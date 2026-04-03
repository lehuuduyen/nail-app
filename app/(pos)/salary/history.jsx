import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  generateWeeklyPeriods,
  getSalaryHistory,
  printEmployeeSalary,
  updateSalaryRecord,
} from '../../../services/salaryService';

function errMsg(e) {
  return e?.response?.data?.error || e?.message || 'Request failed';
}

function payrollEmployeeName(p) {
  const e = p.Employee || p.employee;
  if (!e) return 'Employee';
  return `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Employee';
}

function payrollToPrintRow(p) {
  const name = payrollEmployeeName(p);
  return {
    name,
    commSplitLabel: '—',
    bonusCheck: '—',
    totalSales: Number(p.totalRevenue || 0),
    totalTips: Number(p.totalTips || 0),
    commission: Number(p.commissionAmount || 0),
    tipCredit: Number(p.tipCredit || 0),
    cleanFee: Number(p.cleanFee || 0),
    totalPay: Number(p.totalPay || 0),
    cash: Number(p.bonusAmount || 0),
    check: Number(p.checkDue != null ? p.checkDue : p.totalPay || 0),
    bonusDue: Number(p.bonusAmount || 0),
    checkDue: Number(p.checkDue != null ? p.checkDue : p.totalPay || 0),
    profit: Number(p.ownerProfitAmount || 0),
    note: p.notes || '',
  };
}

export default function SalaryHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState('periods');
  const periods = useMemo(() => generateWeeklyPeriods(52), []);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async (period) => {
    setLoading(true);
    try {
      const data = await getSalaryHistory(period.startDate, period.endDate);
      setRows(data.payrolls || []);
      setScreen('list');
    } catch (err) {
      Alert.alert('Error', errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const selectPeriod = async (period) => {
    setSelectedPeriod(period);
    await loadHistory(period);
  };

  const markPaid = async (p) => {
    try {
      setLoading(true);
      await updateSalaryRecord(p.id, { status: 'paid' });
      await loadHistory(selectedPeriod);
    } catch (err) {
      Alert.alert('Error', errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const printOne = async (p) => {
    try {
      const label = selectedPeriod?.label || '';
      await printEmployeeSalary(payrollToPrintRow(p), label);
    } catch (err) {
      Alert.alert('Print', errMsg(err));
    }
  };

  const padTop = Math.max(insets.top, 12);

  if (screen === 'periods') {
    return (
      <View style={styles.container}>
        <View style={[styles.headerBlock, { paddingTop: padTop }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.backChevron}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerLine1}>Please select an action for Salary</Text>
          </View>
          <Text style={styles.headerLine2}>Pick A Date Range</Text>
          {loading ? <ActivityIndicator style={{ marginTop: 8 }} color="#333" /> : null}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {periods.map((period, i) => (
            <TouchableOpacity
              key={period.startDate}
              onPress={() => selectPeriod(period)}
              activeOpacity={0.7}
              style={[styles.periodRow, i > 0 && styles.periodRowBorder]}
            >
              <Text style={styles.periodText}>{period.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: padTop }]}>
        <TouchableOpacity
          onPress={() => {
            setScreen('periods');
            setRows([]);
            setSelectedPeriod(null);
          }}
          hitSlop={12}
          style={styles.backLinkRow}
        >
          <Text style={styles.backChevronSm}>‹</Text>
          <Text style={styles.backLinkText}>Pick A Date Range</Text>
        </TouchableOpacity>
        <Text style={styles.periodCenterTitle}>{selectedPeriod?.label}</Text>
      </View>

      {loading && rows.length === 0 ? (
        <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.listHeader}>
            <Text style={[styles.hCell, styles.hName]}>Employee</Text>
            <Text style={[styles.hCell, styles.hPeriod]}>Period</Text>
            <Text style={[styles.hCell, styles.hPay]}>Total Pay</Text>
            <Text style={[styles.hCell, styles.hStat]}>Status</Text>
            <Text style={[styles.hCell, styles.hAct]}> </Text>
          </View>
          {rows.length === 0 ? (
            <Text style={styles.empty}>No saved payroll for this week.</Text>
          ) : (
            rows.map((p, i) => (
              <View
                key={p.id}
                style={[styles.row, i % 2 === 1 && styles.rowAlt]}
              >
                <Text style={[styles.cCell, styles.hName]} numberOfLines={1}>
                  {payrollEmployeeName(p)}
                </Text>
                <Text style={[styles.cCell, styles.hPeriod]} numberOfLines={2}>
                  {selectedPeriod?.label}
                </Text>
                <Text style={[styles.cCell, styles.hPay]}>
                  ${Number(p.totalPay || 0).toFixed(2)}
                </Text>
                <Text style={[styles.cCell, styles.hStat]}>{p.status || 'draft'}</Text>
                <View style={[styles.hAct, styles.actCol]}>
                  <Pressable onPress={() => printOne(p)}>
                    <Text style={styles.linkPrint}>Print</Text>
                  </Pressable>
                  {p.status !== 'paid' ? (
                    <Pressable onPress={() => markPaid(p)}>
                      <Text style={styles.linkPaid}>Paid</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  headerBlock: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backChevron: { fontSize: 32, color: '#222', fontWeight: '300', lineHeight: 36 },
  headerLine1: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  headerLine2: { marginTop: 6, fontSize: 18, fontWeight: '800', color: '#111' },
  periodRow: { paddingVertical: 20, backgroundColor: '#f5f5f5', alignItems: 'center' },
  periodRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#c8c8c8' },
  periodText: { fontSize: 16, color: '#222', fontWeight: '600' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  backLinkRow: { flexDirection: 'row', alignItems: 'center', width: 160 },
  backChevronSm: { fontSize: 26, color: '#222', fontWeight: '300' },
  backLinkText: { fontSize: 14, fontWeight: '700', color: '#222' },
  periodCenterTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },

  listHeader: {
    flexDirection: 'row',
    backgroundColor: '#2b2b3a',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  hCell: { color: '#fff', fontSize: 11, fontWeight: '800' },
  hName: { flex: 1.2 },
  hPeriod: { flex: 1.4 },
  hPay: { flex: 0.9, textAlign: 'right' },
  hStat: { flex: 0.7, textAlign: 'center' },
  hAct: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  rowAlt: { backgroundColor: '#f4f4f4' },
  cCell: { fontSize: 13, color: '#222' },
  actCol: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, alignItems: 'center' },
  linkPrint: { color: '#1565C0', fontWeight: '700', fontSize: 13 },
  linkPaid: { color: '#E53935', fontWeight: '800', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 15, color: '#666' },
});
