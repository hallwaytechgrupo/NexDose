import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export const sendPushNotification = async (pushToken: string, title: string, body: string) => {
    console.log(`📤 Tentando enviar notificação para token: ${pushToken.substring(0, 30)}...`);
    
    if (!Expo.isExpoPushToken(pushToken)) {
        console.warn(`⚠️ Token inválido: ${pushToken}`);
        return;
    }

    const messages = [{
        to: pushToken,
        sound: 'default' as const,
        title: title,
        body: body,
    }];

    try {
        const result = await expo.sendPushNotificationsAsync(messages);
        console.log(`✅ Notificação enviada com sucesso:`, result);
    } catch (error) {
        console.error("❌ Erro ao enviar notificação:", error);
    }
};