/**
 * In hoá đơn qua Bluetooth dùng high-level BluetoothEscposPrinter API.
 * Cùng dữ liệu `d` với buildReceiptEscPos (escpos.js), đầu ra tương đương.
 * Không hỗ trợ in bitmap chữ ký (dùng dòng ký thay thế).
 *
 * @param {object} d  receiptData
 * @param {object} BEP  BluetoothEscposPrinter từ react-native-bluetooth-escpos-printer
 */

const CARD_FEE = 0.03;
const LINE_WIDTH = 32;

function pad(str, width) {
  return String(str ?? '').padEnd(width, ' ');
}

function twoCols(left, right) {
  const r = String(right ?? '');
  const maxLeft = Math.max(LINE_WIDTH - r.length - 1, 1);
  const l = String(left ?? '').slice(0, maxLeft).padEnd(maxLeft, ' ');
  return `${l} ${r}`;
}

function divider() {
  return '-'.repeat(LINE_WIDTH);
}

function groupByTech(lines) {
  const groups = [];
  for (const l of lines) {
    const name = l.employeeName || l.staffName || '';
    if (groups.length === 0 || groups[groups.length - 1].techName !== name) {
      groups.push({ techName: name, items: [l] });
    } else {
      groups[groups.length - 1].items.push(l);
    }
  }
  return groups;
}

export async function printReceiptViaBt(d, BEP) {
  const {
    paymentMethod = 'card',
    lines = [],
    subtotal = 0,
    tip = 0,
    total = 0,
    staffName = '',
    date = '',
    cardBrand = '',
    cardLast4 = '',
    cardholderName = '',
    entryMode = 'contactless',
    authCode = '',
    aidLabel = '',
    aid = '',
    cashTender = 0,
    cashChange = 0,
    cashPortion = 0,
    cardPortion = 0,
  } = d;

  const isCard = paymentMethod === 'card';
  const isSplit = paymentMethod === 'split';
  const isCash = paymentMethod === 'cash';
  const chargeAmt = isCard ? (total - tip) : (isSplit ? (cashPortion + cardPortion) : total);

  const salonName = process.env.EXPO_PUBLIC_SALON_NAME || 'NICE NAILS & SPA';
  const salonAddr = process.env.EXPO_PUBLIC_SALON_ADDRESS || '8048 N 19Th Ave';
  const salonCity = process.env.EXPO_PUBLIC_SALON_CITY || 'Phoenix AZ 85021';
  const salonPhone = process.env.EXPO_PUBLIC_SALON_PHONE || '(602) 759-9184';

  const p = BEP;
  const ALIGN = p.ALIGN;
  const opts = { encoding: 'CP437', codepage: 16 };

  const lp = async (text) => p.printText(`${text}\n`, opts);
  const center = async (text) => {
    await p.printerAlign(ALIGN.CENTER);
    await lp(text);
    await p.printerAlign(ALIGN.LEFT);
  };
  const bold = async (fn) => {
    await p.setBlob(1);
    await fn();
    await p.setBlob(0);
  };

  await p.printerInit();

  await center('Customer Receipt');
  await bold(() => center(salonName));
  await center(salonAddr);
  await center(salonCity);
  await center(salonPhone);
  await lp(divider());
  await lp(`Date: ${date}`);
  if (staffName) await lp(`Tech: ${staffName}`);
  await lp(divider());

  for (const g of groupByTech(lines)) {
    if (g.techName) {
      await bold(() => lp(`Tech: ${g.techName}`));
    }
    for (const l of g.items) {
      const cp = Number(l.price) * (l.qty || 1) * (1 + CARD_FEE);
      const bp = Number(l.price) * (l.qty || 1);
      await lp(twoCols(l.name || '', `${cp.toFixed(2)}/${bp.toFixed(2)}`));
    }
  }
  await lp(divider());

  await lp(`CARD TOTAL: $${(subtotal * (1 + CARD_FEE)).toFixed(2)}`);
  await lp(`CASH TOTAL: $${subtotal.toFixed(2)}`);
  await bold(() => lp('***PAYMENT DETAILS***'));

  if (isCard) {
    await lp(`Credit/Debit: $${total.toFixed(2)}`);
    if (cardLast4) await lp(`Note: Last4#:${cardLast4}`);
  } else if (isSplit) {
    await lp(`Credit/Debit: $${cardPortion.toFixed(2)}`);
    if (cardLast4) await lp(`Note: Last4#:${cardLast4}`);
    await lp(`Cash: $${cashPortion.toFixed(2)}`);
  } else {
    await lp(`Cash: $${total.toFixed(2)}`);
  }

  await lp('Note: ');
  await bold(() => lp(`TOTAL CHARGE: $${chargeAmt.toFixed(2)}`));
  await lp(`Tip Added: $${tip.toFixed(2)}`);
  await bold(() => lp(`GRAND TOTAL: $${(chargeAmt + tip).toFixed(2)}`));

  if ((isCard || isSplit) && cardLast4) {
    await lp(divider());
    await bold(() => lp(`${(cardBrand || 'CARD').toUpperCase()}-${cardLast4}`));
    await lp(`CARDHOLDER${cardholderName ? ': ' + String(cardholderName).toUpperCase() : ''}`);
    await lp(`Card Entry: ${(entryMode || '').toUpperCase()}`);
    if (authCode) await lp(`Auth Code: ${authCode}`);
    if (aid) await lp(`AID: ${aid}`);
    if (aidLabel) await lp(`App Label: ${aidLabel}`);
  }

  if (isCard || isSplit) {
    await lp(divider());
    await bold(() => center("CUSTOMER'S SIGNATURE"));
    await lp('');
    await lp('');
    await lp('');
    await lp('x' + '_'.repeat(LINE_WIDTH - 1));
  }

  if (isCash) {
    await lp(divider());
    await lp(`Cash Tender: $${cashTender.toFixed(2)}`);
    await lp(`Change: $${cashChange.toFixed(2)}`);
  }

  await lp(divider());
  await center('I agree to pay this amount');
  await center('All sales are final');
  await center('Keep this receipt for record');
  await center('By paying, I confirm that');
  await center('I received services up to');
  await bold(() => center('my satisfaction'));
  await lp(divider());

  await p.printAndFeed(3);
}
