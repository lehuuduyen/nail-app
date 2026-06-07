import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrinterStore } from '../store/printerStore';

let TcpSocket = null;
try {
  TcpSocket = require('react-native-tcp-socket').default;
} catch (e) {
  console.warn('[Printer] react-native-tcp-socket require FAILED →', e?.message);
}

/** true nếu native module TCP socket đã được link (EAS Build). */
export const isPrinterSupported = () => Boolean(TcpSocket);

const CONNECT_TIMEOUT_MS = 6_000;

/**
 * Hook quản lý kết nối máy in nhiệt ESC/POS qua WiFi/LAN (TCP RAW — port 9100).
 *
 * @returns {{
 *   ip: string,
 *   port: number,
 *   connected: boolean,
 *   connecting: boolean,
 *   lastError: string | null,
 *   saveConfig: (ip: string, port: number) => void,
 *   testConnect: (ip?: string, port?: number) => Promise<boolean>,
 *   disconnect: () => void,
 *   send: (buffer: Buffer) => Promise<boolean>,
 * }}
 */
export function usePrinterConnection() {
  const { ip, port, connected, setPrinterConfig, setConnected } = usePrinterStore();
  const [connecting, setConnecting] = useState(false);
  const [lastError, setLastError] = useState(null);
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

  /** Mở kết nối TCP, gửi `payload` (nếu có), rồi đóng. Dùng chung cho test-print và in hoá đơn. */
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
              // đợi buffer flush ra mạng trước khi đóng socket
              setTimeout(() => finish(true), 250);
            } else {
              finish(true);
            }
          },
        );
        socketRef.current = socket;
        socket.on('error', (e) => finish(false, e?.message ?? 'Lỗi kết nối máy in'));
        socket.on('close', () => {
          if (!settled) finish(true);
        });
      } catch (e) {
        finish(false, e?.message ?? 'Không kết nối được máy in');
      }
    });
  }, [closeSocket, setConnected]);

  const testConnect = useCallback(
    (overrideIp, overridePort) => openAndSend(overrideIp ?? ip, overridePort ?? port, null),
    [openAndSend, ip, port],
  );

  const send = useCallback(
    (buffer) => openAndSend(ip, port, buffer),
    [openAndSend, ip, port],
  );

  const disconnect = useCallback(() => {
    closeSocket();
    setConnected(false);
    setLastError(null);
  }, [closeSocket, setConnected]);

  return { ip, port, connected, connecting, lastError, saveConfig, testConnect, disconnect, send };
}
