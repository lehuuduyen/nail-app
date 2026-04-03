import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { fetchCatalogEmployees, fetchCatalogServices } from '../../api/catalog';
import OwnerTicketEditModal from '../../components/OwnerTicketEditModal';
import TechnicianTicketsPanel from '../../components/TechnicianTicketsPanel';
import { useOwnerStore } from '../../store/ownerStore';
import { getSalonDateYmd } from '../../utils/salonTz';
import { mapApiEmployeeToPosStaff } from '../../utils/staffDisplay';
import { formatYmdAsTicketLabel } from '../../utils/ticketDisplay';
import { SAMPLE_STAFF } from '../../constants/sampleData';
import { useLocalCatalogStore } from '../../store/localCatalogStore';

const FORM_BG = '#0d0d0d';
const INPUT_BG = '#fff';

function FieldLabel({ children }) {
  return (
    <Text className="text-[9px] font-bold text-white mb-1 uppercase" numberOfLines={2}>
      {children}
    </Text>
  );
}

function SmallInput({ value, onChangeText, keyboardType = 'decimal-pad' }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      className="text-neutral-900 text-[12px] font-semibold px-2 py-2 rounded border border-neutral-400"
      style={{ backgroundColor: INPUT_BG, minHeight: 36 }}
    />
  );
}

