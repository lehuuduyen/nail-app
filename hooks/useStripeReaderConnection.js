import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

let requestForegroundPermissionsAsync = null;
try {
  requestForegroundPermissionsAsync = require('expo-location').requestForegroundPermissionsAsync;
} catch {}

let useStripeTerminalSdk = null;
let DiscoveryMethod = null;
try {
  const pkg = require('@stripe/stripe-terminal-react-native');
  useStripeTerminalSdk = pkg.useStripeTerminal;
  DiscoveryMethod = pkg.DiscoveryMethod;
  console.log('[StripeTerminal] SDK loaded OK — useStripeTerminal:', typeof useStripeTerminalSdk, '| DiscoveryMethod:', DiscoveryMethod);
} catch (e) {
  console.warn('[StripeTerminal] require FAILED →', e?.message, '\nStack:', e?.stack);
}

export { DiscoveryMethod };

/** true nếu Stripe Terminal native module đã được link (EAS Build). */
export const isStripeTerminalSupported = () => Boolean(useStripeTerminalSdk);

const DISCOVERY_TIMEOUT_MS = 15_000;

/**
 * Hook quản lý vòng đời kết nối Stripe Terminal reader:
 *   initialize → discoverReaders → connectBluetoothReader / connectInternetReader.
 *
 * QUAN TRỌNG: Chỉ gọi hook này bên trong component được render khi
 * isStripeTerminalSupported() === true — tránh vi phạm Rules of Hooks.
 *
 * @param {{ onConnect?: (reader: object) => void }} options
 * @returns {{
 *   init: () => Promise<void>,
 *   discover: (method?: string, simulated?: boolean) => Promise<{ error: string | null }>,
 *   connect: (reader: object) => Promise<boolean>,
 *   cancelDiscover: () => void,
 *   discovering: boolean,
 *   discoveredReaders: object[],
 *   connectedReader: object | null,
 *   connectingSerial: string | null,
 *   lastError: string | null,
 * }}
 */
