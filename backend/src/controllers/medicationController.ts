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
    const tableProbe = await pool.query(
        `SELECT
           to_regclass('public.dose_history') IS NOT NULL AS has_old_history,
           to_regclass('public.medication_intake_history') IS NOT NULL AS has_new_history`
    );

    const hasOldHistory = Boolean(tableProbe.rows[0]?.has_old_history);
    const hasNewHistory = Boolean(tableProbe.rows[0]?.has_new_history);

    const historySources: string[] = [];

    if (hasOldHistory) {
      historySources.push(`
        SELECT
          h.id,
          h.medication_id,
          m.name AS medication_name,
          h.taken_at AS taken_at,
          h.scheduled_at AS scheduled_at,
          CASE
            WHEN h.taken_at IS NOT NULL AND h.taken_at <= h.scheduled_at + INTERVAL '30 minutes' THEN 'taken_on_time'
            WHEN h.taken_at IS NOT NULL AND h.taken_at > h.scheduled_at + INTERVAL '30 minutes' THEN 'taken_late'
            WHEN h.taken_at IS NULL AND h.scheduled_at <= NOW() THEN 'missed'
            ELSE 'pending'
          END AS status
        FROM dose_history h
        JOIN medications m ON h.medication_id = m.id
        WHERE h.dispenser_id = $1
      `);
    }

    if (hasNewHistory) {
      historySources.push(`
        SELECT
          h.id,
          h.medication_id,
          m.name AS medication_name,
          h.intake_time AS taken_at,
          h.scheduled_time AS scheduled_at,
          CASE
            WHEN h.intake_time IS NOT NULL AND h.intake_time <= h.scheduled_time + INTERVAL '30 minutes' THEN 'taken_on_time'
            WHEN h.intake_time IS NOT NULL AND h.intake_time > h.scheduled_time + INTERVAL '30 minutes' THEN 'taken_late'
            WHEN h.intake_time IS NULL AND h.scheduled_time <= NOW() THEN 'missed'
            ELSE 'pending'
          END AS status
        FROM medication_intake_history h
        JOIN medications m ON h.medication_id = m.id
        WHERE m.dispenser_id = $1
      `);
    }

    if (historySources.length === 0) {
      return res.status(500).json({ error: 'Nenhuma tabela de histórico foi encontrada no banco.' });
    }

    const result = await pool.query(
        `
         SELECT
           history.id,
           history.medication_name,
           history.taken_at,
           history.scheduled_at,
           history.status
         FROM (
           ${historySources.join(' UNION ALL ')}
         ) history
         WHERE DATE(history.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = DATE(NOW() AT TIME ZONE 'America/Sao_Paulo')
         ORDER BY history.scheduled_at ASC
        `,
        [dispenserId]
    );

    res.status(200).json(result.rows);
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

  // Prevenção contra loop infinito se o usuário enviar intervalo 0
  if (intervalHours <= 0) {
    return res.status(400).json({ error: 'O intervalo de horas deve ser maior que zero.' });
  }

  const parsedStartDate = new Date(startDate);
  // Força o fuso do Brasil para evitar que no servidor fique 3h adiantado
  const startTime = parsedStartDate.toLocaleTimeString('pt-BR', {
    hour12: false,
    timeZone: 'America/Sao_Paulo'
  });

  // AQUI ESTÁ A VARIÁVEL QUE HAVIA SUMIDO:
  const finalEndDate = isContinuous ? null : endDate;

  try {
    // 1. Cria a "Regra" do medicamento
    const medResult = await pool.query(
        `INSERT INTO medications (dispenser_id, name, dosage, start_time, end_date, interval_hours, is_continuous)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [dispenserId, name, dosage, startTime, finalEndDate, intervalHours, isContinuous]
    );

    const newMedication = medResult.rows[0];
    const medicationId = newMedication.id;

    // 2. Calcula as datas das próximas doses
    const doses: Date[] = [];
    let currentDoseTime = new Date(startDate);

    // Teto máximo de 30 dias para não sobrecarregar o banco
    const maxDays = 30;
    const limitByDays = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000);
    let limitDate = limitByDays;

    if (!isContinuous && finalEndDate) {
      const parsedEndDate = new Date(finalEndDate);
      // Se tiver data final e for menor que 30 dias, respeita a data final do remédio
      limitDate = parsedEndDate < limitByDays ? parsedEndDate : limitByDays;
    }

    // Trava de segurança extra de 200 doses máximas no array
    const maxDosesLimit = 200;
    let doseCount = 0;

    while (currentDoseTime <= limitDate && doseCount < maxDosesLimit) {
      doses.push(new Date(currentDoseTime));

      // Soma o intervalo de horas no tempo atual
      currentDoseTime = new Date(currentDoseTime.getTime() + intervalHours * 60 * 60 * 1000);
      doseCount++;
    }

    // 3. Salva todas as doses de uma vez (Bulk Insert)
    if (doses.length > 0) {
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      doses.forEach((dose) => {
        placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        // Aqui passamos a 'dose' direto, sem .toISOString()
        values.push(dispenserId, medicationId, dose);
      });

      // Gera a query final de forma segura contra SQL Injection
      const query = `
        INSERT INTO dose_history (dispenser_id, medication_id, scheduled_at)
        VALUES ${placeholders.join(', ')}
      `;

      await pool.query(query, values);
    }

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
