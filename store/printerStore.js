import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cấu hình máy in nhiệt ESC/POS qua WiFi/LAN (giao thức RAW — TCP port 9100).
 * Hoạt động trên cả iOS và Android, không cần Bluetooth/MFi.
 */
export const usePrinterStore = create(
  persist(
    (set) => ({
      ip: '',
      port: 9100,
      connected: false,
      setPrinterConfig: (ip, port) => set({ ip, port: port || 9100 }),
      setConnected: (connected) => set({ connected }),
    }),
    {
      name: 'nail-app-printer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ ip: s.ip, port: s.port }),
    }
  )
);
