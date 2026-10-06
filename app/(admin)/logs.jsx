import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useErrorLogStore } from '../../store/errorLogStore';

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const logs = useErrorLogStore((s) => s.logs);
  const clearLogs = useErrorLogStore((s) => s.clearLogs);

  const confirmClear = () => {
    Alert.alert('Clear logs', 'Xoá toàn bộ log lỗi login?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: clearLogs },
    ]);
  };

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 py-3 bg-white border-b border-neutral-200">
        <Pressable onPress={() => router.back()} className="mr-2">
          <Ionicons name="arrow-back" size={24} />
        </Pressable>
        <Text className="text-xl font-bold flex-1">Login Error Logs</Text>
        {logs.length > 0 ? (
          <Pressable onPress={confirmClear} className="px-2 py-1">
            <Text className="text-primary font-semibold">Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView className="p-3">
        {logs.length === 0 ? (
          <Text className="text-neutral-400 text-sm text-center mt-8">No errors logged</Text>
        ) : (
          logs.map((l, i) => (
            <View
              key={i}
              className="bg-white rounded-xl p-4 border border-neutral-200 mb-2"
            >
              <Text className="text-xs text-neutral-400 mb-1">
                {new Date(l.timestamp).toLocaleString()}
              </Text>
              <Text className="font-semibold mb-1">
                {l.status ? `HTTP ${l.status}` : 'Network error'}
                {l.username ? ` · user: ${l.username}` : ''}
              </Text>
              <Text className="text-sm text-neutral-600">{l.message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
