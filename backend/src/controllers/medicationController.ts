import { Request, Response } from 'express';
import pool from '../db';

// Interfaces de Tipagem
interface CreateMedicationRequest {
  name: string;
  dosage: string;
  startDate: string;
  intervalHours: number;
  endDate?: string;
  isContinuous: boolean;
}

interface UpdateMedicationRequest {
  name?: string;
  dosage?: string;
  startDate?: string;
  intervalHours?: number;
  endDate?: string;
  isContinuous?: boolean;
}

// Helper para converter IDs com segurança
function toInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? Math.floor(n) : null;
}

/**
 * Validação de Acesso Robusta
 * - Se for DONO (sponsor_id), tem acesso total sempre.
 * - Se for CUIDADOR (device_access), verifica a flag can_edit_medications.
 */
async function assertDeviceAccess(params: {
  userId: number;
  dispenserId: number;
  requireEdit: boolean;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { userId, dispenserId, requireEdit } = params;

  // 1. Verifica se o usuário é o dono do dispenser (Sponsor)
  const owner = await pool.query(
      `SELECT id FROM dispensers WHERE id = $1 AND sponsor_id = $2`,
      [dispenserId, userId]
  );

  // Se for dono, ignoramos qualquer restrição e permitimos
  if (owner.rows.length > 0) return { ok: true };

  // 2. Se não for dono, verifica se existe um vínculo na device_access (Cuidador/Caregiver)
  const access = await pool.query(
      `SELECT can_edit_medications FROM device_access WHERE dispenser_id = $1 AND user_id = $2`,
      [dispenserId, userId]
  );

  // Se não houver registro de acesso para esse usuário
  if (access.rows.length === 0) {
    return { ok: false, status: 403, error: 'Acesso negado. Você não está vinculado a este dispositivo.' };
  }

  // 3. Se a ação exigir edição (Criar, Atualizar, Deletar)
  if (requireEdit) {
    const hasEditPermission = access.rows[0].can_edit_medications;

    if (!hasEditPermission) {
      return {
        ok: false,
        status: 403,
        error: 'Permissão negada. O administrador não permitiu que você alterasse medicamentos.'
      };
    }
  }

  return { ok: true };
}

// --- CONTROLLERS ---

export const getMedications = async (req: Request, res: Response) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? req.query.dispenserId);

  if (!dispenserId) return res.status(400).json({ error: 'dispenserId é obrigatório.' });

  // Apenas visualização (requireEdit: false)
  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: false });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const result = await pool.query(
        `SELECT
           m.id, m.name, m.dosage, m.start_date, m.end_date,
           s.interval_hours, s.start_time, s.is_active
         FROM medications m
                LEFT JOIN medication_schedules s ON m.id = s.medication_id
         WHERE m.dispenser_id = $1
         ORDER BY m.created_at DESC`,
        [dispenserId]
    );

    const medications = result.rows.map(m => ({
      ...m,
      is_expired: m.end_date ? new Date(m.end_date) < new Date() : false
    }));

    return res.status(200).json(medications);
  } catch (error) {
    console.error('Erro ao buscar:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar medicamentos.' });
  }
};

export const createMedication = async (
    req: Request<{ dispenserId: string }, {}, CreateMedicationRequest>,
    res: Response
) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? (req.body as any)?.dispenserId);
  const { name, dosage, startDate, intervalHours, endDate, isContinuous } = req.body;

  if (!dispenserId) return res.status(400).json({ error: 'dispenserId é obrigatório.' });

  // EXIGE EDIÇÃO (requireEdit: true)
  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  if (!name || !dosage || !startDate || intervalHours === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  const parsedStartDate = new Date(startDate);
  const startTime = parsedStartDate.toLocaleTimeString('pt-BR', { hour12: false });
  const finalEndDate = isContinuous ? null : endDate;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const medResult = await client.query(
        `INSERT INTO medications (dispenser_id, name, dosage, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [dispenserId, name, dosage, startDate, finalEndDate]
    );
    const newMed = medResult.rows[0];

    const schResult = await client.query(
        `INSERT INTO medication_schedules (medication_id, dispenser_id, interval_hours, start_time)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [newMed.id, dispenserId, intervalHours, startTime]
    );

    await client.query('COMMIT');
    return res.status(201).json({ medication: newMed, schedule: schResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Erro ao salvar medicamento.' });
  } finally {
    client.release();
  }
};

export const updateMedication = async (
    req: Request<{ dispenserId: string; id: string }, {}, UpdateMedicationRequest>,
    res: Response
) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? req.query.dispenserId);
  const medicationId = toInt(req.params.id);
  const { name, dosage, startDate, intervalHours, endDate, isContinuous } = req.body;

  if (!dispenserId || !medicationId) return res.status(400).json({ error: 'IDs inválidos.' });

  // EXIGE EDIÇÃO (requireEdit: true)
  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (name !== undefined || dosage !== undefined || endDate !== undefined || isContinuous !== undefined) {
      const medFields: string[] = [];
      const medValues: any[] = [];
      let i = 1;

      if (name !== undefined) { medFields.push(`name = $${i++}`); medValues.push(name); }
      if (dosage !== undefined) { medFields.push(`dosage = $${i++}`); medValues.push(dosage); }

      if (isContinuous === true) {
        medFields.push(`end_date = NULL`);
      } else if (endDate !== undefined) {
        medFields.push(`end_date = $${i++}`);
        medValues.push(endDate);
      }

      medValues.push(medicationId, dispenserId);
      await client.query(
          `UPDATE medications SET ${medFields.join(', ')}
           WHERE id = $${i++} AND dispenser_id = $${i}`,
          medValues
      );
    }

    if (startDate !== undefined || intervalHours !== undefined) {
      const schFields: string[] = [];
      const schValues: any[] = [];
      let i = 1;

      if (intervalHours !== undefined) { schFields.push(`interval_hours = $${i++}`); schValues.push(intervalHours); }
      if (startDate !== undefined) {
        const startTime = new Date(startDate).toLocaleTimeString('pt-BR', { hour12: false });
        schFields.push(`start_time = $${i++}`); schValues.push(startTime);
      }

      schValues.push(medicationId, dispenserId);
      await client.query(
          `UPDATE medication_schedules SET ${schFields.join(', ')}
           WHERE medication_id = $${i++} AND dispenser_id = $${i}`,
          schValues
      );
    }

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Atualizado com sucesso!' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Erro ao atualizar.' });
  } finally {
    client.release();
  }
};

export const deleteMedication = async (req: Request, res: Response) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? req.query.dispenserId);
  const medicationId = toInt(req.params.id);

  if (!dispenserId || !medicationId) return res.status(400).json({ error: 'IDs inválidos.' });

  // EXIGE EDIÇÃO (requireEdit: true)
  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const result = await pool.query(
        `DELETE FROM medications WHERE id = $1 AND dispenser_id = $2 RETURNING id`,
        [medicationId, dispenserId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Não encontrado.' });
    return res.status(200).json({ message: 'Deletado com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar.' });
  }
};