// CORREÇÃO: Usando importações modulares para melhor resolução de tipos no TypeScript.
import { initializeApp, getApps } from 'firebase-admin/app';
import { getMessaging, MulticastMessage, SendResponse } from 'firebase-admin/messaging';
import pool from '../db';

// --- CONFIGURAÇÃO DO FIREBASE ---
try {
  // CORREÇÃO: Usando getApps() em vez de admin.apps
  if (getApps().length === 0) {
    initializeApp();
    console.log('Firebase Admin SDK inicializado com sucesso.');
  }
} catch (error) {
  console.error('Falha ao inicializar o Firebase Admin SDK. Verifique suas credenciais (GOOGLE_APPLICATION_CREDENTIALS).', error);
}
// ---------------------------------

/**
 * Busca os push tokens (FCM tokens) de todos os usuários associados a um dispenser.
 * @param dispenserId O ID do dispenser
 * @returns Uma lista de FCM tokens válidos.
 */
export async function getPushTokensForDispenser(dispenserId: number): Promise<string[]> {
  try {
    const result = await pool.query(
      `SELECT u.push_token
       FROM users u
       JOIN dispensers d ON u.id = d.sponsor_id
       WHERE d.id = $1 AND u.push_token IS NOT NULL`,
      [dispenserId]
    );

    const tokens = result.rows.map(row => row.push_token).filter(Boolean);
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
 * Envia notificações push para uma lista de tokens usando Firebase Cloud Messaging (FCM).
 * @param tokens A lista de FCM registration tokens.
 * @param title O título da notificação.
 * @param body O corpo da mensagem.
 * @param data Dados adicionais para enviar com a notificação.
 */
export async function sendPushNotifications(tokens: string[], title: string, body: string, data: { [key: string]: string } = {}) {
  if (tokens.length === 0) {
    return;
  }

  // CORREÇÃO: Usando o tipo 'MulticastMessage' importado diretamente.
  const message: MulticastMessage = {
    tokens,
    notification: {
      title,
      body,
    },
    data,
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
    android: {
      priority: 'high',
    },
  };

  try {
    // CORREÇÃO: Usando getMessaging() em vez de admin.messaging()
    const response = await getMessaging().sendEachForMulticast(message);
    if (response.failureCount > 0) {
      // CORREÇÃO: Adicionando tipo explícito para 'resp'
      response.responses.forEach((resp: SendResponse, idx: number) => {
        if (!resp.success) {
          console.error(`Falha ao enviar para o token ${tokens[idx]}:`, resp.error);
        }
      });
    }
  } catch (error) {
    console.error('Erro ao enviar notificações via Firebase:', error);
  }
}

/**
 * Envia uma notificação push para um único token.
 * @param token O FCM registration token.
 * @param title O título da notificação.
 * @param body O corpo da mensagem.
 * @param data Dados adicionais para enviar com a notificação.
 */
export async function sendPushNotification(token: string, title: string, body: string, data: { [key: string]: string } = {}) {
  return sendPushNotifications([token], title, body, data);
}