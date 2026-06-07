import * as Print from 'expo-print';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { formatMoney } from '../utils/money';
import { usePrinterConnection } from '../hooks/usePrinterConnection';
import { buildReceiptEscPos } from '../utils/escpos';

const SALON_NAME  = process.env.EXPO_PUBLIC_SALON_NAME  || 'NICE NAILS & SPA';
const SALON_ADDR  = process.env.EXPO_PUBLIC_SALON_ADDRESS || '8048 N 19Th Ave';
const SALON_CITY  = process.env.EXPO_PUBLIC_SALON_CITY  || 'Phoenix AZ 85021';
const SALON_PHONE = process.env.EXPO_PUBLIC_SALON_PHONE || '(602) 759-9184';
const CARD_FEE    = 0.03;

/**
 * Tính viewBox SVG bám sát bounding box thực của các nét vẽ chữ ký.
 * Cần thiết vì tọa độ được ghi trong hệ toạ độ khung ký tên gốc (flex:1 trong modal,
 * kích thước thay đổi theo thiết bị) — render lại trong SVG khác kích thước mà không có
 * viewBox đúng sẽ khiến nét vẽ nằm ngoài vùng hiển thị (vô hình).
 */
function computeSignatureViewBox(paths, padding = 10) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const re = /[ML]\s*(-?[\d.]+),(-?[\d.]+)/g;
  for (const p of paths) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(String(p)))) {
      const x = parseFloat(m[1]);
      const y = parseFloat(m[2]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!isFinite(minX)) return '0 0 380 190';
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  return `${minX - padding} ${minY - padding} ${w + padding * 2} ${h + padding * 2}`;
}

// Group consecutive lines by employeeName, return [{employeeName, items:[]}]
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

function cardPrice(basePrice, qty) {
  return (Number(basePrice) * (qty || 1) * (1 + CARD_FEE));
}

function cashPrice(basePrice, qty) {
  return (Number(basePrice) * (qty || 1));
}

function pad(str, len, right = false) {
  const s = String(str);
  if (right) return s.padStart(len, ' ');
  return s.padEnd(len, ' ');
}

