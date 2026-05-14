import { Request, Response } from 'express';
import pool from '../db';

interface CreateMedicationRequest {
  name: string;
  dosage: string;
  startDate: string;
  intervalHours: number;
}

interface UpdateMedicationRequest {
  name?: string;
  dosage?: string;
  startDate?: string;
  intervalHours?: number;
}

function toInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

async function assertDeviceAccess(params: {
  userId: number;
  dispenserId: number;
  requireEdit: boolean;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { userId, dispenserId, requireEdit } = params;

  // Owner can always read/write.
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
    return { ok: false, status: 403, error: 'Sem acesso a este dispositivo.' };
  }

  if (requireEdit && !access.rows[0].can_edit_medications) {
    return { ok: false, status: 403, error: 'Sem permissao para editar medicamentos neste dispositivo.' };
  }

  return { ok: true };
}

export const getMedications = async (req: Request, res: Response) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? req.query.dispenserId);

  if (!dispenserId) {
    return res.status(400).json({ error: 'dispenserId e obrigatorio.' });
  }

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: false });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const result = await pool.query(
      `SELECT 
        m.id,
        m.name,
        m.dosage,
        s.interval_hours,
        s.start_time
       FROM medications m
       LEFT JOIN medication_schedules s ON m.id = s.medication_id
       WHERE m.dispenser_id = $1
       ORDER BY m.created_at DESC`,
      [dispenserId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar medicamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar medicamentos.' });
  }
};

export const createMedication = async (
  req: Request<{ dispenserId: string }, {}, CreateMedicationRequest>,
  res: Response
) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? (req.body as any)?.dispenserId);
  const { name, dosage, startDate, intervalHours } = req.body;

  if (!dispenserId) {
    return res.status(400).json({ error: 'dispenserId e obrigatorio.' });
  }

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  if (!name || !dosage || !startDate || !intervalHours) {
    return res.status(400).json({ error: 'Todos os campos obrigatorios devem ser preenchidos.' });
  }

  const parsedStartDate = new Date(startDate);
  const startTime = parsedStartDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const medicationResult = await client.query(
      `INSERT INTO medications (dispenser_id, name, dosage)
       VALUES ($1, $2, $3)
       RETURNING id, dispenser_id, name, dosage, created_at`,
      [dispenserId, name, dosage]
    );
    const newMedication = medicationResult.rows[0];

    const scheduleResult = await client.query(
      `INSERT INTO medication_schedules (medication_id, dispenser_id, interval_hours, start_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, interval_hours, start_time, is_active, created_at`,
      [newMedication.id, dispenserId, intervalHours, startTime]
    );
    const newSchedule = scheduleResult.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Medicamento registrado com sucesso!',
      medication: {
        ...newMedication,
        schedule: newSchedule,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar medicamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao registrar medicamento.' });
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

  if (!dispenserId) return res.status(400).json({ error: 'dispenserId e obrigatorio.' });
  if (!medicationId) return res.status(400).json({ error: 'id invalido.' });

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const { name, dosage, startDate, intervalHours } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ensure medication belongs to dispenser.
    const authCheck = await client.query(
      `SELECT id FROM medications WHERE id = $1 AND dispenser_id = $2`,
      [medicationId, dispenserId]
    );
    if (authCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Medicamento nao encontrado neste dispositivo.' });
    }

    if (name !== undefined || dosage !== undefined) {
      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (name !== undefined) {
        fields.push(`name = $${i++}`);
        values.push(name);
      }
      if (dosage !== undefined) {
        fields.push(`dosage = $${i++}`);
        values.push(dosage);
      }

      values.push(medicationId, dispenserId);
      await client.query(
        `UPDATE medications SET ${fields.join(', ')} WHERE id = $${i++} AND dispenser_id = $${i}`,
        values
      );
    }

    if (startDate !== undefined || intervalHours !== undefined) {
      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (intervalHours !== undefined) {
        fields.push(`interval_hours = $${i++}`);
        values.push(intervalHours);
      }
      if (startDate !== undefined) {
        const parsed = new Date(startDate);
        const startTime = parsed.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        fields.push(`start_time = $${i++}`);
        values.push(startTime);
      }

      values.push(medicationId, dispenserId);
      await client.query(
        `UPDATE medication_schedules
         SET ${fields.join(', ')}
         WHERE medication_id = $${i++} AND dispenser_id = $${i}`,
        values
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Medicamento atualizado com sucesso!' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar medicamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar medicamento.' });
  } finally {
    client.release();
  }
};

export const deleteMedication = async (
  req: Request<{ dispenserId: string; id: string }>,
  res: Response
) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? req.query.dispenserId);
  const medicationId = toInt(req.params.id);

  if (!dispenserId) return res.status(400).json({ error: 'dispenserId e obrigatorio.' });
  if (!medicationId) return res.status(400).json({ error: 'id invalido.' });

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const result = await pool.query(
      `DELETE FROM medications WHERE id = $1 AND dispenser_id = $2 RETURNING id`,
      [medicationId, dispenserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicamento nao encontrado neste dispositivo.' });
    }

    res.status(200).json({ message: 'Medicamento deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar medicamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao deletar medicamento.' });
  }
};

