import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * adminUnlocked: chỉ trong RAM — không persist.
 * Mỗi lần quay lại POS hoặc Huỷ PIN → clear; vào Owner Login / link Admin → luôn hỏi PIN lại.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      adminUnlocked: false,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null, adminUnlocked: false }),
      unlockAdmin: () => set({ adminUnlocked: true }),
      clearAdminSession: () => set({ adminUnlocked: false }),
    }),
    {
      name: 'nail-app-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        token: s.token,
        user: s.user,
      }),
    }
  )
);
