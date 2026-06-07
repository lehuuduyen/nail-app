import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
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
import CashPaymentModal from '../../components/CashPaymentModal';
import CardCheckoutModal from '../../components/CardCheckoutModal';
import ReceiptModal from '../../components/ReceiptModal';
import StripeTerminalPaymentModal from '../../components/StripeTerminalPaymentModal';
import StripeReaderModal from '../../components/StripeReaderModal';
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
import { isCardTerminalPaymentEnabled, isStripePaymentEnabled } from '../../utils/featureFlags';
import { isPosTestPayEnabled } from '../../utils/posTestPay';
import { pollHelcimTransactionApproved } from '../../utils/helcimTerminal';

// Lazy-load Stripe hooks — native-only, không tương thích web.
// Platform.OS check để Metro tree-shake trên web bundle.
let useStripe = () => ({ initPaymentSheet: null, presentPaymentSheet: null });
let useStripeTerminal = () => ({ collectPaymentMethod: null, retrievePaymentIntent: null, processPaymentIntent: null, cancelCollectPaymentMethod: null, connectedReader: null });
if (Platform.OS !== 'web') {
  try {
    useStripe = require('@stripe/stripe-react-native').useStripe;
  } catch { /* chưa rebuild với native module */ }
  try {
    useStripeTerminal = require('@stripe/stripe-terminal-react-native').useStripeTerminal;
  } catch { /* chưa rebuild với native module */ }
}

let requestForegroundPermissionsAsync = null;
try { requestForegroundPermissionsAsync = require('expo-location').requestForegroundPermissionsAsync; } catch { /* not available */ }

// Lấy từ Stripe Dashboard → Terminal → Locations — bắt buộc khi reconnect Bluetooth (M2/Chipper).
const STRIPE_LOCATION_ID = process.env.EXPO_PUBLIC_STRIPE_LOCATION_ID || null;
const READER_RECONNECT_TIMEOUT_MS = 10_000;
// Bật để test luồng thẻ bằng reader giả lập (sandbox) — không cần máy thật, không
// tốn phí Stripe, không charge tiền thật. PHẢI tắt (env=0 hoặc xoá) trước khi build live.
const STRIPE_SIMULATED_READER = process.env.EXPO_PUBLIC_STRIPE_SIMULATED_READER === '1';

// Reader có thể yêu cầu khách thao tác thêm NGAY TRONG LÚC processPaymentIntent
// đang chạy (vd. chạm lại lần 2 để xác thực số tiền lớn) — báo qua
// onDidRequestReaderDisplayMessage / onDidRequestReaderInput. Nếu không dịch các
// tín hiệu này thành hướng dẫn hiển thị, khách đứng nhìn "Đang xử lý thanh toán…"
// không biết phải làm gì → tưởng máy treo trong khi thực ra đang chờ họ chạm lại.
const READER_DISPLAY_MESSAGE_HINTS = {
  retryCard: 'Thẻ chưa đọc được — vui lòng chạm hoặc cắm lại thẻ',
  insertCard: 'Vui lòng cắm thẻ vào khe đọc chip của máy',
  insertOrSwipeCard: 'Vui lòng cắm hoặc quẹt thẻ vào máy',
  swipeCard: 'Vui lòng quẹt thẻ qua khe đọc của máy',
  removeCard: 'Vui lòng rút thẻ ra khỏi máy',
  multipleContactlessCardsDetected: 'Máy phát hiện nhiều thẻ cùng lúc — chỉ đưa 1 thẻ lại gần máy',
  tryAnotherCard: 'Thẻ bị từ chối — vui lòng thử thẻ khác',
  tryAnotherReadMethod: 'Vui lòng thử cách khác: cắm chip thay vì chạm thẻ',
  checkMobileDevice: 'Vui lòng kiểm tra điện thoại / đồng hồ đang để gần máy',
  cardRemovedTooEarly: 'Thẻ bị rút ra quá sớm — vui lòng chạm/cắm lại và giữ yên',
};

const READER_INPUT_HINT = 'Máy đang chờ — vui lòng chạm hoặc đưa thẻ vào máy để xác nhận giao dịch';

const NUM_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];


const VISION_URL = process.env.EXPO_PUBLIC_VISION_URL || 'http://localhost:8000';

