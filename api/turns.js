import api from './client';

/**
 * @param {string} dateYmd - YYYY-MM-DD (ngày salon)
 * @returns {Promise<{ success: boolean, date: string, employees: Array, suggested: number|null, total: number }>}
 */
export async function fetchTurnsForDate(dateYmd) {
  const { data } = await api.get('/api/turns/today', {
    params: { date: dateYmd },
  });
  return data;
}
