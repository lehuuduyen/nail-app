import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { formatMoney, splitTransactionAmountForDisplay } from '../../utils/money';

export default function ReceiptsScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/transactions', { params: { limit: 100 } });
      setRows(data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 py-3 border-b border-neutral-200 bg-white">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text className="text-lg font-bold flex-1">Receipts</Text>
      </View>
      {loading ? (
        <ActivityIndicator className="mt-8" color="#E53935" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const { total, tip, withoutTip } = splitTransactionAmountForDisplay(item);
            return (
              <View className="bg-white rounded-xl p-3 mb-2 border border-neutral-200">
                <View className="flex-row justify-between">
                  <Text className="font-mono font-bold">#{item.id}</Text>
                  <Text className="text-xs uppercase text-neutral-500">
                    {item.paymentMethod}
                  </Text>
                </View>
                <View className="mt-2 border-t border-neutral-100 pt-2 gap-1">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-neutral-600">Dịch vụ (không tip)</Text>
                    <Text className="text-sm font-medium text-neutral-900">
                      {formatMoney(withoutTip)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-neutral-600">Tip</Text>
                    <Text className="text-sm font-semibold text-gift">
                      {formatMoney(tip)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between border-t border-dashed border-neutral-200 pt-1 mt-1">
                    <Text className="text-base font-bold text-neutral-900">Tổng thu</Text>
                    <Text className="text-base font-bold text-primary">
                      {formatMoney(total)}
                    </Text>
                  </View>
                </View>
                {item.Employee ? (
                  <Text className="text-xs text-neutral-400 mt-2">
                    {item.Employee.firstName} {item.Employee.lastName}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
