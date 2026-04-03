import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const OWNER_PIN_STORAGE_KEY = 'OWNER_PIN';

const DEFAULT_PIN = '1234';
const PERSIST_NAME = 'nail-owner-session';

async function readExpectedPin() {
  try {
    const raw = await AsyncStorage.getItem(OWNER_PIN_STORAGE_KEY);
    if (raw != null && String(raw).length >= 4) return String(raw);
  } catch {
    /* ignore */
  }
  return DEFAULT_PIN;
}

export const useOwnerStore = create(
  persist(
    (set, get) => ({
      isOwnerMode: false,
      ownerPin: DEFAULT_PIN,
      loginTime: null,
      lastActivityAt: null,
      autoLogoutMinutes: 480,

      touchActivity: () => {
        const { isOwnerMode } = get();
        if (isOwnerMode) set({ lastActivityAt: Date.now() });
      },

      syncPinFromStorage: async () => {
        try {
          let raw = await AsyncStorage.getItem(OWNER_PIN_STORAGE_KEY);
          if (raw == null || String(raw).length < 4) {
            await AsyncStorage.setItem(OWNER_PIN_STORAGE_KEY, DEFAULT_PIN);
            raw = DEFAULT_PIN;
          }
          set({ ownerPin: String(raw) });
        } catch {
          set({ ownerPin: DEFAULT_PIN });
        }
      },

      login: async (pin) => {
        const expected = await readExpectedPin();
        const ok = String(pin) === String(expected);
        if (ok) {
          const now = Date.now();
          set({
            isOwnerMode: true,
            loginTime: now,
            lastActivityAt: now,
            ownerPin: expected,
          });
        }
        return ok;
      },

      logout: () =>
        set({
          isOwnerMode: false,
          loginTime: null,
          lastActivityAt: null,
        }),

      updatePin: async (newPin) => {
        const s = String(newPin || '').trim();
        if (s.length < 4) throw new Error('PIN must be at least 4 digits');
        await AsyncStorage.setItem(OWNER_PIN_STORAGE_KEY, s);
        set({ ownerPin: s });
      },

      checkSessionTimeout: () => {
        const { isOwnerMode, lastActivityAt, autoLogoutMinutes } = get();
        if (!isOwnerMode || lastActivityAt == null) return;
        const ms = Math.max(1, autoLogoutMinutes) * 60 * 1000;
        if (Date.now() - lastActivityAt > ms) get().logout();
      },
    }),
    {
      name: PERSIST_NAME,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        isOwnerMode: s.isOwnerMode,
        loginTime: s.loginTime,
        lastActivityAt: s.lastActivityAt,
        autoLogoutMinutes: s.autoLogoutMinutes,
      }),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          useOwnerStore.getState().checkSessionTimeout();
        });
      },
    }
  )
);
