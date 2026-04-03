import {
  addDaysYmd,
  mondayOfCurrentWeek,
  mondayOfWeekContainingYmd,
  parseLocalYmd,
  shiftWeekByDays,
} from './ymdLocal';

export { mondayOfCurrentWeek, mondayOfWeekContainingYmd, parseLocalYmd };

export function shiftWeekMonday(ymd, deltaWeeks) {
  return shiftWeekByDays(ymd, deltaWeeks);
}

/**
 * Luôn cặp đủ 7 ngày: end = start + 6 (đồng bộ API / list PICK A WEEK).
 */
export function weekRangeFromPayload(data, anchorYmd) {
  const s0 = data?.startDate != null && String(data.startDate).trim() !== '' ? String(data.startDate).trim() : null;
  const e0 = data?.endDate != null && String(data.endDate).trim() !== '' ? String(data.endDate).trim() : null;

  let start = s0;
  let end = e0;

  if (start && !end) {
    end = addDaysYmd(start, 6);
  } else if (!start && end) {
    start = addDaysYmd(end, -6);
  } else if (!start && !end) {
    start = mondayOfWeekContainingYmd(anchorYmd);
    end = addDaysYmd(start, 6);
  }

  return {
    start,
    end,
    rangeLabel: `${start} → ${end} (7 ngày)`,
  };
}
