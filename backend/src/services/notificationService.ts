import { Expo } from 'expo-server-sdk';
import pool from '../db';

// Inicializar cliente do Expo
const expo = new Expo();

/**
 * Busca os push tokens (Expo tokens) de todos os usuários associados a um dispenser
 * e filtra pelas preferências de notificação do tipo de evento correspondente.
 * @param dispenserId O ID do dispenser
 * @param type O tipo de notificação ('release' | 'intake' | 'delay' | 'device')
 * @returns Uma lista de Expo push tokens válidos.
 */
export async function getPushTokensForDispenser(
  dispenserId: number,
  type: 'release' | 'intake' | 'delay' | 'device'
): Promise<string[]> {
  try {
    const result = await pool.query(
      `WITH dispenser_users AS (
         SELECT sponsor_id AS user_id FROM dispensers WHERE id = $1 AND sponsor_id IS NOT NULL
         UNION
         SELECT user_id FROM device_access WHERE dispenser_id = $1
       )
       SELECT u.push_token, p.preferences
       FROM dispenser_users du
       JOIN users u ON du.user_id = u.id
       LEFT JOIN user_dispenser_notification_prefs p 
         ON p.user_id = u.id AND p.dispenser_id = $1
       WHERE u.push_token IS NOT NULL AND u.push_token != ''`,
      [dispenserId]
    );

    const tokens = result.rows
      .filter(row => {
        const prefs = row.preferences || {};
        if (prefs[type] !== undefined) {
          return !!prefs[type];
        }
        // Valores padrão caso não exista preferência salva no banco para este tipo
        if (type === 'device') {
          return false; // status do dispenser é desativado por padrão
        }
        return true; // release, intake e delay são ativados por padrão
      })
      .map(row => row.push_token)
      .filter(Boolean);

    return tokens;
  } catch (error) {
    console.error(`Erro ao buscar push tokens para o dispenser ${dispenserId}:`, error);
    return [];
  }
}

/**
 * Busca o nome de um medicamento pelo seu ID.
 * @param medicationId O ID do medicamento.
 * @returns O nome do medicamento ou null se não for encontrado.
 */
export async function getMedicationNameById(medicationId: number): Promise<string | null> {
  try {
    const result = await pool.query('SELECT name FROM medications WHERE id = $1', [medicationId]);
    return result.rows[0]?.name || null;
  } catch (error) {
    console.error(`Erro ao buscar nome do medicamento ${medicationId}:`, error);
    return null;
  }
}

/**
 * Envia notificações push para uma lista de tokens usando Expo Server SDK.
 * @param tokens A lista de Expo push tokens.
 * @param title O título da notificação.
 * @param body O corpo da mensagem.
 * @param data Dados adicionais para enviar com a notificação.
 */
export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data: { [key: string]: string } = {}
) {
  if (tokens.length === 0) {
    return;
  }

  const messages = [];
  for (const token of tokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`Token "${token}" não é um Expo push token válido.`);
      continue;
    }

    messages.push({
      to: token,
      sound: 'default' as const,
      title,
      body,
      data,
    });
  }

  if (messages.length === 0) {
    return;
  }

  const chunks = expo.chunkPushNotifications(messages);
  
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('[push] Lote de notificações enviado via Expo:', ticketChunk);
    } catch (error) {
      console.error('[push] Erro ao enviar lote de notificações via Expo:', error);
    }
  }
}

/**
 * Envia uma notificação push para um único token.
 * @param token O Expo push token.
 * @param title O título da notificação.
 * @param body O corpo da mensagem.
 * @param data Dados adicionais para enviar com a notificação.
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data: { [key: string]: string } = {}
) {
  return sendPushNotifications([token], title, body, data);
}