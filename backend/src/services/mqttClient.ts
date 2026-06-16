import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import { randomUUID } from 'crypto';
import pool from '../db';
import {
  buildEventTopic,
  buildReleasePayload,
  buildReleaseTopic,
  buildStatusTopic,
  markDoseAsDispensedByDevice, // ✅ IMPORTADO
  markDoseDispatchFailed,
  markDoseDispatched,
  markDoseTaken,
  recordDeviceEvent,
} from './medicationScheduleService';
import { getPushTokensForDispenser, getMedicationNameById, sendPushNotifications } from './notificationService';

type MqttEventPayload = {
  eventType?: string;
  timestamp?: string;
  deviceId?: string | number;
  commandId?: string;
  medicationId?: number | string;
  data?: Record<string, unknown>;
};

export let mqttClient: MqttClient | null = null;
let connected = false;
let schedulerTick: NodeJS.Timeout | null = null;

function describeBrokerUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return rawUrl;
  }
}

function isLocalBrokerUrl(rawUrl: string) {
  try {
    const host = new URL(rawUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === 'mqtt';
  } catch {
    return false;
  }
}

function parseNumber(value: unknown): number | null {
  const numeric = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(numeric) ? Math.floor(numeric) : null;
}

function safeParsePayload(raw: Buffer): MqttEventPayload | null {
  try {
    const parsed = JSON.parse(raw.toString('utf8')) as MqttEventPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.eventType !== 'string' || !parsed.eventType.trim()) return null;
    if (typeof parsed.timestamp !== 'string' || !parsed.timestamp.trim()) return null;
    if (parsed.deviceId === undefined || parsed.deviceId === null || parsed.deviceId === '') return null;
    return parsed;
  } catch {
    return null;
  }
}

// ✅ LÓGICA DE EVENTOS ATUALIZADA
async function handleMqttEvent(topic: string, payload: MqttEventPayload) {
  const dispenserId = parseNumber(payload.deviceId);
  const medicationId = parseNumber(payload.medicationId);
  const commandId = payload.commandId;

  // Grava todos os eventos recebidos para auditoria
  await recordDeviceEvent({
    topic,
    eventType: payload.eventType ?? 'unknown',
    dispenserId,
    medicationId,
    payload: payload as Record<string, unknown>,
  });

  if (!dispenserId) {
    console.warn('[mqtt] Ignorando evento sem dispenserId:', payload);
    return;
  }

  switch (payload.eventType) {
    // Passo 4: ESP32 confirma que o remédio caiu na gaveta
    case 'dose_dispensada':
      if (commandId) {
        console.log(`[mqtt] Dispenser ${dispenserId}: Dose dispensada, aguardando coleta. CommandId: ${commandId}`);
        await markDoseAsDispensedByDevice(commandId);
        // TODO: Iniciar notificação para "Remédio pronto para coleta"
      }
      break;

    // Passo 6: ESP32 confirma que a gaveta foi aberta
    case 'dose_coletada':
      if (commandId) {
        console.log(`[mqtt] Dispenser ${dispenserId}: Coleta confirmada. CommandId: ${commandId}`);
        await markDoseTaken({
          commandId: commandId,
          dispenserId: dispenserId,
          intakeTime: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        });
        // TODO: Parar notificações de "colete o remédio" e enviar notificação de sucesso
        try {
            const tokens = await getPushTokensForDispenser(dispenserId);
            if (tokens.length > 0) {
              const medName = (medicationId ? await getMedicationNameById(medicationId) : null) || 'Medicamento';
              const title = 'Dose Administrada';
              const body = `${medName} foi dispensado e tomado com sucesso.`;
              await sendPushNotifications(tokens, title, body, { dispenserId: String(dispenserId), medicationId: String(medicationId) });
            }
        } catch (error) {
            console.error('Falha ao enviar notificação de dose tomada:', error);
        }
      }
      break;

    case 'alerta_coleta':
      console.warn(`[mqtt] Alerta do dispenser ${dispenserId}: Coleta não realizada a tempo.`);
      // A lógica de marcar como 'missed' será feita pelo scheduler para maior controle
      break;

    case 'device_status':
    case 'conectado':
      await pool.query(
        `UPDATE dispensers
         SET status = COALESCE($2, status),
             last_sync = NOW()
         WHERE id = $1`,
        [dispenserId, typeof payload.data?.status === 'string' ? payload.data.status : 'online']
      );
      break;
  }
}


function createClientOptions(): IClientOptions {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    throw new Error('MQTT_BROKER_URL é obrigatório para iniciar a integração MQTT.');
  }

  const configuredId = process.env.MQTT_CLIENT_ID || 'nexdose-backend';
  const clientId = configuredId === 'nexdose-backend' ? `${configuredId}-${randomUUID().slice(0, 8)}` : configuredId;

  return {
    clientId,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    reconnectPeriod: Number(process.env.MQTT_RECONNECT_MS) || 10000,
    connectTimeout: Number(process.env.MQTT_CONNECT_TIMEOUT_MS) || 30_000,
    keepalive: 60,
    clean: process.env.MQTT_CLEAN_SESSION !== 'false' ? false : true,
  };
}

