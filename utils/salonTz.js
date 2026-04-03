/**
 * Ngày “hôm nay” của salon theo múi giờ IANA — cấu hình qua EXPO_PUBLIC_SALON_TIMEZONE.
 * Ví dụ bang: America/Phoenix, America/Chicago, America/New_York, America/Los_Angeles
 */

function readEnvTz() {
  const v = process.env.EXPO_PUBLIC_SALON_TIMEZONE;
  const s = v != null ? String(v).trim() : '';
  return s || 'America/Phoenix';
}

/** Nhãn hiển thị tùy chọn (vd "Phoenix", "Dallas") — nếu trống thì lấy từ IANA. */
function readEnvTzLabel() {
  const v = process.env.EXPO_PUBLIC_SALON_TZ_LABEL;
  const s = v != null ? String(v).trim() : '';
  return s || '';
}

export function getSalonTimezone() {
  const tz = readEnvTz();
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return 'America/Phoenix';
  }
}

/** Tên ngắn cho UI: env SALON_TZ_LABEL hoặc phần sau dấu / của IANA. */
export function getSalonTzDisplayLabel() {
  const custom = readEnvTzLabel();
  if (custom) return custom;
  const tz = getSalonTimezone();
  const i = tz.lastIndexOf('/');
  return i >= 0 ? tz.slice(i + 1).replace(/_/g, ' ') : tz;
}

function partsNowInSalon() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: getSalonTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
}

function pickPart(parts, type) {
  return parts.find((p) => p.type === type)?.value;
}

/** YYYY-MM-DD theo lịch salon (khớp query `date` trên API). */
export function getSalonDateYmd() {
  const p = partsNowInSalon();
  return `${pickPart(p, 'year')}-${pickPart(p, 'month')}-${pickPart(p, 'day')}`;
}

export function formatSalonTodayReadable() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: getSalonTimezone(),
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}
