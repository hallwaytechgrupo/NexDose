import { Request, Response } from 'express';
import pool from '../db';

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

function toInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? Math.floor(n) : null;
}

async function assertDeviceAccess(params: {
  userId: number;
  dispenserId: number;
  requireEdit: boolean;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { userId, dispenserId, requireEdit } = params;

  const owner = await pool.query(
      `SELECT id FROM dispensers WHERE id = $1 AND sponsor_id = $2`,
      [dispenserId, userId]
  );

  if (owner.rows.length > 0) return { ok: true };

  const access = await pool.query(
      `SELECT can_edit_medications FROM device_access WHERE dispenser_id = $1 AND user_id = $2`,
      [dispenserId, userId]
  );

  if (access.rows.length === 0) {
    return { ok: false, status: 403, error: 'Acesso negado. Você não está vinculado a este dispositivo.' };
  }

  if (requireEdit && !access.rows[0].can_edit_medications) {
    return { ok: false, status: 403, error: 'Permissão negada. O administrador não permitiu que você alterasse medicamentos.' };
  }

  return { ok: true };
}

export const getMedications = async (req: Request, res: Response) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? req.query.dispenserId);

  if (!dispenserId) return res.status(400).json({ error: 'dispenserId é obrigatório.' });

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: false });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const result = await pool.query(
        `SELECT id, name, dosage, start_time, end_date, interval_hours, is_continuous
         FROM medications
         WHERE dispenser_id = $1
         ORDER BY created_at DESC`,
        [dispenserId]
    );

    const medications = result.rows.map(m => ({
      id: String(m.id),
      name: m.name,
      dosage: m.dosage,
      interval: m.interval_hours,
      nextDose: m.start_time, // Retorna "15:00:00" para o front aplicar substring(0,5) -> "15:00"
      endDate: m.end_date,
      isContinuous: m.is_continuous,
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

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  if (!name || !dosage || !startDate || intervalHours === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  // Extrai apenas a string de hora local ("15:00:00") para manter a compatibilidade com a linha do tempo do app
  const parsedStartDate = new Date(startDate);
  const startTime = parsedStartDate.toLocaleTimeString('pt-BR', { hour12: false });
  const finalEndDate = isContinuous ? null : endDate;

  try {
    const medResult = await pool.query(
        `INSERT INTO medications (dispenser_id, name, dosage, start_time, end_date, interval_hours, is_continuous)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [dispenserId, name, dosage, startTime, finalEndDate, intervalHours, isContinuous]
    );

    return res.status(201).json(medResult.rows[0]);
  } catch (error) {
    console.error('Erro ao criar medicamento:', error);
    return res.status(500).json({ error: 'Erro ao salvar medicamento.' });
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

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
    if (dosage !== undefined) { fields.push(`dosage = $${i++}`); values.push(dosage); }
    if (intervalHours !== undefined) { fields.push(`interval_hours = $${i++}`); values.push(intervalHours); }
    if (isContinuous !== undefined) { fields.push(`is_continuous = $${i++}`); values.push(isContinuous); }

    if (startDate !== undefined) {
      const startTime = new Date(startDate).toLocaleTimeString('pt-BR', { hour12: false });
      fields.push(`start_time = $${i++}`);
      values.push(startTime);
    }

    if (isContinuous === true) {
      fields.push(`end_date = NULL`);
    } else if (endDate !== undefined) {
      fields.push(`end_date = $${i++}`);
      values.push(endDate);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });

    values.push(medicationId, dispenserId);
    const result = await pool.query(
        `UPDATE medications SET ${fields.join(', ')}
         WHERE id = $${i++} AND dispenser_id = $${i} RETURNING *`,
        values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Medicamento não encontrado.' });

    return res.status(200).json({ message: 'Atualizado com sucesso!', medication: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar medicamento:', error);
    return res.status(500).json({ error: 'Erro ao atualizar.' });
  }
};

export const deleteMedication = async (req: Request, res: Response) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? req.query.dispenserId);
  const medicationId = toInt(req.params.id);

  if (!dispenserId || !medicationId) return res.status(400).json({ error: 'IDs inválidos.' });

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