import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { fetchCatalogEmployees, fetchCatalogServices } from '../../api/catalog';
import PaymentModal from '../../components/PaymentModal';
import ServiceButton from '../../components/ServiceButton';
import TicketSummary from '../../components/TicketSummary';
import { SAMPLE_SERVICES, SAMPLE_STAFF } from '../../constants/sampleData';
import { useLocalCatalogStore } from '../../store/localCatalogStore';
import { usePosStore } from '../../store/posStore';

const TURN_TYPE_OPTIONS = [
  { key: 'walk_in', label: 'Walk-in', color: '#4CAF50' },
  { key: 'customer_pick', label: 'Khách chọn', color: '#2196F3' },
  { key: 'owner_assign', label: 'Owner assign', color: '#FF9800' },
  { key: 'appointment', label: 'Hẹn trước', color: '#9C27B0' },
];
import {
  POS_TAB_ORDER,
  apiCategoryToPosTab,
  normalizePosTabLabel,
  tabsInUseForServices,
} from '../../utils/serviceCategories';
import { mapApiEmployeeToPosStaff } from '../../utils/staffDisplay';
import { getSalonDateYmd } from '../../utils/salonTz';
import { splitByWeights } from '../../utils/splitTicketPayment';
import { isCardTerminalPaymentEnabled } from '../../utils/featureFlags';
import { isPosTestPayEnabled } from '../../utils/posTestPay';
import { pollHelcimTransactionApproved } from '../../utils/helcimTerminal';

const NUM_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

function mergeLocalServices(base) {
  const local = useLocalCatalogStore.getState().services;
  const extra = local.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    category: normalizePosTabLabel(apiCategoryToPosTab(s.category || 'other')),
  }));
  return [...base, ...extra];
}

function isApiNumericId(v) {
  if (v == null || v === '') return false;
  const s = String(v);
  if (s.includes('local')) return false;
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
}

function routeParamFirst(v) {
  if (v == null || v === '') return '';
  const x = Array.isArray(v) ? v[0] : v;
  if (x == null) return '';
  return String(x);
}

