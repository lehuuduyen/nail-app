import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { formatEmployeeNameFromDb } from '../../utils/staffDisplay';
import { getApiErrorMessage } from '../../utils/apiError';
import { getSalonDateYmd } from '../../utils/salonTz';

function maskPhone(phone) {
  if (!phone || phone.length < 4) return '—';
  const tail = phone.slice(-4);
  return `(xxx) xxx-${tail}`;
}

function sortQueue(rows) {
  const priority = { in_progress: 0, scheduled: 1 };
  return [...(rows || [])]
    .filter((a) => a.status !== 'cancelled')
    .sort((a, b) => {
      const doneA = a.status === 'completed' ? 2 : priority[a.status] ?? 1;
      const doneB = b.status === 'completed' ? 2 : priority[b.status] ?? 1;
      if (doneA !== doneB) return doneA - doneB;
      return new Date(a.scheduledAt) - new Date(b.scheduledAt);
    });
}

export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const isOffline = !token || String(token).startsWith('local-demo');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    const day = getSalonDateYmd();
    try {
      const { data } = await api.get('/api/appointments/day', {
        params: { date: day },
      });
      setRows(data || []);
    } catch (e) {
      setErr(getApiErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const queue = useMemo(() => sortQueue(rows), [rows]);

  const queueWithTurn = useMemo(() => {
    let n = 0;
    return queue.map((c) => {
      const isDone = c.status === 'completed';
      if (!isDone) n += 1;
      return { c, turnLabel: isDone ? '✓' : String(n) };
    });
  }, [queue]);

  const updateStatus = useCallback(
    async (id, body) => {
      if (isOffline) {
        Alert.alert('Offline', 'Đăng nhập API để cập nhật trạng thái.');
        return;
      }
      try {
        const { data } = await api.put(`/api/appointments/${id}`, body);
        setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
      } catch (e) {
        Alert.alert('Lỗi', getApiErrorMessage(e));
      }
    },
    [isOffline]
  );

  const confirmArrived = useCallback(
    (a) => {
      Alert.alert('Đã đến?', `${a.customerName}`, [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => updateStatus(a.id, { status: 'in_progress' }),
        },
      ]);
    },
    [updateStatus]
  );

  const confirmDone = useCallback(
    (a) => {
      Alert.alert('Hoàn thành?', `${a.customerName}`, [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () =>
            updateStatus(a.id, {
              status: 'completed',
              completedAt: new Date().toISOString(),
            }),
        },
      ]);
    },
    [updateStatus]
  );

  return (
    <View
      className="flex-1 bg-black/20 justify-center items-center px-4"
      style={{ paddingTop: insets.top }}
    >
      <View className="bg-white rounded-xl w-full max-w-4xl max-h-[90%] overflow-hidden border border-neutral-200">
        <View className="border-b border-neutral-200 py-3 px-4">
          <Text className="text-xl font-bold text-center">Check turns</Text>
          <Text className="text-center text-xs text-neutral-500 mt-1">
            {getSalonDateYmd()} · Hàng chờ theo lịch hẹn (database)
            {isOffline ? ' · chỉ xem (offline)' : ''}
          </Text>
        </View>
        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#E53935" />
          </View>
        ) : (
          <ScrollView
            className="px-2"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {err ? (
              <Text className="text-xs text-amber-800 bg-amber-50 p-2 m-2 rounded-lg">
                {err}
              </Text>
            ) : null}
            {queueWithTurn.length === 0 ? (
              <Text className="text-center text-neutral-500 py-8">
                Không có lịch hôm nay.
              </Text>
            ) : (
              queueWithTurn.map(({ c, turnLabel }) => {
                const tech = c.Employee
                  ? formatEmployeeNameFromDb(c.Employee)
                  : '—';
                const sched = format(new Date(c.scheduledAt), 'h:mm a');
                const isDone = c.status === 'completed';
                const isServing = c.status === 'in_progress';

                return (
                  <View
                    key={c.id}
                    className="flex-row items-center border-b border-neutral-200 py-3 px-2 flex-wrap"
                  >
                    <Text className="w-8 text-neutral-500 text-sm font-bold">
                      {turnLabel}
                    </Text>
                    <View className="w-8 h-8 rounded-full bg-neutral-300 items-center justify-center mr-2">
                      <Text className="font-bold text-neutral-600">
                        {(c.customerName || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1 min-w-[100px]">
                      <Text className="font-bold text-sm uppercase" numberOfLines={1}>
                        {c.customerName}
                      </Text>
                      <Text className="text-xs text-neutral-500">
                        {maskPhone(c.customerPhone)}
                      </Text>
                    </View>
                    <View className="w-[88px]">
                      <Text className="text-[10px] text-neutral-400">Giờ hẹn</Text>
                      <Text className="text-xs font-semibold">{sched}</Text>
                    </View>
                    <View className="w-[72px] items-center">
                      <Ionicons name="calendar-outline" size={20} color="#666" />
                      <View
                        className={`mt-1 px-2 py-0.5 rounded-full ${
                          isServing ? 'bg-gift' : isDone ? 'bg-emerald-600' : 'bg-neutral-200'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            isServing || isDone ? 'text-white' : 'text-neutral-600'
                          }`}
                        >
                          {isDone ? 'XONG' : isServing ? 'ĐANG LÀM' : 'CHỜ'}
                        </Text>
                      </View>
                    </View>
                    <View className="w-[56px] items-center">
                      <Text className="text-[10px] text-neutral-400">Tech</Text>
                      <Text className="text-[9px] font-semibold text-center" numberOfLines={2}>
                        {tech}
                      </Text>
                    </View>
                    <View className="w-[80px]">
                      <Text className="text-[10px] text-neutral-400">Dịch vụ</Text>
                      <Text className="text-[10px] font-semibold" numberOfLines={2}>
                        {c.Service?.name || '—'}
                      </Text>
                    </View>
                    {!isDone ? (
                      <View className="w-full flex-row justify-end gap-2 mt-2">
                        {!isServing ? (
                          <Pressable
                            onPress={() => confirmArrived(c)}
                            disabled={isOffline}
                            className={`rounded-lg px-3 py-2 ${isOffline ? 'bg-neutral-200' : 'bg-primary'}`}
                          >
                            <Text
                              className={`text-xs font-bold ${isOffline ? 'text-neutral-500' : 'text-white'}`}
                            >
                              Đã đến
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            onPress={() => confirmDone(c)}
                            disabled={isOffline}
                            className={`rounded-lg px-3 py-2 ${isOffline ? 'bg-neutral-200' : 'bg-emerald-700'}`}
                          >
                            <Text
                              className={`text-xs font-bold ${isOffline ? 'text-neutral-500' : 'text-white'}`}
                            >
                              Hoàn thành
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
        <View className="p-4 border-t border-neutral-200">
          <Pressable
            onPress={() => router.back()}
            className="bg-gift self-start rounded-xl px-8 py-3"
          >
            <Text className="text-white font-bold">CLOSE</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