export async function publishReleaseCommand(params: {
  dispenserId: number;
  medicationId: number;
  historyId: number;
  scheduledTime: Date;
  attempts: number;
}) {
  if (!mqttClient || !connected) {
    throw new Error('Cliente MQTT ainda não conectado.');
  }

  const prefix = process.env.MQTT_TOPIC_PREFIX || 'nexdose';
  const commandId = randomUUID();
  const topic = buildReleaseTopic(prefix, params.dispenserId);
  
  const payload = buildReleasePayload({
    commandId,
    dispenserId: params.dispenserId,
    medicationId: params.medicationId,
    scheduledTime: params.scheduledTime,
    attempts: params.attempts,
  });

  const maxRetries = Number(process.env.MQTT_PUBLISH_MAX_RETRIES) || 3;
  const baseDelay = Number(process.env.MQTT_PUBLISH_BASE_DELAY_MS) || 1000;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        mqttClient!.publish(topic, JSON.stringify(payload), { qos: 1, retain: false }, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      await markDoseDispatched({
        historyId: params.historyId,
        commandId,
        topic,
        payload,
      });

      return;
    } catch (err) {
      lastError = err;
      const isLast = attempt === maxRetries;
      console.warn(`[mqtt] publish attempt ${attempt}/${maxRetries} failed for historyId=${params.historyId}:`, err instanceof Error ? err.message : err);
      if (!isLast) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  await markDoseDispatchFailed({
    historyId: params.historyId,
    errorMessage: lastError instanceof Error ? lastError.message : 'Erro desconhecido ao publicar comando MQTT (todas as tentativas falharam)'
  });
  throw lastError;
}

async function attachHandlers(clientInstance: MqttClient) {
  const prefix = process.env.MQTT_TOPIC_PREFIX || 'nexdose';
  const statusTopic = buildStatusTopic(prefix);
  const eventTopic = buildEventTopic(prefix);

  clientInstance.on('connect', async () => {
    connected = true;
    console.log(`[mqtt] connected to ${describeBrokerUrl(process.env.MQTT_BROKER_URL ?? '')}`);

    clientInstance.subscribe([statusTopic, eventTopic], { qos: 1 }, (error) => {
      if (error) {
        console.error('[mqtt] subscription error', error);
      }
    });
  });

  clientInstance.on('reconnect', () => {
    connected = false;
    console.log('[mqtt] reconnecting');
  });

  clientInstance.on('close', () => {
    connected = false;
    console.log('[mqtt] disconnected');
  });

  clientInstance.on('error', (error) => {
    console.error('[mqtt] error', error);
  });

  clientInstance.on('message', async (topic, rawMessage) => {
    const payload = safeParsePayload(rawMessage);
    if (!payload) {
      console.warn(`[mqtt] payload inválido ignorado no tópico ${topic}`);
      return;
    }

    try {
      await handleMqttEvent(topic, payload);
    } catch (error) {
      console.error('[mqtt] erro ao processar mensagem', error);
    }
  });
}

export async function startMqttIntegration() {
  if (mqttClient) {
    return mqttClient;
  }

  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    console.warn('[mqtt] MQTT_BROKER_URL não configurado; integração MQTT desativada.');
    return null;
  }

  if (process.env.NODE_ENV === 'production' && isLocalBrokerUrl(brokerUrl)) {
    console.warn('[mqtt] MQTT_BROKER_URL aponta para broker local/interno em produção. Use um broker público, ex: mqtts://host:8883.');
  }

  console.log(`[mqtt] starting integration with ${describeBrokerUrl(brokerUrl)}`);
  mqttClient = mqtt.connect(brokerUrl, createClientOptions());
  await attachHandlers(mqttClient);

  const timeoutMs = Number(process.env.MQTT_STARTUP_CONNECT_TIMEOUT_MS) || 20_000;

  try {
    await new Promise<void>((resolve, reject) => {
      let resolved = false;
      const onConnect = () => {
        resolved = true;
        mqttClient!.off('connect', onConnect);
        resolve();
      };

      mqttClient!.on('connect', onConnect);

      const onError = (err: Error) => {
        if (!resolved) {
          console.error('[mqtt] erro durante tentativa inicial de conexão', err);
        }
      };

      mqttClient!.on('error', onError);

      const timer = setTimeout(() => {
        if (!resolved) {
          mqttClient!.off('connect', onConnect);
          mqttClient!.off('error', onError);
          console.warn(`[mqtt] não foi possível conectar ao broker em ${timeoutMs}ms; prosseguindo sem conexão inicial. O cliente continuará tentando reconectar.`);
          resolve();
        }
      }, timeoutMs);
    });
  } catch (err) {
    console.error('[mqtt] falha ao aguardar conexão inicial do MQTT', err);
  }

  return mqttClient;
}

export async function stopMqttIntegration() {
  if (schedulerTick) {
    if (typeof (schedulerTick as any).stop === 'function') {
      (schedulerTick as any).stop();
    }
    schedulerTick = null;
  }

  if (mqttClient) {
    await new Promise<void>((resolve) => {
      mqttClient!.end(true, {}, () => resolve());
    });
    mqttClient = null;
    connected = false;
  }
}

export function isMqttConnected() {
  try {
    return !!(mqttClient && (mqttClient.connected === true || connected === true));
  } catch {
    return !!connected;
  }
}

export function setSchedulerTicker(tick: NodeJS.Timeout | null) {
  schedulerTick = tick;
}