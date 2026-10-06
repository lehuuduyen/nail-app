const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('zustand/vanilla');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const utils = new Function(read('utils/localTickets.js').replaceAll('export ', '') +
  '; return {cloneTicket, LOCAL_TICKET_KEY, parseTickets, phoenixDay, nextPhoenixMidnight, ticketSnapshot, ticketStaffNames};')();
const source = read('store/localTicketStore.js').replace(/^import .*;\n/gm, '').replaceAll('export ', '').replace('const useLocalTicketStore = createLocalTicketStore(AsyncStorage);', '');
const factory = new Function('create', ...Object.keys(utils), source + ';return createLocalTicketStore;')(createStore, ...Object.values(utils));
const posFactory = () => new Function('create', read('store/posStore.js').replace(/^import .*;\n/gm, '').replace('export const', 'const') + ';return usePosStore;')(createStore);
const ui = { selectedCustomer: { id: 5, name: 'Customer', phone: '5551234' }, turnType: 'appointment', linkedAppointmentId: 12, pendingLineStaff: { id: 8, name: 'B' } };
function sample() {
  const pos = posFactory();
  pos.setState({ staffId: 7, staffName: 'A', lines: [
    { id: 'line1', serviceId: 2, name: 'Custom', price: 42.75, qty: 3, employeeId: 7, employeeName: 'A' },
    { id: 'line2', serviceId: 'local-2', name: 'Design', price: 6.5, qty: 2, employeeId: 8, employeeName: 'B' },
  ], taxEnabled: true, taxRate: 0.0825, tip: 8.23, discount: 3.17, customLabel: 'Custom label' });
  return pos;
}
function storage(initial = null) {
  return { value: initial, writes: 0, fail: false,
    async getItem() { return this.value; },
    async setItem(key, value) { if (this.fail) throw Error('disk full'); this.writes++; this.value = value; },
  };
}
test('durable round trip, stable ID, isolated edits, A → B → A and clear', async () => {
  const disk = storage(); const store = factory(disk); const pos = sample();
  const snap = utils.ticketSnapshot(pos.getState(), ui); const total = pos.getState().getTotal();
  await store.getState().save('A', snap, total);
  pos.getState().lines[0].price = 999;
  assert.equal(store.getState().tickets[0].snapshot.lines[0].price, 42.75);
  const reopened = factory(disk); await reopened.getState().hydrate();
  const a = reopened.getState().tickets[0];
  pos.getState().restoreLocalTicket(a.id, a.snapshot);
  assert.equal(pos.getState().getTotal(), total);
  assert.deepEqual(utils.ticketSnapshot(pos.getState(), ui), snap);
  assert.equal(utils.ticketStaffNames(snap), 'A + B');
  pos.getState().restoreLocalTicket('B', { ...snap, lines: [] });
  assert.equal(pos.getState().lines.length, 0);
  pos.getState().restoreLocalTicket('A', a.snapshot);
  pos.getState().lines[0].qty = 7;
  assert.equal(a.snapshot.lines[0].qty, 3);
  await reopened.getState().save('A', utils.ticketSnapshot(pos.getState(), ui), pos.getState().getTotal());
  assert.equal(reopened.getState().tickets.length, 1);
  assert.equal(reopened.getState().tickets[0].createdAt, a.createdAt);
  pos.getState().clearTicket();
  assert.equal(pos.getState().localTicketId, null);
  assert.equal(pos.getState().lines.length, 0);
  reopened.getState().requestOpen('A'); const first = reopened.getState().openRequest.nonce;
  reopened.getState().consumeOpen(first); assert.equal(reopened.getState().openRequest, null);
  reopened.getState().requestOpen('A'); assert.ok(reopened.getState().openRequest.nonce > first);
  const newer = reopened.getState().openRequest;
  reopened.getState().consumeOpen(first); assert.equal(reopened.getState().openRequest, newer);
});
test('slow hydration, serialized concurrent saves, failed write retry without publishing', async () => {
  const pos = sample(); const snap = utils.ticketSnapshot(pos.getState(), ui);
  const disk = storage(); const seed = factory(disk); await seed.getState().save('old', snap, 1);
  let release; disk.getItem = () => new Promise((resolve) => { release = () => resolve(disk.value); });
  const store = factory(disk);
  const a = store.getState().save('A', snap, 2); const b = store.getState().save('B', snap, 3);
  await new Promise(setImmediate); assert.equal(disk.writes, 1); release(); await Promise.all([a, b]);
  assert.deepEqual(store.getState().tickets.map((t) => t.id), ['old', 'A', 'B']);
  disk.fail = true;
  await assert.rejects(store.getState().save('A', snap, 9));
  assert.equal(store.getState().tickets.find((t) => t.id === 'A').total, 2);
  disk.fail = false; await Promise.all([store.getState().save('A', snap, 9), store.getState().save('A', snap, 10)]);
  assert.equal(store.getState().tickets.length, 3);
  assert.equal(store.getState().tickets.find((t) => t.id === 'A').total, 10);
});
test('corrupt, unknown schema and failed reads cannot overwrite storage', async () => {
  for (const raw of ['broken', '{"version":2,"tickets":[]}', '{"version":1,"tickets":[{}]}']) {
    const disk = storage(raw); const store = factory(disk);
    await assert.rejects(store.getState().save('A', utils.ticketSnapshot(sample().getState(), ui), 1));
    assert.equal(disk.value, raw); assert.equal(disk.writes, 0); assert.ok(store.getState().error);
  }
  const disk = storage(); disk.getItem = async () => { throw Error('read failed'); };
  const store = factory(disk); await assert.rejects(store.getState().hydrate());
  assert.equal(store.getState().hydrated, false); assert.equal(disk.writes, 0);
  disk.getItem = async () => null; await store.getState().hydrate(); assert.equal(store.getState().hydrated, true);
});
test('Phoenix boundary independent of device zone; original day retained on edit', async () => {
  assert.equal(utils.phoenixDay(new Date('2026-10-06T06:59:59Z')), '2026-10-05');
  assert.equal(utils.phoenixDay(new Date('2026-10-06T07:00:00Z')), '2026-10-06');
  assert.equal(utils.nextPhoenixMidnight(new Date('2026-10-06T06:59:59Z')), 1000);
  const disk = storage(); const store = factory(disk); const snap = utils.ticketSnapshot(sample().getState(), ui);
  await store.getState().save('A', snap, 1);
  const data = JSON.parse(disk.value); data.tickets[0].day = '2000-01-01'; disk.value = JSON.stringify(data);
  const next = factory(disk); await next.getState().save('A', snap, 2);
  assert.equal(next.getState().tickets[0].day, '2000-01-01');
  assert.equal(next.getState().tickets.filter((t) => t.day === utils.phoenixDay()).length, 0);
  assert.equal(JSON.parse(disk.value).tickets.length, 1);
});
test('Cancel serializes with saves, waits for hydration, preserves other tickets and survives restart', async () => {
  const disk = storage(); const snap = utils.ticketSnapshot(sample().getState(), ui);
  const seed = factory(disk); await seed.getState().save('old', snap, 1);
  let release;
  disk.getItem = () => new Promise((resolve) => { release = () => resolve(disk.value); });
  const store = factory(disk);
  const save = store.getState().save('A', snap, 2);
  const cancel = store.getState().remove('A');
  const other = store.getState().save('B', snap, 3);
  await new Promise(setImmediate); assert.equal(disk.writes, 1);
  release(); await Promise.all([save, cancel, other]);
  assert.deepEqual(store.getState().tickets.map((t) => t.id), ['old', 'B']);
  disk.getItem = async () => disk.value;
  const restarted = factory(disk); await restarted.getState().hydrate();
  assert.deepEqual(restarted.getState().tickets.map((t) => t.id), ['old', 'B']);
});
test('Cancel write failure retains receipt until retry; corrupt storage cannot be erased', async () => {
  const disk = storage(); const store = factory(disk);
  await store.getState().save('A', utils.ticketSnapshot(sample().getState(), ui), 1);
  const original = disk.value; disk.fail = true;
  await assert.rejects(store.getState().remove('A'));
  assert.equal(disk.value, original); assert.equal(store.getState().tickets.length, 1);
  disk.fail = false; await store.getState().remove('A');
  assert.equal(store.getState().tickets.length, 0);
  const broken = storage('broken');
  await assert.rejects(factory(broken).getState().remove('A'));
  assert.equal(broken.value, 'broken'); assert.equal(broken.writes, 0);
});
