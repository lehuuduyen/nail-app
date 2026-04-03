/** Thanh toán máy chạm thẻ (Helcim / Ingenico). Mặc định tắt — bật: EXPO_PUBLIC_ENABLE_CARD_PAYMENT=1 */
export function isCardTerminalPaymentEnabled() {
  const v = process.env.EXPO_PUBLIC_ENABLE_CARD_PAYMENT;
  return v === '1' || String(v).toLowerCase() === 'true';
}
