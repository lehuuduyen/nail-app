import { format } from 'date-fns';

export const START_HOUR = 9;
export const END_HOUR = 18;
export const SLOTS_PER_HOUR = 4;

export function slotsCount() {
  return (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
}

/** Map API appointment to grid block; null if not same calendar day (device TZ) */
export function appointmentToBlock(appt, employeeIdToRow, selectedDate) {
  const selectedStr = format(selectedDate, 'yyyy-MM-dd');
  const d = new Date(appt.scheduledAt);
  if (Number.isNaN(d.getTime()) || format(d, 'yyyy-MM-dd') !== selectedStr) {
    return null;
  }
  const dayStartMins = START_HOUR * 60;
  const dayEndMins = END_HOUR * 60;
  const maxSlots = slotsCount();
  let apptMins = d.getHours() * 60 + d.getMinutes();
  let slotIndex;
  if (apptMins < dayStartMins) {
    slotIndex = 0;
  } else if (apptMins >= dayEndMins) {
    slotIndex = Math.max(0, maxSlots - 1);
  } else {
    slotIndex = Math.floor((apptMins - dayStartMins) / 15);
  }
  slotIndex = Math.max(0, Math.min(slotIndex, maxSlots - 1));

  const durationMin = appt.Service?.duration ?? 30;
  let span = Math.max(1, Math.ceil(durationMin / 15));
  span = Math.min(span, maxSlots - slotIndex);

  const row = employeeIdToRow.get(appt.employeeId) ?? 0;
  const label = (appt.Service?.name || 'Booking').slice(0, 16);
  return { id: appt.id, row, start: slotIndex, span, label, appt };
}