export default function OwnerAddTicketScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const isOwnerMode = useOwnerStore((s) => s.isOwnerMode);

  const staffIdParam = Array.isArray(params.staffId) ? params.staffId[0] : params.staffId;
  const staffNameParam = Array.isArray(params.staffName) ? params.staffName[0] : params.staffName;

  const [staffList, setStaffList] = useState(SAMPLE_STAFF);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [tipCard, setTipCard] = useState('0');
  const [cardPaid, setCardPaid] = useState('0');
  const [cashPaid, setCashPaid] = useState('0');
  const [giftPaid, setGiftPaid] = useState('0');
  const [checkPaid, setCheckPaid] = useState('0');
  const [discounts, setDiscounts] = useState('0');
  const [note, setNote] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [fallbackServiceId, setFallbackServiceId] = useState(1);
  const [editTicket, setEditTicket] = useState(null);

  const workYmd = getSalonDateYmd();
  const workLabel = formatYmdAsTicketLabel(workYmd);

  const load = useCallback(async () => {
    const localExtras = useLocalCatalogStore.getState().employees;
    const mapLocal = (emps, startIdx) =>
      emps.map((e, i) =>
        mapApiEmployeeToPosStaff(
          {
            id: e.id,
            firstName: e.firstName,
            lastName: e.lastName,
            isActive: true,
          },
          startIdx + i
        )
      );
    try {
      const [emps, txRes, svcRes] = await Promise.all([
        fetchCatalogEmployees(),
        api.get('/api/transactions', { params: { limit: 200, date: workYmd } }),
        fetchCatalogServices(),
      ]);
      const rows = (svcRes || []).filter((s) => s.isActive !== false);
      if (rows.length) setFallbackServiceId(rows[0].id);

      if (emps.length) {
        const main = emps.map((e, i) => mapApiEmployeeToPosStaff(e, i));
        const merged = [...main, ...mapLocal(localExtras, main.length)];
        setStaffList(merged);
        const sid = staffIdParam != null ? String(staffIdParam) : '';
        const pick =
          merged.find((s) => String(s.id) === sid) ||
          merged[0];
        setSelectedStaff(pick);
      } else {
        const merged = [...SAMPLE_STAFF, ...mapLocal(localExtras, SAMPLE_STAFF.length)];
        setStaffList(merged);
        const sid = staffIdParam != null ? String(staffIdParam) : '';
        setSelectedStaff(
          merged.find((s) => String(s.id) === sid) ||
            merged[0]
        );
      }
      setTransactions(txRes.data || []);
    } catch {
      const merged = [...SAMPLE_STAFF, ...mapLocal(localExtras, SAMPLE_STAFF.length)];
      setStaffList(merged);
      const sid = staffIdParam != null ? String(staffIdParam) : '';
      setSelectedStaff(
        merged.find((s) => String(s.id) === sid) || merged[0]
      );
      setTransactions([]);
    }
  }, [staffIdParam, workYmd]);

  useFocusEffect(
    useCallback(() => {
      if (!isOwnerMode) {
        router.replace('/(pos)');
        return;
      }
      load();
    }, [load, isOwnerMode])
  );

  useEffect(() => {
    if (!staffList.length) return;
    const sid = staffIdParam != null ? String(staffIdParam) : '';
    const found = staffList.find((s) => String(s.id) === sid);
    if (found) {
      setSelectedStaff(found);
      return;
    }
    if (staffNameParam) {
      setSelectedStaff({
        id: staffIdParam || `local-${staffNameParam}`,
        firstName: staffNameParam,
        lastName: '',
        displayName: staffNameParam,
      });
    }
  }, [staffList, staffIdParam, staffNameParam]);

  const selectedLabel = selectedStaff
    ? selectedStaff.displayName ||
      `${selectedStaff.firstName || ''} ${selectedStaff.lastName || ''}`.trim()
    : '—';

  const submitAdd = async () => {
    const amt = parseFloat(amount) || 0;
    if (!selectedStaff || amt <= 0) {
      Alert.alert('Required', 'Pick an employee and enter amount.');
      return;
    }
    const tips = parseFloat(tipCard) || 0;
    const eid = selectedStaff.id;
    const numId = Number(eid);
    const body = {
      employeeId: Number.isFinite(numId) && numId > 0 ? numId : undefined,
      serviceId: fallbackServiceId,
      amount: Math.round((amt + tips) * 100) / 100,
      tips: Math.round(tips * 100) / 100,
      paymentMethod:
        (parseFloat(cardPaid) || 0) > 0
          ? 'card'
          : (parseFloat(cashPaid) || 0) > 0
            ? 'cash'
            : 'cash',
      date: workYmd,
      notes: [
        note || '',
        `card:${cardPaid}`,
        `cash:${cashPaid}`,
        `gift:${giftPaid}`,
        `check:${checkPaid}`,
        `disc:${discounts}`,
      ]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 500),
    };

    if (!body.employeeId) {
      Alert.alert('Employee', 'Use an employee from the server list for API save, or stay offline.');
      return;
    }

    try {
      const { data } = await api.post('/api/transactions', body);
      setTransactions((prev) => [{ ...data, Employee: selectedStaff }, ...prev]);
      setAmount('');
      setTipCard('0');
      setCardPaid('0');
      setCashPaid('0');
      setGiftPaid('0');
      setCheckPaid('0');
      setDiscounts('0');
      setNote('');
      Alert.alert('Added', 'Ticket saved.');
    } catch {
      const localId = `local-${Date.now()}`;
      setTransactions((prev) => [
        {
          id: localId,
          date: workYmd,
          amount: body.amount,
          tips: body.tips,
          paymentMethod: body.paymentMethod,
          notes: body.notes,
          createdAt: new Date().toISOString(),
          Employee: {
            firstName: selectedStaff.firstName,
            lastName: selectedStaff.lastName || '',
          },
        },
        ...prev,
      ]);
      Alert.alert('Saved locally', 'Could not reach server — ticket kept on this device only.');
    }
  };

  if (!isOwnerMode) return null;

  return (
    <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: FORM_BG }}>
      <View className="flex-row items-center px-2 py-2 border-b border-neutral-600 bg-neutral-900">
        <Pressable onPress={() => router.back()} className="px-2 py-2">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-center text-white font-black text-xs uppercase">
          Owner add ticket
        </Text>
        <View className="w-8" />
      </View>

      <View className="flex-1 flex-row min-h-0">
        <ScrollView
          className="flex-1 min-w-0"
          contentContainerStyle={{ padding: 10, paddingBottom: 32 }}
          style={{ backgroundColor: FORM_BG }}
        >
          <View className="flex-row flex-wrap gap-y-2 gap-x-2 mb-2">
            <View className="w-[48%] flex-grow min-w-[140px]">
              <FieldLabel>PICK AN EMPLOYEE*</FieldLabel>
              <Pressable
                onPress={() => setPickerOpen(true)}
                className="rounded border border-neutral-400 px-2 py-2.5"
                style={{ backgroundColor: INPUT_BG }}
              >
                <Text className="text-[11px] font-bold text-neutral-900" numberOfLines={2}>
                  {selectedLabel}
                </Text>
              </Pressable>
            </View>
            <View className="w-[22%] flex-grow min-w-[72px]">
              <FieldLabel>AMOUNT*</FieldLabel>
              <SmallInput value={amount} onChangeText={setAmount} />
            </View>
            <View className="w-[22%] flex-grow min-w-[72px]">
              <FieldLabel>TIP CARD*</FieldLabel>
              <SmallInput value={tipCard} onChangeText={setTipCard} />
            </View>
            <View className="w-[22%] flex-grow min-w-[100px]">
              <FieldLabel>WORKDATE</FieldLabel>
              <View
                className="rounded border border-neutral-400 px-2 py-2.5 justify-center"
                style={{ backgroundColor: INPUT_BG, minHeight: 36 }}
              >
                <Text className="text-[11px] font-bold text-neutral-900">{workLabel}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-y-2 gap-x-1.5 mb-4">
            {[
              ['CARD PAID', cardPaid, setCardPaid],
              ['CASH PAID', cashPaid, setCashPaid],
              ['GIFT PAID', giftPaid, setGiftPaid],
              ['CHECK P...', checkPaid, setCheckPaid],
              ['DISCOUNTS', discounts, setDiscounts],
            ].map(([label, val, set]) => (
              <View key={label} className="w-[30%] flex-grow min-w-[90px]">
                <FieldLabel>{label}</FieldLabel>
                <SmallInput value={val} onChangeText={set} />
              </View>
            ))}
            <View className="w-full min-w-[120px] mt-1">
              <FieldLabel>NOTE (STUB #)</FieldLabel>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder=" "
                className="text-neutral-900 text-[12px] px-2 py-2 rounded border border-neutral-400"
                style={{ backgroundColor: INPUT_BG, minHeight: 36 }}
              />
            </View>
          </View>

          <View className="flex-row gap-3 mb-4">
            <Pressable
              onPress={() => router.back()}
              className="flex-1 max-w-[160px] py-4 rounded-md items-center justify-center bg-green-700 active:opacity-90"
            >
              <Text className="text-white font-extrabold text-sm">CANCEL</Text>
            </Pressable>
            <Pressable
              onPress={submitAdd}
              className="flex-[1.4] py-4 rounded-md items-center justify-center bg-orange-600 active:opacity-90"
            >
              <Text className="text-white font-extrabold text-sm">ADD</Text>
            </Pressable>
          </View>

          <View className="bg-white rounded-md p-3 border border-neutral-400">
            <Text className="text-[11px] font-bold text-neutral-900 mb-2">Customer Notice</Text>
            <Text className="text-[10px] text-neutral-700 leading-snug mb-3">
              Visa regulations require merchants to inform customers when a surcharge or dual pricing
              applies to card transactions. Display appropriate signage and offer the cash price as an
              alternative where applicable.
            </Text>
            <Pressable className="bg-blue-600 py-2.5 rounded-md items-center active:opacity-90">
              <Text className="text-white font-bold text-xs">View Full Details</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View className="w-[32%] max-w-[340px] min-w-[220px]">
          <TechnicianTicketsPanel
            transactions={transactions}
            onRowPress={(tx) => setEditTicket(tx)}
          />
        </View>
      </View>

      <OwnerTicketEditModal
        visible={!!editTicket}
        transaction={editTicket}
        staffList={staffList}
        fallbackServiceId={fallbackServiceId}
        onClose={() => setEditTicket(null)}
        onSaved={(updated) => {
          setTransactions((prev) =>
            prev.map((t) => (String(t.id) === String(updated.id) ? updated : t))
          );
        }}
        onDeleted={(removed) => {
          setTransactions((prev) => prev.filter((t) => String(t.id) !== String(removed.id)));
        }}
      />

      <Modal visible={pickerOpen} animationType="fade" transparent>
        <Pressable className="flex-1 bg-black/60 justify-center px-4" onPress={() => setPickerOpen(false)}>
          <Pressable
            className="bg-white rounded-xl max-h-[70%] border border-neutral-300 overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="font-bold text-base px-4 pt-4 pb-2">Pick employee</Text>
            <ScrollView className="px-2 pb-4" style={{ maxHeight: 400 }}>
              {staffList.map((s) => (
                <Pressable
                  key={String(s.id)}
                  onPress={() => {
                    setSelectedStaff(s);
                    setPickerOpen(false);
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
      </Modal>
    </View>
  );
}
