/**
 * Chia tổng thanh toán / tip theo trọng số từng dòng (giá × qty).
 */
export function splitByWeights(weights, total) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const n = weights.length;
  if (n === 0) return [];
  if (sum <= 0) {
    const even = Math.round((total / n) * 100) / 100;
    const out = Array(n).fill(even);
    const drift = Math.round((total - even * n) * 100) / 100;
    if (n) out[n - 1] = Math.round((out[n - 1] + drift) * 100) / 100;
    return out;
  }
  const raw = weights.map((w) => (w / sum) * total);
  const rounded = raw.map((x) => Math.round(x * 100) / 100);
  let drift = Math.round((total - rounded.reduce((a, b) => a + b, 0)) * 100) / 100;
  if (n && drift !== 0) {
    rounded[n - 1] = Math.round((rounded[n - 1] + drift) * 100) / 100;
  }
  return rounded;
}
