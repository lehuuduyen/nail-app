import { Buffer } from 'buffer';

// ESC/POS — bộ lệnh chuẩn cho máy in nhiệt (58mm, ~32 ký tự/dòng ở Font A).
const ESC = 0x1b;
const GS = 0x1d;
const LINE_WIDTH = 32;
const CARD_FEE = 0.03;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  FEED_LINE: [0x0a],
  CUT_PARTIAL: [GS, 0x56, 0x42, 0x00],
};

// Kích thước bitmap chữ ký in trên giấy 58mm (đầu in ~384 dot ngang ở 8 dot/mm).
// Giữ tỉ lệ ~2.6:1 giống khung ký trong ReceiptModal/buildPrintHtml.
const SIGNATURE_WIDTH = 320;
const SIGNATURE_HEIGHT = 120;
const SIGNATURE_PADDING = 6;

/** "M12.3,45.6 L13.0,46.1 L..." → [[12.3,45.6],[13.0,46.1],...] (định dạng do chính PanResponder ở CardCheckoutModal sinh ra, chỉ gồm M/L). */
function parseSignaturePathPoints(pathStr) {
  const points = [];
  const re = /[ML]\s*(-?[\d.]+),(-?[\d.]+)/g;
  let m;
  while ((m = re.exec(String(pathStr)))) {
    points.push([parseFloat(m[1]), parseFloat(m[2])]);
  }
  return points;
}

/**
 * Vẽ các nét chữ ký (toạ độ gốc theo khung vẽ trên thiết bị — kích thước thay đổi
 * theo màn hình) lên lưới bit đen-trắng cố định, tự co giãn theo bounding box để
 * không bị méo/lệch dù khung vẽ gốc to nhỏ khác nhau.
 * @returns {Uint8Array|null} lưới bit width*height (1 = điểm đen), null nếu rỗng
 */
function rasterizeSignaturePaths(paths, width = SIGNATURE_WIDTH, height = SIGNATURE_HEIGHT) {
  const allPoints = paths.flatMap(parseSignaturePathPoints);
  if (allPoints.length < 2) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of allPoints) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const srcW = Math.max(maxX - minX, 1);
  const srcH = Math.max(maxY - minY, 1);

  const targetW = width - SIGNATURE_PADDING * 2;
  const targetH = height - SIGNATURE_PADDING * 2;
  const scale = Math.min(targetW / srcW, targetH / srcH);
  const offsetX = SIGNATURE_PADDING + (targetW - srcW * scale) / 2;
  const offsetY = SIGNATURE_PADDING + (targetH - srcH * scale) / 2;

  const grid = new Uint8Array(width * height);
  const setPixel = (x, y) => {
    // Tô dày 2x2 — nét mảnh 1px dễ bị mất/mờ trên đầu in nhiệt giá rẻ.
    for (let dy = 0; dy <= 1; dy += 1) {
      for (let dx = 0; dx <= 1; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) grid[py * width + px] = 1;
      }
    }
  };
  const drawLine = (fx0, fy0, fx1, fy1) => {
    let x0 = Math.round(fx0);
    let y0 = Math.round(fy0);
    const x1 = Math.round(fx1);
    const y1 = Math.round(fy1);
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      setPixel(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };

  const toX = (x) => offsetX + (x - minX) * scale;
  const toY = (y) => offsetY + (y - minY) * scale;
  for (const pathStr of paths) {
    const points = parseSignaturePathPoints(pathStr);
    for (let i = 1; i < points.length; i += 1) {
      drawLine(toX(points[i - 1][0]), toY(points[i - 1][1]), toX(points[i][0]), toY(points[i][1]));
    }
  }
  return grid;
}

