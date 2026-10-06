import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cấu hình máy in nhiệt ESC/POS.
 * connectionType: 'wifi' (TCP RAW port 9100) | 'bluetooth' (BT Classic SPP)
 */
export const usePrinterStore = create(
  persist(
    (set) => ({
      ip: '',
      port: 9100,
      connected: false,
      connectionType: 'wifi',
      btDeviceName: '',
      btDeviceAddress: '',
      setPrinterConfig: (ip, port) => set({ ip, port: port || 9100 }),
      setConnectionType: (type) => set({ connectionType: type, connected: false }),
      setBtDevice: (name, address) => set({ btDeviceName: name, btDeviceAddress: address }),
      setConnected: (connected) => set({ connected }),
    }),
    {
      name: 'nail-app-printer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        ip: s.ip,
        port: s.port,
        connectionType: s.connectionType,
        btDeviceName: s.btDeviceName,
        btDeviceAddress: s.btDeviceAddress,
      }),
    }
  )
);
