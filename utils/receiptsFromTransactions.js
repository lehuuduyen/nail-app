import { splitTransactionAmount } from './money';
import { formatEmployeeNameFromDb } from './staffDisplay';

/** Chỉ dùng cho test / mock — không dùng trên màn POS thật. */
export const SAMPLE_PAID_RECEIPTS = [
  { id: 7087, paymentType: 'CASH', total: '35.00', amountDue: '', serviceBy: 'CO UT+' },
  { id: 7086, paymentType: 'VISA-3267', total: '99.91', amountDue: '0.00', serviceBy: 'LISA+LEO+' },
  { id: 7085, paymentType: 'VISA-7701', total: '200.85', amountDue: '31.00', serviceBy: 'SUSAN+LEO+' },
];

export const SAMPLE_UNPAID_RECEIPTS = [
  { id: 7084, paymentType: 'CASH', total: '62.00', serviceBy: 'Service By: CO UT+' },
];

function formatPaymentLine(r) {
  const m = String(r.paymentMethod || 'cash').toLowerCase();
  if (m === 'cash') return 'CASH';
  if (m === 'card') {
    const four = r.helcimCardLast4 || r.cardLast4;
    if (four) return `VISA-${four}`;
    return 'CARD';
  }
  return String(r.paymentMethod || '—').toUpperCase();
}

function formatReceiptServiceBy(r) {
  const n = (r.notes || '').trim();
  if (n && n.length < 36 && !n.includes(':')) {
    const u = n.toUpperCase();
    return u.endsWith('+') ? u : `${u}+`;
  }
  if (r.Employee) {
    const s = formatEmployeeNameFromDb(r.Employee).toUpperCase().trim();
    return `${s.replace(/\s+/g, ' ')}+`;
  }
  return '—';
}

/** Chuẩn YYYY-MM-DD từ trường date API (string DATEONLY hoặc ISO). */
function transactionDateYmd(tx) {
  const raw = tx?.date;
  if (raw == null) return '';
  const s = typeof raw === 'string' ? raw : String(raw);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 10);
}

function isRefunded(tx) {
  return String(tx.paymentStatus || '').toLowerCase() === 'refunded';
}

function isUnpaidStatus(tx) {
  const s = String(tx.paymentStatus || '').toLowerCase();
  return s === 'pending' || s === 'open' || s === 'unpaid' || s === 'draft';
}

function mapToPaidRow(tx) {
  const { total, tip } = splitTransactionAmount(tx);
  const tipStr = tip > 0 ? tip.toFixed(2) : '';
  return {
    id: tx.id,
    paymentType: formatPaymentLine(tx),
    total: total.toFixed(2),
    amountDue: tipStr,
    serviceBy: formatReceiptServiceBy(tx),
  };
}

function mapToUnpaidRow(tx) {
  const { total } = splitTransactionAmount(tx);
  const svc = formatReceiptServiceBy(tx);
  return {
    id: tx.id,
    paymentType: formatPaymentLine(tx),
    total: total.toFixed(2),
    serviceBy: svc.startsWith('Service By:') ? svc : `Service By: ${svc}`,
  };
}

/**
 * Map API transactions → receipt rows. Chỉ giữ giao dịch đúng `salonDateYmd` (theo múi giờ salon).
 * Không dùng dữ liệu mẫu trên POS — list rỗng nếu không có vé trong ngày.
 */
export function transactionsToReceiptRows(transactions, salonDateYmd) {
  const ymd = salonDateYmd != null ? String(salonDateYmd).trim() : '';
  let list = Array.isArray(transactions) ? transactions : [];
  if (ymd) {
    list = list.filter((tx) => transactionDateYmd(tx) === ymd);
  }

  if (list.length === 0) {
    return { paid: [], unpaid: [] };
  }

  const paid = [];
  const unpaid = [];
  for (const tx of list) {
    if (isRefunded(tx)) continue;
    if (isUnpaidStatus(tx)) {
      unpaid.push(mapToUnpaidRow(tx));
    } else {
      paid.push(mapToPaidRow(tx));
    }
  }

  return { paid, unpaid };
}
