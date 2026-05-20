import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export const sendPushNotification = async (pushToken: string, title: string, body: string) => {
    if (!Expo.isExpoPushToken(pushToken)) return;

    const messages = [{
        to: pushToken,
        sound: 'default' as const,
        title: title,
        body: body,
    }];

    try {
        await expo.sendPushNotificationsAsync(messages);
    } catch (error) {
        console.error("Erro ao enviar:", error);
    }
};