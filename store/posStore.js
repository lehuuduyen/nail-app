import { create } from 'zustand';

const CARD_FEE_RATE = 0.03;

export const usePosStore = create((set, get) => ({
  /** Tăng sau khi đóng vé thành công — Home đọc để gọi lại load() (turn + receipt). */
  homeRefreshNonce: 0,
  bumpHomeRefresh: () => set((s) => ({ homeRefreshNonce: s.homeRefreshNonce + 1 })),

  localTicketId: null,
  ticketGeneration: 0,
  restoreLocalTicket: (id, snapshot) => set({
    ...JSON.parse(JSON.stringify(Object.fromEntries(
      ['lines', 'staffId', 'staffName', 'taxEnabled', 'taxRate', 'tip', 'discount', 'customLabel']
        .map((key) => [key, snapshot[key]])
    ))), localTicketId: id,
  }),
  staffId: null,
  staffName: null,
  lines: [],
  taxEnabled: false,
  taxRate: 0.0825,
  tip: 0,
  discount: 0,
  customLabel: '',
  // Legacy navigation callers (including both Appointments POS buttons) call
  // setStaff before opening the mounted tab. Preserve that intent even for the
  // same technician or null staff; staff equality is not a new-ticket signal.
  staffRequestNonce: 0,
  pendingStaffRequest: null,
  setStaff: (staffId, staffName, startNewTicket = true) => set((s) => ({
    staffId, staffName,
    ...(startNewTicket ? {
      staffRequestNonce: s.staffRequestNonce + 1,
      pendingStaffRequest: { nonce: s.staffRequestNonce + 1, staffId, staffName },
    } : {}),
  })),
  consumeStaffRequest: (nonce) => set((s) =>
    s.pendingStaffRequest?.nonce === nonce ? { pendingStaffRequest: null } : {}),
  addLine: (line) =>
    set((s) => ({
      lines: [...s.lines, { ...line, id: `${Date.now()}-${Math.random()}` }],
    })),
  removeLine: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
  clearTicket: () =>
    set((s) => ({
      localTicketId: null,
      ticketGeneration: s.ticketGeneration + 1,
      lines: [],
      tip: 0,
      discount: 0,
      taxEnabled: false,
      customLabel: '',
      staffId: null,
      staffName: null,
    })),
  setTaxEnabled: (v) => set({ taxEnabled: v }),
  setTip: (v) => set({ tip: Number(v) || 0 }),
  setDiscount: (v) => set({ discount: Number(v) || 0 }),
  getSubtotal: () => get().lines.reduce((a, l) => a + Number(l.price) * (l.qty || 1), 0),
  getTaxAmount: () => {
    const s = get();
    if (!s.taxEnabled) return 0;
    return s.getSubtotal() * (s.taxRate || 0);
  },
  getTotal: () => {
    const s = get();
    const sub = s.getSubtotal();
    const tax = s.getTaxAmount();
    return Math.max(0, sub + tax + s.tip - s.discount);
  },
  /** Phần chịu phí thẻ: dịch vụ + thuế − giảm giá (không gồm tip). */
  getCardFeeBase: () => {
    const s = get();
    const sub = s.getSubtotal();
    const tax = s.getTaxAmount();
    return Math.max(0, sub + tax - s.discount);
  },
  /** Tip không bị tính phí 3% — chỉ (base × 3%) + tip. */
  getCardTotal: () => {
    const s = get();
    const base = s.getCardFeeBase();
    return base * (1 + CARD_FEE_RATE) + s.tip;
  },
  getCashTotal: () => get().getTotal(),
}));
