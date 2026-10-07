const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const formatEmployeeNameFromDb = new Function(read('utils/staffDisplay.js').replace(/^import .*;\n/gm, '').replaceAll('export ', '') + ';return formatEmployeeNameFromDb;')();
const splitByWeights = new Function(read('utils/splitTicketPayment.js').replaceAll('export ', '') + ';return splitByWeights;')();
const build = new Function('splitByWeights', 'formatEmployeeNameFromDb', read('utils/checkTurnColumns.js').replace(/^import .*;\n/gm, '').replaceAll('export ', '') + ';return buildCheckTurnColumns;')(splitByWeights, formatEmployeeNameFromDb);
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

test('successful persistence removes only the captured Save ID after all server rows, even after POS reset', async () => {
  const events = [];
  let tickets = [saved([{ price: 100 }]), { ...saved([{ price: 50 }]), id: 'other' }];
  const source = read('app/(pos)/new-ticket.jsx').split('const persistPayloadsToApi = useCallback(')[1].split('\n  }, []);')[0] + '\n  }';
  const persist = new Function('api', 'usePosStore', 'useLocalTicketStore', 'Alert', `return (${source});`)(
    { post: async () => { events.push('post'); } },
    { getState: () => ({ localTicketId: null, bumpHomeRefresh: () => events.push('refresh') }) },
    { getState: () => ({ remove: async (id) => { events.push(id); tickets = tickets.filter((t) => t.id !== id); } }) },
    { alert: () => assert.fail('Unexpected alert') }
  );
  assert.equal(await persist([{ canApi: true, body: {}, localTicketId: 'ticket' }, { canApi: true, body: {}, localTicketId: 'ticket' }]), true);
  assert.deepEqual(events, ['post', 'post', 'ticket', 'refresh']);
  assert.deepEqual(tickets.map((t) => t.id), ['other']);
  const [column] = run(tickets.filter((t) => t.id === 'ticket'), [{ employeeId: 1, rows: [{ serviceTotal: 100, turns: 1 }] }]);
  assert.equal(column.totalAmount, 100); assert.equal(column.totalTurns, 1); assert.equal(column.hasSaved, false);
});

test('failed server save retains local copy; storage retry never repeats transaction posts', async () => {
  const source = read('app/(pos)/new-ticket.jsx').split('const persistPayloadsToApi = useCallback(')[1].split('\n  }, []);')[0] + '\n  }';
  let postFails = true; let diskFails = true; let posts = 0; let removes = 0; let retry;
  const persist = new Function('api', 'usePosStore', 'useLocalTicketStore', 'Alert', `return (${source});`)(
    { post: async () => { posts++; if (postFails) throw Error('offline'); } },
    { getState: () => ({ bumpHomeRefresh() {} }) },
    { getState: () => ({ remove: async () => { removes++; if (diskFails) throw Error('disk full'); } }) },
    { alert: (title, message, buttons) => { if (buttons) retry = buttons[0].onPress; } }
  );
  const payloads = [{ canApi: true, body: {}, localTicketId: 'ticket' }];
  assert.equal(await persist(payloads), false); assert.equal(removes, 0);
  postFails = false;
  assert.equal(await persist(payloads), true); assert.equal(posts, 2); assert.equal(removes, 1);
  diskFails = false;
  await retry(); assert.equal(posts, 2); assert.equal(removes, 2);
  assert.equal(await persist([{ canApi: false, body: {}, localTicketId: 'ticket' }]), true);
  assert.equal(removes, 3); // Local completion also closes the Save copy.
});

test('periodic refresh updates Check Turn independently of rotation and handles offline', async () => {
  const source = read('components/PublicHomeScreen.jsx').split('const refreshTurnsOnly = useCallback(')[1].split('\n  }, []);')[0] + '\n  }';
  let failRotation = true; let failColumns = false; let columns; let rotation;
  const refresh = new Function('phoenixDay', 'getSalonDateYmd', 'fetchTurnsForDate', 'fetchCheckTurnColumns', 'setCheckTurnSnapshot', 'setTurnSnapshot', `return (${source});`)(
    () => dayYmd, () => '2026-10-07',
    async () => { if (failRotation) throw Error('offline'); return { employees: [], suggested: 7, total: 4 }; },
    async (date) => { assert.equal(date, dayYmd); if (failColumns) throw Error('offline'); return { columns: [] }; },
    (value) => { columns = value; }, (value) => { rotation = value; }
  );
  await refresh(); assert.deepEqual(columns, { columns: [] }); assert.equal(rotation, undefined);
  failRotation = false; failColumns = true;
  await refresh(); assert.equal(columns, null); assert.equal(rotation.suggested, 7); assert.equal(rotation.rotationTotal, 4);
});

test('turn threshold uses discounted service money while gross display stays unchanged', () => {
  for (const [discount, turns] of [[5.01, 0], [5, 1], [4.99, 1], [10, 0], [40, 0]]) {
    const [col] = run([saved([{ price: 30 }], { discount, tip: 100, taxEnabled: true, taxRate: 0.1 })]);
    assert.equal(col.totalAmount, 30);
    assert.equal(col.totalTurns, turns);
  }
  const columns = run([saved([{ price: 30 }, { price: 60, employeeId: 'local-2' }], { discount: 30 })]);
  assert.deepEqual(columns.map((c) => c.totalAmount), [30, 60]);
  assert.deepEqual(columns.map((c) => c.totalTurns), [0, 1]);
});

test('checkout sends the same discounted basis as Save without changing payment allocation', () => {
  const source = read('app/(pos)/new-ticket.jsx').split('const buildLinePayloads = useCallback(')[1].split('\n    [lines, staffId,')[0].trim().replace(/,$/, '');
  const lines = [{ price: 30, name: 'A', serviceId: 1 }, { price: 60, name: 'B', serviceId: 2 }];
  const state = { tip: 12.34, discount: 30, localTicketId: 'saved' };
  const make = new Function('usePosStore', 'getCardFeeBase', 'lines', 'splitByWeights', 'staffId', 'fallbackServiceId', 'turnType', 'linkedAppointmentId', 'selectedCustomer', 'isApiNumericId', `return (${source});`)(
    { getState: () => state }, () => 69, lines, splitByWeights, 1, 1, 'appointment', null, null, Number.isFinite
  );
  for (const method of ['cash', 'card']) {
    const bodies = make(method, dayYmd).map((p) => p.body);
    assert.deepEqual(bodies.map((b) => b.serviceAmount), [30, 60]);
    assert.deepEqual(bodies.map((b) => b.serviceAmountNet), [20, 40]);
    assert.deepEqual(bodies.map((b) => b.tips), [4.11, 8.23]);
    assert.deepEqual(bodies.map((b) => b.amount), method === 'cash' ? [27.11, 54.23] : [27.8, 55.61]);
    assert.equal(run([saved(lines, state)])[0].totalTurns, bodies.filter((b) => b.serviceAmountNet >= 25).length);
  }
});
