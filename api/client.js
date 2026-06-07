import axios from 'axios';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://127.0.0.1:5001';

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && !String(token).startsWith('local-demo')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token thật (không phải local-demo) bị backend từ chối (hết hạn / không hợp lệ)
// → đăng xuất ngay và đưa về màn login, tránh lỗi 401 âm thầm rải rác khắp app.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const token = useAuthStore.getState().token;
    const isOfflineDemo = !token || String(token).startsWith('local-demo');
    if (status === 401 && !isOfflineDemo) {
      console.warn('[api] 401 — token hết hạn/không hợp lệ, đăng xuất');
      useAuthStore.getState().logout();
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  },
);

export default api;