/** Đóng gói lưới bit thành lệnh ảnh raster ESC/POS: GS v 0 m xL xH yL yH d1...dk */
function packEscposRasterImage(grid, width, height) {
  const bytesPerRow = Math.ceil(width / 8);
  const data = Buffer.alloc(bytesPerRow * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grid[y * width + x]) {
        data[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  const header = Buffer.from([
    GS, 0x76, 0x30, 0x00,
    bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
  ]);
  return Buffer.concat([header, data]);
}

class EscPosBuilder {
  constructor(lineWidth = LINE_WIDTH) {
    this.lineWidth = lineWidth;
    this.chunks = [Buffer.from(CMD.INIT)];
  }

  _push(bytes) {
    this.chunks.push(Buffer.from(bytes));
    return this;
  }

  raw(text) {
    this.chunks.push(Buffer.from(String(text), 'utf8'));
    return this;
  }

  line(text = '') {
    this.raw(text);
    return this._push(CMD.FEED_LINE);
  }

  feed(n = 1) {
    for (let i = 0; i < n; i += 1) this._push(CMD.FEED_LINE);
    return this;
  }

  alignLeft() { return this._push(CMD.ALIGN_LEFT); }
  alignCenter() { return this._push(CMD.ALIGN_CENTER); }
  alignRight() { return this._push(CMD.ALIGN_RIGHT); }
  boldOn() { return this._push(CMD.BOLD_ON); }
  boldOff() { return this._push(CMD.BOLD_OFF); }

  centerLine(text = '', bold = false) {
    this.alignCenter();
    if (bold) this.boldOn();
    this.line(text);
    if (bold) this.boldOff();
    return this.alignLeft();
  }

  divider(char = '-') {
    return this.line(char.repeat(this.lineWidth));
  }

  /** In ảnh chữ ký (rasterize trực tiếp từ path đã ký — không cần lib chụp ảnh/native module). */
  signature(signaturePaths = []) {
    const grid = rasterizeSignaturePaths(signaturePaths);
    if (!grid) return this;
    this.alignCenter();
    this.chunks.push(packEscposRasterImage(grid, SIGNATURE_WIDTH, SIGNATURE_HEIGHT));
    return this.alignLeft();
  }

  /** In hai cột — cột trái căn trái, cột phải căn phải, lấp đầy lineWidth ký tự. */
  twoCols(left = '', right = '') {
    const r = String(right);
    const maxLeft = Math.max(this.lineWidth - r.length - 1, 1);
    const l = String(left).slice(0, maxLeft).padEnd(maxLeft, ' ');
    return this.line(`${l} ${r.padStart(r.length, ' ')}`);
  }

  cut() {
    this.feed(3);
    return this._push(CMD.CUT_PARTIAL);
  }

  toBuffer() {
    return Buffer.concat(this.chunks);
  }
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

const cardPrice = (basePrice, qty) => Number(basePrice) * (qty || 1) * (1 + CARD_FEE);
const cashPrice = (basePrice, qty) => Number(basePrice) * (qty || 1);

/**
 * Dựng buffer lệnh ESC/POS cho hoá đơn — cùng dữ liệu `d` với buildPrintHtml
 * trong ReceiptModal.jsx, đảm bảo bản in nhiệt khớp với hoá đơn hiển thị/PDF.
 *
 * @param {object} d receiptData (xem ReceiptModal.jsx)
 * @returns {Buffer}
 */
export function buildReceiptEscPos(d) {
  const {
    paymentMethod = 'card',
    lines = [],
    subtotal = 0,
    taxAmount = 0,
    tip = 0,
    total = 0,
    staffName = '',
    date = '',
    cardBrand = '',
    cardLast4 = '',
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
  // total (card) đã gồm tip (xem getCardTotal) — TOTAL CHARGE phải trừ tip ra,
  // GRAND TOTAL = chargeAmt + tip mới ra đúng total, tránh cộng tip 2 lần.
  const chargeAmt = isCard ? (total - tip) : (isSplit ? (cashPortion + cardPortion) : total);

  const salonName = process.env.EXPO_PUBLIC_SALON_NAME || 'NICE NAILS & SPA';
  const salonAddr = process.env.EXPO_PUBLIC_SALON_ADDRESS || '8048 N 19Th Ave';
  const salonCity = process.env.EXPO_PUBLIC_SALON_CITY || 'Phoenix AZ 85021';
  const salonPhone = process.env.EXPO_PUBLIC_SALON_PHONE || '(602) 759-9184';

  const b = new EscPosBuilder();

  b.centerLine('Customer Receipt');
  b.centerLine(salonName, true);
  b.centerLine(salonAddr);
  b.centerLine(salonCity);
  b.centerLine(salonPhone);
  b.divider();
  b.line(`Date: ${date}`);
  if (staffName) b.line(`Tech: ${staffName}`);
  b.divider();

  for (const g of groupByTech(lines)) {
    if (g.techName) {
      b.boldOn();
      b.line(`Tech: ${g.techName}`);
      b.boldOff();
    }
    for (const l of g.items) {
      const cp = cardPrice(l.price, l.qty);
      const bp = cashPrice(l.price, l.qty);
      b.twoCols(l.name || '', `${cp.toFixed(2)}/${bp.toFixed(2)}`);
    }
  }
  b.divider();

  b.line(`CARD TOTAL: $${(subtotal * (1 + CARD_FEE)).toFixed(2)}`);
  b.line(`CASH TOTAL: $${subtotal.toFixed(2)}`);
  b.boldOn();
  b.line('***PAYMENT DETAILS***');
  b.boldOff();

  if (isCard) {
    b.line(`Credit/Debit: $${total.toFixed(2)}`);
    if (cardLast4) b.line(`Note: Last4#:${cardLast4}`);
  } else if (isSplit) {
    b.line(`Credit/Debit: $${cardPortion.toFixed(2)}`);
    if (cardLast4) b.line(`Note: Last4#:${cardLast4}`);
    b.line(`Cash: $${cashPortion.toFixed(2)}`);
  } else {
    b.line(`Cash: $${total.toFixed(2)}`);
  }

  b.line('Note: ');
  b.boldOn();
  b.line(`TOTAL CHARGE: $${chargeAmt.toFixed(2)}`);
  b.boldOff();
  if (tip > 0) {
    b.line(`Tip Added: $${tip.toFixed(2)}`);
    b.boldOn();
    b.line(`GRAND TOTAL: $${(chargeAmt + tip).toFixed(2)}`);
    b.boldOff();
  }

  if ((isCard || isSplit) && cardLast4) {
    b.divider();
    b.boldOn();
    b.line(`${(cardBrand || 'CARD').toUpperCase()}-${cardLast4}`);
    b.boldOff();
    b.line('CARDHOLDER');
    b.line(`Card Entry: ${(entryMode || '').toUpperCase()}`);
    if (authCode) b.line(`Auth Code: ${authCode}`);
    if (aid) b.line(`AID: ${aid}`);
    if (aidLabel) b.line(`App Label: ${aidLabel}`);
  }

  if (isCard || isSplit) {
    b.divider();
    b.centerLine("CUSTOMER'S SIGNATURE", true);
    const signaturePaths = d.signaturePaths || [];
    if (signaturePaths.length > 0) {
      b.signature(signaturePaths);
    } else {
      b.feed(3);
      b.line('x_______________________________');
    }
  }

  if (isCash) {
    b.divider();
    b.line(`Cash Tender: $${cashTender.toFixed(2)}`);
    b.line(`Change: $${cashChange.toFixed(2)}`);
  }

  b.divider();
  b.centerLine('I agree to pay this amount');
  b.centerLine('All sales are final');
  b.centerLine('Keep this receipt for record');
  b.centerLine('By paying, I confirm that');
  b.centerLine('I received services up to');
  b.centerLine('my satisfaction', true);
  b.divider();
  b.cut();

  return b.toBuffer();
}

/** Buffer lệnh in thử ngắn — dùng để kiểm tra kết nối máy in. */
export function buildTestPrintEscPos() {
  const b = new EscPosBuilder();
  b.centerLine('TEST PRINT', true);
  b.divider();
  b.line(`Time: ${new Date().toLocaleString()}`);
  // Tránh dấu tiếng Việt — đa số máy in nhiệt giá rẻ không hỗ trợ UTF-8/CP1258.
  b.line('Ket noi may in thanh cong!');
  b.divider();
  b.cut();
  return b.toBuffer();
}
