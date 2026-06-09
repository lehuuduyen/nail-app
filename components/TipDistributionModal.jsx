import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';

const ACCENT = '#00897b';
const ACCENT_LIGHT = '#e0f2f1';

function ModeButton({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        backgroundColor: active ? ACCENT : ACCENT_LIGHT,
        borderRadius: 6,
        marginHorizontal: 3,
      }}
    >
      <Text style={{ color: active ? '#fff' : ACCENT, fontWeight: '800', fontSize: 11 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Hiện sau khi thanh toán thẻ với tip khi có 2+ tech.
 * Props:
 *   visible: bool
 *   totalTip: number  — tổng tip (đã chọn ở CardCheckoutModal)
 *   techGroups: Array<{ techId: string, techName: string, serviceAmount: number }>
 *   onConfirm(tipPerTech: { [techId]: number }) → void
 *   onSkip() → void  — bỏ qua, dùng tỉ lệ mặc định
 */
export default function TipDistributionModal({ visible, totalTip = 0, techGroups = [], onConfirm, onSkip }) {
  const [mode, setMode] = useState('ratio');
  const [manualInputs, setManualInputs] = useState({});

  useEffect(() => {
    if (visible) {
      setMode('ratio');
      setManualInputs({});
    }
  }, [visible]);

  const computedTips = useMemo(() => {
    const n = techGroups.length;
    if (n === 0) return [];
    const totalSvc = techGroups.reduce((s, t) => s + t.serviceAmount, 0);

    let tips;
    if (mode === 'even') {
      const each = Math.floor((totalTip / n) * 100) / 100;
      tips = techGroups.map((_, i) =>
        i === 0 ? Math.round((totalTip - each * (n - 1)) * 100) / 100 : each,
      );
    } else if (mode === 'ratio') {
      if (totalSvc <= 0) {
        const each = Math.floor((totalTip / n) * 100) / 100;
        tips = techGroups.map((_, i) =>
          i === 0 ? Math.round((totalTip - each * (n - 1)) * 100) / 100 : each,
        );
      } else {
        const raw = techGroups.map((t) => Math.floor((totalTip * t.serviceAmount / totalSvc) * 100) / 100);
        const sumRaw = raw.reduce((s, v) => s + v, 0);
        const diff = Math.round((totalTip - sumRaw) * 100);
        tips = raw.map((v, i) =>
          i === 0 ? Math.round((v + diff / 100) * 100) / 100 : v,
        );
      }
    } else {
      tips = techGroups.map((t) => {
        const v = parseFloat(manualInputs[t.techId]);
        return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
      });
    }
    return tips;
  }, [mode, manualInputs, techGroups, totalTip]);

  const tipSum = computedTips.reduce((s, v) => s + v, 0);
  const isValid = mode !== 'manual' || Math.abs(tipSum - totalTip) < 0.02;

  const handleConfirm = () => {
    if (!isValid) {
      Alert.alert(
        'Tổng tip chưa khớp',
        `Tổng đang nhập: $${tipSum.toFixed(2)}\nCần đúng: $${totalTip.toFixed(2)}`,
      );
      return;
    }
    const result = {};
    techGroups.forEach((t, i) => { result[t.techId] = computedTips[i] ?? 0; });
    onConfirm(result);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18 }}>

          {/* Header */}
          <Text style={{ fontSize: 17, fontWeight: '900', color: '#111', letterSpacing: 0.3 }}>
            CHIA TIP: ${totalTip.toFixed(2)}
          </Text>
          <Text style={{ fontSize: 11, color: '#888', marginTop: 2, marginBottom: 18 }}>
            Chọn cách phân chia cho từng tech
          </Text>

          {/* Mode buttons */}
          <View style={{ flexDirection: 'row', marginBottom: 18 }}>
            <ModeButton label="Chia đôi" active={mode === 'even'} onPress={() => setMode('even')} />
            <ModeButton label="Theo tỉ lệ" active={mode === 'ratio'} onPress={() => setMode('ratio')} />
            <ModeButton label="Thủ công" active={mode === 'manual'} onPress={() => setMode('manual')} />
          </View>

          {/* Header row */}
          <View style={{ flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1.5, borderBottomColor: '#b2dfdb', marginBottom: 4 }}>
            <Text style={{ flex: 2, fontSize: 10, fontWeight: '700', color: '#666' }}>TECH</Text>
            <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: '#666', textAlign: 'right' }}>SERVICE</Text>
            <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: '#666', textAlign: 'right' }}>TIP</Text>
          </View>

          {/* Tech rows */}
          {techGroups.map((tech, i) => (
            <View
              key={String(tech.techId)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}
            >
              <Text style={{ flex: 2, fontSize: 13, fontWeight: '800', color: '#111' }} numberOfLines={1}>
                {tech.techName}
              </Text>
              <Text style={{ flex: 1, fontSize: 13, color: '#555', textAlign: 'right' }}>
                ${tech.serviceAmount.toFixed(2)}
              </Text>
              {mode === 'manual' ? (
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: ACCENT, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 }}>
                    <Text style={{ color: '#666', fontSize: 13, marginRight: 2 }}>$</Text>
                    <TextInput
                      value={manualInputs[tech.techId] ?? ''}
                      onChangeText={(v) => setManualInputs((prev) => ({ ...prev, [tech.techId]: v }))}
                      keyboardType="decimal-pad"
                      style={{ width: 60, fontSize: 14, fontWeight: '700', color: '#111', textAlign: 'right', padding: 0 }}
                      placeholder="0.00"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                </View>
              ) : (
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: ACCENT, textAlign: 'right' }}>
                  ${(computedTips[i] ?? 0).toFixed(2)}
                </Text>
              )}
            </View>
          ))}

          {/* Total check */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 20, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: '#e0e0e0' }}>
            <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>Tổng phân bổ</Text>
            <Text style={{
              fontSize: 13, fontWeight: '800',
              color: isValid ? '#2e7d32' : '#c62828',
            }}>
              ${tipSum.toFixed(2)} / ${totalTip.toFixed(2)} {isValid ? '✓' : '✗'}
            </Text>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={onSkip}
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8 }}
            >
              <Text style={{ fontWeight: '700', color: '#666', fontSize: 12 }}>Bỏ qua</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={{ flex: 2, paddingVertical: 12, alignItems: 'center', backgroundColor: ACCENT, borderRadius: 8, opacity: isValid ? 1 : 0.5 }}
            >
              <Text style={{ fontWeight: '900', color: '#fff', fontSize: 14 }}>XÁC NHẬN</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
