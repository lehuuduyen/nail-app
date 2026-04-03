/**
 * Parse payload từ HelcimPay.js SUCCESS (eventMessage là JSON / nested).
 */
export function parseHelcimSuccessPayload(raw) {
  if (raw == null || raw === '') return null;
  let o = raw;
  if (typeof o === 'string') {
    try {
      o = JSON.parse(o);
    } catch {
      return null;
    }
  }
  if (typeof o === 'string') {
    try {
      o = JSON.parse(o);
    } catch {
      return null;
    }
  }
  const inner = o?.data?.data ?? o?.data ?? o;
  if (!inner || typeof inner !== 'object') return null;
  const tid = inner.transactionId ?? inner.id ?? inner.paymentId;
  if (tid == null || tid === '') return null;
  const cardNum = String(inner.cardNumber || inner.maskedCardNumber || '')
    .replace(/\D/g, '');
  const last4 =
    cardNum.length >= 4
      ? cardNum.slice(-4)
      : inner.cardLast4 != null
        ? String(inner.cardLast4).slice(-4)
        : null;
  return {
    helcimTransactionId: String(tid),
    helcimInvoiceNumber: inner.invoiceNumber || null,
    helcimApprovalCode: inner.approvalCode || null,
    helcimCardLast4: last4,
    helcimCardType: inner.cardType || null,
    helcimFeeSaverAmount: Number(inner.feeSaverAmount) || 0,
  };
}

/** Meta từ GET /payment/:id (Smart Terminal) — cùng logic unwrap với Pay.js. */
export function mapHelcimApiPaymentToMeta(raw) {
  if (raw == null || typeof raw !== 'object') return null;
  try {
    return parseHelcimSuccessPayload(JSON.stringify(raw));
  } catch {
    return null;
  }
}

export function buildHelcimPayHtml(checkoutToken) {
  const tokenJson = JSON.stringify(String(checkoutToken));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="https://secure.helcim.app/helcim-pay/services/start.js"></script>
  <style>body{margin:0;background:#f0f0f0;font-family:system-ui,sans-serif;}</style>
</head>
<body>
<script>
(function () {
  var TOKEN = ${tokenJson};
  function send(obj) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    } catch (e) {}
  }
  function parseMsg(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    return typeof raw === 'object' ? raw : null;
  }
  window.addEventListener('message', function (event) {
    var key = 'helcim-pay-js-' + TOKEN;
    var d = parseMsg(event && event.data);
    if (!d || d.eventName !== key) return;
    if (d.eventStatus === 'SUCCESS') {
      send({ type: 'helcim', status: 'SUCCESS', message: d.eventMessage });
      return;
    }
    if (d.eventStatus === 'ABORTED') {
      send({ type: 'helcim', status: 'ABORTED', message: d.eventMessage || 'Declined' });
      return;
    }
    if (d.eventStatus === 'HIDE') {
      send({ type: 'helcim', status: 'HIDE' });
    }
  });
  function openPay() {
    if (typeof appendHelcimPayIframe === 'function') {
      appendHelcimPayIframe(TOKEN, true);
      send({ type: 'helcim', status: 'READY' });
    } else {
      setTimeout(openPay, 120);
    }
  }
  if (document.readyState === 'complete') {
    setTimeout(openPay, 200);
  } else {
    window.addEventListener('load', function () { setTimeout(openPay, 200); });
  }
})();
</script>
</body>
</html>`;
}
