import { randomUUID } from 'crypto';
import pool from '../db';
import type { PoolClient } from 'pg';

export type MedicationScheduleInput = {
  dispenserId: number;
  medicationId: number;
  scheduleStartAt: string;
  intervalHours: number;
  endDate?: string | null;
  isContinuous: boolean;
};

type HistoryRow = {
  id: number;
  dispenser_id: number;
  medication_id: number;
  scheduled_time: Date;
  intake_time: Date | null;
  status: string;
  command_id: string | null;
  attempts: number;
  command_topic: string | null;
  command_payload: unknown;
};

function buildSchedule(startDate: string, intervalHours: number, endDate?: string | null, isContinuous?: boolean) {
  const scheduledDates: Date[] = [];
  const startMoment = new Date(startDate);

  if (Number.isNaN(startMoment.getTime())) {
    throw new Error('startDate inválida');
  }

  if (intervalHours <= 0) {
    throw new Error('intervalHours deve ser maior que zero');
  }

  const maxDays = 30;
  const maxByDays = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000);
  const limitDate = !isContinuous && endDate
    ? new Date(endDate) < maxByDays
      ? new Date(endDate)
      : maxByDays
    : maxByDays;

  let current = new Date(startMoment);
  let count = 0;
  const maxDoses = 240;

  while (current <= limitDate && count < maxDoses) {
    scheduledDates.push(new Date(current));
    current = new Date(current.getTime() + intervalHours * 60 * 60 * 1000);
    count++;
  }

  return scheduledDates;
}

