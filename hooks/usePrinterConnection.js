import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrinterStore } from '../store/printerStore';
import { printReceiptViaBt } from '../utils/escposBt';

let TcpSocket = null;
try {
  TcpSocket = require('react-native-tcp-socket').default;
} catch (e) {
  console.warn('[Printer] react-native-tcp-socket not available →', e?.message);
}

let BluetoothManager = null;
let BluetoothEscposPrinter = null;
try {
  const btLib = require('react-native-bluetooth-escpos-printer');
  BluetoothManager = btLib.BluetoothManager;
  BluetoothEscposPrinter = btLib.BluetoothEscposPrinter;
} catch (e) {
  console.warn('[Printer] react-native-bluetooth-escpos-printer not available →', e?.message);
}

export const isPrinterSupported = () => Boolean(TcpSocket) || Boolean(BluetoothManager);
export const isWifiPrinterSupported = () => Boolean(TcpSocket);
export const isBluetoothPrinterSupported = () => Boolean(BluetoothManager);

const CONNECT_TIMEOUT_MS = 6_000;

/**
 * Hook quản lý kết nối máy in nhiệt ESC/POS qua WiFi/LAN (TCP RAW port 9100)
 * và qua Bluetooth Classic (SPP) cho máy in Epson TM series.
 */
