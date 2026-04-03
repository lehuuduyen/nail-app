/** Match reference POS labels (incl. ARYLIC typo). */
export const SERVICE_DISPLAY_GROUPS = [
  'ADDITIONAL - THÊM',
  'ARYLIC - BỘT',
  'EYELASH',
  'FACIAL',
  'HEAD SPA',
  'KID < 10YO',
  'MANICURE - TAY',
  'PEDICURE - CHÂN',
  'WAX - TẨY LÔNG',
];

export const DISPLAY_GROUP_TO_API = {
  'ADDITIONAL - THÊM': 'other',
  'ARYLIC - BỘT': 'acrylic',
  EYELASH: 'other',
  FACIAL: 'other',
  'HEAD SPA': 'other',
  'KID < 10YO': 'other',
  'MANICURE - TAY': 'manicure',
  'PEDICURE - CHÂN': 'pedicure',
  'WAX - TẨY LÔNG': 'waxing',
};

export function apiCategoryToDisplayGroup(apiCat) {
  const k = String(apiCat || 'other').toLowerCase().trim();
  if (k === 'acrylic' || k === 'nails') return 'ARYLIC - BỘT';
  if (k === 'manicure' || k === 'gel' || k === 'dip') return 'MANICURE - TAY';
  if (k === 'pedicure') return 'PEDICURE - CHÂN';
  if (k === 'waxing') return 'WAX - TẨY LÔNG';
  if (k === 'facial') return 'FACIAL';
  if (k === 'lash' || k === 'eyelash') return 'EYELASH';
  if (k === 'head_spa' || k === 'head spa' || k === 'headspa') return 'HEAD SPA';
  if (k === 'kids') return 'KID < 10YO';
  return 'ADDITIONAL - THÊM';
}
