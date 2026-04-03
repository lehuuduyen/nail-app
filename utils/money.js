export function formatMoney(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return '$0.00';
  return `$${v.toFixed(2)}`;
}

export function parseMoney(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Transaction: amount = phí dịch vụ + tip (POS); tips = phần tip.
 * withoutTip = doanh thu dịch vụ (total sales không gồm tip).
 */
export function splitTransactionAmount(item) {
  const total = parseMoney(item?.amount);
  const tip = parseMoney(item?.tips);
  const withoutTip = Math.max(0, total - tip);
  return { total, tip, withoutTip };
}
