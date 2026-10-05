import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { cloneTicket, LOCAL_TICKET_KEY, parseTickets, phoenixDay } from '../utils/localTickets';

// Explicit persistence: publish only after durable writes; failed reads never become an empty save.
export function createLocalTicketStore(storage, createStore = create) {
  let hydration;
  let queue = Promise.resolve();
  return createStore((set, get) => ({
    tickets: [], hydrated: false, error: null, openRequest: null,
    requestOpen: (id = null, defaults = {}) => set((s) => ({
      openRequest: { nonce: (s.openRequest?.nonce || 0) + 1, id, defaults },
    })),
    hydrate: () => {
      if (get().hydrated) return Promise.resolve();
      if (!hydration) hydration = (async () => {
        try {
          const tickets = parseTickets(await storage.getItem(LOCAL_TICKET_KEY));
          set({ tickets, hydrated: true, error: null });
        } catch (error) {
          set({ error: 'Không đọc được ticket local. Vui lòng thử lại; dữ liệu cũ được giữ nguyên.' });
          throw error;
        } finally { hydration = null; }
      })();
      return hydration;
    },
    save: (id, snapshot, total) => {
      const copy = cloneTicket(snapshot);
      const operation = queue.catch(() => {}).then(async () => {
        await get().hydrate();
        const previous = get().tickets.find((t) => t.id === id);
        const now = new Date();
        const ticket = { version: 1, id, createdAt: previous?.createdAt || now.toISOString(),
          updatedAt: now.toISOString(), day: previous?.day || phoenixDay(now), snapshot: copy, total };
        const tickets = [...get().tickets.filter((t) => t.id !== id), ticket];
        const serialized = JSON.stringify({ version: 1, tickets });
        parseTickets(serialized);
        await storage.setItem(LOCAL_TICKET_KEY, serialized);
        set({ tickets, error: null });
        return cloneTicket(ticket);
      });
      queue = operation;
      return operation;
    },
  }));
}
export const useLocalTicketStore = createLocalTicketStore(AsyncStorage);
