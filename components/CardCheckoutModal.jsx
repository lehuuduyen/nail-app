import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { formatMoney } from '../utils/money';

const TIP_OPTS = [
  { label: 'No Tip', pct: 0 },
  { label: '10%', pct: 0.10 },
  { label: '20%', pct: 0.20 },
  { label: '30%', pct: 0.30 },
];

// Không gian toạ độ chuẩn để lưu chữ ký — mọi nơi render (ReceiptModal, PDF, ESC/POS)
// đều dùng viewBox này, đảm bảo strokeWidth 2.5 hiện đúng kích thước.
const SIG_W = 380;
const SIG_H = 190;

/**
 * Co giãn các nét vẽ từ không gian gốc (flex:1, kích thước thay đổi theo thiết bị)
 * về không gian cố định SIG_W × SIG_H để strokeWidth không bị thu nhỏ khi render.
 */
function normalizePaths(paths, padding = 8) {
  if (!paths?.length) return paths;
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
  if (!isFinite(minX)) return paths;
  const srcW = Math.max(maxX - minX, 1);
  const srcH = Math.max(maxY - minY, 1);
  const scale = Math.min((SIG_W - padding * 2) / srcW, (SIG_H - padding * 2) / srcH);
  const dx = padding + ((SIG_W - padding * 2) - srcW * scale) / 2 - minX * scale;
  const dy = padding + ((SIG_H - padding * 2) - srcH * scale) / 2 - minY * scale;
  return paths.map(pathStr =>
    String(pathStr).replace(/([ML])\s*(-?[\d.]+),(-?[\d.]+)/g, (_, cmd, x, y) =>
      `${cmd}${(parseFloat(x) * scale + dx).toFixed(2)},${(parseFloat(y) * scale + dy).toFixed(2)}`
    )
  );
}

const TITLES = {
  tip: 'Chọn Tip',
  processing: 'Đang xử lý',
  signature: 'Ký tên',
};

/**
 * Modal thanh toán thẻ Stripe — TÁCH RIÊNG từng bước vì số tiền charge phải
 * chốt (gồm tip) TRƯỚC khi khách chạm thẻ (giao dịch card-present không thể
 * đổi số tiền sau khi đã đọc thẻ — bị khoá trong cryptogram EMV của thẻ).
 *
 * mode:
 *   'tip'        — chọn tip TRƯỚC khi chạm thẻ. onConfirm(tipAmount)
 *   'processing' — đang chạm/charge thẻ (không cho thao tác). Không gọi onConfirm.
 *   'signature'  — đã charge xong, ký xác nhận. onConfirm(signaturePaths)
 */
