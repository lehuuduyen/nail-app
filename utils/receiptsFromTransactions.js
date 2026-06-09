import { splitTransactionAmountForDisplay } from './money';
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
  if (r._mergedServiceBy) return r._mergedServiceBy;
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

/** Gộp tất cả transaction trong cùng 1 ticket thành 1 record đại diện. */
function mergeTicketGroup(txs) {
  const sorted = [...txs].sort((a, b) => a.id - b.id);
  const first = sorted[0];
  const totalAmount = sorted.reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const totalTips = sorted.reduce((s, tx) => s + Number(tx.tips || 0), 0);
  const names = [...new Set(
    sorted
      .map((tx) => tx.Employee ? formatEmployeeNameFromDb(tx.Employee).toUpperCase().trim() : null)
      .filter(Boolean),
  )];
  return {
    ...first,
    amount: totalAmount,
    tips: totalTips,
    _mergedServiceBy: names.length ? `${names.join('+')}+` : '—',
  };
}

/** Nhóm transactions theo ticketId (nếu có), ngược lại mỗi tx là 1 nhóm riêng. */
function groupTransactionsByTicket(list) {
  const map = new Map();
  for (const tx of list) {
    const key = tx.ticketId || `solo-${tx.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(tx);
  }
  return [...map.values()].map(mergeTicketGroup);
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
  const { withoutTip, tip } = splitTransactionAmountForDisplay(tx);
  const tipStr = tip > 0 ? tip.toFixed(2) : '';
  return {
    id: tx.id,
    paymentType: formatPaymentLine(tx),
    total: withoutTip.toFixed(2),
    amountDue: tipStr,
    serviceBy: formatReceiptServiceBy(tx),
  };
}

function mapToUnpaidRow(tx) {
  const { total } = splitTransactionAmountForDisplay(tx);
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

  // Tách paid/unpaid trước khi group (unpaid có thể chưa có ticketId)
  const unpaidRaw = list.filter((tx) => !isRefunded(tx) && isUnpaidStatus(tx));
  const paidRaw = list.filter((tx) => !isRefunded(tx) && !isUnpaidStatus(tx));

  const paid = groupTransactionsByTicket(paidRaw).map(mapToPaidRow);
  const unpaid = groupTransactionsByTicket(unpaidRaw).map(mapToUnpaidRow);

  return { paid, unpaid };
}
