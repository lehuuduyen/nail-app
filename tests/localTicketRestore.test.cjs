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
    openRequest, appliedOpenRef, staffParamsAppliedRef: { current: false }, observedGenerationRef: { current: 0 },
    useLocalTicketStore: { getState: () => ({ tickets }) },
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
