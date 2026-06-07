/** Thanh toán máy chạm thẻ (Helcim / Ingenico). Mặc định tắt — bật: EXPO_PUBLIC_ENABLE_CARD_PAYMENT=1 */
export function isCardTerminalPaymentEnabled() {
  const v = process.env.EXPO_PUBLIC_ENABLE_CARD_PAYMENT;
  return v === '1' || String(v).toLowerCase() === 'true';
}

/** Thanh toán thẻ qua Stripe PaymentSheet. Mặc định tắt — bật: EXPO_PUBLIC_ENABLE_STRIPE=1 */
export function isStripePaymentEnabled() {
  const v = process.env.EXPO_PUBLIC_ENABLE_STRIPE;
  return (v === '1' || String(v).toLowerCase() === 'true') &&
    Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
