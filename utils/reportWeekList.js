import {
  addDaysYmd,
  mondayOfCurrentWeek,
  ymdToLocalDate,
} from './ymdLocal';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** `MAR-23-26` — giống POS cũ (tháng IN HOA, ngày 2 số, năm 2 số). */
function fmtMmmDdYyFromYmd(ymd) {
  const d = ymdToLocalDate(ymd);
  const mon = MONTHS[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mon}-${day}-${yy}`;
}

/**
 * Một "tuần" = **7 ngày liên tiếp**: ngày bắt đầu + 6 ngày = ngày kết thúc
 * (vd MAR-23-26 to MAR-29-26), chữ ` to ` viết thường.
 */
export function formatWeekRangeLabel(weekStartYmd) {
  const endYmd = addDaysYmd(weekStartYmd, 6);
  return `${fmtMmmDdYyFromYmd(weekStartYmd)} to ${fmtMmmDdYyFromYmd(endYmd)}`;
}

/**
 * 52 tuần lùi dần; mỗi dòng `weekStartYmd` là Thứ Hai (local), label khớp công thức trên.
 */
export function buildWeekRowsDescending(count = 52) {
  const rows = [];
  let weekStartYmd = mondayOfCurrentWeek();
  for (let i = 0; i < count; i += 1) {
    rows.push({
      weekStartYmd,
      mondayYmd: weekStartYmd,
      label: formatWeekRangeLabel(weekStartYmd),
    });
    weekStartYmd = addDaysYmd(weekStartYmd, -7);
  }
  return rows;
}
