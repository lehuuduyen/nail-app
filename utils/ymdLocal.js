/**
 * Calendar math in **device local timezone** only (no UTC date-only parsing).
 * Matches nail-backend `addDaysYMD` / Monday logic.
 */

export function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Today as YYYY-MM-DD (local). */
export function localTodayYmd() {
  const t = new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}

export function addDaysYmd(ymd, delta) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/** Monday (local) of the week containing the given YYYY-MM-DD. */
export function mondayOfWeekContainingYmd(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0 Sun … 6 Sat
  const toMon = dow === 0 ? -6 : 1 - dow;
  dt.setDate(dt.getDate() + toMon);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export function mondayOfCurrentWeek() {
  return mondayOfWeekContainingYmd(localTodayYmd());
}

/** Shift anchor by whole weeks (anchor is usually Monday). */
export function shiftWeekByDays(ymd, deltaWeeks) {
  return addDaysYmd(ymd, deltaWeeks * 7);
}

export function ymdToLocalDate(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function parseLocalYmd(ymd) {
  return ymdToLocalDate(ymd);
}
