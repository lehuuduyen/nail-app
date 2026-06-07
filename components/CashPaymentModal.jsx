import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { formatMoney } from '../utils/money';

const QUICK_BILLS = [20, 50, 100];

export default function CashPaymentModal({
  visible,
  onClose,
  totalAmount,
  onConfirmCash,
  onConfirmSplit,
}) {
  const [mode, setMode] = useState('cash');
  const [tender, setTender] = useState('');
  const [cashPortion, setCashPortion] = useState('');

  const tenderNum = parseFloat(tender) || 0;
  const change = tenderNum - totalAmount;
  const cashPortionNum = parseFloat(cashPortion) || 0;
  const cardPortion = Math.max(0, Math.round((totalAmount - cashPortionNum) * 100) / 100);

  const reset = () => {
    setMode('cash');
    setTender('');
    setCashPortion('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirmCash = () => {
    if (tenderNum < totalAmount) return;
    const savedChange = change;
    reset();
    onConfirmCash(tenderNum, savedChange);
  };

  const handleConfirmSplit = () => {
    if (cashPortionNum <= 0 || cashPortionNum >= totalAmount) return;
    const cp = cashPortionNum;
    const card = cardPortion;
    reset();
    onConfirmSplit(cp, card);
  };

  const setQuickTender = (bill) => {
    const rounded = Math.ceil(totalAmount / bill) * bill;
    setTender(String(rounded));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 32,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Thanh toán tiền mặt</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={{ fontSize: 26, color: '#9ca3af', lineHeight: 28 }}>×</Text>
            </Pressable>
          </View>

          {/* Total banner */}
          <View style={{
            backgroundColor: '#f0fdf4', borderRadius: 16,
            paddingVertical: 14, paddingHorizontal: 20,
            alignItems: 'center', marginBottom: 16,
          }}>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Tổng cần thanh toán</Text>
            <Text style={{ fontSize: 40, fontWeight: '900', color: '#15803d' }}>{formatMoney(totalAmount)}</Text>
          </View>

          {/* Mode tabs */}
          <View style={{
            flexDirection: 'row', backgroundColor: '#f3f4f6',
            borderRadius: 14, padding: 4, marginBottom: 18,
          }}>
            <Pressable
              onPress={() => setMode('cash')}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center',
                backgroundColor: mode === 'cash' ? '#2196F3' : 'transparent',
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 14, color: mode === 'cash' ? '#fff' : '#6b7280' }}>
                Tiền mặt
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('split')}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center',
                backgroundColor: mode === 'split' ? '#7c3aed' : 'transparent',
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 14, color: mode === 'split' ? '#fff' : '#6b7280' }}>
                Tiền mặt + Thẻ
              </Text>
            </Pressable>
          </View>

          {mode === 'cash' ? (
            <>
              {/* Quick-tender buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <Pressable
                  onPress={() => setTender(totalAmount.toFixed(2))}
                  style={{
                    flex: 1, backgroundColor: '#dbeafe', borderRadius: 12,
                    paddingVertical: 10, alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#1d4ed8' }}>Vừa đúng</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1d4ed8' }}>{formatMoney(totalAmount)}</Text>
                </Pressable>
                {QUICK_BILLS.map((bill) => {
                  const rounded = Math.ceil(totalAmount / bill) * bill;
                  if (rounded === totalAmount) return null;
                  return (
                    <Pressable
                      key={bill}
                      onPress={() => setQuickTender(bill)}
                      style={{
                        flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12,
                        paddingVertical: 10, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>tiền ${bill}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#374151' }}>{formatMoney(rounded)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Tender input */}
              <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Tiền khách đưa ($)</Text>
              <TextInput
                keyboardType="decimal-pad"
                value={tender}
                onChangeText={setTender}
                placeholder="0.00"
                placeholderTextColor="#d1d5db"
                style={{
                  borderWidth: 2,
                  borderColor: tenderNum >= totalAmount && tenderNum > 0 ? '#16a34a' : '#e5e7eb',
                  borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12,
                  fontSize: 28, fontWeight: '800', color: '#111827',
                  marginBottom: 14,
                }}
              />

              {/* Change display */}
              {tenderNum > 0 && (
                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, marginBottom: 18,
                  backgroundColor: change >= 0 ? '#f0fdf4' : '#fff7ed',
                }}>
                  <View>
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>
                      {change >= 0 ? 'Tiền thừa trả khách' : 'Còn thiếu'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {formatMoney(tenderNum)} − {formatMoney(totalAmount)}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 32, fontWeight: '900',
                    color: change >= 0 ? '#16a34a' : '#ea580c',
                  }}>
                    {change >= 0 ? formatMoney(change) : `−${formatMoney(-change)}`}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleConfirmCash}
                disabled={tenderNum < totalAmount}
                style={{
                  backgroundColor: tenderNum >= totalAmount ? '#16a34a' : '#e5e7eb',
                  borderRadius: 16, paddingVertical: 18, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 }}>
                  HOÀN TẤT TIỀN MẶT
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* Split mode */}
              <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Phần trả bằng tiền mặt ($)</Text>
              <TextInput
                keyboardType="decimal-pad"
                value={cashPortion}
                onChangeText={setCashPortion}
                placeholder="0.00"
                placeholderTextColor="#d1d5db"
                style={{
                  borderWidth: 2,
                  borderColor: cashPortionNum > 0 && cashPortionNum < totalAmount ? '#2196F3' : '#e5e7eb',
                  borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12,
                  fontSize: 28, fontWeight: '800', color: '#111827',
                  marginBottom: 14,
                }}
                autoFocus
              />

              {/* Split breakdown */}
              {cashPortionNum > 0 && cashPortionNum < totalAmount && (
                <View style={{ gap: 8, marginBottom: 18 }}>
                  <View style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: 12, paddingHorizontal: 18,
                    backgroundColor: '#dbeafe', borderRadius: 14,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>💵</Text>
                      <Text style={{ fontWeight: '700', fontSize: 16, color: '#1e40af' }}>Tiền mặt</Text>
                    </View>
                    <Text style={{ fontWeight: '900', fontSize: 22, color: '#1e40af' }}>
                      {formatMoney(cashPortionNum)}
                    </Text>
                  </View>
                  <View style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: 12, paddingHorizontal: 18,
                    backgroundColor: '#f3e8ff', borderRadius: 14,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>💳</Text>
                      <Text style={{ fontWeight: '700', fontSize: 16, color: '#6d28d9' }}>Thẻ</Text>
                    </View>
                    <Text style={{ fontWeight: '900', fontSize: 22, color: '#6d28d9' }}>
                      {formatMoney(cardPortion)}
                    </Text>
                  </View>
                </View>
              )}

              {cashPortionNum >= totalAmount && cashPortionNum > 0 && (
                <View style={{
                  backgroundColor: '#fef3c7', borderRadius: 12,
                  paddingVertical: 10, paddingHorizontal: 16, marginBottom: 18,
                }}>
                  <Text style={{ color: '#92400e', fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
                    Tiền mặt phải nhỏ hơn tổng ({formatMoney(totalAmount)})
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleConfirmSplit}
                disabled={cashPortionNum <= 0 || cashPortionNum >= totalAmount}
                style={{
                  backgroundColor: (cashPortionNum > 0 && cashPortionNum < totalAmount) ? '#7c3aed' : '#e5e7eb',
                  borderRadius: 16, paddingVertical: 18, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 }}>
                  HOÀN TẤT THANH TOÁN
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
