import '../global.css';
import * as Updates from 'expo-updates';
import ScaledAppShell from '../components/ScaledAppShell';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

export default function RootLayout() {
  useEasOtaCheck();

  return (
    <SafeAreaProvider>
      <ScaledAppShell>
        <Stack screenOptions={{ headerShown: false }} />
      </ScaledAppShell>
    </SafeAreaProvider>
  );
}
