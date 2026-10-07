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

/** Service-only display math; API and Save turns use gross line prices, per contract. */
export function buildCheckTurnColumns({ apiColumns = [], savedTickets = [], employees = [], dayYmd } = {}) {
  const staff = Array.isArray(employees) ? employees : [];
  const byId = new Map();
  const ensureColumn = (id, source = {}) => {
    const key = String(id);
    if (!byId.has(key)) {
      const employee = staff.find((e) => String(e.id) === key);
      byId.set(key, { ...source, ...employee, employeeId: id, rows: [] });
    }
    return byId.get(key);
  };
  for (const column of Array.isArray(apiColumns) ? apiColumns : []) {
    const target = ensureColumn(column.employeeId, column);
    target.rows.push(...(column.rows || []).map((row, i) =>
      makeRow(row, false, `api:${column.employeeId}:${row.ticketId ?? i}`)));
  }
  for (const ticket of Array.isArray(savedTickets) ? savedTickets : []) {
    if (ticket.day !== dayYmd) continue;
    const snapshot = ticket.snapshot || {};
    const groups = new Map();
    for (const line of snapshot.lines || []) {
      const id = line.employeeId ?? snapshot.staffId;
      const key = String(id);
      if (!groups.has(key)) groups.set(key, {
        employeeId: id, displayName: line.employeeName ?? snapshot.staffName,
        amount: 0, turns: 0, services: [],
      });
      const group = groups.get(key);
      const price = numeric(line.price) * (line.qty || 1);
      group.amount += price;
      if (price >= 25) group.turns += 1;
      group.services.push({ name: line.name, price: round(price) });
    }
    for (const group of groups.values()) {
      ensureColumn(group.employeeId, group).rows.push(makeRow({
        ...group, customer: snapshot.selectedCustomer, time: ticket.createdAt,
      }, true, `saved:${ticket.id}:${group.employeeId}`));
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
