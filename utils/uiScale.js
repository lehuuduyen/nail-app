/**
 * Phóng to toàn bộ UI (tablet POS). 1 = không scale; ~1.12–1.22 thường hợp lý.
 * Đặt EXPO_PUBLIC_UI_SCALE trong .env (cần restart bundler).
 */
const raw = process.env.EXPO_PUBLIC_UI_SCALE;
const n = raw != null && String(raw).trim() !== '' ? Number.parseFloat(String(raw)) : NaN;

export const UI_SCALE =
  Number.isFinite(n) && n >= 1 && n <= 1.6 ? n : 1.14;

export function shouldScaleUi() {
  return UI_SCALE > 1.005;
}