export function usePrinterConnection() {
  const {
    ip, port, connected,
    connectionType, btDeviceName, btDeviceAddress,
    setPrinterConfig, setConnectionType, setBtDevice, setConnected,
  } = usePrinterStore();

  const [connecting, setConnecting] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [btDevices, setBtDevices] = useState([]);
  const [btScanning, setBtScanning] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => () => {
    socketRef.current?.destroy?.();
    socketRef.current = null;
  }, []);

  const saveConfig = useCallback((newIp, newPort) => {
    setPrinterConfig(newIp?.trim(), Number(newPort) || 9100);
    setConnected(false);
  }, [setPrinterConfig, setConnected]);

  const closeSocket = useCallback(() => {
    socketRef.current?.destroy?.();
    socketRef.current = null;
  }, []);

  // ─── WiFi: mở TCP, gửi payload (nếu có) rồi đóng ────────────────────────
  const openAndSend = useCallback((targetIp, targetPort, payload) => {
    return new Promise((resolve) => {
      if (!TcpSocket) {
        setLastError('Cần rebuild app (EAS Build) để dùng máy in qua mạng.');
        resolve(false);
        return;
      }
      if (!targetIp) {
        setLastError('Chưa nhập địa chỉ IP máy in.');
        resolve(false);
        return;
      }

      closeSocket();
      setLastError(null);
      setConnecting(true);

      let settled = false;
      const finish = (ok, err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setConnecting(false);
        setConnected(ok);
        if (err) setLastError(err);
        closeSocket();
        resolve(ok);
      };

      const timer = setTimeout(() => {
        finish(false, 'Hết thời gian kết nối — kiểm tra IP và mạng WiFi của máy in.');
      }, CONNECT_TIMEOUT_MS);

      try {
        const socket = TcpSocket.createConnection(
          { host: targetIp, port: targetPort || 9100, tls: false },
          () => {
            if (payload) {
              socket.write(payload);
              setTimeout(() => finish(true), 250);
            } else {
              finish(true);
            }
          },
        );
        socketRef.current = socket;
        socket.on('error', (e) => finish(false, e?.message ?? 'Lỗi kết nối máy in'));
        socket.on('close', () => { if (!settled) finish(true); });
      } catch (e) {
        finish(false, e?.message ?? 'Không kết nối được máy in');
      }
    });
  }, [closeSocket, setConnected]);

  // ─── Bluetooth: quét thiết bị đã ghép ────────────────────────────────────
  const scanBtDevices = useCallback(async () => {
    if (!BluetoothManager) {
      setLastError('Cần EAS Build để dùng Bluetooth.');
      return;
    }
    setBtScanning(true);
    setBtDevices([]);
    setLastError(null);
    try {
      const enabled = await BluetoothManager.isBluetoothEnabled();
      if (!enabled) {
        await BluetoothManager.enableBluetooth();
      }
      const result = await BluetoothManager.scanDevices();
      const parsed = JSON.parse(result);
      const paired = (parsed.paired || []).map((d) =>
        typeof d === 'string' ? JSON.parse(d) : d,
      );
      const found = (parsed.found || []).map((d) =>
        typeof d === 'string' ? JSON.parse(d) : d,
      );
      const all = [...paired, ...found.filter((f) => !paired.find((p) => p.address === f.address))];
      setBtDevices(all);
    } catch (e) {
      setLastError(e?.message ?? 'Không quét được thiết bị Bluetooth.');
    } finally {
      setBtScanning(false);
    }
  }, []);

  // ─── Bluetooth: kết nối đến thiết bị đã chọn ─────────────────────────────
  const connectBt = useCallback(async (deviceName, deviceAddress) => {
    if (!BluetoothManager) {
      setLastError('Cần EAS Build để dùng Bluetooth.');
      return false;
    }
    setConnecting(true);
    setLastError(null);
    try {
      await BluetoothManager.connect(deviceAddress);
      setBtDevice(deviceName, deviceAddress);
      setConnected(true);
      setConnecting(false);
      return true;
    } catch (e) {
      setLastError(e?.message ?? 'Không kết nối được máy in Bluetooth.');
      setConnected(false);
      setConnecting(false);
      return false;
    }
  }, [setBtDevice, setConnected]);

  // ─── In qua Bluetooth dùng high-level ESC/POS API ────────────────────────
  const printReceiptBt = useCallback(async (receiptData) => {
    if (!BluetoothEscposPrinter) {
      setLastError('Cần EAS Build để in qua Bluetooth.');
      return false;
    }
    setLastError(null);
    try {
      await printReceiptViaBt(receiptData, BluetoothEscposPrinter);
      return true;
    } catch (e) {
      setLastError(e?.message ?? 'Lỗi in qua Bluetooth.');
      return false;
    }
  }, []);

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Gửi ESC/POS buffer thô (WiFi only). */
  const send = useCallback(
    (buffer) => openAndSend(ip, port, buffer),
    [openAndSend, ip, port],
  );

  /**
   * In hoá đơn — tự động chọn WiFi hay Bluetooth theo connectionType.
   * WiFi: gửi buffer thô buildReceiptEscPos(data).
   * BT:   dùng high-level BluetoothEscposPrinter API.
   */
  const printReceipt = useCallback(
    (receiptData) => {
      if (connectionType === 'bluetooth') return printReceiptBt(receiptData);
      const { buildReceiptEscPos } = require('../utils/escpos');
      return openAndSend(ip, port, buildReceiptEscPos(receiptData));
    },
    [connectionType, printReceiptBt, openAndSend, ip, port],
  );

  const testConnect = useCallback(
    (overrideIp, overridePort) => {
      if (connectionType === 'bluetooth') return connectBt(btDeviceName, btDeviceAddress);
      return openAndSend(overrideIp ?? ip, overridePort ?? port, null);
    },
    [connectionType, connectBt, btDeviceName, btDeviceAddress, openAndSend, ip, port],
  );

  const disconnect = useCallback(() => {
    closeSocket();
    setConnected(false);
    setLastError(null);
  }, [closeSocket, setConnected]);

  /** true nếu đã cấu hình (WiFi: có IP; BT: có địa chỉ thiết bị). */
  const isConfigured = connectionType === 'bluetooth'
    ? Boolean(btDeviceAddress)
    : Boolean(ip);

  return {
    // WiFi
    ip, port,
    saveConfig,
    // Bluetooth
    connectionType, btDeviceName, btDeviceAddress,
    btDevices, btScanning,
    setConnectionType, scanBtDevices, connectBt,
    // Chung
    connected, connecting, lastError,
    isConfigured,
    testConnect, disconnect,
    send,
    printReceipt,
  };
}