function buildPrintHtml(d) {
  const {
    paymentMethod = 'card',
    lines = [],
    subtotal = 0,
    taxAmount = 0,
    tip = 0,
    total = 0,
    staffName = '',
    date = '',
    signaturePaths = [],
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

  const cardTotal = subtotal * (1 + CARD_FEE) + (taxAmount > 0 ? taxAmount * (1 + CARD_FEE) : 0);
  const grandTotal = isCard ? total : (isSplit ? (cashPortion + cardPortion) : total);

  const div = '--------------------------------';

  // Service lines grouped by tech
  const groups = groupByTech(lines);
  let svcLines = '';
  for (const g of groups) {
    if (g.techName) {
      svcLines += `<div>${pad('Tech: ' + g.techName, 32)}</div>`;
    }
    for (const l of g.items) {
      const cp = cardPrice(l.price, l.qty);
      const bp = cashPrice(l.price, l.qty);
      const priceStr = `${cp.toFixed(2)}/${bp.toFixed(2)}`;
      const maxNameLen = 32 - priceStr.length - 1;
      const name = (l.name || '').slice(0, maxNameLen);
      svcLines += `<div>${pad(name, maxNameLen)} ${pad(priceStr, priceStr.length, true)}</div>`;
    }
  }

  // Payment detail block
  let payDetail = '';
  if (isCard) {
    payDetail += `<div>Credit/Debit: $${total.toFixed(2)}</div>`;
    if (cardLast4) payDetail += `<div>Note: Last4#:${cardLast4}</div>`;
  } else if (isSplit) {
    payDetail += `<div>Credit/Debit: $${cardPortion.toFixed(2)}</div>`;
    if (cardLast4) payDetail += `<div>Note: Last4#:${cardLast4}</div>`;
    payDetail += `<div>Cash: $${cashPortion.toFixed(2)}</div>`;
  } else {
    payDetail += `<div>Cash: $${total.toFixed(2)}</div>`;
  }

  // total (card) đã gồm tip (xem getCardTotal) — TOTAL CHARGE phải trừ tip ra,
  // GRAND TOTAL = chargeAmt + tip mới ra đúng total, tránh cộng tip 2 lần.
  const chargeAmt = isCard ? (total - tip) : (isSplit ? (cashPortion + cardPortion) : total);

  // Card info block
  let cardInfo = '';
  if ((isCard || isSplit) && cardLast4) {
    const brand = (cardBrand || 'CARD').toUpperCase();
    cardInfo += `<div>${brand}-${cardLast4}</div>`;
    cardInfo += `<div>CARDHOLDER</div>`;
    cardInfo += `<div>Card Entry: ${entryMode.toUpperCase()}</div>`;
    if (authCode) cardInfo += `<div>Auth Code: ${authCode}</div>`;
    if (aid)      cardInfo += `<div>AID: ${aid}</div>`;
    if (aidLabel) cardInfo += `<div>App Label: ${aidLabel}</div>`;
  }

  // Signature SVG paths — viewBox tính động từ bounding box thực để ký hiển thị đúng
  // dù được vẽ trong không gian toạ độ lớn (flex:1 trên tablet).
  const svgPaths = signaturePaths.map(p =>
    `<path d="${p}" stroke="#1e3a8a" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join('');
  const sigSection = (isCard || isSplit)
    ? `<div>${div}</div>
       <div>CUSTOMER'S SIGNATURE</div>
       <div style="border:1px solid #ccc;border-radius:4px;background:#f9fafb;padding:6px;margin:6px 0">
         <svg width="260" height="100" viewBox="0 0 380 190" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
           ${svgPaths || ''}
         </svg>
       </div>`
    : '';

  // Cash tender block
  const tenderBlock = isCash
    ? `<div>${div}</div>
       <div>Cash Tender: $${cashTender.toFixed(2)}</div>
       <div>Change: $${cashChange.toFixed(2)}</div>`
    : '';

  return `
<html><head><meta charset="utf-8"/></head>
<body style="font-family:'Courier New',Courier,monospace;font-size:13px;max-width:310px;margin:0 auto;padding:12px;line-height:1.55">
<div style="text-align:center">Customer Receipt</div>
<div style="text-align:center;font-weight:bold">${SALON_NAME}</div>
<div style="text-align:center">${SALON_ADDR}</div>
<div style="text-align:center">${SALON_CITY}</div>
<div style="text-align:center">${SALON_PHONE}</div>
<div>${div}</div>
<div>Date: ${date}</div>
${staffName ? `<div>Tech: ${staffName}</div>` : ''}
<div>${div}</div>
${svcLines}
<div>${div}</div>
<div>CARD TOTAL: $${(subtotal * (1 + CARD_FEE)).toFixed(2)}</div>
<div>CASH TOTAL: $${subtotal.toFixed(2)}</div>
<div>***PAYMENT DETAILS***</div>
${payDetail}
<div>Note: </div>
<div>TOTAL CHARGE: $${chargeAmt.toFixed(2)}</div>
${tip > 0 ? `<div>Tip Added: $${tip.toFixed(2)}</div><div>GRAND TOTAL: $${(chargeAmt + tip).toFixed(2)}</div>` : ''}
${cardInfo}
${sigSection}
${tenderBlock}
<div>${div}</div>
<div style="text-align:center">I agree to pay this amount</div>
<div style="text-align:center">All sales are final</div>
<div style="text-align:center">Keep this receipt for record</div>
<div style="text-align:center">By paying, I confirm that</div>
<div style="text-align:center">I received services up to</div>
<div style="text-align:center;font-weight:bold">my satisfaction</div>
<div>${div}</div>
</body></html>`;
}

export default function ReceiptModal({ visible, onDone, receiptData, signaturePaths = [] }) {
  // Hooks PHẢI gọi vô điều kiện — không được gọi sau conditional return (vi phạm Rules of Hooks
  // khiến React crash "Expected static flag was missing" khi receiptData chuyển từ null → non-null).
  const printer = usePrinterConnection();
  const [thermalPrinting, setThermalPrinting] = useState(false);

  if (!receiptData) return null;

  const d = { ...receiptData, signaturePaths: receiptData.signaturePaths ?? signaturePaths };
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
    cashTender = 0,
    cashChange = 0,
    cashPortion = 0,
    cardPortion = 0,
  } = d;

  const isCard = paymentMethod === 'card';
  const isSplit = paymentMethod === 'split';
  const isCash = paymentMethod === 'cash';

  const groups = groupByTech(lines);
  // total (card) đã gồm tip (xem getCardTotal) — TOTAL CHARGE phải trừ tip ra,
  // GRAND TOTAL = chargeAmt + tip mới ra đúng total, tránh cộng tip 2 lần.
  const chargeAmt = isCard ? (total - tip) : (isSplit ? (cashPortion + cardPortion) : total);

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: buildPrintHtml(d) });
    } catch {
      // user dismissed print dialog
    }
  };

  const handleThermalPrint = async () => {
    if (!printer.ip) {
      Alert.alert('Máy in nhiệt', 'Chưa cấu hình máy in. Vào Cài đặt → Thiết bị để kết nối máy in.');
      return;
    }
    setThermalPrinting(true);
    try {
      const ok = await printer.send(buildReceiptEscPos(d));
      if (!ok) {
        Alert.alert('Máy in nhiệt', printer.lastError || 'In thất bại — kiểm tra kết nối máy in.');
      }
    } finally {
      setThermalPrinting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#6d28d9', paddingTop: 52,
          paddingBottom: 18, paddingHorizontal: 20, alignItems: 'center',
        }}>
          <Text style={{ fontSize: 26, color: '#fff' }}>✓</Text>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900', marginTop: 4 }}>
            Thanh toán thành công
          </Text>
          <Text style={{ color: '#ddd6fe', fontSize: 12, marginTop: 3 }}>{date}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* Receipt card — monospace look */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 14,
            padding: 16, marginBottom: 16,
            shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
          }}>
            {/* Salon header */}
            <Text style={styles.mono_center_bold}>Customer Receipt</Text>
            <Text style={styles.mono_center_bold}>{SALON_NAME}</Text>
            <Text style={styles.mono_center}>{SALON_ADDR}</Text>
            <Text style={styles.mono_center}>{SALON_CITY}</Text>
            <Text style={styles.mono_center}>{SALON_PHONE}</Text>
            <Text style={styles.div}>{'—'.repeat(32)}</Text>
            <Text style={styles.mono}>Date: {date}</Text>
            {staffName ? <Text style={styles.mono}>Tech: {staffName}</Text> : null}
            <Text style={styles.div}>{'—'.repeat(32)}</Text>

            {/* Service lines grouped by tech */}
            {groups.map((g, gi) => (
              <View key={gi}>
                {g.techName ? (
                  <Text style={[styles.mono, { color: '#374151', fontWeight: '700' }]}>Tech: {g.techName}</Text>
                ) : null}
                {g.items.map((l, li) => {
                  const cp = cardPrice(l.price, l.qty);
                  const bp = cashPrice(l.price, l.qty);
                  return (
                    <View key={li} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[styles.mono, { flex: 1 }]} numberOfLines={1}>{l.name}</Text>
                      <Text style={styles.mono}> {cp.toFixed(2)}/{bp.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
            <Text style={styles.div}>{'—'.repeat(32)}</Text>

            {/* Totals */}
            <Text style={styles.mono}>CARD TOTAL: ${(subtotal * (1 + CARD_FEE)).toFixed(2)}</Text>
            <Text style={styles.mono}>CASH TOTAL: ${subtotal.toFixed(2)}</Text>
            <Text style={[styles.mono, { fontWeight: '700', marginTop: 6 }]}>***PAYMENT DETAILS***</Text>

            {isCard && <Text style={styles.mono}>Credit/Debit: ${total.toFixed(2)}</Text>}
            {isCard && cardLast4 ? <Text style={styles.mono}>Note: Last4#:{cardLast4}</Text> : null}
            {isSplit && <Text style={styles.mono}>Credit/Debit: ${cardPortion.toFixed(2)}</Text>}
            {isSplit && cardLast4 ? <Text style={styles.mono}>Note: Last4#:{cardLast4}</Text> : null}
            {isSplit && <Text style={styles.mono}>Cash: ${cashPortion.toFixed(2)}</Text>}
            {isCash  && <Text style={styles.mono}>Cash: ${total.toFixed(2)}</Text>}

            <Text style={styles.mono}>Note: </Text>
            <Text style={[styles.mono, { fontWeight: '700' }]}>TOTAL CHARGE: ${chargeAmt.toFixed(2)}</Text>
            {tip > 0 && <Text style={styles.mono}>Tip Added: ${tip.toFixed(2)}</Text>}
            {tip > 0 && (
              <Text style={[styles.mono, { fontWeight: '900', fontSize: 15 }]}>
                GRAND TOTAL: ${(chargeAmt + tip).toFixed(2)}
              </Text>
            )}

            {/* Card info */}
            {(isCard || isSplit) && cardLast4 ? (
              <>
                <Text style={styles.div}>{'—'.repeat(32)}</Text>
                <Text style={[styles.mono, { fontWeight: '700' }]}>{(cardBrand || 'CARD').toUpperCase()}-{cardLast4}</Text>
                <Text style={styles.mono}>CARDHOLDER</Text>
                <Text style={styles.mono}>Card Entry: {d.entryMode?.toUpperCase() || 'CONTACTLESS'}</Text>
                {d.authCode ? <Text style={styles.mono}>Auth Code: {d.authCode}</Text> : null}
                {d.aid       ? <Text style={styles.mono}>AID: {d.aid}</Text> : null}
                {d.aidLabel  ? <Text style={styles.mono}>App Label: {d.aidLabel}</Text> : null}
              </>
            ) : null}

            {/* Signature */}
            {(isCard || isSplit) && (
              <>
                <Text style={styles.div}>{'—'.repeat(32)}</Text>
                <Text style={[styles.mono, { marginBottom: 6 }]}>CUSTOMER'S SIGNATURE</Text>
                <View style={{
                  height: 110, backgroundColor: '#f9fafb',
                  borderRadius: 10, overflow: 'hidden',
                  borderWidth: 1, borderColor: '#e5e7eb',
                }}>
                  <Svg width="100%" height="100%" viewBox="0 0 380 190" preserveAspectRatio="xMidYMid meet">
                    {(d.signaturePaths || []).map((p, i) => (
                      <Path key={i} d={p} stroke="#1e3a8a" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                  </Svg>
                  {(d.signaturePaths || []).length === 0 && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#d1d5db', fontSize: 13 }}>Không có chữ ký</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Cash tender */}
            {isCash && (
              <>
                <Text style={styles.div}>{'—'.repeat(32)}</Text>
                <Text style={styles.mono}>Cash Tender: ${cashTender.toFixed(2)}</Text>
                <Text style={styles.mono}>Change: ${cashChange.toFixed(2)}</Text>
              </>
            )}

            <Text style={styles.div}>{'—'.repeat(32)}</Text>
            <Text style={styles.mono_center}>I agree to pay this amount</Text>
            <Text style={styles.mono_center}>All sales are final</Text>
            <Text style={styles.mono_center}>Keep this receipt for record</Text>
            <Text style={styles.mono_center}>By paying, I confirm that</Text>
            <Text style={styles.mono_center}>I received services up to</Text>
            <Text style={[styles.mono_center, { fontWeight: '700' }]}>my satisfaction</Text>
          </View>
        </ScrollView>

        {/* Buttons */}
        <View style={{
          paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28,
          backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 10,
        }}>
          <Pressable
            onPress={handlePrint}
            style={{ backgroundColor: '#6d28d9', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>In biên lai</Text>
          </Pressable>
          {printer.ip ? (
            <Pressable
              onPress={handleThermalPrint}
              disabled={thermalPrinting}
              style={{
                backgroundColor: printer.connected ? '#0d6efd' : '#9ca3af',
                borderRadius: 14, paddingVertical: 14, alignItems: 'center',
                opacity: thermalPrinting ? 0.6 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                {thermalPrinting ? 'Đang in…' : `In qua máy in nhiệt (${printer.ip})`}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onDone}
            style={{ backgroundColor: '#f3f4f6', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ fontWeight: '700', fontSize: 16, color: '#374151' }}>Xong</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  mono: {
    fontFamily: 'Courier New',
    fontSize: 12.5,
    color: '#111827',
    lineHeight: 20,
  },
  mono_center: {
    fontFamily: 'Courier New',
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 19,
  },
  mono_center_bold: {
    fontFamily: 'Courier New',
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 20,
  },
  div: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: '#d1d5db',
    marginVertical: 6,
    letterSpacing: 0.5,
  },
};
