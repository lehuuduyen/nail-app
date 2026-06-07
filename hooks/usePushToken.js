import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export function usePushToken() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token || token === 'local-demo') return;

    async function register() {
      try {
        // Android requires a notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Booking Alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#c9a96e',
          });
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

        await api.put('/api/auth/push-token', { pushToken });
      } catch (e) {
        console.warn('Push token registration failed:', e.message);
      }
    }

    register();
  }, [token]);
}
