import '../global.css';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';
import ScaledAppShell from '../components/ScaledAppShell';
import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePushToken } from '../hooks/usePushToken';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_TERMINAL_ENABLED = process.env.EXPO_PUBLIC_ENABLE_STRIPE === '1' || process.env.EXPO_PUBLIC_ENABLE_STRIPE === 'true';

// Stripe native modules — không tương thích web; Platform.OS check để Metro tree-shake.
let StripeProvider = null;
let StripeTerminalProvider = null;
if (Platform.OS !== 'web') {
  if (STRIPE_PK) {
    try {
      StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
    } catch {
      StripeProvider = null;
    }
  }

  console.log('[Layout] STRIPE_TERMINAL_ENABLED:', STRIPE_TERMINAL_ENABLED, '| STRIPE_PK:', STRIPE_PK ? STRIPE_PK.slice(0, 12) + '…' : 'MISSING');
  if (STRIPE_TERMINAL_ENABLED) {
    try {
      StripeTerminalProvider = require('@stripe/stripe-terminal-react-native').StripeTerminalProvider;
      console.log('[Layout] StripeTerminalProvider loaded:', typeof StripeTerminalProvider);
    } catch (e) {
      console.warn('[Layout] StripeTerminalProvider load FAILED:', e?.message);
      StripeTerminalProvider = null;
    }
  } else {
    console.warn('[Layout] StripeTerminalProvider SKIPPED — EXPO_PUBLIC_ENABLE_STRIPE không phải "1"');
  }
}

const fetchConnectionToken = async () => {
  const token = useAuthStore.getState().token;
  const isOfflineDemo = !token || String(token).startsWith('local-demo');
  console.log(
    '[Layout] fetchConnectionToken called — auth token:',
    token ? `${String(token).slice(0, 12)}… (offlineDemo=${isOfflineDemo})` : 'NONE',
  );
  if (isOfflineDemo) {
    const msg = 'Tài khoản offline (demo) — không thể lấy connection token. Hãy đăng xuất và đăng nhập bằng tài khoản thật.';
    console.warn('[Layout] fetchConnectionToken SKIPPED —', msg);
    throw new Error(msg);
  }
  try {
    const { data } = await api.post('/api/stripe/connection-token');
    console.log('[Layout] connection token OK, secret prefix:', data.secret?.slice(0, 8));
    return data.secret;
  } catch (e) {
    console.warn('[Layout] fetchConnectionToken FAILED:', e?.response?.status, e?.message);
    throw e;
  }
};

// Show notifications while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** EAS Update: bản release kiểm tra OTA khi mở app và khi quay lại foreground. */
function useEasOtaCheck() {
  useEffect(() => {
    if (__DEV__) return;
    if (!Updates.isEnabled) return;

    let cancelled = false;

    const pull = async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (cancelled || !isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch {
        /* bỏ qua — mạng lỗi hoặc chưa cấu hình channel */
      }
    };

    pull();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') pull();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
}

function useNotificationListeners() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Fired when a notification arrives while the app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification.request.content.title);
      }
    );

    // Fired when user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'new_booking') {
          // Navigation to appointments tab can be added here if needed
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

export default function RootLayout() {
  useEasOtaCheck();
  usePushToken();
  useNotificationListeners();

  const inner = (
    <SafeAreaProvider>
      <ScaledAppShell>
        <Stack screenOptions={{ headerShown: false }} />
      </ScaledAppShell>
    </SafeAreaProvider>
  );

  let wrapped = inner;

  if (StripeTerminalProvider) {
    wrapped = (
      <StripeTerminalProvider logLevel="verbose" tokenProvider={fetchConnectionToken}>
        {wrapped}
      </StripeTerminalProvider>
    );
  }

  if (StripeProvider && STRIPE_PK) {
    wrapped = (
      <StripeProvider publishableKey={STRIPE_PK} merchantIdentifier="merchant.com.nicenailsspa.app">
        {wrapped}
      </StripeProvider>
    );
  }

  return wrapped;
}
