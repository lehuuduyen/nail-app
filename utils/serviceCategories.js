/**
 * Map `Service.category` từ API (seed / web) → tab POS — khớp serviceMenuSeed & website.
 */
export const POS_TAB_ORDER = [
  'MANICURE - TAY',
  'PEDICURE - CHÂN',
  'ACRYLIC - BỘT',
  'WAXING',
  'FACIAL',
  'EYELASH',
  'HEAD SPA',
  'KID < 10YO',
  'ADDITIONAL - THÊM',
];

const API_TO_TAB = {
  manicure: 'MANICURE - TAY',
  gel: 'MANICURE - TAY',
  dip: 'MANICURE - TAY',
  acrylic: 'ACRYLIC - BỘT',
  nails: 'ACRYLIC - BỘT',
  pedicure: 'PEDICURE - CHÂN',
  waxing: 'WAXING',
  facial: 'FACIAL',
  lash: 'EYELASH',
  head_spa: 'HEAD SPA',
  kids: 'KID < 10YO',
  addon: 'ADDITIONAL - THÊM',
  other: 'ADDITIONAL - THÊM',
};

/** Legacy / typo từ dữ liệu cũ */
const LEGACY_TAB_ALIASES = {
  'ARYLIC - BỘT': 'ACRYLIC - BỘT',
};

export function apiCategoryToPosTab(apiCat) {
  const k = String(apiCat || 'other')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  return API_TO_TAB[k] || 'ADDITIONAL - THÊM';
}

export function normalizePosTabLabel(label) {
  const s = String(label || '').trim();
  return LEGACY_TAB_ALIASES[s] || s;
}

/** Tabs có ít nhất một dịch vụ (giữ thứ tự menu). */
export function tabsInUseForServices(services) {
  const set = new Set(
    (services || []).map((s) => normalizePosTabLabel(s.category))
  );
  return POS_TAB_ORDER.filter((t) => set.has(t));
}
