import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configura como as notificações se comportam com o app aberto
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Listener para quando a notificação é recebida
export function setupNotificationListeners() {
    // Quando a notificação é recebida enquanto o app está aberto
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('📱 Notificação recebida:', notification);
    });

    // Quando o usuário toca na notificação
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notificação tocada:', response);
        // Aqui você pode adicionar lógica para navegar para a tela correta
    });

    return () => {
        notificationListener.remove();
        responseListener.remove();
    };
}

export async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Falha ao obter permissão para push notifications!');
        throw new Error('Permissão para notificações não concedida.');
    }

    // Push token do Expo só funciona corretamente em aparelho físico.
    if (!Device.isDevice) {
        console.log('É necessário usar um dispositivo físico para Push Notifications');
        return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
        console.log('Project ID do EAS não encontrado para Push Notifications');
        return;
    }

    try {
        return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (error) {
        console.warn('Push notifications ainda não estão configuradas para este build:', error);
        return;
    }
}
