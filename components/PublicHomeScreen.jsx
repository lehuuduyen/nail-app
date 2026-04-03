import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/client';
import { fetchCatalogEmployees, fetchSalonDisplayName } from '../api/catalog';
import { fetchTurnsForDate } from '../api/turns';
import CheckTurnModal from './CheckTurnModal';
import CustomerReceipts from './CustomerReceipts';
import LeftSidebar from './LeftSidebar';
import OwnerPinModal from './OwnerPinModal';
import RightActionButtons from './RightActionButtons';
import SalonHeader from './SalonHeader';
import StaffGrid from './StaffGrid';
import { SAMPLE_STAFF } from '../constants/sampleData';
import { useAuthStore } from '../store/authStore';
import { usePosStore } from '../store/posStore';
import { useLocalCatalogStore } from '../store/localCatalogStore';
import { useOwnerStore } from '../store/ownerStore';
import { loadSetting, SETTING_KEYS } from '../utils/settingsStorage';
import {
  formatSalonTodayReadable,
  getSalonDateYmd,
  getSalonTzDisplayLabel,
} from '../utils/salonTz';
import { mapApiEmployeeToPosStaff } from '../utils/staffDisplay';
import { transactionsToReceiptRows } from '../utils/receiptsFromTransactions';

const PAGE_BG = '#f0f0f0';
const RIGHT_COL_W = 280;

