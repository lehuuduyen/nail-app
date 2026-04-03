/** Tỉ lệ thợ–chủ: tổng tỷ lệ = t/(t+o) (vd 6-4 → tech 6 owner 4; 4.5-5.5 → 45, 55). */
export const COMMISSION_PICKS = [
  { label: '4.5 - 5.5', tech: 45, owner: 55 },
  { label: '4 - 6', tech: 4, owner: 6 },
  { label: '3.5 - 6.5', tech: 35, owner: 65 },
  { label: '3 - 7', tech: 3, owner: 7 },
  { label: '2.5 - 7.5', tech: 25, owner: 75 },
  { label: '2 - 8', tech: 2, owner: 8 },
  { label: '1 - 9', tech: 1, owner: 9 },
  { label: '0 - 10', tech: 0, owner: 10 },
  { label: '6 - 4', tech: 6, owner: 4 },
  { label: '5 - 5', tech: 5, owner: 5 },
];

/** Chia Cash - Check (% cash của tổng trả). */
export const CASH_CHECK_PICKS = [
  { label: '0 - 10', cashPct: 0 },
  { label: '1 - 9', cashPct: 10 },
  { label: '2 - 8', cashPct: 20 },
  { label: '2.5 - 7.5', cashPct: 25 },
  { label: '3 - 7', cashPct: 30 },
  { label: '3.5 - 6.5', cashPct: 35 },
  { label: '4 - 6', cashPct: 40 },
  { label: '4.5 - 5.5', cashPct: 45 },
  { label: '5 - 5', cashPct: 50 },
];

export const MINIMUM_PAY_OPTIONS = [0, 200, 250, 300, 350, 400, 450, 500];

export function formatCommissionLabel(tech, owner) {
  const t = Number(tech) || 0;
  const o = Number(owner) || 0;
  if (t <= 10 && o <= 10 && t + o === 10) {
    return `${t} - ${o}`;
  }
  const td = t / 10;
  const od = o / 10;
  const f = (x) => (Math.abs(x - Math.round(x)) < 1e-6 ? String(Math.round(x)) : x.toFixed(1));
  return `${f(td)} - ${f(od)}`;
}
