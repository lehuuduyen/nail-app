import { formatEmployeeNameFromDb } from './staffDisplay';

const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const timeValue = (time) => Date.parse(time) || 0;

function makeRow(row, isSaved, key) {
  const amount = round(numeric(row.serviceTotal ?? row.amount));
  const turns = numeric(row.turns);
  const services = Array.isArray(row.services) ? row.services.map((s) => ({ ...s })) : [];
  const customer = row.customer || null;
  return {
    key, amount, turns, isSaved,
    label: `${amount}${turns ? ` (${turns}t)` : ''}`,
    hasDetails: true,
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
  // Keep the roster visible even before the endpoint responds or while offline.
  staff.forEach((employee) => ensureColumn(employee.id, employee));
  for (const column of Array.isArray(apiColumns) ? apiColumns : []) {
    const target = ensureColumn(column.employeeId, column);
    // Prefer server identity when the roster has no nickname.
    target.nickname = target.nickname || column.nickname;
    target.displayName = target.displayName || column.displayName || column.name;
    for (const [i, row] of (column.rows || []).entries()) {
      const services = Array.isArray(row.services) ? row.services : [];
      target.rows.push(makeRow(services.length ? {
        ...row,
        serviceTotal: services.reduce((sum, service) => sum + numeric(service.price), 0),
        turns: services.filter((service) => numeric(service.price) >= 25).length,
      } : row, false, `api:${column.employeeId}:${row.ticketId ?? i}:${i}`));
    }
  }
  for (const ticket of Array.isArray(savedTickets) ? savedTickets : []) {
    if (ticket.day !== dayYmd) continue;
    const snapshot = ticket.snapshot || {};
    const grouped = new Map();
    for (const line of snapshot.lines || []) {
      const id = line.employeeId ?? snapshot.staffId;
      const key = String(id);
      const amount = numeric(line.price) * (line.qty || 1);
      const column = ensureColumn(id, { displayName: line.employeeName ?? snapshot.staffName });
      if (!grouped.has(key)) grouped.set(key, { column, amount: 0, turns: 0, services: [] });
      const row = grouped.get(key);
      row.amount += amount;
      row.turns += amount >= 25 ? 1 : 0;
      row.services.push({ name: line.name, price: round(amount) });
    }
    for (const [id, row] of grouped) {
      row.column.rows.push(makeRow({
        amount: row.amount, turns: row.turns, services: row.services,
        customer: snapshot.selectedCustomer, time: ticket.createdAt,
      }, true, `saved:${ticket.id}:${id}`));
    }
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
