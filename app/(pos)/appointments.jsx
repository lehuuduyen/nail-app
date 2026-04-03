import { Ionicons } from '@expo/vector-icons';
import { addDays, addMinutes, format, setHours, setMinutes, startOfDay, startOfWeek } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { useAuthStore } from '../../store/authStore';
import {
  FALLBACK_EMPLOYEE_ROWS,
  buildAppointmentStaffCols,
  employeeIdToScheduleRow,
} from '../../constants/sampleData';
import { formatEmployeeNameFromDb } from '../../utils/staffDisplay';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  END_HOUR,
  START_HOUR,
  SLOTS_PER_HOUR,
  appointmentToBlock,
  slotsCount,
} from '../../utils/appointmentsGrid';

const SLOT_W = 44;
const ROW_H = 52;

function slotIndexToLabel(slotIndex, dayDate) {
  const d = new Date(dayDate);
  d.setHours(START_HOUR, 0, 0, 0);
  return format(addMinutes(d, slotIndex * 15), 'h:mm a');
}

/** Giờ hẹn theo slot (local) → ISO gửi API */
function slotIndexToScheduledISO(selectedDate, slotIndex) {
  const base = startOfDay(selectedDate);
  const atStart = setMinutes(setHours(base, START_HOUR), 0);
  return addMinutes(atStart, slotIndex * 15).toISOString();
}

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const isOffline = !token || String(token).startsWith('local-demo');
  const weekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 0 }),
    []
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(
    Math.min(6, Math.max(0, new Date().getDay()))
  );

  const selectedDate = useMemo(
    () => addDays(weekStart, selectedDayIndex),
    [weekStart, selectedDayIndex]
  );

  const [employees, setEmployees] = useState(FALLBACK_EMPLOYEE_ROWS);
  const [dayAppointments, setDayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadErr, setLoadErr] = useState('');

  const [bookOpen, setBookOpen] = useState(false);
  const [bookSlotIndex, setBookSlotIndex] = useState(0);
  const [bookStaffLabel, setBookStaffLabel] = useState('');
  const [bookEmployeeId, setBookEmployeeId] = useState(null);
  const [bookCustomerName, setBookCustomerName] = useState('');
  const [bookCustomerPhone, setBookCustomerPhone] = useState('');
  const [bookServiceId, setBookServiceId] = useState(null);
  const [servicesForBook, setServicesForBook] = useState([]);
  const [bookSaving, setBookSaving] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const skipFocusRefetchOnce = useRef(true);

  const applyScheduleResponse = useCallback((employeesList, dayRes) => {
    const list = Array.isArray(employeesList) ? employeesList : [];
    setEmployees(list.length ? list : FALLBACK_EMPLOYEE_ROWS);
    setDayAppointments(dayRes.data || []);
  }, []);

  const refetchSchedule = useCallback(async () => {
    setLoadErr('');
    try {
      const [emps, dayRes] = await Promise.all([
        fetchCatalogEmployees(),
        api.get('/api/appointments/day', { params: { date: dateStr } }),
      ]);
      applyScheduleResponse(emps, dayRes);
    } catch (e) {
      setLoadErr(getApiErrorMessage(e));
      setEmployees(FALLBACK_EMPLOYEE_ROWS);
      setDayAppointments([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [dateStr, applyScheduleResponse]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr('');
      try {
        const [emps, dayRes] = await Promise.all([
          fetchCatalogEmployees(),
          api.get('/api/appointments/day', { params: { date: dateStr } }),
        ]);
        if (cancelled) return;
        applyScheduleResponse(emps, dayRes);
      } catch (e) {
        if (!cancelled) {
          setLoadErr(getApiErrorMessage(e));
          setEmployees(FALLBACK_EMPLOYEE_ROWS);
          setDayAppointments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateStr, applyScheduleResponse]);

  useFocusEffect(
    useCallback(() => {
      if (skipFocusRefetchOnce.current) {
        skipFocusRefetchOnce.current = false;
        return;
      }
      refetchSchedule();
    }, [refetchSchedule])
  );

  const onTapRefresh = useCallback(() => {
    setRefreshing(true);
    refetchSchedule();
  }, [refetchSchedule]);

  useEffect(() => {
    if (!bookOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = (await fetchCatalogServices()).filter((s) => s.isActive !== false);
        if (cancelled) return;
        setServicesForBook(rows);
        setBookServiceId(rows[0]?.id ?? null);
      } catch {
        if (!cancelled) {
          setServicesForBook([]);
          setBookServiceId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookOpen]);

  const openBookModal = useCallback(
    (staffName, rowIdx, slotIndex) => {
      if (isOffline) {
        Alert.alert(
          'Cần đăng nhập API',
          'Đặt lịch lưu lên server. Thoát offline hoặc đăng nhập tài khoản backend.'
        );
        return;
      }
      const sorted = [...employees].sort((a, b) => a.id - b.id);
      if (!sorted.length) {
        Alert.alert('Lỗi', 'Chưa có danh sách nhân viên.');
        return;
      }
      const emp = rowIdx > 0 ? sorted[rowIdx - 1] : sorted[0];
      setBookSlotIndex(slotIndex);
      setBookStaffLabel(staffName);
      setBookEmployeeId(emp?.id ?? null);
      setBookCustomerName('');
      setBookCustomerPhone('');
      setBookOpen(true);
    },
    [employees, isOffline]
  );

  const submitBook = useCallback(async () => {
    const name = bookCustomerName.trim() || 'Khách';
    if (!bookEmployeeId || !bookServiceId) {
      Alert.alert('Thiếu dữ liệu', 'Chọn dịch vụ (và nhân viên).');
      return;
    }
    setBookSaving(true);
    try {
      await api.post('/api/appointments', {
        customerName: name,
        customerPhone: bookCustomerPhone.trim() || null,
        employeeId: bookEmployeeId,
        serviceId: bookServiceId,
        scheduledAt: slotIndexToScheduledISO(selectedDate, bookSlotIndex),
        status: 'scheduled',
      });
      setBookOpen(false);
      setRefreshing(true);
      await refetchSchedule();
      Alert.alert('Đã đặt lịch', 'Đã lưu vào lịch hẹn (appointments).');
    } catch (e) {
      Alert.alert('Không lưu được', getApiErrorMessage(e));
    } finally {
      setBookSaving(false);
    }
  }, [
    bookCustomerName,
    bookCustomerPhone,
    bookEmployeeId,
    bookServiceId,
    bookSlotIndex,
    refetchSchedule,
    selectedDate,
  ]);

  const staffCols = useMemo(
    () => buildAppointmentStaffCols(employees),
    [employees]
  );
  const rowMap = useMemo(
    () => employeeIdToScheduleRow(employees),
    [employees]
  );
  const blocks = useMemo(
    () =>
      (dayAppointments || [])
        .map((a) => appointmentToBlock(a, rowMap, selectedDate))
        .filter(Boolean),
    [dayAppointments, rowMap, selectedDate]
  );

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${format(weekStart, 'MMM-d')}-${format(end, 'yy')}`;
  }, [weekStart]);

  const headerSlots = useMemo(() => {
    const out = [];
    for (let h = START_HOUR; h < END_HOUR; h += 1) {
      const ampm = h < 12 ? 'AM' : 'PM';
      const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
      out.push({ key: `h-${h}`, label: `${hr}:00${ampm}`, sub: ['15', '30', '45'] });
    }
    return out;
  }, []);

  const nSlots = slotsCount();

  const onCellPress = useCallback(
    (staffName, rowIdx, slotIndex) => {
      const time = slotIndexToLabel(slotIndex, selectedDate);
      const dateStrFmt = format(selectedDate, 'EEE MMM d');
      const sorted = [...employees].sort((a, b) => a.id - b.id);
      const emp = rowIdx > 0 ? sorted[rowIdx - 1] : null;
      const staffIdParam =
        emp?.id != null && String(emp.id).length > 0 ? String(emp.id) : '';
      Alert.alert(
        'Ô trống',
        `${staffName}\n${dateStrFmt}\n${time}`,
        [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Đặt lịch (lưu DB)',
            onPress: () => openBookModal(staffName, rowIdx, slotIndex),
          },
          {
            text: 'Chỉ mở vé POS',
            style: 'destructive',
            onPress: () =>
              router.push({
                pathname: '/(pos)/new-ticket',
                params: {
                  ...(staffIdParam ? { staffId: staffIdParam } : {}),
                  staffName: staffName === 'ANYONE' ? 'STAFF' : staffName,
                },
              }),
          },
        ]
      );
    },
    [selectedDate, openBookModal]
  );

  const onBlockPress = useCallback((block) => {
    const a = block.appt;
    const tech = a.Employee ? formatEmployeeNameFromDb(a.Employee) : '—';
    const when = format(new Date(a.scheduledAt), 'PPp');
    Alert.alert(
      a.customerName || 'Booking',
      `${when}\n${a.Service?.name || 'Service'} · ${tech}\n${a.customerPhone || ''}\nTrạng thái: ${a.status}`,
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Thanh toán POS (vé)',
          onPress: () =>
            router.push({
              pathname: '/(pos)/new-ticket',
              params: {
                ...(a.employeeId != null && String(a.employeeId) !== ''
                  ? { staffId: String(a.employeeId) }
                  : {}),
                staffName: tech,
                appointmentId: String(a.id),
                defaultTurnType: 'appointment',
              },
            }),
        },
      ]
    );
  }, []);

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(pos)');
  }, []);

  return (
    <View className="flex-1 bg-[#e8e8e8]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-2 py-2 bg-[#e0e0e0] border-b border-neutral-300 flex-wrap">
        <Pressable
          onPress={goHome}
          className="p-2 rounded-lg active:bg-neutral-300"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="home-outline" size={22} />
        </Pressable>
        {loading || refreshing ? (
          <ActivityIndicator size="small" color="#E53935" className="ml-2" />
        ) : null}
        <Pressable
          onPress={onTapRefresh}
          className="p-2 rounded-lg active:bg-neutral-300"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Tải lại lịch"
        >
          <Ionicons name="refresh-outline" size={22} color="#333" />
        </Pressable>
        <View className="px-2 py-1 flex-1 min-w-[120px]">
          <Text className="text-[10px] text-neutral-600" numberOfLines={1}>
            {loadErr ? `Offline: ${loadErr}` : `${dayAppointments.length} lịch · ${dateStr}`}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            Alert.alert(
              'Walk-in / thanh toán',
              'Mở vé POS để thu tiền ngay — không tạo lịch hẹn. Đặt lịch: chọn ô giờ trên lưới → Đặt lịch (lưu DB).',
              [
                { text: 'Huỷ', style: 'cancel' },
                {
                  text: 'Mở vé POS',
                  onPress: () =>
                    router.push({ pathname: '/(pos)/new-ticket', params: {} }),
                },
              ]
            )
          }
          className="bg-neutral-300 rounded-lg px-3 py-2 ml-auto active:opacity-70"
        >
          <Text className="text-xs font-bold">POS</Text>
        </Pressable>
      </View>

      <View className="bg-white px-2 py-2 border-b border-neutral-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const d = addDays(weekStart, i);
            const sel = i === selectedDayIndex;
            return (
              <Pressable
                key={i}
                onPress={() => setSelectedDayIndex(i)}
                className="px-4 py-2 mr-2 rounded-lg active:bg-neutral-100"
              >
                <Text
                  className={`text-xs font-bold ${sel ? 'text-primary' : 'text-neutral-600'}`}
                >
                  {format(d, 'd EEE').toUpperCase()}
                </Text>
                <Text
                  className={`text-[10px] ${sel ? 'text-primary' : 'text-neutral-500'}`}
                >
                  {format(d, 'MMMM')}
                </Text>
                {sel ? <View className="h-0.5 bg-primary mt-1" /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <View className="flex-row items-center justify-between mt-1 px-2">
          <Text className="font-bold">{weekLabel}</Text>
          <Text className="text-primary text-xs font-semibold">
            Lịch từ database
          </Text>
        </View>
      </View>

      <View className="flex-1 flex-row min-h-0">
        <View
          className="bg-staffBlue justify-start pt-12 z-10"
          style={{ width: 72 }}
        >
          {staffCols.map((name) => (
            <View
              key={name}
              className="justify-center px-1 border-b border-white/20"
              style={{ height: ROW_H }}
            >
              <Text className="text-white text-[10px] font-bold text-center uppercase">
                {name}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          className="flex-1 bg-[#ececec]"
          nestedScrollEnabled={Platform.OS === 'android'}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: SLOT_W * nSlots + 8 }}>
            <View className="flex-row border-b border-neutral-300 bg-[#f5f5f5]">
              {headerSlots.map((h) => (
                <View
                  key={h.key}
                  className="border-r border-neutral-300"
                  style={{ width: SLOT_W * SLOTS_PER_HOUR }}
                >
                  <Text className="text-[10px] font-bold text-center py-1">
                    {h.label}
                  </Text>
                  <View className="flex-row">
                    {h.sub.map((s) => (
                      <View
                        key={s}
                        className="border-r border-neutral-200 items-center"
                        style={{ width: SLOT_W }}
                      >
                        <Text className="text-[9px] text-neutral-500">{s}</Text>
                      </View>
                    ))}
                    <View
                      className="items-center border-r border-neutral-200"
                      style={{ width: SLOT_W }}
                    >
                      <Text className="text-[9px] text-neutral-500">00</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {staffCols.map((name, rowIdx) => (
              <View
                key={name}
                className="flex-row border-b border-neutral-300 relative"
                style={{ height: ROW_H, width: SLOT_W * nSlots }}
              >
                {Array.from({ length: nSlots }).map((_, si) => (
                  <Pressable
                    key={si}
                    onPress={() => onCellPress(name, rowIdx, si)}
                    style={{ width: SLOT_W, height: ROW_H }}
                    className="border-r border-neutral-200 justify-center active:bg-primary/10"
                  />
                ))}
                {blocks
                  .filter((b) => b.row === rowIdx)
                  .map((b) => {
                    const st = b.appt.status;
                    const bg =
                      st === 'completed'
                        ? '#2E7D32'
                        : st === 'in_progress'
                          ? '#F9A825'
                          : st === 'cancelled'
                            ? '#757575'
                            : '#1565C0';
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => onBlockPress(b)}
                        className="absolute rounded-sm justify-center px-1"
                        style={{
                          left: b.start * SLOT_W,
                          width: b.span * SLOT_W - 2,
                          top: 6,
                          bottom: 6,
                          backgroundColor: bg,
                        }}
                      >
                        <Text
                          className="text-white text-[9px] font-semibold"
                          numberOfLines={1}
                        >
                          {b.label}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <Modal visible={bookOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            className="flex-1"
            onPress={() => !bookSaving && setBookOpen(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="bg-white rounded-t-2xl"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <ScrollView
              className="px-4 pt-4 max-h-[480px]"
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-lg font-bold text-neutral-900">
                Đặt lịch hẹn
              </Text>
              <Text className="text-sm text-neutral-600 mt-1 mb-2">
                {format(selectedDate, 'EEE, MMM d')} ·{' '}
                {slotIndexToLabel(bookSlotIndex, selectedDate)} · {bookStaffLabel}
              </Text>
              {bookStaffLabel === 'ANYONE' ? (
                <Text className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg mb-2">
                  Cột ANYONE: lịch lưu với nhân viên đầu danh sách (có thể đổi sau trên web).
                </Text>
              ) : null}
              <Text className="text-xs text-neutral-500 mb-1">Tên khách *</Text>
              <TextInput
                value={bookCustomerName}
                onChangeText={setBookCustomerName}
                placeholder="VD: LAN NGUYEN"
                className="border border-neutral-300 rounded-lg px-3 py-2 mb-2 bg-white"
              />
              <Text className="text-xs text-neutral-500 mb-1">Điện thoại (tùy)</Text>
              <TextInput
                value={bookCustomerPhone}
                onChangeText={setBookCustomerPhone}
                placeholder="555-0100"
                keyboardType="phone-pad"
                className="border border-neutral-300 rounded-lg px-3 py-2 mb-3 bg-white"
              />
              <Text className="text-xs font-semibold text-neutral-700 mb-2">
                Dịch vụ
              </Text>
              {servicesForBook.length === 0 ? (
                <Text className="text-sm text-neutral-500 mb-3">
                  Đang tải dịch vụ…
                </Text>
              ) : (
                <View className="mb-4 gap-1">
                  {servicesForBook.map((s) => {
                    const sel = bookServiceId === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setBookServiceId(s.id)}
                        className={`border rounded-lg px-3 py-2 ${
                          sel ? 'border-primary bg-rose-50' : 'border-neutral-200 bg-white'
                        }`}
                      >
                        <Text className="text-sm font-medium">{s.name}</Text>
                        <Text className="text-xs text-neutral-500">
                          ${Number(s.price).toFixed(2)} · {s.duration ?? 30} phút
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <View className="flex-row gap-2 pb-6">
                <Pressable
                  onPress={() => !bookSaving && setBookOpen(false)}
                  className="flex-1 border border-neutral-300 rounded-xl py-3 items-center"
                >
                  <Text className="font-semibold text-neutral-700">Huỷ</Text>
                </Pressable>
                <Pressable
                  onPress={submitBook}
                  disabled={bookSaving || !bookServiceId}
                  className="flex-1 bg-primary rounded-xl py-3 items-center opacity-100"
                  style={{
                    opacity: bookSaving || !bookServiceId ? 0.5 : 1,
                  }}
                >
                  <Text className="font-bold text-white">
                    {bookSaving ? 'Đang lưu…' : 'Lưu lịch'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
