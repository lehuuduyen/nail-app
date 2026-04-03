import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../api/client';
import { getApiErrorMessage } from '../utils/apiError';
import { usePosStore } from '../store/posStore';
import { buildOwnerTicketNotes, parseOwnerTicketNotes } from '../utils/ownerTicketNotes';
import { splitTransactionAmount } from '../utils/money';

function isServerTicketId(id) {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 && !String(id).startsWith('local');
}

function findStaffForTx(tx, staffList) {
  const eid = tx?.employeeId ?? tx?.Employee?.id ?? tx?.employee?.id;
  if (eid == null) return null;
  return staffList.find((s) => Number(s.id) === Number(eid)) || null;
}

const inputClass =
  'border border-neutral-300 rounded px-2 py-2 text-neutral-900 text-[13px] font-semibold bg-white';

export default function OwnerTicketEditModal({
  visible,
  transaction,
  staffList,
  fallbackServiceId,
  onClose,
  onSaved,
  onDeleted,
}) {
  const [editStaff, setEditStaff] = useState(null);
  const [amount, setAmount] = useState('');
  const [tipCard, setTipCard] = useState('0');
  const [cardPaid, setCardPaid] = useState('0');
  const [cashPaid, setCashPaid] = useState('0');
  const [giftPaid, setGiftPaid] = useState('0');
  const [checkPaid, setCheckPaid] = useState('0');
  const [discounts, setDiscounts] = useState('0');
  const [noteStub, setNoteStub] = useState('');
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const resetFromTransaction = useCallback(
    (tx) => {
      if (!tx) return;
      const { withoutTip, tip } = splitTransactionAmount(tx);
      const parsed = parseOwnerTicketNotes(tx.notes);
      setAmount(String(withoutTip));
      setTipCard(String(tip));
      setCardPaid(parsed.cardPaid);
      setCashPaid(parsed.cashPaid);
      setGiftPaid(parsed.giftPaid);
      setCheckPaid(parsed.checkPaid);
      setDiscounts(parsed.discounts);
      setNoteStub(parsed.noteStub);
      setEditStaff(findStaffForTx(tx, staffList) || staffList[0] || null);
    },
    [staffList]
  );

  useEffect(() => {
    if (visible && transaction) {
      resetFromTransaction(transaction);
    }
  }, [visible, transaction, resetFromTransaction]);

  const staffLabel = editStaff
    ? editStaff.displayName || `${editStaff.firstName || ''} ${editStaff.lastName || ''}`.trim()
    : '—';

  const canSaveToServer = transaction && isServerTicketId(transaction.id);

  const handleSave = async () => {
    if (!transaction) return;
    if (!isServerTicketId(transaction.id)) {
      Alert.alert('Không sửa được', 'Ticket chỉ lưu trên máy (offline) — không đồng bộ server.');
      return;
    }
    const amt = parseFloat(amount) || 0;
    const tips = parseFloat(tipCard) || 0;
    if (!editStaff || amt <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Chọn nhân viên và nhập amount.');
      return;
    }
    const numId = Number(editStaff.id);
    if (!Number.isFinite(numId) || numId < 1) {
      Alert.alert('Nhân viên', 'Chọn nhân viên từ danh sách server.');
      return;
    }
    const sid = Number(transaction.serviceId || fallbackServiceId);
    const body = {
      employeeId: numId,
      serviceId: Number.isFinite(sid) && sid > 0 ? sid : fallbackServiceId,
      amount: Math.round((amt + tips) * 100) / 100,
      tips: Math.round(tips * 100) / 100,
      paymentMethod:
        (parseFloat(cardPaid) || 0) > 0 ? 'card' : (parseFloat(cashPaid) || 0) > 0 ? 'cash' : 'cash',
      date: String(transaction.date || '').slice(0, 10),
      notes: buildOwnerTicketNotes(noteStub, cardPaid, cashPaid, giftPaid, checkPaid, discounts),
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      Alert.alert('Ngày', 'Ngày ticket không hợp lệ.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put(`/api/transactions/${transaction.id}`, body);
      onSaved?.(data);
      onClose?.();
      Alert.alert('Đã lưu', 'Đã cập nhật ticket.');
    } catch (e) {
      Alert.alert('Lỗi', getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!transaction || !isServerTicketId(transaction.id)) return;
    Alert.alert(
      'Xóa ticket?',
      `Ticket #${transaction.id} sẽ bị xóa vĩnh viễn khỏi server.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/api/transactions/${transaction.id}`);
              usePosStore.getState().bumpHomeRefresh();
              onDeleted?.(transaction);
              onClose?.();
              Alert.alert('Đã xóa', 'Ticket đã được xóa.');
            } catch (e) {
              Alert.alert('Lỗi', getApiErrorMessage(e));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (!visible || !transaction) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />
        <View className="bg-white rounded-t-2xl max-h-[88%] border-t border-neutral-200 relative w-full">
          <View className="flex-row items-center justify-between px-4 pt-3 pb-2 border-b border-neutral-200">
            <Text className="text-base font-black text-neutral-900">
              Sửa ticket #{transaction.id}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text className="text-blue-600 font-bold text-[15px]">Đóng</Text>
            </Pressable>
          </View>

          <ScrollView
            className="px-4 pt-3"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 28 }}
          >
            {!canSaveToServer ? (
              <Text className="text-amber-800 text-[11px] font-semibold mb-3 bg-amber-100 px-2 py-2 rounded-lg">
                Ticket chỉ lưu trên máy (offline) — không cập nhật được server.
              </Text>
            ) : null}
            <Text className="text-[10px] font-bold text-neutral-500 mb-1">NHÂN VIÊN</Text>
            <Pressable
              onPress={() => setEmpPickerOpen(true)}
              className="border border-neutral-300 rounded-lg px-3 py-2.5 mb-3 bg-neutral-50"
            >
              <Text className="text-[13px] font-bold text-neutral-900" numberOfLines={2}>
                {staffLabel}
              </Text>
            </Pressable>

            <View className="flex-row flex-wrap gap-2 mb-2">
              <View className="w-[47%] flex-grow min-w-[100px]">
                <Text className="text-[10px] font-bold text-neutral-500 mb-1">AMOUNT*</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  className={inputClass}
                />
              </View>
              <View className="w-[47%] flex-grow min-w-[100px]">
                <Text className="text-[10px] font-bold text-neutral-500 mb-1">TIP CARD</Text>
                <TextInput
                  value={tipCard}
                  onChangeText={setTipCard}
                  keyboardType="decimal-pad"
                  className={inputClass}
                />
              </View>
            </View>

            {[
              ['CARD PAID', cardPaid, setCardPaid],
              ['CASH PAID', cashPaid, setCashPaid],
              ['GIFT PAID', giftPaid, setGiftPaid],
              ['CHECK PAID', checkPaid, setCheckPaid],
              ['DISCOUNTS', discounts, setDiscounts],
            ].map(([label, val, set]) => (
              <View key={label} className="mb-2">
                <Text className="text-[10px] font-bold text-neutral-500 mb-1">{label}</Text>
                <TextInput
                  value={val}
                  onChangeText={set}
                  keyboardType="decimal-pad"
                  className={inputClass}
                />
              </View>
            ))}

            <Text className="text-[10px] font-bold text-neutral-500 mb-1">NOTE (STUB #)</Text>
            <TextInput
              value={noteStub}
              onChangeText={setNoteStub}
              className={`${inputClass} mb-4`}
              multiline
            />

            <Pressable
              onPress={handleSave}
              disabled={saving || deleting || !canSaveToServer}
              className={`rounded-xl py-3.5 items-center mb-2 ${canSaveToServer ? 'bg-orange-600 active:opacity-90' : 'bg-neutral-300'}`}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-extrabold text-[15px]">
                  {canSaveToServer ? 'LƯU THAY ĐỔI' : 'KHÔNG LƯU (OFFLINE)'}
                </Text>
              )}
            </Pressable>

            {canSaveToServer ? (
              <Pressable
                onPress={handleDelete}
                disabled={deleting || saving}
                className="rounded-xl py-3 items-center mb-2 border-2 border-red-600 bg-white active:opacity-90"
              >
                {deleting ? (
                  <ActivityIndicator color="#c62828" />
                ) : (
                  <Text className="text-red-700 font-extrabold text-[14px]">XÓA TICKET</Text>
                )}
              </Pressable>
            ) : null}
          </ScrollView>

          {empPickerOpen ? (
            <Pressable
              className="absolute inset-0 bg-black/45 justify-center px-3"
              onPress={() => setEmpPickerOpen(false)}
            >
              <Pressable
                className="bg-white rounded-xl max-h-[65%] overflow-hidden border border-neutral-300 self-center w-full max-w-md"
                onPress={(e) => e.stopPropagation()}
              >
                <Text className="font-bold text-base px-4 pt-4 pb-2">Chọn nhân viên</Text>
                <ScrollView style={{ maxHeight: 360 }} className="px-1 pb-4">
                  {staffList.map((s) => (
                    <Pressable
                      key={String(s.id)}
                      onPress={() => {
                        setEditStaff(s);
                        setEmpPickerOpen(false);
                      }}
                      className="py-3 px-3 border-b border-neutral-100"
                    >
                      <Text className="font-semibold text-neutral-900">
                        {s.displayName || `${s.firstName} ${s.lastName}`.trim()}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Pressable>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
