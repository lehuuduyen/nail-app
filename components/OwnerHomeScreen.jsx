import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
import api from '../api/client';
import { fetchCatalogEmployees, fetchCatalogServices } from '../api/catalog';
import { SAMPLE_STAFF } from '../constants/sampleData';
import { useLocalCatalogStore } from '../store/localCatalogStore';
import { useOwnerStore } from '../store/ownerStore';
import { splitTransactionAmountForDisplay } from '../utils/money';
import { getSalonDateYmd } from '../utils/salonTz';
import { mapApiEmployeeToPosStaff } from '../utils/staffDisplay';
import OwnerTicketEditModal from './OwnerTicketEditModal';
import { formatYmdAsTicketLabel, techTicketRowSummary } from '../utils/ticketDisplay';

const LEFT_BG = '#111';
const RIGHT_BG = '#1a1a1a';
const INPUT_BG = '#333';
const BORDER = '#555';

const inputStyle = {
  backgroundColor: INPUT_BG,
  color: '#fff',
  borderRadius: 4,
  paddingHorizontal: 8,
  paddingVertical: 8,
  fontSize: 13,
  borderWidth: 1,
  borderColor: BORDER,
  minHeight: 38,
};

function FormField({ label, children }) {
  return (
    <View style={{ flex: 1, minWidth: 72 }}>
      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function OwnerHomeScreen() {
  const insets = useSafeAreaInsets();
  const isOwnerMode = useOwnerStore((s) => s.isOwnerMode);
  const ownerLogout = useOwnerStore((s) => s.logout);

  const [staffList, setStaffList] = useState(SAMPLE_STAFF);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [fallbackServiceId, setFallbackServiceId] = useState(1);

  const [amount, setAmount] = useState('');
  const [tipCard, setTipCard] = useState('0');
  const [cardPaid, setCardPaid] = useState('0');
  const [cashPaid, setCashPaid] = useState('0');
  const [giftPaid, setGiftPaid] = useState('0');
  const [checkPaid, setCheckPaid] = useState('0');
  const [discounts, setDiscounts] = useState('0');
  const [noteStub, setNoteStub] = useState('');
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
        setSelectedStaff((prev) => prev || merged[0]);
      } else {
        const merged = [...SAMPLE_STAFF, ...mapLocal(localExtras, SAMPLE_STAFF.length)];
        setStaffList(merged);
        setSelectedStaff((prev) => prev || merged[0]);
      }
      setTransactions(txRes.data || []);
    } catch {
      const merged = [...SAMPLE_STAFF, ...mapLocal(localExtras, SAMPLE_STAFF.length)];
      setStaffList(merged);
      setSelectedStaff((prev) => prev || merged[0]);
      setTransactions([]);
    }
  }, [workYmd]);

  useFocusEffect(
    useCallback(() => {
      if (!isOwnerMode) {
        router.replace('/(pos)');
        return;
      }
      load();
    }, [load, isOwnerMode])
  );

  const selectedLabel = selectedStaff
    ? selectedStaff.displayName ||
      `${selectedStaff.firstName || ''} ${selectedStaff.lastName || ''}`.trim()
    : 'Select…';

  const todaySummary = () => {
    let total = 0;
    let tips = 0;
    for (const t of transactions) {
      const { withoutTip, tip } = splitTransactionAmountForDisplay(t);
      total += withoutTip;
      tips += tip;
    }
    Alert.alert(
      'Today summary',
      `Transactions: ${transactions.length}\nSales (no tip): $${total.toFixed(2)}\nTips: $${tips.toFixed(2)}`
    );
  };

  const handleAddTicket = async () => {
    const amt = parseFloat(amount) || 0;
    if (!selectedStaff || amt <= 0) {
      Alert.alert('Error', 'Please select employee and enter amount');
      return;
    }
    const tips = parseFloat(tipCard) || 0;
    const numId = Number(selectedStaff.id);
    const body = {
      employeeId: Number.isFinite(numId) && numId > 0 ? numId : undefined,
      serviceId: fallbackServiceId,
      amount: Math.round((amt + tips) * 100) / 100,
      tips: Math.round(tips * 100) / 100,
      paymentMethod:
        (parseFloat(cardPaid) || 0) > 0 ? 'card' : (parseFloat(cashPaid) || 0) > 0 ? 'cash' : 'cash',
      date: workYmd,
      turnType: 'owner_assign',
      notes: [
        noteStub || '',
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
      Alert.alert('Employee', 'Use an employee from the server list for API save.');
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
      setNoteStub('');
      Alert.alert('Success', 'Ticket added!');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Request failed';
      Alert.alert('Error', String(msg));
    }
  };

  const clearForm = () => {
    setAmount('');
    setTipCard('0');
    setCardPaid('0');
    setCashPaid('0');
    setGiftPaid('0');
    setCheckPaid('0');
    setDiscounts('0');
    setNoteStub('');
  };

  if (!isOwnerMode) return null;

  return (
    <View className="flex-1" style={{ backgroundColor: LEFT_BG, paddingTop: insets.top }}>
      <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Pressable
              onPress={() =>
                Alert.alert('Guide', 'Owner add ticket: pick employee, amounts, then ADD.')
              }
              style={{ backgroundColor: '#555', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4 }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>GUIDE</Text>
            </Pressable>

            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>OWNER ADD TICKET</Text>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pressable
                onPress={todaySummary}
                style={{ backgroundColor: '#555', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4 }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>TODAY SUMMARY</Text>
              </Pressable>
              <Pressable
                onPress={() => ownerLogout()}
                style={{ backgroundColor: '#E53935', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4 }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>OFF OWNER MODE</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', marginBottom: 4 }}>PICK AN EMPLOYEE*</Text>
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={[inputStyle, { justifyContent: 'center' }]}
              >
                <Text style={{ color: '#fff', fontSize: 12 }} numberOfLines={2}>
                  {selectedLabel}
                </Text>
              </Pressable>
            </View>
            <FormField label="AMOUNT*">
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#888"
                style={inputStyle}
              />
            </FormField>
            <FormField label="TIP CARD*">
              <TextInput value={tipCard} onChangeText={setTipCard} keyboardType="decimal-pad" style={inputStyle} />
            </FormField>
            <FormField label="WORKDATE">
              <View style={[inputStyle, { justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: 12 }}>{workLabel}</Text>
              </View>
            </FormField>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'CARD PAID', value: cardPaid, setter: setCardPaid },
              { label: 'CASH PAID', value: cashPaid, setter: setCashPaid },
              { label: 'GIFT PAID', value: giftPaid, setter: setGiftPaid },
              { label: 'CHECK P...', value: checkPaid, setter: setCheckPaid },
              { label: 'DISCOUNTS', value: discounts, setter: setDiscounts },
            ].map((field) => (
              <View key={field.label} style={{ width: '30%', minWidth: 88 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', marginBottom: 4 }}>{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType="decimal-pad"
                  style={inputStyle}
                />
              </View>
            ))}
            <View style={{ width: '100%', marginTop: 4 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', marginBottom: 4 }}>NOTE (STUB #)</Text>
              <TextInput
                value={noteStub}
                onChangeText={setNoteStub}
                style={inputStyle}
                placeholder=" "
                placeholderTextColor="#888"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <Pressable
              onPress={clearForm}
              style={{
                flex: 1,
                backgroundColor: '#4CAF50',
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
                maxWidth: 160,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>CANCEL</Text>
            </Pressable>
            <Pressable
              onPress={handleAddTicket}
              style={{
                flex: 2,
                backgroundColor: '#FF6B00',
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>ADD</Text>
            </Pressable>
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#111', marginBottom: 6 }}>Customer Notice</Text>
            <Text style={{ fontSize: 10, color: '#444', lineHeight: 15 }}>
              Visa regulations require clear customer communication for card pricing and surcharges where applicable.
            </Text>
          </View>
        </ScrollView>

        <View style={{ width: 320, backgroundColor: RIGHT_BG, padding: 8, borderLeftWidth: 1, borderLeftColor: '#333' }}>
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: '#333',
              paddingBottom: 8,
              marginBottom: 8,
            }}
          >
            {['Date', 'Employee', 'Amount', 'Tip'].map((h) => (
              <Text key={h} style={{ flex: 1, color: '#999', fontSize: 10, fontWeight: '700' }}>
                {h}
              </Text>
            ))}
          </View>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: '#aaa', fontSize: 11, fontWeight: '700' }}>TECHNICIAN TICKETS</Text>
            <Text style={{ color: '#666', fontSize: 9, fontWeight: '600', marginTop: 2 }}>
              Chạm để sửa · giữ để xem nhanh
            </Text>
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator>
            {transactions.map((ticket) => {
              const row = techTicketRowSummary(ticket);
              const cell = { flex: 1, minWidth: 0, paddingHorizontal: 2 };
              return (
                <Pressable
                  key={String(ticket.id)}
                  onPress={() => setEditTicket(ticket)}
                  onLongPress={() =>
                    Alert.alert(
                      `Ticket #${ticket.id}`,
                      `${row.employee}\n${row.amountStr} · ${row.tipStr}\n${row.dateLabel} ${row.timeStr}`
                    )
                  }
                  style={{
                    width: '100%',
                    paddingVertical: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: '#333',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                    <Text
                      style={[cell, { color: '#64b5f6', fontSize: 10, textDecorationLine: 'underline' }]}
                      numberOfLines={1}
                    >
                      {row.dateLabel}
                    </Text>
                    <Text style={[cell, { color: '#fff', fontSize: 10, fontWeight: '700' }]} numberOfLines={2}>
                      {row.employee}
                    </Text>
                    <Text style={[cell, { color: '#81c784', fontSize: 10, fontWeight: '600' }]} numberOfLines={1}>
                      {row.amountStr}
                    </Text>
                    <Text style={[cell, { color: '#ffb74d', fontSize: 10, fontWeight: '600' }]} numberOfLines={1}>
                      {row.tipStr}
                    </Text>
                  </View>
                  {row.timeStr ? (
                    <Text style={{ color: '#666', fontSize: 9, textAlign: 'right', marginTop: 2 }}>
                      {row.timeStr}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
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
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 }} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={{ backgroundColor: '#fff', borderRadius: 12, maxHeight: '70%', overflow: 'hidden' }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontWeight: '800', padding: 16, fontSize: 16 }}>Pick employee</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {staffList.map((s) => (
                <Pressable
                  key={String(s.id)}
                  onPress={() => {
                    setSelectedStaff(s);
                    setPickerOpen(false);
                  }}
                  style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600' }}>
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
