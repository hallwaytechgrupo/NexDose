import pool from '../db';
import { getDueMedicationHistory, markDoseDispatchFailed } from './medicationScheduleService';
import { isMqttConnected, publishReleaseCommand } from './mqttClient';

let running = false;

export async function runSchedulerOnce() {
  if (running) {
    return;
  }

  running = true;
  try {
    if (!isMqttConnected()) {
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let dueDoses = [] as any[];
      try {
        dueDoses = await getDueMedicationHistory(client, 25);
      } catch (err: any) {
        // If the table doesn't exist yet, avoid crashing and spam-logging every tick.
        if (err && err.code === '42P01') {
          console.warn('[scheduler] tabela medication_intake_history ausente; aguardando inicialização do banco.');
          await client.query('ROLLBACK');
          return;
        }
        throw err;
      }

      await client.query('COMMIT');

      for (const dose of dueDoses) {
        try {
          await publishReleaseCommand({
            dispenserId: dose.dispenser_id,
            medicationId: dose.medication_id,
            historyId: dose.id,
            scheduledTime: new Date(dose.scheduled_time),
            attempts: dose.attempts,
          });
        } catch (error) {
          await markDoseDispatchFailed({
            historyId: dose.id,
            errorMessage: error instanceof Error ? error.message : 'Falha ao publicar comando MQTT',
          });
        }
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    running = false;
  }
}

export function startScheduler(intervalMs = 30_000) {
  runSchedulerOnce().catch((error) => {
    console.error('[scheduler] initial run failed', error);
  });

  const timer = setInterval(() => {
    runSchedulerOnce().catch((error) => {
      console.error('[scheduler] tick failed', error);
    });
  }, intervalMs);

  return timer;
}