import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Nhân viên / dịch vụ thêm khi offline hoặc bổ sung cục bộ (AsyncStorage).
 * Khi có API + JWT, ưu tiên POST lên server từ màn add-*.
 */
export const useLocalCatalogStore = create(
  persist(
    (set) => ({
      employees: [],
      services: [],
      addEmployee: (row) =>
        set((s) => ({
          employees: [...s.employees, { ...row, id: row.id || `local-${Date.now()}` }],
        })),
      addService: (row) =>
        set((s) => ({
          services: [...s.services, { ...row, id: row.id || `local-svc-${Date.now()}` }],
        })),
      removeEmployee: (id) =>
        set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),
      removeService: (id) =>
        set((s) => ({ services: s.services.filter((e) => e.id !== id) })),
      clear: () => set({ employees: [], services: [] }),
    }),
    {
      name: 'nail-local-catalog',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
