import { Request, Response } from 'express';
import pool from '../db';
import {
  deleteMedicationSchedule,
  replaceMedicationSchedule,
} from '../services/medicationScheduleService';

// ✅ Adicionado 'compartment'
interface CreateMedicationRequest {
  name: string;
  dosage: string;
  compartment: number;
  startDate: string;
  intervalHours: number;
  endDate?: string;
  isContinuous: boolean;
}

// ✅ Adicionado 'compartment'
interface UpdateMedicationRequest {
  name?: string;
  dosage?: string;
  compartment?: number;
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

export const getHistory = async (req: Request, res: Response) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId);

  if (!dispenserId) {
    return res.status(400).json({ error: 'O ID do dispensador é obrigatório.' });
  }

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: false });
  if (!access.ok) {
    return res.status(access.status).json({ error: access.error });
  }

  try {
    const result = await pool.query(
        `SELECT
           h.id,
           m.name as medication_name,
           h.intake_time,
           h.scheduled_time,
           h.status,
           h.command_id,
           h.command_topic,
           h.command_payload,
           h.sent_at,
           h.acknowledged_at,
           h.attempts,
           h.last_error
         FROM medication_intake_history h
                JOIN medications m ON h.medication_id = m.id
         WHERE h.dispenser_id = $1
           AND DATE(h.scheduled_time AT TIME ZONE 'America/Sao_Paulo') = DATE(NOW() AT TIME ZONE 'America/Sao_Paulo')
         ORDER BY h.scheduled_time ASC`,
        [dispenserId]
    );

    const history = result.rows.map((row) => {
      const scheduledTime = new Date(row.scheduled_time);
      const intakeTime = row.intake_time ? new Date(row.intake_time) : null;

      let status = row.status;
      if (status === 'taken' && intakeTime) {
        status = intakeTime <= new Date(scheduledTime.getTime() + 30 * 60 * 1000)
            ? 'taken_on_time'
            : 'taken_late';
      }

      return {
        id: String(row.id),
        medicationName: row.medication_name,
        scheduledAt: row.scheduled_time,
        intakeAt: row.intake_time,
        status,
        commandId: row.command_id,
        attempts: row.attempts,
        lastError: row.last_error,
        medication_name: row.medication_name,
      };
    });

    res.status(200).json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico de doses:', error);
    res.status(500).json({ error: 'Erro interno ao buscar o histórico.' });
  }
};

export const getMedications = async (req: Request, res: Response) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.params.dispenserId ?? req.query.dispenserId);

  if (!dispenserId) return res.status(400).json({ error: 'dispenserId é obrigatório.' });

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: false });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    // ✅ Adicionado 'compartment' ao SELECT
    const result = await pool.query(
        `SELECT id, name, dosage, compartment, start_time, schedule_start_at, end_date, interval_hours, is_continuous
         FROM medications
         WHERE dispenser_id = $1
         ORDER BY created_at DESC`,
        [dispenserId]
    );

    const medications = result.rows.map(m => ({
      id: String(m.id),
      name: m.name,
      dosage: m.dosage,
      compartment: m.compartment, // ✅ Adicionado 'compartment' ao retorno
      interval: m.interval_hours,
      nextDose: m.start_time,
      scheduleStartAt: m.schedule_start_at,
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
  // ✅ Adicionado 'compartment'
  const { name, dosage, compartment, startDate, intervalHours, endDate, isContinuous } = req.body;

  if (!dispenserId) return res.status(400).json({ error: 'dispenserId é obrigatório.' });

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  // ✅ Adicionado 'compartment' à validação
  if (!name || !dosage || !compartment || !startDate || intervalHours === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  if (intervalHours <= 0) {
    return res.status(400).json({ error: 'O intervalo de horas deve ser maior que zero.' });
  }

  const parsedStartDate = new Date(startDate);
  const startTime = parsedStartDate.toLocaleTimeString('pt-BR', {
    hour12: false,
    timeZone: 'America/Sao_Paulo'
  });

  const finalEndDate = isContinuous ? null : endDate;

  try {
    // ✅ Adicionado 'compartment' ao INSERT
    const medResult = await pool.query(
        `INSERT INTO medications (dispenser_id, name, dosage, compartment, start_time, schedule_start_at, interval_hours, is_continuous, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [dispenserId, name, dosage, compartment, startTime, parsedStartDate, intervalHours, isContinuous, finalEndDate]
    );

    const newMedication = medResult.rows[0];
    await replaceMedicationSchedule({
      dispenserId,
      medicationId: newMedication.id,
      scheduleStartAt: parsedStartDate.toISOString(),
      intervalHours,
      endDate: finalEndDate,
      isContinuous,
    });

    return res.status(201).json(newMedication);
  } catch (error) {
    console.error('Erro ao criar medicamento e gerar histórico:', error);
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
  // ✅ Adicionado 'compartment'
  const { name, dosage, compartment, startDate, intervalHours, endDate, isContinuous } = req.body;

  if (!dispenserId || !medicationId) return res.status(400).json({ error: 'IDs inválidos.' });

  const access = await assertDeviceAccess({ userId, dispenserId, requireEdit: true });
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
    if (dosage !== undefined) { fields.push(`dosage = $${i++}`); values.push(dosage); }
    // ✅ Adicionado 'compartment' à lógica dinâmica
    if (compartment !== undefined) { fields.push(`compartment = $${i++}`); values.push(compartment); }
    if (intervalHours !== undefined) { fields.push(`interval_hours = $${i++}`); values.push(intervalHours); }
    if (isContinuous !== undefined) { fields.push(`is_continuous = $${i++}`); values.push(isContinuous); }

    if (startDate !== undefined) {
      const startTime = new Date(startDate).toLocaleTimeString('pt-BR', { hour12: false });
      fields.push(`start_time = $${i++}`);
      values.push(startTime);
      fields.push(`schedule_start_at = $${i++}`);
      values.push(new Date(startDate));
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

    if (startDate !== undefined || intervalHours !== undefined || endDate !== undefined || isContinuous !== undefined) {
      await replaceMedicationSchedule({
        dispenserId,
        medicationId,
        scheduleStartAt: result.rows[0].schedule_start_at,
        intervalHours: result.rows[0].interval_hours,
        endDate: result.rows[0].end_date,
        isContinuous: result.rows[0].is_continuous,
      });
    }

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
    await deleteMedicationSchedule(medicationId);
    return res.status(200).json({ message: 'Deletado com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar.' });
  }
};