function salesExcludingTips(t) {
  const a = parseFloat(t.amount || 0);
  const tip = parseFloat(t.tips || 0);
  return Math.max(0, a - tip);
}

/** Build { label: { amount, tips, tickets } } from raw transactions (amount = dịch vụ + tip). */
export function transactionsToByDayChart(transactions) {
  if (!transactions?.length) return {};
  const byDate = {};
  transactions.forEach((t) => {
    const day = t.date;
    if (!byDate[day]) byDate[day] = { amount: 0, tips: 0, tickets: 0 };
    byDate[day].amount += salesExcludingTips(t);
    byDate[day].tips += parseFloat(t.tips || 0);
    byDate[day].tickets += 1;
  });
  const sortedKeys = Object.keys(byDate).sort();
  const out = {};
  sortedKeys.forEach((k) => {
    const d = new Date(`${k}T12:00:00`);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    out[label] = byDate[k];
  });
  return out;
}

/** Aggregate store-income byDate keys into month buckets for year view. */
export function byDateToByMonthChart(byDate) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const acc = {};
  months.forEach((m) => {
    acc[m] = { amount: 0, tips: 0, tickets: 0, card: 0, cash: 0, total: 0 };
  });
  Object.entries(byDate || {}).forEach(([ymd, v]) => {
    const d = new Date(`${ymd}T12:00:00`);
    const m = months[d.getMonth()];
    acc[m].total += parseFloat(v.total || 0);
    acc[m].amount += parseFloat(v.total || 0);
    acc[m].tips += parseFloat(v.tips || 0);
    acc[m].tickets += v.tickets || 0;
    acc[m].card += parseFloat(v.card || 0);
    acc[m].cash += parseFloat(v.cash || 0);
  });
  return acc;
}

/** Store-income range: daily totals as bar chart buckets. */
export function storeByDateToChart(byDate) {
  const out = {};
  Object.keys(byDate || {})
    .sort()
    .forEach((k) => {
      out[k.slice(5)] = { amount: parseFloat(byDate[k].total || 0) };
    });
  return out;
}