export async function replaceMedicationSchedule(input: MedicationScheduleInput) {
  const schedule = buildSchedule(input.scheduleStartAt, input.intervalHours, input.endDate, input.isContinuous);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM medication_intake_history WHERE medication_id = $1', [input.medicationId]);

    if (schedule.length > 0) {
      const values: Array<number | Date | string | null> = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      schedule.forEach((scheduledTime) => {
        const commandId = randomUUID();
        placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 'pending', $${paramIndex++})`);
        values.push(input.dispenserId, input.medicationId, scheduledTime, commandId);
      });

      await client.query(
        `INSERT INTO medication_intake_history (dispenser_id, medication_id, scheduled_time, status, command_id)
         VALUES ${placeholders.join(', ')}`,
        values
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMedicationSchedule(medicationId: number) {
  await pool.query('DELETE FROM medication_intake_history WHERE medication_id = $1', [medicationId]);
}

export async function getRecentMedicationHistory(dispenserId: number, limit = 20) {
  const result = await pool.query(
    `SELECT
       h.id,
       h.dispenser_id,
       h.medication_id,
       h.scheduled_time,
       h.intake_time,
       h.status,
       h.command_id,
       h.command_topic,
       h.command_payload,
       h.sent_at,
       h.acknowledged_at,
       h.attempts,
       h.last_error,
       m.name AS medication_name,
       m.dosage
     FROM medication_intake_history h
     JOIN medications m ON m.id = h.medication_id
     WHERE h.dispenser_id = $1
     ORDER BY h.scheduled_time DESC
     LIMIT $2`,
    [dispenserId, limit]
  );

  return result.rows;
}

export async function getDueMedicationHistory(client: PoolClient, limit = 50): Promise<HistoryRow[]> {
  // Defensive: if the history table doesn't exist yet, return empty list instead of throwing.
  try {
    const chk = await client.query(`SELECT to_regclass('public.medication_intake_history') AS cls`);
    if (!chk.rows[0] || !chk.rows[0].cls) {
      return [];
    }
  } catch (err) {
    // If the check itself fails, surface the error to caller to handle.
    throw err;
  }

  const result = await client.query(
    `SELECT
       id,
       dispenser_id,
       medication_id,
       scheduled_time,
       intake_time,
       status,
       command_id,
       attempts,
       command_topic,
       command_payload
     FROM medication_intake_history
     WHERE status = 'pending'
       AND scheduled_time <= NOW()
     ORDER BY scheduled_time ASC
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [limit]
  );

  return result.rows;
}

export async function markDoseDispatched(params: {
  historyId: number;
  commandId: string;
  topic: string;
  payload: Record<string, unknown>;
}) {
  await pool.query(
    `UPDATE medication_intake_history
     SET status = 'dispatched',
         command_id = $2,
         command_topic = $3,
         command_payload = $4::jsonb,
         sent_at = NOW(),
         attempts = attempts + 1,
         updated_at = NOW()
     WHERE id = $1`,
    [params.historyId, params.commandId, params.topic, JSON.stringify(params.payload)]
  );
}

export async function markDoseDispatchFailed(params: {
  historyId: number;
  errorMessage: string;
}) {
  await pool.query(
    `UPDATE medication_intake_history
     SET status = 'failed',
         last_error = $2,
         attempts = attempts + 1,
         updated_at = NOW()
     WHERE id = $1`,
    [params.historyId, params.errorMessage]
  );
}

export async function markDoseTaken(params: {
  commandId?: string | null;
  dispenserId: number;
  medicationId?: number | null;
  intakeTime?: Date;
  notes?: string | null;
}) {
  const intakeTime = params.intakeTime ?? new Date();

  if (params.commandId) {
    await pool.query(
      `UPDATE medication_intake_history
       SET intake_time = $2,
           status = 'taken',
           acknowledged_at = NOW(),
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE command_id = $1`,
      [params.commandId, intakeTime, params.notes ?? null]
    );
    return;
  }

  await pool.query(
    `WITH candidate AS (
       SELECT id
       FROM medication_intake_history
       WHERE dispenser_id = $1
         AND medication_id = COALESCE($4, medication_id)
         AND status IN ('pending', 'dispatched')
       ORDER BY scheduled_time ASC
       LIMIT 1
     )
     UPDATE medication_intake_history h
     SET intake_time = $2,
         status = 'taken',
         acknowledged_at = NOW(),
         notes = COALESCE($3, notes),
         updated_at = NOW()
     FROM candidate c
     WHERE h.id = c.id`,
    [params.dispenserId, intakeTime, params.notes ?? null, params.medicationId ?? null]
  );
}

export async function markDoseMissed(historyId: number, reason = 'Dose missed by scheduler') {
  await pool.query(
    `UPDATE medication_intake_history
     SET status = 'missed',
         last_error = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [historyId, reason]
  );
}

export async function recordDeviceEvent(params: {
  topic: string;
  eventType: string;
  dispenserId?: number | null;
  medicationId?: number | null;
  payload: Record<string, unknown>;
}) {
  await pool.query(
    `INSERT INTO device_events (topic, event_type, dispenser_id, medication_id, payload, processed, processed_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, true, NOW())`,
    [params.topic, params.eventType, params.dispenserId ?? null, params.medicationId ?? null, JSON.stringify(params.payload)]
  );
}

export function buildReleaseTopic(prefix: string, deviceId: string | number) {
  return `${prefix}/dispenser/${deviceId}/command`;
}

export function buildStatusTopic(prefix: string) {
  return `${prefix}/dispenser/+/status`;
}

export function buildEventTopic(prefix: string) {
  return `${prefix}/dispenser/+/event`;
}

export function buildReleasePayload(params: {
  commandId: string;
  dispenserId: number;
  deviceId?: string | number;
  medicationId: number;
  scheduledTime: Date;
  attempts: number;
}) {
  const totalServos = Number(process.env.DISPENSER_TOTAL_SERVOS) || 3;
  const totalDivisions = Number(process.env.DISPENSER_TOTAL_DIVISIONS) || 6;
  const zeroBasedMedication = Math.max(params.medicationId - 1, 0);

  return {
    eventType: 'release_dose',
    timestamp: new Date().toISOString(),
    commandId: params.commandId,
    deviceId: String(params.deviceId ?? params.dispenserId),
    data: {
      dispenserId: params.dispenserId,
      medicationId: params.medicationId,
      scheduledTime: params.scheduledTime.toISOString(),
      attempts: params.attempts,
      disco: (zeroBasedMedication % totalServos) + 1,
      doseIndex: (Math.floor(zeroBasedMedication / totalServos) % totalDivisions) + 1,
    },
  };
}
