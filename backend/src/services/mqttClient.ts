import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import { randomUUID } from 'crypto';
import pool from '../db';
import {
  buildEventTopic,
  buildReleasePayload,
  buildReleaseTopic,
  buildStatusTopic,
  markDoseDispatchFailed,
  markDoseDispatched,
  markDoseTaken,
  recordDeviceEvent,
} from './medicationScheduleService';

type MqttEventPayload = {
  eventType?: string;
  timestamp?: string;
  deviceId?: string | number;
  commandId?: string;
  medicationId?: number | string;
  data?: Record<string, unknown>;
};

let client: MqttClient | null = null;
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

async function handleMqttEvent(topic: string, payload: MqttEventPayload) {
  const dispenserId = parseNumber(payload.deviceId);
  const medicationId = parseNumber(payload.medicationId);

  await recordDeviceEvent({
    topic,
    eventType: payload.eventType ?? 'unknown',
    dispenserId,
    medicationId,
    payload: payload as Record<string, unknown>,
  });

  if (payload.eventType === 'dose_taken' || payload.eventType === 'dose_ack') {
    await markDoseTaken({
      commandId: payload.commandId ?? null,
      dispenserId: dispenserId ?? 0,
      medicationId,
      intakeTime: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    });
  }

  if (payload.eventType === 'device_status') {
    await pool.query(
      `UPDATE dispensers
       SET status = COALESCE($2, status),
           last_sync = NOW()
       WHERE id = $1`,
      [dispenserId, typeof payload.data?.status === 'string' ? payload.data.status : 'online']
    );
  }
}

function createClientOptions(): IClientOptions {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    throw new Error('MQTT_BROKER_URL é obrigatório para iniciar a integração MQTT.');
  }

  // If user provided a fixed MQTT_CLIENT_ID (e.g. via compose), keep it but
  // add a short random suffix to avoid "session taken over" when multiple
  // ephemeral processes connect during development or when using `docker exec`.
  const configuredId = process.env.MQTT_CLIENT_ID || 'nexdose-backend';
  const clientId = configuredId === 'nexdose-backend' ? `${configuredId}-${randomUUID().slice(0, 8)}` : configuredId;

  return {
    clientId,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    // Use a slightly longer reconnect period and timeout to avoid tight connect/disconnect loops
    reconnectPeriod: Number(process.env.MQTT_RECONNECT_MS) || 10000,
    connectTimeout: Number(process.env.MQTT_CONNECT_TIMEOUT_MS) || 30_000,
    keepalive: 60,
    // Prefer persistent session to avoid losing subscriptions on reconnects in dev
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
  if (!client || !connected) {
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

  // Retry with exponential backoff
  const maxRetries = Number(process.env.MQTT_PUBLISH_MAX_RETRIES) || 3;
  const baseDelay = Number(process.env.MQTT_PUBLISH_BASE_DELAY_MS) || 1000;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        client!.publish(topic, JSON.stringify(payload), { qos: 1, retain: false }, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      // registro do despacho apenas quando o publish for bem sucedido
      await markDoseDispatched({
        historyId: params.historyId,
        commandId,
        topic,
        payload,
      });

      return; // sucesso
    } catch (err) {
      lastError = err;
      const isLast = attempt === maxRetries;
      console.warn(`[mqtt] publish attempt ${attempt}/${maxRetries} failed for historyId=${params.historyId}:`, err instanceof Error ? err.message : err);
      if (!isLast) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        // small sleep
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  // todos as tentativas falharam -> marca falha e lança
  await markDoseDispatchFailed({
    historyId: params.historyId,
    errorMessage: lastError instanceof Error ? lastError.message : 'Erro desconhecido ao publicar comando MQTT (todas as tentativas falharam)'
  });
  throw lastError;
}

async function attachHandlers(mqttClient: MqttClient) {
  const prefix = process.env.MQTT_TOPIC_PREFIX || 'nexdose';
  const statusTopic = buildStatusTopic(prefix);
  const eventTopic = buildEventTopic(prefix);

  mqttClient.on('connect', async () => {
    connected = true;
    console.log(`[mqtt] connected to ${describeBrokerUrl(process.env.MQTT_BROKER_URL ?? '')}`);

    mqttClient.subscribe([statusTopic, eventTopic], { qos: 1 }, (error) => {
      if (error) {
        console.error('[mqtt] subscription error', error);
      }
    });
  });

  mqttClient.on('reconnect', () => {
    connected = false;
    console.log('[mqtt] reconnecting');
  });

  mqttClient.on('close', () => {
    connected = false;
    console.log('[mqtt] disconnected');
  });

  mqttClient.on('error', (error) => {
    console.error('[mqtt] error', error);
  });

  mqttClient.on('message', async (topic, rawMessage) => {
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
  if (client) {
    return client;
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
  client = mqtt.connect(brokerUrl, createClientOptions());
  await attachHandlers(client);

  // Aguarda o evento 'connect' por um tempo configurável antes de prosseguir com o startup.
  // Isso evita que o processo continue sem que o broker esteja disponível e reduza logs de
  // erro repetidos no startup. O cliente MQTT continuará tentando reconectar automaticamente
  // conforme a opção `reconnectPeriod` do cliente.
  const timeoutMs = Number(process.env.MQTT_STARTUP_CONNECT_TIMEOUT_MS) || 20_000;

  try {
    await new Promise<void>((resolve, reject) => {
      let resolved = false;
      const onConnect = () => {
        resolved = true;
        client!.off('connect', onConnect);
        resolve();
      };

      client!.on('connect', onConnect);

      // Se ocorrer um erro fatal antes da conexão, rejeitamos imediatamente
      const onError = (err: Error) => {
        if (!resolved) {
          // não chama reject aqui para não derrubar o processo; apenas logamos
          console.error('[mqtt] erro durante tentativa inicial de conexão', err);
        }
      };

      client!.on('error', onError);

      const timer = setTimeout(() => {
        if (!resolved) {
          client!.off('connect', onConnect);
          client!.off('error', onError);
          console.warn(`[mqtt] não foi possível conectar ao broker em ${timeoutMs}ms; prosseguindo sem conexão inicial. O cliente continuará tentando reconectar.`);
          resolve();
        }
      }, timeoutMs);
    });
  } catch (err) {
    // Nunca falhamos o startup por causa do MQTT — apenas logamos o problema.
    console.error('[mqtt] falha ao aguardar conexão inicial do MQTT', err);
  }

  return client;
}

export async function stopMqttIntegration() {
  if (schedulerTick) {
    clearInterval(schedulerTick);
    schedulerTick = null;
  }

  if (client) {
    await new Promise<void>((resolve) => {
      client!.end(true, {}, () => resolve());
    });
    client = null;
    connected = false;
  }
}

export function isMqttConnected() {
  // Prefer the underlying client's connected flag when available
  try {
    return !!(client && (client.connected === true || connected === true));
  } catch {
    return !!connected;
  }
}

export function setSchedulerTicker(tick: NodeJS.Timeout | null) {
  schedulerTick = tick;
}
