import pool from '../db';
import { getDueMedicationHistory, markDoseDispatchFailed, markDoseMissed } from './medicationScheduleService';
import { isMqttConnected, publishReleaseCommand } from './mqttClient';
import { getPushTokensForDispenser, sendPushNotifications } from './notificationService';

let running = false;

// ✅ NOVA FUNÇÃO: Verifica doses que foram dispensadas mas não coletadas a tempo
async function checkMissedDoses() {
  const missedDoseTimeoutMinutes = 30; // Tempo em minutos para considerar uma dose como 'esquecida'
  
  const result = await pool.query(
    `SELECT id, dispenser_id, medication_id
     FROM medication_intake_history
     WHERE status = 'dispatched'
       AND acknowledged_at IS NULL
       AND sent_at < NOW() - INTERVAL '${missedDoseTimeoutMinutes} minutes'`,
  );

  if (result.rows.length === 0) {
    return; // Nenhuma dose esquecida encontrada
  }

  console.log(`[scheduler] Encontradas ${result.rows.length} doses esquecidas.`);

  for (const dose of result.rows) {
    try {
      await markDoseMissed(dose.id, `Dose não coletada em ${missedDoseTimeoutMinutes} minutos.`);
      
      // Lógica de notificação para o cuidador/responsável
      const tokens = await getPushTokensForDispenser(dose.dispenser_id);
      if (tokens.length > 0) {
        const title = '⚠️ Alerta: Dose Não Coletada';
        const body = `A dose do medicamento ID ${dose.medication_id} foi dispensada mas não foi coletada a tempo.`;
        await sendPushNotifications(tokens, title, body, { dispenserId: String(dose.dispenser_id), medicationId: String(dose.medication_id) });
      }
    } catch (error) {
      console.error(`[scheduler] Erro ao marcar a dose ${dose.id} como esquecida:`, error);
    }
  }
}


async function runSchedulerOnce() {
  if (running) {
    return;
  }

  running = true;
  try {
    if (!isMqttConnected()) {
      return;
    }

    // ✅ Adicionada a verificação de doses esquecidas
    await checkMissedDoses();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let dueDoses = [] as any[];
      try {
        dueDoses = await getDueMedicationHistory(client, 25);
      } catch (err: any) {
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
          console.log(`⏰ Processando dose ${dose.id} do medicamento ${dose.medication_id}`);
          
          await publishReleaseCommand({
            dispenserId: dose.dispenser_id,
            medicationId: dose.medication_id,
            historyId: dose.id,
            scheduledTime: new Date(dose.scheduled_time),
            attempts: dose.attempts,
          });

          const tokens = await getPushTokensForDispenser(dose.dispenser_id);
          if (tokens.length > 0) {
            const medResult = await client.query(
              `SELECT name FROM medications WHERE id = $1`,
              [dose.medication_id]
            );
            const medicationName = medResult.rows[0]?.name || 'Medicamento';
            
            const title = '💊 Hora do Medicamento';
            const body = `É hora de tomar ${medicationName}!`;
            await sendPushNotifications(tokens, title, body, { dispenserId: String(dose.dispenser_id), medicationId: String(dose.medication_id) });
          }

        } catch (error) {
          console.error(`❌ Erro ao processar dose ${dose.id}:`, error);
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