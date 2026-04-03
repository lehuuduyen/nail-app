/**
 * Bật bằng EXPO_PUBLIC_POS_TEST_PAY=1 — chỉ dùng dev/staging.
 * Tự seed vé + bấm thẻ sẽ ghi DB (paymentMethod card) nhưng KHÔNG quẹt Helcim —
 * không có giao dịch trên portal Helcim; tắt flag này + Pay.js thật mới có lịch sử Helcim.
 */
export function isPosTestPayEnabled() {
  const v = String(process.env.EXPO_PUBLIC_POS_TEST_PAY ?? '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