export default function CardCheckoutModal({
  visible,
  onClose,
  subtotal,
  lockedTipAmount = 0, // tip đã chốt — dùng để hiện tổng tiền ở bước ký (mode='signature')
  onConfirm,
  mode = 'tip',
  processingHint, // string|null — hướng dẫn từ máy đọc thẻ giữa lúc chạm/xử lý
}) {
  const [tipPct, setTipPct] = useState(null);
  const [customTip, setCustomTip] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [paths, setPaths] = useState([]);
  const [drawingPath, setDrawingPath] = useState('');
  const currentPathRef = useRef('');

  const tipAmount = useCustom
    ? (parseFloat(customTip) || 0)
    : tipPct != null
      ? Math.round(subtotal * tipPct * 100) / 100
      : 0;

  const tipSelected = useCustom ? parseFloat(customTip) >= 0 : tipPct !== null;

  const reset = () => {
    setTipPct(null);
    setCustomTip('');
    setUseCustom(false);
    setPaths([]);
    setDrawingPath('');
    currentPathRef.current = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const handleConfirmTip = () => {
    const tip = tipAmount;
    reset();
    onConfirm(tip);
  };

  const handleConfirmSignature = () => {
    const savedPaths = normalizePaths([...paths]);
    reset();
    onConfirm(savedPaths);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPathRef.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setDrawingPath(currentPathRef.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPathRef.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setDrawingPath(currentPathRef.current);
      },
      onPanResponderRelease: () => {
        // Chụp giá trị TRƯỚC khi reset ref — updater của setPaths chạy lazy (có thể
        // sau khi dòng dưới đã set currentPathRef.current = '', khiến nó luôn nhận
        // chuỗi rỗng nếu đọc trực tiếp từ ref bên trong updater).
        const finishedPath = currentPathRef.current;
        if (finishedPath) {
          setPaths((prev) => [...prev, finishedPath]);
        }
        currentPathRef.current = '';
        setDrawingPath('');
      },
    })
  ).current;

  // Thẻ đã AUTHORIZE (giữ tiền) trước khi modal mở — không cho đóng ngang để tránh
  // để lại khoản giữ tiền "treo" trên thẻ khách tới khi tự hết hạn.
  const canClose = false;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
          backgroundColor: '#7c3aed',
        }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
            {TITLES[mode]}
          </Text>

          {canClose && (
            <Pressable onPress={handleClose} hitSlop={16}>
              <Text style={{ fontSize: 30, color: 'rgba(255,255,255,0.8)', lineHeight: 32 }}>×</Text>
            </Pressable>
          )}
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 }}>
          {mode === 'tip' ? (
            <>
              {/* Subtotal */}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#f8fafc', borderRadius: 16,
                paddingVertical: 16, paddingHorizontal: 20, marginBottom: 24,
              }}>
                <Text style={{ fontSize: 15, color: '#6b7280', fontWeight: '600' }}>Subtotal dịch vụ</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#111827' }}>{formatMoney(subtotal)}</Text>
              </View>

              {/* Tip presets */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                {TIP_OPTS.map((opt) => {
                  const active = !useCustom && tipPct === opt.pct;
                  const amt = Math.round(subtotal * opt.pct * 100) / 100;
                  return (
                    <Pressable
                      key={opt.label}
                      onPress={() => { setTipPct(opt.pct); setUseCustom(false); }}
                      style={{
                        flex: 1, paddingVertical: 18, borderRadius: 16, alignItems: 'center',
                        backgroundColor: active ? '#7c3aed' : '#f3f4f6',
                        borderWidth: 2, borderColor: active ? '#7c3aed' : 'transparent',
                      }}
                    >
                      <Text style={{ fontWeight: '900', fontSize: 16, color: active ? '#fff' : '#374151' }}>
                        {opt.label}
                      </Text>
                      {opt.pct > 0 && (
                        <Text style={{ fontSize: 13, marginTop: 4, color: active ? '#ddd6fe' : '#9ca3af' }}>
                          {formatMoney(amt)}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom tip */}
              <Pressable
                onPress={() => setUseCustom(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, marginBottom: 20,
                  backgroundColor: useCustom ? '#fdf4ff' : '#f9fafb',
                  borderWidth: 2, borderColor: useCustom ? '#a855f7' : '#e5e7eb',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', width: 90 }}>Số khác ($)</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={customTip}
                  onChangeText={(v) => { setCustomTip(v); setUseCustom(true); }}
                  placeholder="0.00"
                  placeholderTextColor="#d1d5db"
                  style={{ flex: 1, fontSize: 26, fontWeight: '800', color: '#111827', paddingVertical: 0 }}
                />
              </Pressable>

              {/* Total preview — đây CHÍNH XÁC là số tiền sẽ chạm thẻ */}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 14, paddingHorizontal: 20,
                backgroundColor: '#fdf4ff', borderRadius: 16, marginBottom: 20,
              }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#7c3aed' }}>Tổng tiền sẽ chạm thẻ</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#7c3aed' }}>
                  {formatMoney(subtotal + (tipSelected ? tipAmount : 0))}
                </Text>
              </View>

              <View style={{ flex: 1 }} />

              <Pressable
                onPress={() => tipSelected && handleConfirmTip()}
                style={{
                  backgroundColor: tipSelected ? '#7c3aed' : '#d1d5db',
                  borderRadius: 18, paddingVertical: 20, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>
                  XÁC NHẬN TIP → CHẠM THẺ
                </Text>
              </Pressable>
            </>
          ) : mode === 'processing' ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 }}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' }}>
                Đang xử lý thanh toán…
              </Text>
              {processingHint ? (
                <View style={{
                  backgroundColor: '#fef3c7', borderRadius: 12,
                  paddingVertical: 10, paddingHorizontal: 14, maxWidth: 320,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#92400e', textAlign: 'center' }}>
                    {processingHint}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                  Vui lòng không tắt màn hình
                </Text>
              )}
            </View>
          ) : (
            <>
              {/* Tip summary — tip đã chốt từ trước khi chạm thẻ, không đổi được nữa */}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: 16, marginBottom: 16,
                borderBottomWidth: 1.5, borderBottomColor: '#f3f4f6',
              }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>
                  Dịch vụ {formatMoney(subtotal)} + Tip {formatMoney(lockedTipAmount)}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#7c3aed' }}>
                  = {formatMoney(subtotal + lockedTipAmount)}
                </Text>
              </View>

              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 10 }}>
                Thẻ đã được charge thành công — vui lòng ký tên xác nhận
              </Text>

              {/* Signature pad — takes remaining vertical space */}
              <View
                style={{
                  flex: 1, backgroundColor: '#f9fafb',
                  borderRadius: 16, overflow: 'hidden',
                  borderWidth: 1.5, borderColor: '#e5e7eb',
                  marginBottom: 12,
                }}
                {...panResponder.panHandlers}
              >
                <Svg width="100%" height="100%">
                  <Line x1="20" y1="88%" x2="96%" y2="88%" stroke="#e5e7eb" strokeWidth="1" />
                  {paths.map((p, i) => (
                    <Path
                      key={i} d={p}
                      stroke="#1e3a8a" strokeWidth={2.5}
                      fill="none" strokeLinecap="round" strokeLinejoin="round"
                    />
                  ))}
                  {drawingPath ? (
                    <Path
                      d={drawingPath} stroke="#1e3a8a" strokeWidth={2.5}
                      fill="none" strokeLinecap="round" strokeLinejoin="round"
                    />
                  ) : null}
                </Svg>
                {paths.length === 0 && !drawingPath && (
                  <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ color: '#d1d5db', fontSize: 18 }}>Ký tên tại đây</Text>
                  </View>
                )}
              </View>

              {/* Secondary actions */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 }}>
                <Pressable
                  onPress={() => { setPaths([]); setDrawingPath(''); currentPathRef.current = ''; }}
                  hitSlop={12}
                >
                  <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>Xóa chữ ký</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleConfirmSignature}
                style={{ backgroundColor: '#7c3aed', borderRadius: 18, paddingVertical: 20, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>
                  {paths.length > 0 ? 'XÁC NHẬN & XUẤT HOÁ ĐƠN' : 'BỎ QUA & XUẤT HOÁ ĐƠN'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