function CustomerPhoto({ phone, name, size = 32 }) {
  const [imgError, setImgError] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size }}>
      {/* Avatar chữ cái luôn nằm dưới — hiện khi ảnh lỗi hoặc chưa load */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700' }}>{initial}</Text>
      </View>
      {/* Ảnh thật chồng lên — nếu load được sẽ che avatar chữ */}
      {!imgError && (
        <Image
          source={{ uri: `${VISION_URL}/api/v1/customers/${phone}/photo` }}
          style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2 }}
          onError={() => setImgError(true)}
        />
      )}
    </View>
  );
}

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
  // Prefer params for immediate display — posStore updates asynchronously via useEffect
  const displayStaffName = routeParamFirst(params.staffName) || staffName || null;

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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerLookupResult, setCustomerLookupResult] = useState(null);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [waitingList, setWaitingList] = useState([]);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [showPhoneSearch, setShowPhoneSearch] = useState(false);
  const cardPendingRef = useRef(null);
  const posTestSeedTriedRef = useRef(false);
  const testPayEnabled = useMemo(() => isPosTestPayEnabled(), []);
  const cardTerminalEnabled = isCardTerminalPaymentEnabled();
  const stripeEnabled = isStripePaymentEnabled();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [cardReaderReady, setCardReaderReady] = useState(false);
  const cardReaderReadyTimerRef = useRef(null);
  const clearCardReaderReadyFallback = useCallback(() => {
    if (cardReaderReadyTimerRef.current) {
      clearTimeout(cardReaderReadyTimerRef.current);
      cardReaderReadyTimerRef.current = null;
    }
  }, []);
  // Một số reader/SDK không bắn onDidRequestReaderInput cho contactless (tap) —
  // đặt mốc tối đa ~1.5s để KHÔNG bắt khách chờ vô thời hạn ở màn "đang khởi động".
  // Tín hiệu thật từ SDK (nếu có) vẫn thắng nếu đến sớm hơn mốc này.
  const armCardReaderReadyFallback = useCallback((ms = 1500) => {
    clearCardReaderReadyFallback();
    cardReaderReadyTimerRef.current = setTimeout(() => {
      cardReaderReadyTimerRef.current = null;
      setCardReaderReady(true);
    }, ms);
  }, [clearCardReaderReadyFallback]);
  useEffect(() => () => clearCardReaderReadyFallback(), [clearCardReaderReadyFallback]);
  const discoveredReadersRef = useRef([]);
  const [reconnectingReader, setReconnectingReader] = useState(false);
  const {
    collectPaymentMethod, retrievePaymentIntent, processPaymentIntent, cancelCollectPaymentMethod, connectedReader,
    discoverReaders, connectReader, cancelDiscovering,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers) => {
      discoveredReadersRef.current = Array.isArray(readers) ? readers : (readers?.readers ?? []);
    },
    // Reader chỉ thực sự bật ăng-ten NFC và sẵn sàng nhận chạm thẻ khi SDK báo
    // 'waitingForInput' / onDidRequestReaderInput — KHÔNG phải ngay khi gọi collectPaymentMethod()
    // (có độ trễ Bluetooth + khởi động phần cứng). Dùng tín hiệu này để chỉ hiện
    // "Chạm thẻ ngay" đúng lúc; nếu SDK không bắn sự kiện thì fallback timer ở trên đảm bảo.
    onDidRequestReaderInput: (options) => {
      console.log('[StripeTerminal] onDidRequestReaderInput:', JSON.stringify(options));
      clearCardReaderReadyFallback();
      setCardReaderReady(true);
      // Reader có thể yêu cầu chạm/cắm lại NGAY TRONG LÚC processPaymentIntent đang
      // chạy (charge) — không chỉ lúc collectPaymentMethod. Hiện gợi ý để khách biết
      // cần thao tác tiếp, tránh đứng nhìn "Đang xử lý thanh toán…" tưởng máy treo.
      setCardProcessingHint(READER_INPUT_HINT);
    },
    onDidChangePaymentStatus: (status) => {
      console.log('[StripeTerminal] onDidChangePaymentStatus:', status);
      if (status === 'waitingForInput') {
        clearCardReaderReadyFallback();
        setCardReaderReady(true);
        setCardProcessingHint(READER_INPUT_HINT);
      } else if (status === 'processing' || status === 'notReady') {
        setCardProcessingHint(null);
      }
    },
    // SDK báo các thông điệp tương tác thẻ — ví dụ 'multipleContactlessCardsDetected',
    // 'retryCard', 'cardRemovedTooEarly'... Đây là cách DUY NHẤT để biết SDK có
    // "thấy" cú chạm thẻ hay không khi collectPaymentMethod() có vẻ đứng yên.
    // Cũng dùng để dịch các tín hiệu này thành hướng dẫn hiển thị cho khách —
    // kể cả khi chúng xảy ra giữa lúc "Đang xử lý thanh toán…" (processPaymentIntent).
    onDidRequestReaderDisplayMessage: (message) => {
      console.log('[StripeTerminal] onDidRequestReaderDisplayMessage:', message);
      setCardProcessingHint(READER_DISPLAY_MESSAGE_HINTS[message] || null);
    },
    onDidChangeConnectionStatus: (status) => {
      console.log('[StripeTerminal] onDidChangeConnectionStatus:', status);
    },
    onDidReportReaderEvent: (event) => {
      console.log('[StripeTerminal] onDidReportReaderEvent:', event);
    },
  });
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cardCheckoutOpen, setCardCheckoutOpen] = useState(false);
  const [cardCheckoutMethod, setCardCheckoutMethod] = useState('helcim');
  // 'tip' (chốt tip TRƯỚC khi chạm thẻ) → 'processing' (đang chạm/charge) → 'signature' (ký sau khi charge xong)
  const [cardCheckoutMode, setCardCheckoutMode] = useState('tip');
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState(null);
  const cardReceiptRef = useRef(null);
  // Lưu kết quả charge (đã thành công) để dùng khi khách ký tên xong — KHÔNG còn lưu PI
  // "đã chạm chưa charge" như trước, vì giờ chạm thẻ + charge chạy liền nhau (1 bước).
  const stripeChargeRef = useRef(null);
  const [terminalCollecting, setTerminalCollecting] = useState(false);
  // Gợi ý hiển thị cho khách khi reader yêu cầu thao tác thêm GIỮA LÚC đang xử lý
  // (vd. chạm lại lần 2 để xác thực) — nếu không hiện cái này, khách đứng nhìn
  // màn "Đang xử lý thanh toán…" mà không biết phải làm gì → tưởng máy bị treo.
  const [cardProcessingHint, setCardProcessingHint] = useState(null);
  const [readerModalOpen, setReaderModalOpen] = useState(false);
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
      return;
    }
    // No params (e.g. opened via Tech Tickets button) — clear any residual staff
    setStaff(null, null);
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
    setSelectedCustomer(null);
  };

  const exitClear = () => {
    resetLocalTicketUi();
    router.back();
  };

  const openCustomerModal = useCallback(async () => {
    setCustomerModalOpen(true);
    setShowPhoneSearch(false);
    setCustomerLookupResult(null);
    setCustomerSearch('');
    setWaitingLoading(true);
    try {
      const res = await api.get('/api/public/checkin/waiting');
      const list = res.data.waiting ?? [];
      setWaitingList(list);
      if (list.length === 0) setShowPhoneSearch(true);
    } catch {
      setWaitingList([]);
      setShowPhoneSearch(true);
    } finally {
      setWaitingLoading(false);
    }
  }, []);

  const handleCustomerSearch = useCallback(async () => {
    const phone = customerSearch.replace(/\D/g, '');
    if (phone.length < 9) return;
    setCustomerLookupLoading(true);
    setCustomerLookupResult(null);
    try {
      const res = await api.get(`/api/public/checkin?phone=${encodeURIComponent(phone)}`);
      setCustomerLookupResult({ ...res.data, normalizedPhone: phone });
    } catch {
      setCustomerLookupResult({ found: false });
    } finally {
      setCustomerLookupLoading(false);
    }
  }, [customerSearch]);

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
        const cid = selectedCustomer?.id;
        if (cid != null && Number.isFinite(Number(cid))) {
          body.customerId = Number(cid);
        }
        if (selectedCustomer?.phone) {
          body.customerPhone = selectedCustomer.phone;
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
    [lines, staffId, fallbackServiceId, getCardFeeBase, turnType, linkedAppointmentId, selectedCustomer]
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
      // Tất cả dòng trong cùng lần thanh toán dùng chung ticketId
      const ticketId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      for (let i = 0; i < payloads.length; i++) {
        const body = { ...payloads[i].body, ticketId };
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
    const receipt = cardReceiptRef.current;
    cardReceiptRef.current = null;
    resetLocalTicketUi();
    setPaymentOpen(false);
    setCashModalOpen(false);
    setCardCheckoutOpen(false);
    setCardProcessingHint(null);
    if (receipt) {
      setReceiptModalData(receipt);
      setReceiptModalOpen(true);
    } else {
      router.back();
    }
  }, [resetLocalTicketUi]);

  const onHelcimPaid = useCallback(
    async (meta) => {
      const ctx = cardPendingRef.current;
      cardPendingRef.current = null;
      if (!ctx?.payloads?.length) return;

      const store = usePosStore.getState();
      cardReceiptRef.current = {
        lines: ctx.payloads.map((p) => p.line),
        subtotal: store.getSubtotal(),
        taxAmount: store.getTaxAmount(),
        tip: store.tip,
        total: store.getCardTotal(),
        staffName: displayStaffName || '',
        date: format(new Date(), 'dd/MM/yyyy HH:mm'),
        signaturePaths: [],
      };

      const helcimFirst = {
        ...meta,
        helcimInvoiceNumber:
          meta?.helcimInvoiceNumber || ctx.checkoutInvoice || undefined,
      };

      const ok = await persistPayloadsToApi(ctx.payloads, helcimFirst);
      if (ok) finishCheckoutAndLeave();
      else cardReceiptRef.current = null;
    },
    [persistPayloadsToApi, finishCheckoutAndLeave, displayStaffName]
  );

  const onPayCash = useCallback(() => {
    const err = validateTicketForPay();
    if (err) {
      Alert.alert('Ticket', err);
      setPaymentOpen(false);
      return;
    }
    setPaymentOpen(false);
    setCashModalOpen(true);
  }, [validateTicketForPay]);

  const onConfirmCash = useCallback(async (tenderAmount, change) => {
    const date = getSalonDateYmd();
    const payloads = buildLinePayloads('cash', date);
    const ok = await persistPayloadsToApi(payloads, null);
    if (!ok) { setCashModalOpen(false); return; }
    const store = usePosStore.getState();
    cardReceiptRef.current = {
      paymentMethod: 'cash',
      lines: [...store.lines],
      subtotal: store.getSubtotal(),
      taxAmount: store.getTaxAmount(),
      tip: store.tip,
      total: store.getCashTotal(),
      staffName: displayStaffName || '',
      date: format(new Date(), 'dd/MM/yyyy HH:mm'),
      signaturePaths: [],
      cashTender: tenderAmount,
      cashChange: change,
    };
    finishCheckoutAndLeave();
  }, [buildLinePayloads, persistPayloadsToApi, finishCheckoutAndLeave, displayStaffName]);

  const onConfirmSplit = useCallback(async (cashPortion, cardPortion) => {
    setCashModalOpen(false);

    if (!collectPaymentMethod || !processPaymentIntent) {
      Alert.alert('Stripe Terminal', 'Cần rebuild app (EAS Build) để dùng máy đọc thẻ.');
      return;
    }
    if (!connectedReader) {
      setReaderModalOpen(true);
      return;
    }

    const cardCents = Math.round(cardPortion * 100);
    try {
      // 1. Tạo PI cho phần thẻ
      const { data } = await api.post('/api/stripe/terminal/payment-intent', {
        amount_cents: cardCents,
        description: `Split – card $${cardPortion.toFixed(2)} / cash $${cashPortion.toFixed(2)}`,
      });

      const { paymentIntent: retrievedPI, error: retrieveErr } = await retrievePaymentIntent(data.clientSecret);
      if (retrieveErr) { Alert.alert('Stripe Terminal', retrieveErr.message); return; }

      // 2. Chờ khách chạm thẻ
      console.log('[StripeTerminal][split] retrievedPI status:', retrievedPI?.status, '| reader:', connectedReader?.serialNumber, connectedReader?.deviceType);
      setCardReaderReady(false);
      setCardProcessingHint(null);
      armCardReaderReadyFallback();
      setTerminalCollecting(true);
      console.log('[StripeTerminal][split] calling collectPaymentMethod...');
      const { paymentIntent: collectedPI, error: collectErr } = await collectPaymentMethod({ paymentIntent: retrievedPI });
      console.log('[StripeTerminal][split] collectPaymentMethod resolved — status:', collectedPI?.status, '| error:', collectErr?.code, collectErr?.message);
      clearCardReaderReadyFallback();
      setTerminalCollecting(false);

      if (collectErr) {
        if (collectErr.code !== 'Canceled') Alert.alert('Stripe Terminal', collectErr.message);
        return;
      }

      // 3. Process thẻ
      const { paymentIntent: confirmedPI, error: processErr } = await processPaymentIntent({ paymentIntent: collectedPI });
      if (processErr) { Alert.alert('Stripe Terminal', processErr.message); return; }

      // 4. Lưu DB với Stripe meta + ghi chú split
      const date = getSalonDateYmd();
      const payloads = buildLinePayloads('cash', date);
      const card = confirmedPI?.charges?.data?.[0]?.payment_method_details?.card_present || {};
      const receiptDetails = confirmedPI?.charges?.data?.[0]?.payment_method_details?.card_present?.receipt || {};
      const stripeMeta = {
        stripePaymentIntentId: confirmedPI?.id || data.paymentIntentId,
        stripeCardBrand: card.brand || undefined,
        stripeCardLast4: card.last4 || undefined,
        paymentStatus: 'approved',
      };
      const payloadsWithSplit = payloads.map((p, i) => ({
        ...p,
        body: {
          ...p.body,
          notes: i === 0
            ? `${p.body.notes}|split:cash:${cashPortion.toFixed(2)}:card:${cardPortion.toFixed(2)}`
            : p.body.notes,
        },
      }));
      const ok = await persistPayloadsToApi(payloadsWithSplit, stripeMeta);
      if (ok) {
        const store = usePosStore.getState();
        cardReceiptRef.current = {
          paymentMethod: 'split',
          lines: [...store.lines],
          subtotal: store.getSubtotal(),
          taxAmount: store.getTaxAmount(),
          tip: store.tip,
          total: store.getCashTotal(),
          staffName: displayStaffName || '',
          date: format(new Date(), 'dd/MM/yyyy HH:mm'),
          signaturePaths: [],
          cashPortion,
          cardPortion,
          cardBrand: card.brand || '',
          cardLast4: card.last4 || '',
          entryMode: card.entry_mode || 'contactless',
          authCode: receiptDetails.authorization_code || '',
          aidLabel: receiptDetails.application_preferred_name || '',
        };
        finishCheckoutAndLeave();
      }
    } catch (e) {
      clearCardReaderReadyFallback();
      setTerminalCollecting(false);
      Alert.alert('Stripe Terminal', e?.response?.data?.error || e?.message || 'Lỗi Stripe Terminal.');
    }
  }, [
    collectPaymentMethod, processPaymentIntent, connectedReader, armCardReaderReadyFallback, clearCardReaderReadyFallback,
    retrievePaymentIntent, buildLinePayloads, persistPayloadsToApi, finishCheckoutAndLeave, displayStaffName,
  ]);

  /**
   * Luồng thẻ Stripe — CHỐT số tiền (gồm tip) TRƯỚC khi yêu cầu khách chạm thẻ.
   * Bắt buộc phải làm vậy vì giao dịch card-present (chạm/cắm/quẹt) khoá số tiền
   * vào cryptogram của thẻ ngay tại thời điểm đọc thẻ — không thể đổi amount sau đó
   * (kể cả PATCH PaymentIntent trên Stripe cũng bị từ chối ở bước confirm/capture).
   * Vì vậy: hỏi tip → tạo PaymentIntent đúng tổng tiền cuối → chạm thẻ → charge → ký tên.
   */
  const runStripeCharge = useCallback(async (tipAmount) => {
    const store = usePosStore.getState();
    store.setTip(tipAmount);
    const serviceFeeAmt = Math.round(store.getCardFeeBase() * 1.03 * 100);
    const totalCents = serviceFeeAmt + Math.round((Number(tipAmount) || 0) * 100);

    // Đóng màn chọn Tip lại — màn "Chạm thẻ ngay" (StripeTerminalPaymentModal) sẽ
    // hiện thay thế. Mở lại CardCheckoutModal (mode='processing' rồi 'signature')
    // sau khi chạm xong, tránh 2 modal full-screen chồng lên nhau.
    setCardCheckoutOpen(false);

    try {
      const { data } = await api.post('/api/stripe/terminal/payment-intent', {
        amount_cents: totalCents,
        description: lines.map((l) => `${l.name}:${l.price}`).join('; ').slice(0, 500),
      });

      const { paymentIntent: retrievedPI, error: retrieveErr } = await retrievePaymentIntent(data.clientSecret);
      if (retrieveErr) {
        Alert.alert('Stripe Terminal', retrieveErr.message);
        return;
      }

      console.log('[StripeTerminal] retrievedPI status:', retrievedPI?.status, '| reader:', connectedReader?.serialNumber, connectedReader?.deviceType);
      setCardReaderReady(false);
      setCardProcessingHint(null);
      armCardReaderReadyFallback();
      setTerminalCollecting(true);
      console.log('[StripeTerminal] calling collectPaymentMethod...');
      const { paymentIntent: collectedPI, error: collectErr } = await collectPaymentMethod({ paymentIntent: retrievedPI });
      console.log('[StripeTerminal] collectPaymentMethod resolved — status:', collectedPI?.status, '| error:', collectErr?.code, collectErr?.message);
      clearCardReaderReadyFallback();
      setTerminalCollecting(false);

      if (collectErr) {
        if (collectErr.code !== 'Canceled') Alert.alert('Stripe Terminal', collectErr.message);
        return;
      }

      // Thẻ đã chạm — mở lại CardCheckoutModal ở chế độ "đang xử lý" rồi charge ngay
      // (đúng tổng tiền đã chốt từ đầu, gồm tip)
      setCardCheckoutMode('processing');
      setCardCheckoutOpen(true);
      setCardProcessingHint(null);
      const { paymentIntent: confirmedPI, error: processErr } = await processPaymentIntent({ paymentIntent: collectedPI });
      setCardProcessingHint(null);

      if (processErr) {
        setCardCheckoutOpen(false);
        Alert.alert('Stripe Terminal', processErr.message);
        return;
      }

      // Charge thành công — lưu kết quả rồi chuyển sang bước Ký tên (modal vẫn đang mở)
      stripeChargeRef.current = { confirmedPI, piId: data.paymentIntentId, tipAmount };
      setCardCheckoutMode('signature');
    } catch (e) {
      clearCardReaderReadyFallback();
      setTerminalCollecting(false);
      setCardProcessingHint(null);
      setCardCheckoutOpen(false);
      Alert.alert('Stripe Terminal', e?.response?.data?.error || e?.message || 'Lỗi Stripe Terminal.');
    }
  }, [lines, collectPaymentMethod, retrievePaymentIntent, processPaymentIntent, connectedReader, armCardReaderReadyFallback, clearCardReaderReadyFallback]);

  // Bước 1: mở màn chọn Tip TRƯỚC khi chạm thẻ
  const startStripeCollection = useCallback(() => {
    setCardCheckoutMode('tip');
    stripeChargeRef.current = null;
    setCardCheckoutOpen(true);
  }, []);

  // Kept for StripeReaderModal "onConnect" callback (không dùng nữa nhưng giữ để tránh lỗi ref)
  const onPayStripe = useCallback(() => startStripeCollection(), [startStripeCollection]);

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

  // Bước cuối: thẻ đã charge xong (đúng tổng tiền gồm tip) — khách ký tên, lưu hoá đơn
  const finishStripeReceipt = useCallback(async (signaturePaths) => {
    const charged = stripeChargeRef.current;
    stripeChargeRef.current = null;
    if (!charged) {
      Alert.alert('Lỗi', 'Không có dữ liệu giao dịch. Vui lòng thử lại.');
      return;
    }

    const { confirmedPI, piId, tipAmount } = charged;
    const store = usePosStore.getState();
    const card = confirmedPI?.charges?.data?.[0]?.payment_method_details?.card_present || {};
    const receiptDetails = confirmedPI?.charges?.data?.[0]?.payment_method_details?.card_present?.receipt || {};

    cardReceiptRef.current = {
      paymentMethod: 'card',
      lines: [...store.lines],
      subtotal: store.getSubtotal(),
      taxAmount: store.getTaxAmount(),
      tip: tipAmount,
      total: store.getCardTotal(),
      staffName: displayStaffName || '',
      date: format(new Date(), 'dd/MM/yyyy HH:mm'),
      signaturePaths: signaturePaths ?? [],
      cardBrand: card.brand || '',
      cardLast4: card.last4 || '',
      entryMode: card.entry_mode || 'contactless',
      authCode: receiptDetails.authorization_code || '',
      aidLabel: receiptDetails.application_preferred_name || '',
      aid: receiptDetails.dedicated_file_name || '',
    };

    const date = getSalonDateYmd();
    const payloads = buildLinePayloads('card', date);
    const stripeMeta = {
      stripePaymentIntentId: confirmedPI?.id || piId,
      stripeCardBrand: card.brand || undefined,
      stripeCardLast4: card.last4 || undefined,
      paymentStatus: 'approved',
    };
    const ok = await persistPayloadsToApi(payloads, stripeMeta);
    if (ok) {
      setCardCheckoutOpen(false);
      finishCheckoutAndLeave();
    } else {
      cardReceiptRef.current = null;
      Alert.alert('Lỗi', 'Thẻ đã charge thành công nhưng không lưu được đơn. Liên hệ quản lý.');
    }
  }, [displayStaffName, buildLinePayloads, persistPayloadsToApi, finishCheckoutAndLeave]);

  /**
   * Reader Bluetooth (M2) đã kết nối ở màn Cài đặt nhưng có thể bị rớt kết nối ngầm
   * (mất sóng BLE, idle timeout...) trước khi thanh toán. Thay vì bắt nhân viên mở lại
   * màn "Chọn thiết bị" mỗi lần, tự quét + kết nối lại trong nền — chỉ hiện màn chọn
   * thiết bị nếu việc tự kết nối lại thất bại.
   */
  const attemptSilentReconnect = useCallback(async () => {
    if (!discoverReaders || !connectReader) return false;
    if (!STRIPE_SIMULATED_READER && !STRIPE_LOCATION_ID) return false;

    if (Platform.OS === 'ios' && requestForegroundPermissionsAsync) {
      const { status } = await requestForegroundPermissionsAsync();
      if (status !== 'granted') return false;
    }

    setReconnectingReader(true);
    discoveredReadersRef.current = [];
    try {
      const discoverLocationId = STRIPE_SIMULATED_READER ? 'tml_simulated' : STRIPE_LOCATION_ID;
      const discoverPromise = discoverReaders({
        discoveryMethod: 'bluetoothScan',
        simulated: STRIPE_SIMULATED_READER,
        locationId: discoverLocationId,
      });

      const found = await new Promise((resolve) => {
        const startedAt = Date.now();
        const poll = setInterval(() => {
          const reader = discoveredReadersRef.current?.[0] ?? null;
          if (reader || Date.now() - startedAt > READER_RECONNECT_TIMEOUT_MS) {
            clearInterval(poll);
            resolve(reader);
          }
        }, 300);
      });

      cancelDiscovering?.();
      await discoverPromise.catch(() => {});

      if (!found) return false;

      console.log('[StripeTerminal] auto-reconnect — found reader:', found.serialNumber, '| connecting...');
      const result = await connectReader({
        discoveryMethod: 'bluetoothScan',
        reader: found,
        locationId: found.locationId || discoverLocationId,
      });
      if (result?.error) {
        console.warn('[StripeTerminal] auto-reconnect FAILED:', result.error.message);
        return false;
      }
      console.log('[StripeTerminal] auto-reconnect OK:', found.serialNumber);
      return true;
    } catch (e) {
      console.warn('[StripeTerminal] auto-reconnect threw:', e?.message);
      return false;
    } finally {
      setReconnectingReader(false);
    }
  }, [discoverReaders, connectReader, cancelDiscovering]);

  const proceedCardCheckout = useCallback((method) => {
    const err = validateTicketForPay();
    if (err) { Alert.alert('Ticket', err); setPaymentOpen(false); return; }
    setCardCheckoutMethod(method);
    setPaymentOpen(false);
    if (method === 'stripe') {
      startStripeCollection(); // chạm thẻ trước
    } else {
      onPayCard(); // Helcim: gửi thẳng tới terminal
    }
  }, [validateTicketForPay, startStripeCollection, onPayCard]);

  const openCardCheckout = useCallback(async (method) => {
    if (method === 'stripe') {
      if (!collectPaymentMethod || !processPaymentIntent) {
        Alert.alert('Stripe Terminal', 'Cần rebuild app (EAS Build) để dùng máy đọc thẻ.');
        setPaymentOpen(false);
        return;
      }

      let reader = connectedReader;
      if (!reader) {
        // Đã kết nối ở Cài đặt nhưng Bluetooth có thể đã rớt ngầm — thử tự kết nối lại
        // trong nền trước, chỉ hiện màn "Chọn thiết bị" nếu thật sự thất bại.
        const reconnected = await attemptSilentReconnect();
        if (reconnected) {
          proceedCardCheckout(method);
          return;
        }
        setPaymentOpen(false);
        setReaderModalOpen(true);
        return;
      }

      // Reader báo "offline" → SDK không thông được với Stripe để xử lý giao dịch,
      // collectPaymentMethod() sẽ treo vô thời hạn dù khách có chạm thẻ.
      // Cảnh báo TRƯỚC khi bắt khách chạm thẻ vô ích.
      if (reader.status === 'offline') {
        Alert.alert(
          'Máy đọc thẻ đang OFFLINE',
          'Máy "' + (reader.label || reader.serialNumber) + '" hiện không kết nối được với Stripe (mất mạng/wifi). ' +
          'Nếu tiếp tục, màn "Chạm thẻ" có thể đứng yên mãi dù khách đã chạm.\n\n' +
          'Hãy kiểm tra WiFi/4G của điện thoại, sau đó vào Cài đặt → Thiết bị để ngắt và kết nối lại máy đọc thẻ trước khi thử lại.',
          [
            { text: 'Để sau', style: 'cancel', onPress: () => setPaymentOpen(false) },
            { text: 'Vẫn tiếp tục', style: 'destructive', onPress: () => proceedCardCheckout(method) },
          ],
        );
        return;
      }
    }
    proceedCardCheckout(method);
  }, [collectPaymentMethod, processPaymentIntent, connectedReader, attemptSilentReconnect, proceedCardCheckout]);

  // Chỉ Stripe dùng CardCheckoutModal (Helcim xử lý tip+sig trên máy vật lý).
  // Modal gọi onConfirm với 1 đối số duy nhất — kiểu dữ liệu phụ thuộc bước hiện tại:
  //   mode='tip'        → onConfirm(tipAmount: number)        → chốt tip rồi mới chạm thẻ
  //   mode='signature'  → onConfirm(signaturePaths: string[]) → đã charge xong, lưu hoá đơn
  const onCardCheckoutConfirm = useCallback((arg) => {
    if (cardCheckoutMode === 'tip') {
      runStripeCharge(arg);
    } else if (cardCheckoutMode === 'signature') {
      finishStripeReceipt(arg);
    }
  }, [cardCheckoutMode, runStripeCharge, finishStripeReceipt]);

  const now = format(new Date(), 'HH:mm EEE MMM d');

  const staffHint = pendingLineStaff
    ? `Dòng tiếp theo: ${pendingLineStaff.name} — bấm Add Tech để đổi hoặc “Dùng NV vé”.`
    : `Mặc định dòng mới gán ${(displayStaffName || 'nhân viên vé').trim() || '—'}. Bấm Add Tech để chọn tech khác.`;

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
          <Pressable
            onPress={openCustomerModal}
            style={{
              borderRadius: 12,
              paddingVertical: 4,
              paddingHorizontal: 8,
              backgroundColor: selectedCustomer ? '#fdf2f8' : '#e5e7eb',
              borderWidth: selectedCustomer ? 1 : 0,
              borderColor: '#fbcfe8',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              maxWidth: 110,
            }}
          >
            {selectedCustomer ? (
              <>
                <CustomerPhoto
                  phone={selectedCustomer.phone}
                  name={selectedCustomer.name}
                  size={22}
                />
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#be185d', flexShrink: 1 }} numberOfLines={1}>
                  {selectedCustomer.name}
                </Text>
              </>
            ) : (
              <Text className="text-[10px] font-semibold">CUSTOMER</Text>
            )}
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
            staffLabel={displayStaffName || '—'}
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
        onPayCard={cardTerminalEnabled ? () => openCardCheckout('helcim') : undefined}
        stripeEnabled={stripeEnabled}
        onPayStripe={stripeEnabled ? () => openCardCheckout('stripe') : undefined}
        onPayCash={onPayCash}
      />

      <CashPaymentModal
        visible={cashModalOpen}
        onClose={() => setCashModalOpen(false)}
        totalAmount={cashTotal}
        onConfirmCash={onConfirmCash}
        onConfirmSplit={onConfirmSplit}
      />

      <CardCheckoutModal
        visible={cardCheckoutOpen}
        onClose={() => { if (cardCheckoutMode === 'tip') setCardCheckoutOpen(false); }}
        subtotal={subtotal}
        lockedTipAmount={stripeChargeRef.current?.tipAmount ?? 0}
        onConfirm={onCardCheckoutConfirm}
        mode={cardCheckoutMode}
        processingHint={cardProcessingHint}
      />

      <ReceiptModal
        visible={receiptModalOpen}
        receiptData={receiptModalData}
        signaturePaths={receiptModalData?.signaturePaths ?? []}
        onDone={() => {
          setReceiptModalOpen(false);
          setReceiptModalData(null);
          router.back();
        }}
      />

      <StripeTerminalPaymentModal
        visible={terminalCollecting}
        ready={cardReaderReady}
        amount={cardTotal}
        readerName={connectedReader?.label || connectedReader?.serialNumber}
        onCancel={() => {
          cancelCollectPaymentMethod?.();
          clearCardReaderReadyFallback();
          setTerminalCollecting(false);
          setCardReaderReady(false);
          setCardProcessingHint(null);
        }}
      />

      <StripeReaderModal
        visible={readerModalOpen}
        onClose={() => setReaderModalOpen(false)}
        onConnect={() => setReaderModalOpen(false)}
      />

      <Modal visible={reconnectingReader} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 items-center gap-3">
            <ActivityIndicator size="large" color="#c9a96e" />
            <Text className="text-base font-bold text-center">Đang kết nối lại máy đọc thẻ…</Text>
            <Text className="text-sm text-neutral-500 text-center">
              Máy đã kết nối ở Cài đặt nhưng bị rớt Bluetooth — đang tự kết nối lại, vui lòng đợi
            </Text>
          </View>
        </View>
      </Modal>

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

      <Modal visible={customerModalOpen} animationType="fade" transparent>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 }}
          onPress={() => {
            setCustomerModalOpen(false);
            setCustomerSearch('');
            setCustomerLookupResult(null);
            setShowPhoneSearch(false);
          }}
        >
          <Pressable
            style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14, maxHeight: '85%' }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Chọn khách hàng</Text>
              <Pressable
                onPress={() => {
                  setCustomerModalOpen(false);
                  setCustomerSearch('');
                  setCustomerLookupResult(null);
                }}
              >
                <Text style={{ fontSize: 22, color: '#9ca3af' }}>×</Text>
              </Pressable>
            </View>

            {/* Đang tải */}
            {waitingLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
                <ActivityIndicator color="#ec4899" size="large" />
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>Đang tải danh sách check-in...</Text>
              </View>
            )}

            {/* Danh sách khách vừa check-in */}
            {!waitingLoading && waitingList.length > 0 && !showPhoneSearch && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 }}>
                  KHÁCH VỪA CHECK-IN — bấm để chọn
                </Text>
                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  {waitingList.map((c) => (
                    <Pressable
                      key={c.phone}
                      onPress={() => {
                        setSelectedCustomer({ id: c.customerId ?? null, name: c.name, phone: c.phone, faceEnrolled: c.faceEnrolled });
                        setCustomerModalOpen(false);
                        setCustomerSearch('');
                        setCustomerLookupResult(null);
                      }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingVertical: 10, paddingHorizontal: 12,
                        borderRadius: 12, backgroundColor: '#fdf2f8',
                        borderWidth: 1, borderColor: '#fbcfe8', marginBottom: 6,
                      }}
                    >
                      <CustomerPhoto phone={c.phone} name={c.name} size={48} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2937' }}>{c.name}</Text>
                        <Text style={{ fontSize: 12, color: '#9ca3af' }}>{c.phone}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: '#ec4899', fontWeight: '600' }}>
                        {new Date(c.arrivedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable
                  onPress={() => setShowPhoneSearch(true)}
                  style={{ alignItems: 'center', paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 13, color: '#9ca3af', textDecorationLine: 'underline' }}>
                    Tìm khách khác theo SĐT
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Tìm theo SĐT (hiện khi danh sách rỗng HOẶC bấm "Tìm số khác") */}
            {!waitingLoading && showPhoneSearch && (
              <View style={{ gap: 10 }}>
                {waitingList.length > 0 && (
                  <Pressable onPress={() => { setShowPhoneSearch(false); setCustomerLookupResult(null); setCustomerSearch(''); }}>
                    <Text style={{ fontSize: 13, color: '#ec4899', fontWeight: '600' }}>← Quay lại danh sách</Text>
                  </Pressable>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={{
                      flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
                      paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
                    }}
                    placeholder="Nhập số điện thoại..."
                    keyboardType="phone-pad"
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                    onSubmitEditing={handleCustomerSearch}
                    autoFocus
                  />
                  <Pressable
                    onPress={handleCustomerSearch}
                    style={{ backgroundColor: '#ec4899', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' }}
                  >
                    {customerLookupLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontWeight: '700' }}>Tìm</Text>
                    }
                  </Pressable>
                </View>

                {customerLookupResult && (
                  customerLookupResult.found ? (
                    <View style={{
                      borderWidth: 1, borderColor: '#fbcfe8', borderRadius: 16,
                      padding: 16, backgroundColor: '#fdf2f8', alignItems: 'center', gap: 10,
                    }}>
                      <CustomerPhoto
                        phone={customerLookupResult.normalizedPhone}
                        name={customerLookupResult.customer.name}
                        size={72}
                      />
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#1f2937' }}>
                        {customerLookupResult.customer.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#9ca3af' }}>
                        {customerLookupResult.normalizedPhone}
                      </Text>
                      {customerLookupResult.services?.length > 0 && (
                        <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                          Dịch vụ quen: {customerLookupResult.services.slice(0, 3).map((s) => s.name).join(', ')}
                        </Text>
                      )}
                      <Pressable
                        onPress={() => {
                          setSelectedCustomer({
                            id: customerLookupResult.customer.id ?? null,
                            name: customerLookupResult.customer.name,
                            phone: customerLookupResult.normalizedPhone,
                            faceEnrolled: customerLookupResult.customer.faceEnrolled,
                          });
                          setCustomerModalOpen(false);
                          setCustomerSearch('');
                          setCustomerLookupResult(null);
                        }}
                        style={{ backgroundColor: '#ec4899', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>✓ Chọn khách này</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 16, color: '#6b7280' }}>Không tìm thấy khách hàng</Text>
                      <Text style={{ fontSize: 12, color: '#9ca3af' }}>SĐT chưa đăng ký trong hệ thống</Text>
                    </View>
                  )
                )}
              </View>
            )}

            {/* Bỏ chọn */}
            {!waitingLoading && selectedCustomer && (
              <Pressable
                onPress={() => {
                  setSelectedCustomer(null);
                  setCustomerModalOpen(false);
                  setCustomerSearch('');
                  setCustomerLookupResult(null);
                }}
                style={{ borderWidth: 1, borderColor: '#fecdd3', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, color: '#f43f5e' }}>Bỏ chọn khách hiện tại</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
