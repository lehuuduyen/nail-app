import { useEffect } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {
  DiscoveryMethod,
  isStripeTerminalSupported,
  useStripeReaderConnection,
} from '../hooks/useStripeReaderConnection';
import { useAuthStore } from '../store/authStore';

/**
 * Modal kết nối Stripe Terminal reader.
 * Props:
 *   visible   — bool
 *   onClose   — callback đóng modal
 *   onConnect — callback(reader) khi kết nối thành công
 */
export default function StripeReaderModal({ visible, onClose, onConnect }) {
  const token = useAuthStore((s) => s.token);
  const isOfflineDemo = !token || String(token).startsWith('local-demo');

  if (!isStripeTerminalSupported()) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6">
            <Text className="font-bold text-lg mb-2">Stripe Terminal</Text>
            <Text className="text-neutral-500 text-sm mb-4">
              Cần rebuild app (EAS Build) để sử dụng Stripe Terminal native module.
            </Text>
            <Pressable onPress={onClose} className="bg-primary rounded-xl py-3 items-center">
              <Text className="text-white font-bold">Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  if (isOfflineDemo) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6">
            <Text className="font-bold text-lg mb-2">Stripe Terminal</Text>
            <Text className="text-neutral-500 text-sm mb-4">
              Tài khoản offline (demo) không có quyền gọi server, nên không lấy được
              connection token từ Stripe. Hãy đăng xuất và đăng nhập bằng tài khoản
              thật để dùng máy đọc thẻ.
            </Text>
            <Pressable onPress={onClose} className="bg-primary rounded-xl py-3 items-center">
              <Text className="text-white font-bold">Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return <StripeReaderModalInner visible={visible} onClose={onClose} onConnect={onConnect} />;
}

// Lấy từ Stripe Dashboard → Terminal → Locations
// Cần tạo Location trong test mode: https://dashboard.stripe.com/test/terminal/locations
const STRIPE_LOCATION_ID = process.env.EXPO_PUBLIC_STRIPE_LOCATION_ID || null;
// Bật để tự động dò reader giả lập (sandbox) khi mở modal — không cần máy thật,
// không tốn phí Stripe, không charge tiền thật. PHẢI tắt trước khi build live.
const STRIPE_SIMULATED_READER = process.env.EXPO_PUBLIC_STRIPE_SIMULATED_READER === '1';

function StripeReaderModalInner({ visible, onClose, onConnect }) {
  const {
    init,
    discover,
    connect,
    cancelDiscover,
    discovering,
    discoveredReaders,
    connectedReader,
    connectingSerial,
    lastError,
  } = useStripeReaderConnection({ onConnect });

  useEffect(() => {
    if (visible) init();
  }, [visible]);

  // Test mode: tự động dò reader giả lập ngay khi mở modal — khỏi cần bấm nút "🧪 Simulated".
  useEffect(() => {
    if (visible && STRIPE_SIMULATED_READER) {
      discover(DiscoveryMethod?.BluetoothScan ?? 'bluetoothScan', true);
    }
  }, [visible]);

  useEffect(() => {
    if (lastError) Alert.alert('Stripe Terminal', lastError);
  }, [lastError]);

  console.log('[StripeReaderModal] render — discovering:', discovering, '| readers:', discoveredReaders.length, discoveredReaders.map(r => r.serialNumber));

  const handleConnect = async (reader) => {
    const ok = await connect(reader, STRIPE_LOCATION_ID);
    if (ok) onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl p-5 flex-1" style={{ maxHeight: '80%' }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-lg">Kết nối máy đọc thẻ</Text>
            <Pressable onPress={onClose}>
              <Text className="text-primary font-bold">Đóng</Text>
            </Pressable>
          </View>

          {STRIPE_SIMULATED_READER ? (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <Text className="text-amber-700 font-bold text-sm">🧪 Đang ở chế độ TEST — reader giả lập</Text>
              <Text className="text-amber-600 text-xs mt-0.5">
                Không cần máy đọc thẻ thật, không tốn phí, không charge tiền thật.
                Tắt EXPO_PUBLIC_STRIPE_SIMULATED_READER trong .env trước khi build bản live.
              </Text>
            </View>
          ) : null}

          {connectedReader ? (
            <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <Text className="text-green-700 font-bold text-sm">✓ Đang kết nối</Text>
              <Text className="text-green-600 text-xs mt-0.5">
                {connectedReader.label || connectedReader.serialNumber}
              </Text>
            </View>
          ) : null}

          <View className="gap-2 mb-4">
            <Pressable
              onPress={() => discover(DiscoveryMethod?.Internet ?? 'internet')}
              disabled={discovering}
              className="bg-primary rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold">Tìm qua WiFi / LAN</Text>
              <Text className="text-white text-xs opacity-80">WisePOS E, S700</Text>
            </Pressable>

            <Pressable
              onPress={() => discover(DiscoveryMethod?.BluetoothScan ?? 'bluetoothScan', false, STRIPE_LOCATION_ID)}
              disabled={discovering || !STRIPE_LOCATION_ID}
              className="bg-[#2196F3] rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold">Tìm qua Bluetooth</Text>
              <Text className="text-white text-xs opacity-80">
                {STRIPE_LOCATION_ID ? 'Stripe M2' : 'Cần EXPO_PUBLIC_STRIPE_LOCATION_ID'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => discover(DiscoveryMethod?.Internet ?? 'internet', true)}
              disabled={discovering}
              className="bg-neutral-200 rounded-xl py-3 items-center"
            >
              <Text className="text-neutral-600 font-bold text-sm">🧪 Simulated WiFi (test)</Text>
            </Pressable>

            <Pressable
              onPress={() => discover(DiscoveryMethod?.BluetoothScan ?? 'bluetoothScan', true)}
              disabled={discovering}
              className="bg-neutral-100 rounded-xl py-3 items-center"
            >
              <Text className="text-neutral-500 font-bold text-sm">🧪 Simulated Bluetooth (test)</Text>
            </Pressable>
          </View>

          {discovering && (
            <View className="flex-row items-center gap-2 mb-3">
              <ActivityIndicator size="small" color="#c9a96e" />
              <Text className="text-sm text-neutral-500">Đang tìm reader...</Text>
              <Pressable onPress={cancelDiscover}>
                <Text className="text-primary text-sm font-bold">Dừng</Text>
              </Pressable>
            </View>
          )}

          <ScrollView className="flex-1">
            {discoveredReaders.map((reader) => (
              <Pressable
                key={reader.serialNumber}
                onPress={() => handleConnect(reader)}
                disabled={connectingSerial === reader.serialNumber}
                className="flex-row justify-between items-center bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-2"
              >
                <View>
                  <Text className="font-bold text-sm">
                    {reader.label || reader.deviceType || 'Reader'}
                  </Text>
                  <Text className="text-xs text-neutral-500">{reader.serialNumber}</Text>
                  {reader.ipAddress ? (
                    <Text className="text-xs text-neutral-400">{reader.ipAddress}</Text>
                  ) : null}
                </View>
                {connectingSerial === reader.serialNumber ? (
                  <ActivityIndicator size="small" color="#c9a96e" />
                ) : (
                  <Text className="text-primary font-bold text-sm">Kết nối</Text>
                )}
              </Pressable>
            ))}
            {!discovering && discoveredReaders.length === 0 && (
              <Text className="text-center text-neutral-400 text-sm py-4">
                Không tìm thấy reader — kiểm tra reader cùng mạng WiFi
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