export default function NewTicketScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const setStaff = usePosStore((s) => s.setStaff);
  const lines = usePosStore((s) => s.lines);
  const taxEnabled = usePosStore((s) => s.taxEnabled);
  const setTaxEnabled = usePosStore((s) => s.setTaxEnabled);
  const addLine = usePosStore((s) => s.addLine);
  const removeLine = usePosStore((s) => s.removeLine);
  const clearTicket = usePosStore((s) => s.clearTicket);
  const setTip = usePosStore((s) => s.setTip);
  const setDiscount = usePosStore((s) => s.setDiscount);
  const getSubtotal = usePosStore((s) => s.getSubtotal);
  const getTaxAmount = usePosStore((s) => s.getTaxAmount);
  const getTotal = usePosStore((s) => s.getTotal);
  const getCardTotal = usePosStore((s) => s.getCardTotal);
  const getCashTotal = usePosStore((s) => s.getCashTotal);
  const getCardFeeBase = usePosStore((s) => s.getCardFeeBase);
  const staffId = usePosStore((s) => s.staffId);
  const staffName = usePosStore((s) => s.staffName);

  const [tab, setTab] = useState(POS_TAB_ORDER[0]);
  const [services, setServices] = useState(SAMPLE_SERVICES);
  const [fallbackServiceId, setFallbackServiceId] = useState(1);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('CUSTOM');
  const [amountStr, setAmountStr] = useState('');
  const [discountOpen, setDiscountOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [tipInput, setTipInput] = useState('');
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [modalStaffList, setModalStaffList] = useState(SAMPLE_STAFF);
  const [pendingLineStaff, setPendingLineStaff] = useState(null);
  const [terminalPolling, setTerminalPolling] = useState(false);
  const [turnType, setTurnType] = useState('walk_in');
  const [linkedAppointmentId, setLinkedAppointmentId] = useState(null);
  const cardPendingRef = useRef(null);
  const posTestSeedTriedRef = useRef(false);
  const testPayEnabled = useMemo(() => isPosTestPayEnabled(), []);
  const cardTerminalEnabled = isCardTerminalPaymentEnabled();
  const tabs = useMemo(() => {
    const u = tabsInUseForServices(services);
    return u.length ? u : POS_TAB_ORDER;
  }, [services]);

  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
  }, [tabs, tab]);

  useEffect(() => {
    const raw = routeParamFirst(params.staffId);
    const name = routeParamFirst(params.staffName) || 'STAFF';
    if (raw !== '') {
      const str = raw;
      if (str.startsWith('local-')) {
        setStaff(str, name);
        return;
      }
      const num = Number(str);
      setStaff(Number.isFinite(num) ? num : str, name);
      return;
    }
    if (name !== '' && name !== 'STAFF') {
      setStaff(null, name);
    }
  }, [params.staffId, params.staffName, setStaff]);

  useEffect(() => {
    const appt = routeParamFirst(params.appointmentId);
    if (appt !== '' && /^\d+$/.test(appt)) {
      setLinkedAppointmentId(Number(appt));
      setTurnType('appointment');
      return;
    }
    setLinkedAppointmentId(null);

    const dt = routeParamFirst(params.defaultTurnType);
    if (['walk_in', 'customer_pick', 'owner_assign', 'appointment'].includes(dt)) {
      setTurnType(dt);
      return;
    }

    const sug = routeParamFirst(params.suggestedEmployeeId);
    const sid = routeParamFirst(params.staffId);
    const sNum = sid !== '' ? Number(sid) : NaN;
    const gNum = sug !== '' ? Number(sug) : NaN;
    if (Number.isFinite(sNum) && Number.isFinite(gNum) && sNum === gNum) {
      setTurnType('walk_in');
    } else if (Number.isFinite(sNum)) {
      setTurnType('customer_pick');
    } else {
      setTurnType('walk_in');
    }
  }, [
    params.appointmentId,
    params.defaultTurnType,
    params.suggestedEmployeeId,
    params.staffId,
  ]);

  const loadStaffForModal = useCallback(async () => {
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
      const list = await fetchCatalogEmployees();
      if (list.length) {
        const main = list.map((e, i) => mapApiEmployeeToPosStaff(e, i));
        setModalStaffList([...main, ...mapLocal(localExtras, main.length)]);
      } else {
        setModalStaffList([...SAMPLE_STAFF, ...mapLocal(localExtras, SAMPLE_STAFF.length)]);
      }
    } catch {
      setModalStaffList([...SAMPLE_STAFF, ...mapLocal(localExtras, SAMPLE_STAFF.length)]);
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      const rows = (await fetchCatalogServices()).filter((s) => s.isActive !== false);
      if (rows.length) {
        const mapped = rows.map((s) => ({
          id: s.id,
          name: s.name,
          price: Number(s.price),
          priceCard:
            s.priceCard != null && s.priceCard !== ''
              ? Number(s.priceCard)
              : undefined,
          duration: s.duration,
          category: normalizePosTabLabel(apiCategoryToPosTab(s.category)),
        }));
        setFallbackServiceId(mapped[0].id);
        setServices(mergeLocalServices(mapped));
      } else {
        setServices(mergeLocalServices(SAMPLE_SERVICES));
      }
    } catch {
      setServices(mergeLocalServices(SAMPLE_SERVICES));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      posTestSeedTriedRef.current = false;
      loadServices();
    }, [loadServices])
  );

  /** Test POS: một dòng vé + NV đầu từ API (id số) để Pay gửi server được ngay */
  useEffect(() => {
    if (!testPayEnabled || posTestSeedTriedRef.current || lines.length > 0) return;
    const firstSvc = services.find((s) => isApiNumericId(s.id));
    if (!firstSvc) return;
    posTestSeedTriedRef.current = true;
    (async () => {
      try {
        const emps = await fetchCatalogEmployees();
        const first = emps.find((e) => e.isActive !== false) || emps[0];
        if (!first) return;
        const mapped = mapApiEmployeeToPosStaff(first, 0);
        const st = usePosStore.getState();
        if (st.lines.length > 0) return;
        st.setStaff(mapped.id, mapped.name);
        st.addLine({
          name: firstSvc.name,
          price: firstSvc.price,
          qty: 1,
          serviceId: firstSvc.id,
          employeeId: mapped.id,
          employeeName: mapped.name,
        });
      } catch {
        /* giữ vé trống — thử tay */
      }
    })();
  }, [testPayEnabled, services, lines.length]);

  const filtered = useMemo(
    () => services.filter((s) => s.category === tab),
    [services, tab]
  );

  const subtotal = getSubtotal();
  const taxAmount = getTaxAmount();
  const total = getTotal();
  const cardTotal = getCardTotal();
  const cashTotal = getCashTotal();

  const appendLineWithTech = (payload) => {
    const tech = pendingLineStaff ?? { id: staffId, name: staffName };
    addLine({
      ...payload,
      employeeId: tech.id ?? staffId ?? null,
      employeeName: (tech.name || staffName || '').trim() || undefined,
    });
  };

  const resetLocalTicketUi = () => {
    clearTicket();
    setPendingLineStaff(null);
  };

  const exitClear = () => {
    resetLocalTicketUi();
    router.back();
  };

  const appendDigit = (d) => {
    if (d === '.' && amountStr.includes('.')) return;
    setAmountStr((a) => (a + d).replace(/^0+(\d)/, '$1'));
  };

  const addCustomLine = () => {
    const n = parseFloat(amountStr) || 0;
    if (n <= 0) {
      setCustomOpen(false);
      return;
    }
    appendLineWithTech({
      name: customName || 'CUSTOM',
      price: n,
      qty: 1,
      serviceId: fallbackServiceId,
    });
    setAmountStr('');
    setCustomName('CUSTOM');
    setCustomOpen(false);
  };

  const validateTicketForPay = useCallback(() => {
    const missingTech = lines.some((line) => {
      const eid = line.employeeId ?? staffId;
      return eid == null || eid === '';
    });
    if (!lines.length || missingTech) {
      return 'Mỗi dòng cần nhân viên — chọn bubble trên màn chủ hoặc Add Tech trước khi thêm dịch vụ / thanh toán.';
    }
    return null;
  }, [lines, staffId]);

  const buildLinePayloads = useCallback(
    (method, date) => {
      const tip = usePosStore.getState().tip;
      const serviceBase = getCardFeeBase();
      const weights = lines.map((l) => Number(l.price) * (l.qty || 1));
      const tipParts = splitByWeights(weights, tip);
      let svcParts;
      if (method === 'card') {
        const cardSvcTotal = Math.max(0, serviceBase * 1.03);
        svcParts = splitByWeights(weights, cardSvcTotal);
      } else {
        svcParts = splitByWeights(weights, Math.max(0, serviceBase));
      }

      /** Mọi dòng cùng loại vé — mỗi thợ được backend tính turn đúng (walk-in 2 thợ: cả hai +1). */
      return lines.map((line, i) => {
        const eid = line.employeeId ?? staffId;
        const svcId = line.serviceId ?? fallbackServiceId;
        const tips = tipParts[i] ?? 0;
        const svc = svcParts[i] ?? 0;
        const amount = Math.round((svc + tips) * 100) / 100;
        const lineTurnType = turnType;
        const body = {
          employeeId: Number(eid),
          serviceId: Number(svcId),
          amount,
          tips: Math.round(tips * 100) / 100,
          paymentMethod: method === 'card' ? 'card' : 'cash',
          date,
          notes: `${line.name}:${line.price}`,
          turnType: lineTurnType,
        };
        if (linkedAppointmentId != null && Number.isFinite(linkedAppointmentId)) {
          body.appointmentId = linkedAppointmentId;
        }
        return {
          line,
          employeeId: eid,
          serviceId: svcId,
          body,
          canApi:
            isApiNumericId(eid) && isApiNumericId(svcId) && Number.isFinite(amount),
        };
      });
    },
    [lines, staffId, fallbackServiceId, getCardFeeBase, turnType, linkedAppointmentId]
  );

  const persistPayloadsToApi = useCallback(async (payloads, helcimOnFirstRow) => {
    const allApi = payloads.length > 0 && payloads.every((p) => p.canApi);
    if (!allApi) {
      Alert.alert(
        'Hoàn tất cục bộ',
        'Một số dòng dùng nhân viên/dịch vụ offline — không gửi đủ lên server.'
      );
      return true;
    }
    try {
      for (let i = 0; i < payloads.length; i++) {
        const body = { ...payloads[i].body };
        if (i === 0 && helcimOnFirstRow && typeof helcimOnFirstRow === 'object') {
          Object.assign(body, helcimOnFirstRow, { paymentStatus: 'approved' });
        }
        await api.post('/api/transactions', body);
      }
      usePosStore.getState().bumpHomeRefresh();
      return true;
    } catch {
      Alert.alert('Lỗi', 'Không lưu được giao dịch lên server. Vé chưa đóng.');
      return false;
    }
  }, []);

  const finishCheckoutAndLeave = useCallback(() => {
    clearTicket();
    setPendingLineStaff(null);
    setPaymentOpen(false);
    router.back();
  }, [clearTicket]);

  const onHelcimPaid = useCallback(
    async (meta) => {
      const ctx = cardPendingRef.current;
      cardPendingRef.current = null;
      if (!ctx?.payloads?.length) return;

      const helcimFirst = {
        ...meta,
        helcimInvoiceNumber:
          meta?.helcimInvoiceNumber || ctx.checkoutInvoice || undefined,
      };

      const ok = await persistPayloadsToApi(ctx.payloads, helcimFirst);
      if (ok) finishCheckoutAndLeave();
    },
    [persistPayloadsToApi, finishCheckoutAndLeave]
  );

  const onPayCash = useCallback(async () => {
    const err = validateTicketForPay();
    if (err) {
      Alert.alert('Ticket', err);
      setPaymentOpen(false);
      return;
    }
    const date = getSalonDateYmd();
    const payloads = buildLinePayloads('cash', date);
    const ok = await persistPayloadsToApi(payloads, null);
    if (ok) finishCheckoutAndLeave();
    else setPaymentOpen(false);
  }, [
    validateTicketForPay,
    buildLinePayloads,
    persistPayloadsToApi,
    finishCheckoutAndLeave,
  ]);

  const onPayCard = useCallback(async () => {
    const err = validateTicketForPay();
    if (err) {
      Alert.alert('Ticket', err);
      setPaymentOpen(false);
      return;
    }
    const date = getSalonDateYmd();
    const serviceBase = getCardFeeBase();
    const tip = usePosStore.getState().tip;
    const payloads = buildLinePayloads('card', date);

    if (testPayEnabled) {
      cardPendingRef.current = {
        payloads,
        checkoutInvoice: null,
      };
      setPaymentOpen(false);
      await onHelcimPaid({});
      return;
    }

    setPaymentOpen(false);
    setTerminalPolling(true);
    try {
      const { data } = await api.post('/api/helcim/terminal/charge', {
        amount: serviceBase,
        tips: tip,
        taxEnabled: true,
        notes: lines
          .map((l) => `${l.name}:${l.price}`)
          .join('; ')
          .slice(0, 500),
      });
      if (!data?.success) {
        setTerminalPolling(false);
        Alert.alert('Máy chạm thẻ', data?.error || 'Không gửi được lệnh tới máy (Helcim / Ingenico).');
        return;
      }
      cardPendingRef.current = {
        payloads,
        checkoutInvoice: data.invoiceNumber || null,
      };
      const tid =
        data.helcimTransactionId ||
        data.helcim?.transactionId ||
        data.helcim?.transaction_id ||
        data.helcim?.id ||
        data.helcim?.paymentId;
      if (tid) {
        const result = await pollHelcimTransactionApproved(api, tid, {
          maxAttempts: 90,
          intervalMs: 2000,
        });
        setTerminalPolling(false);
        if (result.ok && result.meta) {
          await onHelcimPaid(result.meta);
          return;
        }
        if (result.reason === 'TIMEOUT') {
          Alert.alert(
            'Helcim',
            'Chưa nhận được APPROVED qua API trong thời gian chờ. Nếu máy đã xong (chạm thẻ / tip / ký), kiểm tra biên lai hoặc webhook Helcim.'
          );
          cardPendingRef.current = null;
          return;
        }
        Alert.alert(
          'Helcim',
          result.reason ? `Giao dịch không thành công (${result.reason}).` : 'Không lấy được kết quả thanh toán.'
        );
        cardPendingRef.current = null;
        return;
      }
      setTerminalPolling(false);
      Alert.alert(
        'Helcim',
        'Đã gửi tới máy. Khách chạm thẻ trên Ingenico; tip và ký theo cài đặt Helcim. Nếu vé không tự đóng, bật webhook hoặc ghi tay sau khi xong trên máy.'
      );
      cardPendingRef.current = null;
    } catch (e) {
      setTerminalPolling(false);
      cardPendingRef.current = null;
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        'Lỗi máy chạm thẻ — kiểm tra HELCIM_TERMINAL_ID, API mode trên máy, và mạng.';
      Alert.alert('Máy chạm thẻ', String(msg));
    }
  }, [
    validateTicketForPay,
    buildLinePayloads,
    getCardFeeBase,
    lines,
    testPayEnabled,
    onHelcimPaid,
  ]);

  const now = format(new Date(), 'HH:mm EEE MMM d');

  const staffHint = pendingLineStaff
    ? `Dòng tiếp theo: ${pendingLineStaff.name} — bấm Add Tech để đổi hoặc “Dùng NV vé”.`
    : `Mặc định dòng mới gán ${(staffName || 'nhân viên vé').trim() || '—'}. Bấm Add Tech để chọn tech khác.`;

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-2 py-2 border-b border-neutral-200 bg-white">
        <View className="w-[20%]">
          <Text className="text-[10px] text-neutral-500">{now}</Text>
          <Pressable
            onPress={exitClear}
            className="bg-primary rounded-xl py-2 px-3 mt-1 self-start"
          >
            <Text className="text-white font-bold text-xs">CANCEL</Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-1">
          <Text className="text-center font-bold text-lg">NEW TICKET</Text>
          {cardTerminalEnabled && testPayEnabled ? (
            <Text className="text-[10px] text-amber-700 font-semibold mt-0.5 text-center px-1">
              TEST PAY — thẻ chỉ lưu DB, không có trên Helcim
            </Text>
          ) : null}
        </View>
        <View className="w-[20%] items-end gap-1">
          <Pressable
            onPress={() => Alert.alert('Save', 'Ticket draft saved (local).')}
            className="bg-primary rounded-xl py-2 px-3"
          >
            <Text className="text-white font-bold text-xs">SAVE</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              await loadStaffForModal();
              setTechModalOpen(true);
            }}
            className="bg-primary rounded-xl py-2 px-3"
          >
            <Text className="text-white font-bold text-[10px]">ADD TECH</Text>
          </Pressable>
          <Pressable className="bg-neutral-200 rounded-xl py-1 px-2">
            <Text className="text-[10px] font-semibold">CUSTOMER</Text>
          </Pressable>
        </View>
      </View>

      <View className="px-2 py-2 bg-amber-50 border-b border-amber-200">
        <Text className="text-[10px] font-bold text-neutral-700 mb-1.5">TURN / LƯỢT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 pr-2">
            {TURN_TYPE_OPTIONS.map((type) => {
              const active = turnType === type.key;
              const locked = linkedAppointmentId != null && type.key !== 'appointment';
              return (
                <Pressable
                  key={type.key}
                  disabled={locked}
                  onPress={() => setTurnType(type.key)}
                  className="rounded-lg px-3 py-2 border-2"
                  style={{
                    backgroundColor: active ? type.color : '#fff',
                    borderColor: active ? type.color : '#ddd',
                    opacity: locked ? 0.35 : 1,
                  }}
                >
                  <Text
                    className="text-[10px] font-extrabold"
                    style={{ color: active ? '#fff' : '#333' }}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        {linkedAppointmentId != null ? (
          <Text className="text-[9px] text-purple-800 mt-1 font-semibold">
            Liên kết appointment #{linkedAppointmentId} — loại lượt: appointment
          </Text>
        ) : null}
      </View>

      <View className="flex-1 flex-row p-2 gap-2" style={{ minHeight: 0 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
          style={{ width: '38%', maxWidth: 320, flexShrink: 0 }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <TicketSummary
            staffLabel={staffName || 'PHUOC'}
            activeStaffHint={staffHint}
            lines={lines}
            taxEnabled={taxEnabled}
            onTaxToggle={setTaxEnabled}
            subtotal={subtotal}
            taxAmount={taxAmount}
            total={total}
            cardTotal={cardTotal}
            cashTotal={cashTotal}
            showCardPricing={cardTerminalEnabled}
            onRemoveLine={removeLine}
            onAddCustom={() => setCustomOpen(true)}
            onAddDiscount={() => setDiscountOpen(true)}
            onAddTip={() => setTipOpen(true)}
            onSellGift={() => Alert.alert('Gift', 'Sell gift flow (placeholder).')}
            onPay={() => setPaymentOpen(true)}
          />
        </ScrollView>

        <View
          className="flex-1 bg-white rounded-xl border border-neutral-200 overflow-hidden"
          style={{ minHeight: 0, minWidth: 0 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-14 border-b border-neutral-200">
            <View className="flex-row items-end px-1">
              {tabs.map((c) => {
                const active = c === tab;
                return (
                  <Pressable key={c} onPress={() => setTab(c)} className="px-3 py-3">
                    <Text
                      className={`text-[10px] font-bold whitespace-nowrap ${
                        active ? 'text-neutral-900' : 'text-neutral-500'
                      }`}
                    >
                      {c}
                    </Text>
                    {active ? <View className="h-1 bg-primary mt-1 rounded-full" /> : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 8,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            <View className="flex-row flex-wrap">
              {filtered.map((s) => (
                <ServiceButton
                  key={s.id}
                  name={s.name}
                  price={s.price}
                  priceCard={s.priceCard}
                  duration={s.duration}
                  onPress={() =>
                    appendLineWithTech({
                      name: s.name,
                      price: s.price,
                      qty: 1,
                      serviceId: s.id ?? fallbackServiceId,
                    })
                  }
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      <PaymentModal
        visible={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        cardAmount={cardTotal}
        cashAmount={cashTotal}
        cardPaymentEnabled={cardTerminalEnabled}
        onPayCard={cardTerminalEnabled ? onPayCard : undefined}
        onPayCash={onPayCash}
      />

      <Modal visible={cardTerminalEnabled && terminalPolling} animationType="fade" transparent>
        <View className="flex-1 bg-black/55 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 items-center max-w-sm border border-neutral-200">
            <ActivityIndicator size="large" color="#111" />
            <Text className="text-neutral-900 font-bold text-base mt-4 text-center">
              Đang chờ máy chạm thẻ
            </Text>
            <Text className="text-neutral-600 text-xs mt-2 text-center leading-snug">
              Chạm hoặc cắm thẻ trên máy Ingenico (Helcim). Tip và chữ ký hiển thị trên máy theo cài đặt Helcim.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={techModalOpen} animationType="fade" transparent>
        <Pressable
          className="flex-1 bg-black/50 justify-center px-4"
          onPress={() => setTechModalOpen(false)}
        >
          <Pressable
            className="bg-white rounded-2xl max-h-[70%] border border-neutral-200 overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="font-bold text-lg px-4 pt-4 pb-2">Tech cho dòng tiếp theo</Text>
            <Pressable
              onPress={() => {
                setPendingLineStaff(null);
                setTechModalOpen(false);
              }}
              className="mx-4 mb-2 bg-neutral-100 rounded-xl py-3 items-center border border-neutral-200"
            >
              <Text className="font-semibold text-neutral-800">Dùng nhân viên vé (mặc định)</Text>
              <Text className="text-[10px] text-neutral-500 mt-0.5">
                {(staffName || '—').trim()}
              </Text>
            </Pressable>
            <ScrollView className="px-2 pb-4" style={{ maxHeight: 360 }}>
              {modalStaffList.map((s) => (
                <Pressable
                  key={String(s.id)}
                  onPress={() => {
                    setPendingLineStaff({
                      id: s.id,
                      name: s.displayName || `${s.firstName} ${s.lastName}`.trim(),
                    });
                    setTechModalOpen(false);
                  }}
                  className="flex-row items-center py-3 px-3 border-b border-neutral-100 active:bg-neutral-50"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: s.color || '#ccc' }}
                  >
                    <Text className="text-white font-bold">{s.initial}</Text>
                  </View>
                  <Text className="flex-1 font-medium text-neutral-900">
                    {s.displayName || `${s.firstName} ${s.lastName}`.trim()}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={customOpen} animationType="fade" transparent>
        <View className="flex-1 bg-black/40 flex-row">
          <View className="w-[32%] bg-neutral-300 p-2 justify-end pb-8">
            <View className="flex-row flex-wrap">
              {NUM_KEYS.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => appendDigit(k)}
                  className="w-[31%] aspect-[1.2] bg-neutral-200 m-0.5 rounded-lg items-center justify-center"
                >
                  <Text className="text-2xl font-bold">{k}</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row mt-2 gap-1">
              <Pressable
                onPress={() => setAmountStr((a) => a.slice(0, -1))}
                className="flex-1 bg-neutral-400 rounded-lg py-3 items-center"
              >
                <Text className="font-bold">⌫</Text>
              </Pressable>
              <Pressable className="flex-1 bg-neutral-400 rounded-lg py-3 items-center">
                <Text className="font-bold">Next</Text>
              </Pressable>
              <Pressable
                onPress={() => setCustomOpen(false)}
                className="flex-1 bg-neutral-400 rounded-lg py-3 items-center"
              >
                <Text className="font-bold">Close</Text>
              </Pressable>
            </View>
          </View>
          <View className="flex-1 justify-center items-center px-4">
            <View className="bg-white rounded-2xl p-6 w-full max-w-md border border-neutral-200">
              <Text className="text-sm text-neutral-600 mb-1">Service Name:</Text>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                className="border border-neutral-300 rounded-lg px-3 py-2 mb-4"
              />
              <Text className="text-sm text-neutral-600 mb-1">Amount:</Text>
              <View className="border border-neutral-300 rounded-lg px-3 py-4 mb-4 min-h-[48px]">
                <Text className="text-2xl">{amountStr || '|'}</Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={addCustomLine}
                  className="flex-1 bg-[#2196F3] rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-bold">DONE</Text>
                </Pressable>
                <Pressable
                  onPress={() => setCustomOpen(false)}
                  className="flex-1 bg-primary rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-bold">CANCEL</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View className="w-14 bg-neutral-200 items-center py-4 border-l border-neutral-300">
            <Text className="text-[10px] text-neutral-500">{now}</Text>
            <Text className="text-[10px] font-bold mt-4" style={{ transform: [{ rotate: '90deg' }] }}>
              NEW TICKET
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={discountOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-center px-8"
          onPress={() => setDiscountOpen(false)}
        >
          <Pressable className="bg-white rounded-xl p-4" onPress={(e) => e.stopPropagation()}>
            <Text className="font-bold mb-2">Discount amount</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={discountInput}
              onChangeText={setDiscountInput}
              className="border border-neutral-300 rounded-lg px-3 py-2 mb-3"
              placeholder="0.00"
            />
            <Pressable
              onPress={() => {
                setDiscount(parseFloat(discountInput) || 0);
                setDiscountOpen(false);
                setDiscountInput('');
              }}
              className="bg-primary rounded-lg py-3 items-center"
            >
              <Text className="text-white font-bold">Apply</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={tipOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-center px-8"
          onPress={() => setTipOpen(false)}
        >
          <Pressable className="bg-white rounded-xl p-4" onPress={(e) => e.stopPropagation()}>
            <Text className="font-bold mb-2">Tip amount</Text>
            <Text className="text-[11px] text-neutral-500 mb-2 leading-snug">
              Phí thẻ 3% không áp dụng lên tip — chỉ trên (Subtotal + Tax − Discount).
            </Text>
            <TextInput
              keyboardType="decimal-pad"
              value={tipInput}
              onChangeText={setTipInput}
              className="border border-neutral-300 rounded-lg px-3 py-2 mb-3"
              placeholder="0.00"
            />
            <Pressable
              onPress={() => {
                setTip(parseFloat(tipInput) || 0);
                setTipOpen(false);
                setTipInput('');
              }}
              className="bg-pay rounded-lg py-3 items-center"
            >
              <Text className="text-white font-bold">Apply</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