export function useStripeReaderConnection({ onConnect } = {}) {
  const [discovering, setDiscovering] = useState(false);
  const [connectingSerial, setConnectingSerial] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  // Lưu readers thủ công — SDK beta.31 clear discoveredReaders khi discovery kết thúc
  const [readers, setReaders] = useState([]);

  const {
    initialize,
    discoverReaders,
    connectReader,
    cancelDiscovering,
    connectedReader,
  } = useStripeTerminalSdk({
    onUpdateDiscoveredReaders: (updated) => {
      console.log('[StripeTerminal] onUpdateDiscoveredReaders param type:', typeof updated, '| isArray:', Array.isArray(updated), '| value:', JSON.stringify(updated));
      setReaders(Array.isArray(updated) ? updated : (updated?.readers ?? []));
    },
    onFinishDiscoveringReaders: () => setDiscovering(false),
  });

  /** Khởi tạo Stripe Terminal SDK (gọi một lần khi component mount). */
  const init = useCallback(async () => {
    console.log('[StripeTerminal] init() called, already initialized:', initialized);
    if (initialized) return;
    try {
      const result = await initialize();
      console.log('[StripeTerminal] initialize() result:', JSON.stringify(result));
      if (result?.error) {
        console.warn('[StripeTerminal] initialize() returned error:', result.error.message);
        setLastError(result.error.message);
        return;
      }
      setInitialized(true);
    } catch (e) {
      console.warn('[StripeTerminal] initialize() threw:', e?.message);
      setLastError(e?.message ?? 'Không khởi tạo được Stripe Terminal SDK');
    }
  }, [initialize, initialized]);

  /**
   * Quét tìm reader qua mạng hoặc Bluetooth.
   *
   * @param {string} method - DiscoveryMethod.Internet | DiscoveryMethod.BluetoothScan
   * @param {boolean} simulated - true để dùng reader giả (sandbox)
   * @param {string|null} locationId - Stripe Terminal Location ID (bắt buộc cho bluetoothScan)
   */
  const discover = useCallback(
    async (method = DiscoveryMethod?.Internet ?? 'internet', simulated = false, locationId = null) => {
      console.log('[StripeTerminal] discover() method:', method, '| simulated:', simulated, '| locationId:', locationId, '| initialized:', initialized);
      if (!initialized) {
        console.warn('[StripeTerminal] discover() gọi trước initialize() — chờ init trước');
        setLastError('SDK chưa sẵn sàng — thử lại sau 1 giây');
        return { error: 'not_initialized' };
      }

      // Stripe Terminal iOS SDK 5.x khởi tạo CBCentralManager kể cả simulated → cần Location permission
      if (Platform.OS === 'ios' && method === 'bluetoothScan') {
        if (requestForegroundPermissionsAsync) {
          console.log('[StripeTerminal] requesting location permission for Bluetooth scan...');
          const { status } = await requestForegroundPermissionsAsync();
          console.log('[StripeTerminal] location permission status:', status);
          if (status !== 'granted') {
            setLastError('Cần cấp quyền Location để tìm máy đọc thẻ Bluetooth. Vào Settings → NailPosVN → Location → Allow.');
            return { error: 'location_denied' };
          }
        }
      }

      setReaders([]);
      setLastError(null);
      setDiscovering(true);
      try {
        console.log('[StripeTerminal] calling discoverReaders...');
        const discoverParams = { discoveryMethod: method, simulated };
        // timeout only for internet — bluetoothScan không hỗ trợ
        if (method !== 'bluetoothScan') discoverParams.timeout = DISCOVERY_TIMEOUT_MS;
        // Stripe Terminal iOS SDK 5.x: locationId BẮT BUỘC cho bluetoothScan, thiếu sẽ gọi abort()
        if (method === 'bluetoothScan') {
          discoverParams.locationId = simulated ? 'tml_simulated' : locationId;
          console.log('[StripeTerminal] bluetoothScan locationId:', discoverParams.locationId);
        }
        const { error } = await discoverReaders(discoverParams);
        console.log('[StripeTerminal] discoverReaders returned, error:', error?.message ?? 'none');
        if (error) {
          setLastError(error.message);
          return { error: error.message };
        }
        return { error: null };
      } catch (e) {
        console.warn('[StripeTerminal] discoverReaders threw:', e?.message);
        const msg = e?.message ?? 'Không tìm được reader';
        setLastError(msg);
        return { error: msg };
      } finally {
        setDiscovering(false);
      }
    },
    [discoverReaders, initialized],
  );

  /**
   * Kết nối vào reader đã tìm thấy.
   * Tự phát hiện loại kết nối dựa trên deviceType (Bluetooth vs Internet).
   *
   * @param {object} reader - phần tử từ discoveredReaders
   * @returns {boolean} true nếu kết nối thành công
   */
  const connect = useCallback(
    async (reader, locationId = null) => {
      setLastError(null);
      setConnectingSerial(reader.serialNumber);
      try {
        const isBluetooth =
          reader.deviceType?.includes('bluetooth') ||
          reader.deviceType?.includes('chipper') ||
          reader.deviceType?.includes('m2') ||
          reader.deviceType?.includes('stripeM2');

        const connectParams = {
          discoveryMethod: isBluetooth ? 'bluetoothScan' : 'internet',
          reader,
        };
        // Stripe Terminal iOS SDK 5.x: locationId bắt buộc cho Bluetooth readers
        if (isBluetooth) {
          connectParams.locationId = reader.locationId || locationId;
        }
        console.log('[StripeTerminal] connectReader params:', JSON.stringify({ ...connectParams, reader: reader.serialNumber }));
        const result = await connectReader(connectParams);

        if (result?.error) {
          setLastError(result.error.message);
          return false;
        }
        onConnect?.(reader);
        return true;
      } catch (e) {
        setLastError(e?.message ?? 'Kết nối thất bại');
        return false;
      } finally {
        setConnectingSerial(null);
      }
    },
    [connectReader, onConnect],
  );

  return {
    init,
    discover,
    connect,
    cancelDiscover: cancelDiscovering,
    discovering,
    discoveredReaders: readers,
    connectedReader,
    connectingSerial,
    lastError,
  };
}
