const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'app/(pos)/new-ticket.jsx'), 'utf8');
const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
const screen = ast.program.body.find((n) => n.type === 'ExportDefaultDeclaration').declaration;
const save = screen.body.body.find((n) => n.type === 'VariableDeclaration' && n.declarations[0].id.name === 'saveLocalTicket').declarations[0].init;
function evaluate(node, bindings) {
  return new Function(...Object.keys(bindings), `return (${code.slice(node.start, node.end)});`)(...Object.values(bindings));
}
test('Save handler blocks double tap, waits for success and retries same ID without network/payment bindings', async () => {
  let finish; let calls = 0; let fail = false;
  const alerts = []; const ids = [];
  const state = { localTicketId: null, getTotal: () => 123 };
  const handler = evaluate(save, {
    saveBusyRef: { current: false }, setSaving: () => {},
    usePosStore: { getState: () => state, setState: (s) => Object.assign(state, s) },
    useLocalTicketStore: { getState: () => ({ save: (id) => {
      calls++; ids.push(id);
      return new Promise((resolve, reject) => { finish = () => fail ? reject(Error('storage')) : resolve(); });
    } }) },
    newTicketId: () => 'stable', ticketSnapshot: () => ({}),
    selectedCustomer: null, turnType: 'walk_in', linkedAppointmentId: null, pendingLineStaff: null,
    Alert: { alert: (...args) => alerts.push(args) },
  });
  const first = handler(); await handler(); assert.equal(calls, 1); assert.equal(alerts.length, 0);
  fail = true; finish(); await first; assert.equal(alerts[0][0], 'Không lưu được ticket');
  fail = false; const retry = handler(); finish(); await retry;
  assert.deepEqual(ids, ['stable', 'stable']); assert.equal(alerts[1][0], 'Save');
});
test('focus request restores component state once per request, switches tickets and resets a new ticket', () => {
  const expression = screen.body.body.find((n) => n.type === 'ExpressionStatement' &&
    n.expression.callee?.name === 'useFocusEffect');
  const callback = expression.expression.arguments[0].arguments[0];
  const appliedOpenRef = { current: null }; const state = { ticketGeneration: 0 };
  const values = {}; let restores = 0;
  const snapshot = { selectedCustomer: { id: 1, name: 'A' }, turnType: 'appointment', linkedAppointmentId: 9, pendingLineStaff: { id: 2 } };
  const tickets = [{ id: 'A', snapshot }, { id: 'B', snapshot: { ...snapshot, selectedCustomer: null, linkedAppointmentId: 4 } }];
  const setters = Object.fromEntries(['SelectedCustomer','TurnType','LinkedAppointmentId','PendingLineStaff','CustomOpen','SvcPriceModal','CustomerModalOpen','TechModalOpen','DiscountOpen','TipOpen','DiscountInput','TipInput','AmountStr','CustomBaseServices','CustomName'].map((key) => [`set${key}`, (v) => { values[key] = v; }]));
  const run = (openRequest) => evaluate(callback, {
    openRequest, params: {}, router: { setParams: () => {} }, routeParamFirst: (v) => v || '', TURN_TYPE_OPTIONS: [], appliedOpenRef, staffParamsAppliedRef: { current: false }, observedGenerationRef: { current: 0 },
    useLocalTicketStore: { getState: () => ({ tickets, openRequest, consumeOpen: () => {} }) },
    usePosStore: { getState: () => ({ ...state, restoreLocalTicket: (id) => { state.id = id; restores++; },
      clearTicket: () => { state.id = null; state.ticketGeneration++; }, setStaff: (id) => { state.staffId = id; } }) },
    ...setters,
  })();
  run({ nonce: 1, id: 'A' }); assert.equal(values.LinkedAppointmentId, 9);
  values.SelectedCustomer.name = 'Edited'; assert.equal(snapshot.selectedCustomer.name, 'A');
  run({ nonce: 1, id: 'A' }); assert.equal(restores, 1);
  run({ nonce: 2, id: 'B' }); assert.equal(values.SelectedCustomer, null); assert.equal(state.id, 'B');
  run({ nonce: 3, id: 'A' }); assert.equal(values.SelectedCustomer.name, 'A');
  run({ nonce: 4, id: null, defaults: { staffId: 7, turnType: 'customer_pick' } });
  assert.equal(state.id, null); assert.equal(state.staffId, 7); assert.equal(values.LinkedAppointmentId, null);
  assert.equal(values.TurnType, 'customer_pick'); assert.equal(values.SelectedCustomer, null);
});
test('all changed JavaScript/JSX parses', () => {
  for (const file of ['app/(pos)/new-ticket.jsx', 'components/PublicHomeScreen.jsx', 'components/CustomerReceipts.jsx', 'store/posStore.js', 'store/localTicketStore.js', 'utils/localTickets.js']) {
    parser.parse(fs.readFileSync(path.join(root, file), 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  }
});

test('Home → Appointment and receipt A → Appointment → Save detach ID and preserve A', async () => {
  const { createStore } = require('zustand/vanilla');
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const utils = new Function(read('utils/localTickets.js').replaceAll('export ', '') + '; return {cloneTicket, LOCAL_TICKET_KEY, parseTickets, phoenixDay, ticketSnapshot};')();
  const storeSource = read('store/localTicketStore.js').replace(/^import .*;\n/gm, '').replaceAll('export ', '').replace('const useLocalTicketStore = createLocalTicketStore(AsyncStorage);', '');
  const factory = new Function('create', ...Object.keys(utils), storeSource + ';return createLocalTicketStore;')(createStore, ...Object.values(utils));
  const local = factory({ getItem: async () => null, setItem: async () => {} });
  const pos = new Function('create', read('store/posStore.js').replace(/^import .*;\n/gm, '').replace('export const', 'const') + ';return usePosStore;')(createStore);
  const expression = screen.body.body.find((n) => n.type === 'ExpressionStatement' && n.expression.callee?.name === 'useFocusEffect');
  const callback = expression.expression.arguments[0].arguments[0];
  const values = {}; const params = {};
  const setters = Object.fromEntries(['SelectedCustomer','TurnType','LinkedAppointmentId','PendingLineStaff','CustomOpen','SvcPriceModal','CustomerModalOpen','TechModalOpen','DiscountOpen','TipOpen','DiscountInput','TipInput','AmountStr','CustomBaseServices','CustomName'].map((key) => [`set${key}`, (v) => { values[key] = v; }]));
  const bindings = { usePosStore: pos, useLocalTicketStore: local, params,
    router: { setParams: (next) => Object.assign(params, next) },
    routeParamFirst: (v) => String(v ?? ''), TURN_TYPE_OPTIONS: [{ key: 'appointment' }],
    appliedOpenRef: { current: null }, staffParamsAppliedRef: { current: false }, observedGenerationRef: { current: 0 }, ...setters };
  const focus = () => evaluate(callback, bindings)();
  const ui = () => ({ selectedCustomer: values.SelectedCustomer, turnType: values.TurnType, linkedAppointmentId: values.LinkedAppointmentId, pendingLineStaff: values.PendingLineStaff });
  local.getState().requestOpen(null, { staffId: 7 }); focus();
  assert.equal(local.getState().openRequest, null);
  pos.getState().setStaff(8, 'Appointment tech');
  Object.assign(params, { appointmentId: '42', defaultTurnType: 'appointment' }); focus();
  assert.equal(values.LinkedAppointmentId, 42); assert.equal(values.TurnType, 'appointment');
  assert.equal(pos.getState().staffId, 8);
  pos.getState().addLine({ name: 'A service', price: 40 });
  await local.getState().save('A', utils.ticketSnapshot(pos.getState(), ui()), 40);
  const original = JSON.stringify(local.getState().tickets[0]);
  local.getState().requestOpen('A'); focus();
  assert.equal(pos.getState().localTicketId, 'A');
  focus(); assert.equal(pos.getState().localTicketId, 'A'); // subscription rerender / refocus
  pos.getState().setStaff(9, 'Next tech');
  Object.assign(params, { appointmentId: '42', defaultTurnType: 'appointment' }); focus();
  assert.equal(pos.getState().localTicketId, null);
  assert.deepEqual(pos.getState().lines, []);
  assert.equal(values.SelectedCustomer, null); assert.equal(values.LinkedAppointmentId, 42);
  pos.getState().addLine({ name: 'Appointment service', price: 25 });
  const handler = evaluate(save, { ...bindings, saveBusyRef: { current: false }, setSaving: () => {},
    newTicketId: () => 'appointment-draft', ticketSnapshot: utils.ticketSnapshot,
    ...ui(), Alert: { alert: () => {} } });
  await handler();
  assert.equal(JSON.stringify(local.getState().tickets.find((t) => t.id === 'A')), original);
  assert.equal(local.getState().tickets.find((t) => t.id === 'appointment-draft').snapshot.linkedAppointmentId, 42);
  // Stale appointment params must never replace a requested receipt.
  params.appointmentId = '99'; local.getState().requestOpen('A'); focus(); focus();
  assert.equal(pos.getState().localTicketId, 'A'); assert.equal(values.LinkedAppointmentId, 42);
});

// Exercise the actual legacy navigation callbacks without changing Appointments.
for (const button of ['Chỉ mở vé POS', 'Mở vé POS']) {
  test(`Appointments ${button}: saved A → new ticket, repeated same staff, and no duplicate reset`, async () => {
    const { createStore } = require('zustand/vanilla');
    const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
    const pos = new Function('create', read('store/posStore.js').replace(/^import .*;\n/gm, '').replace('export const', 'const') + ';return usePosStore;')(createStore);
    const utils = new Function(read('utils/localTickets.js').replaceAll('export ', '') + ';return {ticketSnapshot};')();
    const snapshot = { lines: [{ id: 'line-A', serviceId: 1, name: 'A service', price: 40, qty: 2 }], staffId: 8, staffName: 'B',
      taxEnabled: true, taxRate: 0.0825, tip: 5, discount: 2, customLabel: 'A',
      selectedCustomer: { id: 3, name: 'Customer A' }, linkedAppointmentId: 42, turnType: 'appointment', pendingLineStaff: { id: 8 } };
    const tickets = [{ id: 'A', snapshot }];
    const original = JSON.stringify(tickets[0]);
    const local = { tickets, openRequest: { id: 'A', nonce: 1 }, consumeOpen() { this.openRequest = null; },
      async save(id, data, total) { tickets.push({ id, snapshot: data, total }); } };
    const values = {}; const params = {};
    const setters = Object.fromEntries(['SelectedCustomer','TurnType','LinkedAppointmentId','PendingLineStaff','CustomOpen','SvcPriceModal','CustomerModalOpen','TechModalOpen','DiscountOpen','TipOpen','DiscountInput','TipInput','AmountStr','CustomBaseServices','CustomName'].map((key) => [`set${key}`, (v) => { values[key] = v; }]));
    const bindings = { usePosStore: pos, useLocalTicketStore: { getState: () => local }, params,
      router: { setParams: (next) => Object.assign(params, next) }, routeParamFirst: (v) => String(v ?? ''),
      TURN_TYPE_OPTIONS: [{ key: 'appointment' }], appliedOpenRef: { current: null }, staffParamsAppliedRef: { current: false }, observedGenerationRef: { current: 0 }, ...setters };
    const expression = screen.body.body.find((n) => n.type === 'ExpressionStatement' && n.expression.callee?.name === 'useFocusEffect');
    const focus = () => evaluate(expression.expression.arguments[0].arguments[0], bindings)();
    const appointments = read('app/(pos)/appointments.jsx');
    const tree = parser.parse(appointments, { sourceType: 'module', plugins: ['jsx'] });
    let onPress;
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'ObjectExpression' && node.properties.some((p) => p.key?.name === 'text' && p.value?.value === button)) {
        onPress = node.properties.find((p) => p.key?.name === 'onPress').value;
      }
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
    visit(tree); assert.ok(onPress);
    const navigate = new Function('usePosStore', 'router', 'staffName', 'staffIdParam', `return (${appointments.slice(onPress.start, onPress.end)});`)(
      pos, { push: () => {} }, 'B', '8'); // Mounted tab may retain params: do not rely on push updating them.
    for (let i = 0; i < 2; i++) {
      local.openRequest = { id: 'A', nonce: i + 2 }; focus();
      assert.equal(pos.getState().localTicketId, 'A');
      navigate();
      const nonce = pos.getState().pendingStaffRequest.nonce;
      focus();
      assert.equal(pos.getState().localTicketId, null);
      assert.deepEqual(pos.getState().lines, []);
      assert.equal(pos.getState().staffId, button === 'Mở vé POS' ? null : 8);
      assert.equal(values.SelectedCustomer, null); assert.equal(values.LinkedAppointmentId, null);
      assert.equal(values.PendingLineStaff, null); assert.equal(values.TurnType, 'walk_in');
      assert.equal(pos.getState().tip, 0); assert.equal(pos.getState().discount, 0);
      assert.equal(pos.getState().taxEnabled, false); assert.equal(pos.getState().customLabel, '');
      assert.equal(pos.getState().pendingStaffRequest, null);
      pos.getState().addLine({ name: 'New service', price: 25 });
      focus(); assert.equal(pos.getState().lines.length, 1);
      const handler = evaluate(save, { ...bindings, saveBusyRef: { current: false }, setSaving: () => {},
        newTicketId: () => `new-${nonce}`, ticketSnapshot: utils.ticketSnapshot,
        selectedCustomer: values.SelectedCustomer, turnType: values.TurnType,
        linkedAppointmentId: values.LinkedAppointmentId, pendingLineStaff: values.PendingLineStaff,
        Alert: { alert: () => {} } });
      await handler();
      assert.equal(pos.getState().localTicketId, `new-${nonce}`);
      assert.equal(JSON.stringify(tickets[0]), original);
    }
    assert.equal(new Set(tickets.map((t) => t.id)).size, 3);
  });
}
