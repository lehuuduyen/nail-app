import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      clearTimeout(t);
      setReady(true);
    });
    return () => {
      clearTimeout(t);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(pos)" />;
  }
  return <Redirect href="/(auth)/login" />;
}
