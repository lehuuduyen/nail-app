import { format } from 'date-fns';
import { formatMoney, splitTransactionAmount } from './money';
import { formatEmployeeNameFromDb } from './staffDisplay';

/** e.g. 2026-03-26 → MAR-26-26 */
export function formatYmdAsTicketLabel(ymd) {
  if (!ymd || typeof ymd !== 'string') return '—';
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return ymd;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  return format(dt, 'MMM-dd-yy').toUpperCase();
}

export function formatTxListTime(tx) {
  const raw = tx?.createdAt ?? tx?.updatedAt ?? tx?.created_at;
  if (!raw) return '';
  try {
    return format(new Date(raw), 'h:mm:ss a');
  } catch {
    return '';
  }
}

/** Sequelize / JSON có thể trả Employee hoặc employee; amount/tips có thể là string (Postgres DECIMAL). */
function pickTransactionEmployee(tx) {
  const e = tx?.Employee ?? tx?.employee;
  if (e && typeof e === 'object' && !Array.isArray(e)) return e;
  return null;
}

function ymdOnlyFromTxDate(dateVal) {
  if (dateVal == null) return null;
  if (typeof dateVal === 'string') {
    const s = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (s.length >= 10 && s[4] === '-' && s[7] === '-') return s.slice(0, 10);
  }
  return dateVal;
}

export function techTicketRowSummary(tx) {
  if (!tx || typeof tx !== 'object') {
    return {
      dateLabel: '—',
      employee: '—',
      amountStr: formatMoney(0),
      tipStr: formatMoney(0),
      timeStr: '',
      id: undefined,
    };
  }
  const amountN = parseFloat(tx.amount);
  const tipsN = parseFloat(tx.tips);
  const normalized = {
    ...tx,
    amount: Number.isFinite(amountN) ? amountN : 0,
    tips: Number.isFinite(tipsN) ? tipsN : 0,
  };
  const { withoutTip, tip } = splitTransactionAmount(normalized);
  const empRec = pickTransactionEmployee(tx);
  const emp = empRec
    ? formatEmployeeNameFromDb(empRec)
    : tx?.employeeName
      ? String(tx.employeeName)
      : '—';
  const dateYmd = ymdOnlyFromTxDate(tx.date);
  return {
    dateLabel: formatYmdAsTicketLabel(dateYmd),
    employee: emp,
    amountStr: formatMoney(withoutTip),
    tipStr: formatMoney(tip),
    timeStr: formatTxListTime(tx),
    id: tx?.id,
  };
}
