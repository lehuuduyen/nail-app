import api from '../api/client';

/**
 * Report API calls use the shared axios client (baseURL from EXPO_PUBLIC_API_URL)
 * and the same Bearer token as the rest of the app (Zustand + AsyncStorage persist).
 */

export async function getReportByDate(date) {
  const { data } = await api.get('/api/reports/technician/by-date', { params: { date } });
  return data;
}

export async function getReportByWeek(startDate) {
  const { data } = await api.get('/api/reports/technician/by-week', { params: { startDate } });
  return data;
}

export async function getReportByMonth(year, month) {
  const { data } = await api.get('/api/reports/technician/by-month', { params: { year, month } });
  return data;
}

export async function getReportByRange(startDate, endDate) {
  const { data } = await api.get('/api/reports/technician/by-range', { params: { startDate, endDate } });
  return data;
}

export async function getReportByYear(year) {
  const { data } = await api.get('/api/reports/technician/by-year', { params: { year } });
  return data;
}

export async function getStoreIncomeByDate(date) {
  const { data } = await api.get('/api/reports/store-income/by-date', { params: { date } });
  return data;
}

export async function getStoreIncomeByRange(startDate, endDate) {
  const { data } = await api.get('/api/reports/store-income/by-range', { params: { startDate, endDate } });
  return data;
}

/** Cùng công thức POS: từ ngày đầu (YYYY-MM-DD) + 6 ngày = đủ 7 ngày — không chỉnh lại Thứ Hai. */
export async function getStoreIncomeByWeek(weekStartYmd) {
  return getStoreIncomeByRange(weekStartYmd, addDaysStr(weekStartYmd, 6));
}

export async function getStoreIncomeByYear(year) {
  return getStoreIncomeByRange(`${year}-01-01`, `${year}-12-31`);
}

export async function getOwnerAdvancedByRange(startDate, endDate) {
  const { data } = await api.get('/api/reports/owner-advanced', { params: { startDate, endDate } });
  return data;
}

export async function getPedicureLog(startDate, endDate) {
  const { data } = await api.get('/api/reports/pedicure-log', { params: { startDate, endDate } });
  return data;
}

function addDaysStr(ymd, days) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