export default function PublicHomeScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);
  const ownerLogout = useOwnerStore((s) => s.logout);
  const clearAdminSession = useAuthStore((s) => s.clearAdminSession);

  const [staff, setStaff] = useState(SAMPLE_STAFF);
  const [transactions, setTransactions] = useState([]);
  const [storeTitle, setStoreTitle] = useState('Nice Nails & Spa');
  const [pinOpen, setPinOpen] = useState(false);
  const [turnSnapshot, setTurnSnapshot] = useState({
    employees: [],
    suggested: null,
    date: '',
    rotationTotal: 0,
  });
  const [checkTurnOpen, setCheckTurnOpen] = useState(false);

  const load = useCallback(async () => {
    const salonYmd = getSalonDateYmd();
    const remoteName = await fetchSalonDisplayName();
    const localName = await loadSetting(SETTING_KEYS.storeName);
    setStoreTitle(remoteName ?? (localName || 'Nice Nails & Spa'));

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
      const [emps, txRes, turnRes] = await Promise.all([
        fetchCatalogEmployees(),
        api.get('/api/transactions', {
          params: { limit: 200, date: salonYmd },
        }),
        fetchTurnsForDate(salonYmd).catch(() => null),
      ]);
      const list = emps;
      if (list.length) {
        const main = list.map((e, i) => mapApiEmployeeToPosStaff(e, i));
        setStaff([...main, ...mapLocal(localExtras, main.length)]);
      } else {
        setStaff([...SAMPLE_STAFF, ...mapLocal(localExtras, SAMPLE_STAFF.length)]);
      }
      setTransactions(txRes.data || []);
      if (turnRes?.employees) {
        setTurnSnapshot({
          employees: turnRes.employees,
          suggested: turnRes.suggested ?? null,
          date: salonYmd,
          rotationTotal: Number(turnRes.total) || 0,
        });
      }
    } catch {
      setStaff([...SAMPLE_STAFF, ...mapLocal(localExtras, SAMPLE_STAFF.length)]);
      setTransactions([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      clearAdminSession();
      load();
    }, [load, clearAdminSession])
  );

  const homeRefreshNonce = usePosStore((s) => s.homeRefreshNonce);
  useEffect(() => {
    if (homeRefreshNonce === 0) return;
    load();
  }, [homeRefreshNonce, load]);

  const refreshTurnsOnly = useCallback(async () => {
    const salonYmd = getSalonDateYmd();
    try {
      const data = await fetchTurnsForDate(salonYmd);
      setTurnSnapshot({
        employees: data.employees || [],
        suggested: data.suggested ?? null,
        date: salonYmd,
        rotationTotal: Number(data.total) || 0,
      });
    } catch {
      /* offline / lỗi auth */
    }
  }, []);

  useEffect(() => {
    refreshTurnsOnly();
    const id = setInterval(refreshTurnsOnly, 30000);
    return () => clearInterval(id);
  }, [refreshTurnsOnly]);

  const turnByEmployeeId = useMemo(() => {
    const m = new Map();
    for (const e of turnSnapshot.employees) {
      const id = e.employeeId;
      m.set(id, e);
      const n = Number(id);
      if (Number.isFinite(n)) m.set(n, e);
      m.set(String(id), e);
    }
    return m;
  }, [turnSnapshot.employees]);

  const appointmentHeaderTotal = useMemo(
    () => turnSnapshot.employees.reduce((s, e) => s + (e.appointments || 0), 0),
    [turnSnapshot.employees]
  );

  const salonYmd = getSalonDateYmd();
  const { paid: paidReceipts, unpaid: unpaidReceipts } = useMemo(
    () => transactionsToReceiptRows(transactions, salonYmd),
    [transactions, salonYmd]
  );

  const receiptsDaySubtext = `Hôm nay (${getSalonTzDisplayLabel()}) · ${formatSalonTodayReadable()}`;

  const onSelectStaff = (s) => {
    const sug = turnSnapshot.suggested;
    const defaultTurnType =
      sug != null && String(s.id) === String(sug) ? 'walk_in' : 'customer_pick';
    router.push({
      pathname: '/(pos)/new-ticket',
      params: {
        staffId: String(s.id),
        staffName: s.displayName || `${s.firstName} ${s.lastName}`.trim(),
        suggestedEmployeeId: sug != null ? String(sug) : '',
        defaultTurnType,
      },
    });
  };

  const handleLogoutApp = () => {
    Alert.alert('Sign out?', 'Return to login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          ownerLogout();
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: PAGE_BG, paddingTop: insets.top }}>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: PAGE_BG, minHeight: 0 }}>
        <LeftSidebar
          onOwnerLogin={() => setPinOpen(true)}
          isOwnerMode={false}
          onAppSignOut={handleLogoutApp}
        />

        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <StaffGrid
            staff={staff}
            onSelectStaff={onSelectStaff}
            turnByEmployeeId={turnByEmployeeId}
            suggestedEmployeeId={turnSnapshot.suggested}
          />
        </View>

        <View
          style={{
            width: RIGHT_COL_W,
            minHeight: 0,
            borderLeftWidth: 1,
            borderLeftColor: '#ccc',
            backgroundColor: '#f5f5f5',
          }}
        >
          <SalonHeader
            salonName={storeTitle}
            appointments={appointmentHeaderTotal}
            checkIns={turnSnapshot.rotationTotal}
            onAppointments={() => router.push('/(pos)/appointments')}
            onCheckIns={() => router.push('/(pos)/checkin')}
            onReceipts={() => router.push('/(pos)/receipts')}
          />
          <CustomerReceipts
            paidReceipts={paidReceipts}
            unpaidReceipts={unpaidReceipts}
            daySubtext={receiptsDaySubtext}
          />
        </View>

        <RightActionButtons
          onTechTickets={() => router.push('/(pos)/new-ticket')}
          onCheckTurns={() => setCheckTurnOpen(true)}
        />
      </View>

      <CheckTurnModal
        visible={checkTurnOpen}
        onClose={() => setCheckTurnOpen(false)}
        turnData={turnSnapshot.employees}
        suggested={turnSnapshot.suggested}
        dateLabel={receiptsDaySubtext}
      />

      <OwnerPinModal
        visible={pinOpen}
        onVerified={() => {
          setPinOpen(false);
          useOwnerStore.getState().touchActivity();
        }}
        onCancel={() => setPinOpen(false)}
      />
    </View>
  );
}
