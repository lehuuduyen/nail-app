import { formatEmployeeNameFromDb } from './staffDisplay';

const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const knownName = (name) => typeof name === 'string' && name.trim() && name.trim() !== '—';
const timeValue = (time) => Date.parse(time) || 0;

function makeRow(row, isSaved, key) {
  const amount = round(numeric(row.serviceTotal ?? row.amount));
  const turns = numeric(row.turns);
  const services = Array.isArray(row.services) ? row.services.map((s) => ({ ...s })) : [];
  const customer = row.customer || null;
  const hasCustomer = customer && (customer.id != null || customer.name || customer.firstName || customer.phone);
  return {
    key, amount, turns, isSaved,
    label: `${amount}${turns ? ` (${turns}t)` : ''}`,
    hasDetails: Boolean(services.some((s) => knownName(s.name)) || hasCustomer),
    details: { services, customer, time: row.time, isSaved },
  };
}

/** Display gross service money; count turns on gross service money, ignoring ticket adjustments. */
export function buildCheckTurnColumns({ apiColumns = [], savedTickets = [], employees = [], dayYmd } = {}) {
  const staff = Array.isArray(employees) ? employees : [];
  const byId = new Map();
  const ensureColumn = (id, source = {}) => {
    const key = String(id);
    if (!byId.has(key)) {
      const employee = staff.find((e) => String(e.id) === key);
      byId.set(key, { ...employee, ...source, nickname: source.nickname || employee?.nickname, employeeId: id, rows: [] });
    }
    return byId.get(key);
  };
  for (const column of Array.isArray(apiColumns) ? apiColumns : []) {
    const target = ensureColumn(column.employeeId, column);
    for (const [i, row] of (column.rows || []).entries()) {
      const key = `api:${column.employeeId}:${row.ticketId ?? i}:${i}`;
      // The endpoint groups services by ticket; display each service separately.
      if (Array.isArray(row.services) && row.services.length) {
        row.services.forEach((service, index) => {
          const amount = numeric(service.price);
          target.rows.push(makeRow({
            ...row, serviceTotal: amount, turns: amount >= 25 ? 1 : 0,
            services: [service],
          }, false, `${key}:${index}`));
        });
      } else {
        // Older records without line details retain their service-only API total.
        target.rows.push(makeRow(row, false, key));
      }
    }
  }
  for (const ticket of Array.isArray(savedTickets) ? savedTickets : []) {
    if (ticket.day !== dayYmd) continue;
    const snapshot = ticket.snapshot || {};
    const lines = snapshot.lines || [];
    lines.forEach((line, index) => {
      const id = line.employeeId ?? snapshot.staffId;
      const amount = numeric(line.price) * (line.qty || 1);
      ensureColumn(id, { displayName: line.employeeName ?? snapshot.staffName }).rows.push(makeRow({
        amount, turns: amount >= 25 ? 1 : 0,
        services: [{ name: line.name, price: round(amount) }],
        customer: snapshot.selectedCustomer, time: ticket.createdAt,
      }, true, `saved:${ticket.id}:${id}:${index}`));
    });
  }
  const order = new Map(staff.map((e, index) => [String(e.id), index]));
  return [...byId.values()].map((column) => {
    const rows = column.rows.sort((a, b) => timeValue(a.details.time) - timeValue(b.details.time));
    const totalTurns = rows.reduce((sum, row) => sum + row.turns, 0);
    const name = column.nickname || column.firstName || column.displayName ||
      column.name || formatEmployeeNameFromDb(column);
    return {
      employeeId: column.employeeId, name: `${String(name).toUpperCase()} (${totalTurns})`,
      totalTurns, totalAmount: round(rows.reduce((sum, row) => sum + row.amount, 0)),
      hasSaved: rows.some((row) => row.isSaved), rows,
    };
  }).sort((a, b) => (order.get(String(a.employeeId)) ?? Infinity) -
    (order.get(String(b.employeeId)) ?? Infinity));
}
