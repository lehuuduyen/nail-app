export const LOCAL_TICKET_KEY = 'nail-local-tickets-v1';
export const cloneTicket = (value) => JSON.parse(JSON.stringify(value));
export const newTicketId = () => `local-ticket-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function phoenixDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Phoenix', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).filter((p) => ['year', 'month', 'day'].includes(p.type))
    .sort((a, b) => ['year', 'month', 'day'].indexOf(a.type) - ['year', 'month', 'day'].indexOf(b.type))
    .map((p) => p.value).join('-');
}
export function nextPhoenixMidnight(now = new Date()) {
  return Date.parse(`${phoenixDay(now)}T00:00:00-07:00`) + 86400000 - now.getTime();
}
export function ticketSnapshot(state, ui) {
  const { lines, staffId, staffName, taxEnabled, taxRate, tip, discount, customLabel } = state;
  return cloneTicket({ lines, staffId, staffName, taxEnabled, taxRate, tip, discount, customLabel,
    selectedCustomer: ui.selectedCustomer, turnType: ui.turnType,
    linkedAppointmentId: ui.linkedAppointmentId, pendingLineStaff: ui.pendingLineStaff });
}
export function ticketStaffNames(snapshot) {
  const names = new Map();
  const add = (id, name) => {
    if (name && !names.has(String(id ?? name))) names.set(String(id ?? name), name);
  };
  add(snapshot.staffId, snapshot.staffName);
  snapshot.lines.forEach((line) => add(line.employeeId ?? snapshot.staffId, line.employeeName ?? snapshot.staffName));
  return [...names.values()].join(' + ') || '—';
}
export function parseTickets(raw) {
  if (raw === null) return [];
  const data = JSON.parse(raw);
  if (data.version !== 1 || !Array.isArray(data.tickets)) throw new Error('Unsupported ticket storage');
  const ids = new Set();
  for (const t of data.tickets) {
    if (t.version !== 1 || typeof t.id !== 'string' || ids.has(t.id) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(t.day) || !Number.isFinite(Date.parse(t.createdAt)) ||
        !Number.isFinite(Date.parse(t.updatedAt)) || !Number.isFinite(t.total) ||
        !Array.isArray(t.snapshot?.lines) || typeof t.snapshot.taxEnabled !== 'boolean' ||
        !['taxRate', 'tip', 'discount'].every((k) => Number.isFinite(t.snapshot[k])) ||
        !['staffId', 'staffName', 'customLabel', 'selectedCustomer', 'turnType', 'linkedAppointmentId'].every((k) => Object.hasOwn(t.snapshot, k)) ||
        t.snapshot.lines.some((l) => !l || !l.id || typeof l.name !== 'string' || !Number.isFinite(Number(l.price)) ||
          (l.qty != null && !Number.isFinite(Number(l.qty))))) {
      throw new Error('Invalid ticket storage');
    }
    ids.add(t.id);
  }
  return data.tickets;
}
