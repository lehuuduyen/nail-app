import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_LOGS = 50;

export const useErrorLogStore = create(
  persist(
    (set) => ({
      logs: [],
      logError: (entry) =>
        set((s) => ({
          logs: [{ ...entry, timestamp: new Date().toISOString() }, ...s.logs].slice(
            0,
            MAX_LOGS
          ),
        })),
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: 'nail-app-error-logs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
