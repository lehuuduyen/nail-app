import { mapHelcimApiPaymentToMeta } from './helcimPay';

/** Poll GET /api/helcim/transaction/:id sau khi gửi lệnh tới máy Ingenico / Helcim Smart Terminal. */
export async function pollHelcimTransactionApproved(api, transactionId, options = {}) {
  const maxAttempts = options.maxAttempts ?? 90;
  const intervalMs = options.intervalMs ?? 2000;
  const id = encodeURIComponent(String(transactionId));
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const { data } = await api.get(`/api/helcim/transaction/${id}`);
      if (data?.approved && data?.data) {
        const meta = mapHelcimApiPaymentToMeta(data.data);
        if (meta) return { ok: true, meta };
        const d = data.data;
        const tid =
          d.transactionId ||
          d.transaction_id ||
          d.id ||
          d.paymentId ||
          d.data?.transactionId;
        if (tid != null && tid !== '') {
          return {
            ok: true,
            meta: {
              helcimTransactionId: String(tid),
              helcimInvoiceNumber: d.invoiceNumber || null,
              helcimApprovalCode: d.approvalCode || null,
              helcimCardLast4: d.cardLast4 || d.card_last4 || null,
              helcimCardType: d.cardType || d.card_type || null,
              helcimFeeSaverAmount: Number(d.feeSaverAmount) || 0,
            },
          };
        }
      }
      const raw = data?.data;
      if (raw && typeof raw === 'object') {
        const st = String(raw.status || raw.paymentStatus || raw.transactionStatus || '').toUpperCase();
        if (st === 'DECLINED' || st === 'FAILED' || st === 'CANCELLED' || st === 'VOIDED') {
          return { ok: false, reason: st };
        }
      }
    } catch {
      /* tiếp tục poll */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { ok: false, reason: 'TIMEOUT' };
}
