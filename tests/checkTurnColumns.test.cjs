const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const formatEmployeeNameFromDb = new Function(read('utils/staffDisplay.js').replace(/^import .*;\n/gm, '').replaceAll('export ', '') + ';return formatEmployeeNameFromDb;')();
const build = new Function('formatEmployeeNameFromDb', read('utils/checkTurnColumns.js').replace(/^import .*;\n/gm, '').replaceAll('export ', '') + ';return buildCheckTurnColumns;')(formatEmployeeNameFromDb);
const dayYmd = '2026-10-06';
const employees = [{ id: 1, firstName: 'Man', nickname: 'MAN' }, { id: 'local-2', displayName: 'Mai' }];
const saved = (lines, extras = {}) => ({ id: 'ticket', day: dayYmd, createdAt: '2026-10-06T17:00:00Z', snapshot: { staffId: 1, staffName: 'Man', lines, ...extras } });
const run = (tickets, apiColumns = []) => build({ savedTickets: tickets, apiColumns, employees, dayYmd });

test('gross service money excludes all ticket adjustments; two services form one 200 (2t) Save row', () => {
  const [col] = run([saved([{ name: 'A', price: 100 }, { name: 'B', price: 100 }], { tip: 50, discount: 100, taxEnabled: true, taxRate: 0.1 })]);
  assert.equal(col.totalAmount, 200); assert.equal(col.totalTurns, 2);
  assert.equal(col.name, 'MAN (2)'); assert.equal(col.rows.length, 1);
  assert.equal(col.rows[0].label, '200 (2t)');
  assert.equal(col.hasSaved, true); assert.equal(col.rows[0].isSaved, true);
  assert.equal(col.rows[0].details.isSaved, true);
});
test('threshold 24.99 / 25 / 25.01, add-on and quantity', () => {
  const [col] = run([saved([24.99, 25, 25.01, 20].map((price) => ({ price })))]);
  assert.equal(col.totalAmount, 95); assert.equal(col.totalTurns, 2);
  assert.equal(run([saved([{ price: 20 }])])[0].rows[0].label, '20');
  assert.equal(run([saved([{ price: 12.5, qty: 2 }])])[0].rows[0].label, '25 (1t)');
});
test('all turn types retained, server serviceTotal merged with Save and chronological sorting', () => {
  const rows = ['appointment', 'customer_pick', 'owner_assign', 'walk_in'].map((turnType, i) => ({
    ticketId: i, serviceTotal: 100, turns: 1, turnType, time: `2026-10-06T${18 + i}:00:00Z`, services: [],
  }));
  const apiColumns = [{ employeeId: '1', rows, totalAmount: 400, turns: 4 }];
  const before = JSON.stringify(apiColumns);
  const [col] = run([saved([{ price: 25 }], { turnType: 'appointment' })], apiColumns);
  assert.equal(col.totalAmount, 425); assert.equal(col.totalTurns, 5);
  assert.equal(col.rows[0].isSaved, true); assert.equal(col.rows.length, 5);
  assert.equal(JSON.stringify(apiColumns), before);
  const [closed] = run([], apiColumns);
  assert.equal(closed.hasSaved, false); assert.equal(closed.totalAmount, 400);
});
test('multi-technician Save uses line assignment with snapshot fallback; string IDs and employee order', () => {
  const ticket = saved([{ price: 100, employeeId: 'local-2', employeeName: 'Mai' }, { price: 50 }, { price: 20, employeeId: '1' }]);
  const columns = run([ticket], [{ employeeId: 'local-2', rows: [] }, { employeeId: '1', rows: [] }]);
  assert.deepEqual(columns.map((c) => c.name), ['MAN (1)', 'MAI (1)']);
  assert.deepEqual(columns.map((c) => c.totalAmount), [70, 100]);
  assert.ok(columns.every((c) => c.hasSaved && c.rows.length === 1 && c.rows[0].isSaved));
});
test('details require known service or customer; missing names and empty customer do not show badge', () => {
  for (const name of [undefined, '', '—']) assert.equal(run([saved([{ price: 10, name }])])[0].rows[0].hasDetails, false);
  assert.equal(run([saved([{ price: 10, name: 'Manicure' }])])[0].rows[0].hasDetails, true);
  const customer = { name: 'Test customer', phone: 'test-phone' };
  const row = run([saved([{ price: 10 }], { selectedCustomer: customer })])[0].rows[0];
  assert.equal(row.hasDetails, true); assert.deepEqual(row.details.customer, customer);
  assert.equal(run([], [{ employeeId: 1, rows: [{ serviceTotal: 10, turns: 0, customer: { id: null, phone: null }, services: [{ name: '—', price: 10 }] }] }])[0].rows[0].hasDetails, false);
});
test('offline, missing inputs, previous-day tickets and removal', () => {
  assert.deepEqual(build(), []);
  assert.deepEqual(run([{ ...saved([{ price: 25 }]), day: '2026-10-05' }]), []);
  assert.equal(build({ apiColumns: null, savedTickets: [saved([{ price: 25 }])], employees, dayYmd })[0].totalAmount, 25);
  assert.deepEqual(run([]), []);
});
test('API helper uses shared client and passes the salon day', async () => {
  const calls = [];
  const data = { success: true, date: dayYmd, columns: [] };
  const api = { get: async (...args) => { calls.push(args); return { data }; } };
  const fetchColumns = new Function('api', read('api/turns.js').replace(/^import .*;\n/gm, '').replaceAll('export ', '') + ';return fetchCheckTurnColumns;')(api);
  assert.equal(await fetchColumns(dayYmd), data);
  assert.deepEqual(calls, [['/api/turns/check-turn', { params: { date: dayYmd } }]]);
});
test('changed UI modules parse', () => {
  const parser = require('@babel/parser');
  for (const file of ['components/CheckTurnModal.jsx', 'components/PublicHomeScreen.jsx', 'app/(pos)/new-ticket.jsx']) {
    assert.doesNotThrow(() => parser.parse(read(file), { sourceType: 'module', plugins: ['jsx'] }));
  }
});
