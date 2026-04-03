import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { username, password });
      setAuth(data.token, data.user);
      router.replace('/(pos)');
    } catch {
      setErr('Invalid credentials — try admin / admin123 or use offline');
    } finally {
      setLoading(false);
    }
  };

  const offline = () => {
    setAuth('local-demo', { username: 'demo', role: 'manager' });
    router.replace('/(pos)');
  };

  return (
    <View className="flex-1 bg-surface justify-center px-8">
      <Image
        source={require('../../assets/nailposvn-logo.png')}
        style={{ width: 132, height: 132, alignSelf: 'center', marginBottom: 20 }}
        resizeMode="contain"
        accessibilityLabel="NailPosVN"
      />
      <Text className="text-center text-neutral-500 mb-8">Staff login</Text>
      <TextInput
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
        className="bg-white border border-neutral-200 rounded-xl px-4 py-3 mb-3"
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="bg-white border border-neutral-200 rounded-xl px-4 py-3 mb-2"
      />
      {err ? (
        <Text className="text-primary text-sm mb-2 text-center">{err}</Text>
      ) : null}
      <Pressable
        onPress={submit}
        disabled={loading}
        className="bg-primary rounded-xl py-4 items-center mb-3"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">LOGIN</Text>
        )}
      </Pressable>
      <Pressable onPress={offline} className="py-3">
        <Text className="text-center text-blue-600 underline">
          Continue offline (sample data)
        </Text>
      </Pressable>
    </View>
  );
}
