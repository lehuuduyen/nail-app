import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SalaryShopSummaryBar from '../../../components/SalaryShopSummaryBar';
import {
  calculateSalary,
  generateWeeklyPeriods,
  printEmployeeSalary,
  saveSalaryRecord,
  updateSalaryRecord,
} from '../../../services/salaryService';

const TABLE_HEADER = '#2b2b3a';
const TOTAL_GREEN = '#43A047';
const COL_W = {
  name: 66,
  splitTO: 54,
  bonusChk: 52,
  sales: 70,
  tips: 64,
  commission: 70,
  tipCr: 60,
  clean: 50,
  pay: 68,
  cash: 56,
  check: 56,
  profit: 60,
  actions: 90,
};

const COL_ORDER = [
  'name',
  'splitTO',
  'bonusChk',
  'sales',
  'tips',
  'commission',
  'tipCr',
  'clean',
  'pay',
  'cash',
  'check',
  'profit',
  'actions',
];

/** Stretch table to at least screen width; scale columns proportionally (exact total width). */
function scaledColumnWidths(screenWidth) {
  const tableMinWidth = COL_ORDER.reduce((s, k) => s + COL_W[k], 0);
  const tableW = Math.max(tableMinWidth, screenWidth);
  const widths = {};
  let assigned = 0;
  COL_ORDER.forEach((k, i) => {
    if (i === COL_ORDER.length - 1) {
      widths[k] = tableW - assigned;
    } else {
      const w = Math.floor((tableW * COL_W[k]) / tableMinWidth);
      widths[k] = Math.max(36, w);
      assigned += widths[k];
    }
  });
  return { widths, tableW, tableMinWidth };
}

function errMsg(e) {
  return e?.response?.data?.error || e?.message || 'Request failed';
}

export default function CalculateAllSalary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [screen, setScreen] = useState('periods');
  const periods = useMemo(() => generateWeeklyPeriods(52), []);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [editModal, setEditModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editBonus, setEditBonus] = useState('0');
  const [editCheck, setEditCheck] = useState('0');
  const [editNote, setEditNote] = useState('');

  const loadPeriod = useCallback(async (period) => {
    setLoading(true);
    try {
      const data = await calculateSalary(period.startDate, period.endDate);
      setSalaryData(data);
      setScreen('table');
    } catch (err) {
      Alert.alert('Error', errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const selectPeriod = async (period) => {
    setSelectedPeriod(period);
    await loadPeriod(period);
  };

  const openEdit = (emp) => {
    setEditEmployee(emp);
    setEditBonus(String(emp.cash ?? emp.bonusDue ?? 0));
    setEditCheck(String(emp.check ?? emp.checkDue ?? 0));
    setEditNote(emp.note || '');
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editEmployee || !selectedPeriod) return;
    const bonus = parseFloat(editBonus);
    const check = parseFloat(editCheck);
    const b = Number.isFinite(bonus) ? bonus : 0;
    const c = Number.isFinite(check) ? check : 0;
    try {
      setLoading(true);
      if (editEmployee.payrollId) {
        await updateSalaryRecord(editEmployee.payrollId, {
          bonusAmount: b,
          checkDue: c,
          notes: editNote,
        });
      } else {
        await saveSalaryRecord({
          employeeId: editEmployee.employeeId,
          startDate: selectedPeriod.startDate,
          endDate: selectedPeriod.endDate,
          totalSales: editEmployee.totalSales,
          totalTips: editEmployee.totalTips,
          commission: editEmployee.commission,
          tipCredit: editEmployee.tipCredit,
          cleanFee: editEmployee.cleanFee,
          totalPay: editEmployee.totalPay,
          bonusAmount: b,
          checkDue: c,
          notes: editNote,
          ownerProfit: editEmployee.profit,
        });
      }
      setEditModal(false);
      await loadPeriod(selectedPeriod);
    } catch (err) {
      Alert.alert('Error', errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRow = async (emp) => {
    if (!selectedPeriod) return;
    try {
      setLoading(true);
      await saveSalaryRecord({
        employeeId: emp.employeeId,
        startDate: selectedPeriod.startDate,
        endDate: selectedPeriod.endDate,
        totalSales: emp.totalSales,
        totalTips: emp.totalTips,
        commission: emp.commission,
        tipCredit: emp.tipCredit,
        cleanFee: emp.cleanFee,
        totalPay: emp.totalPay,
        bonusAmount: emp.cash ?? emp.bonusDue ?? 0,
        checkDue: emp.check ?? emp.checkDue,
        notes: emp.note || '',
        ownerProfit: emp.profit,
      });
      Alert.alert('Saved', `${emp.name} salary saved.`);
      await loadPeriod(selectedPeriod);
    } catch (err) {
      Alert.alert('Error', errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintOne = async (emp) => {
    try {
      await printEmployeeSalary(emp, selectedPeriod?.label || '');
    } catch (err) {
      Alert.alert('Print', errMsg(err));
    }
  };

  const { widths: W, tableW } = useMemo(
    () => scaledColumnWidths(windowWidth),
    [windowWidth]
  );

  const employees = salaryData?.employees || [];
  const totals = salaryData?.totals;

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
      <View style={[styles.tableTopHeader, { paddingTop: padTop }]}>
        <TouchableOpacity
          onPress={() => {
            setScreen('periods');
            setSalaryData(null);
            setSelectedPeriod(null);
          }}
          hitSlop={12}
          style={styles.backLinkRow}
        >
          <Text style={styles.backChevronSm}>‹</Text>
          <Text style={styles.backLinkText}>Pick A Date Range</Text>
        </TouchableOpacity>
        <Text style={styles.periodCenterTitle}>{selectedPeriod?.label}</Text>
        <View style={{ width: 160 }} />
      </View>

      {loading && !salaryData ? (
        <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 48 }} />
      ) : (
        <>
          <SalaryShopSummaryBar summary={salaryData?.shopSummary} />
          <ScrollView
          horizontal
          style={styles.tableHScroll}
          contentContainerStyle={[styles.tableHContent, { minWidth: windowWidth }]}
          showsHorizontalScrollIndicator={tableW > windowWidth}
          nestedScrollEnabled
        >
          <View style={{ width: tableW }}>
            <ScrollView
              style={styles.tableVScroll}
              contentContainerStyle={styles.tableVContent}
              nestedScrollEnabled
            >
              <View style={[styles.tableHeaderRow, { width: tableW }]}>
                <Th w={W.name}>Name</Th>
                <Th w={W.splitTO}>T/C</Th>
                <Th w={W.bonusChk}>C/C</Th>
                <Th w={W.sales}>Total Sales</Th>
                <Th w={W.tips}>Total Tip</Th>
                <Th w={W.commission}>Commission</Th>
                <Th w={W.tipCr}>Tip Credit</Th>
                <Th w={W.clean}>Clean fee</Th>
                <Th w={W.pay}>Total Pay</Th>
                <Th w={W.cash}>Cash</Th>
                <Th w={W.check}>Check</Th>
                <Th w={W.profit}>
                  Profit{'\n'}(chủ)
                </Th>
                <Th w={W.actions} last>
                  {' '}
                </Th>
              </View>

              {employees.map((emp, i) => (
                <View
                  key={emp.employeeId}
                  style={[
                    styles.dataRow,
                    { width: tableW },
                    i % 2 === 0 ? styles.rowEven : styles.rowOdd,
                  ]}
                >
                  <Td w={W.name} left bold>
                    {emp.name}
                  </Td>
                  <Td w={W.splitTO} small>
                    {emp.commSplitLabel || '—'}
                  </Td>
                  <Td w={W.bonusChk} small>
                    {typeof emp.bonusCheck === 'string' ? emp.bonusCheck : String(emp.bonusCheck ?? '—')}
                  </Td>
                  <Td w={W.sales} green>
                    ${Number(emp.totalSales || 0).toFixed(2)}
                  </Td>
                  <Td w={W.tips} orange>
                    ${Number(emp.totalTips || 0).toFixed(2)}
                  </Td>
                  <Td w={W.commission} green>
                    ${Number(emp.commission || 0).toFixed(2)}
                  </Td>
                  <Td w={W.tipCr} red>
                    (${Number(emp.tipCredit || 0).toFixed(2)})
                  </Td>
                  <Td w={W.clean} red>
                    (${Number(emp.cleanFee || 0).toFixed(2)})
                  </Td>
                  <Td w={W.pay} bold>
                    ${Number(emp.totalPay || 0).toFixed(2)}
                  </Td>
                  <Td w={W.cash} green>
                    ${Number(emp.cash ?? emp.bonusDue ?? 0).toFixed(2)}
                  </Td>
                  <Td w={W.check} bold>
                    ${Number(emp.check ?? emp.checkDue ?? 0).toFixed(2)}
                  </Td>
                  <Td w={W.profit} green>
                    ${Number(emp.profit || 0).toFixed(2)}
                  </Td>
                  <View style={[styles.actionCell, { width: W.actions }]}>
                    <Pressable onPress={() => handlePrintOne(emp)}>
                      <Text style={styles.actionPrint}>Print</Text>
                    </Pressable>
                    <Pressable onPress={() => openEdit(emp)}>
                      <Text style={styles.actionEdit}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => handleSaveRow(emp)}>
                      <Text style={styles.actionSave}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              {totals ? (
                <View style={[styles.totalRow, { width: tableW }]}>
                  <Td w={W.name} white left bold>
                    TOTAL
                  </Td>
                  <Td w={W.splitTO} white>
                    {' '}
                  </Td>
                  <Td w={W.bonusChk} white>
                    {' '}
                  </Td>
                  <Td w={W.sales} white>
                    ${Number(totals.totalSales || 0).toFixed(2)}
                  </Td>
                  <Td w={W.tips} white>
                    ${Number(totals.totalTips || 0).toFixed(2)}
                  </Td>
                  <Td w={W.commission} white>
                    ${Number(totals.commission || 0).toFixed(2)}
                  </Td>
                  <Td w={W.tipCr} white>
                    (${Number(totals.tipCredit || 0).toFixed(2)})
                  </Td>
                  <Td w={W.clean} white red>
                    (${Number(totals.cleanFee || 0).toFixed(2)})
                  </Td>
                  <Td w={W.pay} white bold>
                    ${Number(totals.totalPay || 0).toFixed(2)}
                  </Td>
                  <Td w={W.cash} white>
                    ${Number(totals.cash ?? totals.bonusDue ?? 0).toFixed(2)}
                  </Td>
                  <Td w={W.check} white bold>
                    ${Number(totals.check ?? totals.checkDue ?? 0).toFixed(2)}
                  </Td>
                  <Td w={W.profit} white>
                    ${Number(totals.profit || 0).toFixed(2)}
                  </Td>
                  <View style={{ width: W.actions }} />
                </View>
              ) : null}
            </ScrollView>
          </View>
        </ScrollView>
        </>
      )}

      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              EDIT SALARY FOR {(editEmployee?.name || '').toUpperCase()}
            </Text>

            <View style={styles.modalFields}>
              <View style={styles.modalFieldStack}>
                <Text style={styles.modalLabelTop}>Cash</Text>
                <TextInput
                  value={editBonus}
                  onChangeText={setEditBonus}
                  keyboardType="decimal-pad"
                  style={styles.modalInputFull}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.modalFieldStack}>
                <Text style={styles.modalLabelTop}>Check</Text>
                <TextInput
                  value={editCheck}
                  onChangeText={setEditCheck}
                  keyboardType="decimal-pad"
                  style={styles.modalInputFull}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.modalFieldStack}>
                <Text style={styles.modalLabelTop}>Note</Text>
                <TextInput
                  value={editNote}
                  onChangeText={setEditNote}
                  multiline
                  style={[styles.modalInputFull, styles.modalInputMultiline]}
                  placeholder="Optional"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setEditModal(false)}
                style={[styles.modalBtn, styles.modalBtnHalf, { backgroundColor: '#7B1FA2' }]}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={[styles.modalBtn, styles.modalBtnHalf, { backgroundColor: '#E53935' }]}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnText}>DONE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Th({ w, children, last }) {
  return (
    <Text
      style={[
        styles.th,
        { width: w },
        last && { borderRightWidth: 0 },
      ]}
      numberOfLines={2}
    >
      {children}
    </Text>
  );
}

function Td({ w, children, left, bold, green, orange, red, white, small }) {
  return (
    <Text
      style={[
        styles.td,
        { width: w },
        small && styles.tdSmall,
        left && styles.tdLeft,
        bold && styles.tdBold,
        green && styles.tdGreen,
        orange && styles.tdOrange,
        red && styles.tdRed,
        white && styles.tdWhite,
      ]}
      numberOfLines={2}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', backgroundColor: '#f0f0f0' },
  tableHScroll: { flex: 1, width: '100%', alignSelf: 'stretch' },
  tableHContent: { flexGrow: 1 },
  tableVScroll: { flex: 1 },
  tableVContent: { flexGrow: 1, paddingBottom: 16 },
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

  tableTopHeader: {
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

  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: TABLE_HEADER,
    paddingVertical: 10,
    alignItems: 'center',
  },
  th: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 2,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
  },
  dataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowEven: { backgroundColor: '#fff' },
  rowOdd: { backgroundColor: '#f4f4f4' },
  td: {
    fontSize: 10,
    textAlign: 'right',
    paddingHorizontal: 4,
    color: '#111',
  },
  tdSmall: { fontSize: 8, textAlign: 'center' },
  tdLeft: { textAlign: 'left' },
  tdBold: { fontWeight: '800' },
  tdGreen: { color: '#1B5E20', fontWeight: '700' },
  tdOrange: { color: '#E65100', fontWeight: '700' },
  tdRed: { color: '#B71C1C', fontWeight: '700' },
  tdWhite: { color: '#fff' },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: TOTAL_GREEN,
  },
  actionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  actionPrint: { color: '#1565C0', fontSize: 11, fontWeight: '700' },
  actionEdit: { color: '#1565C0', fontSize: 11, fontWeight: '700' },
  actionSave: { color: '#E53935', fontSize: 11, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  modalCard: {
    backgroundColor: '#2a2a2a',
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  modalFields: { gap: 16, marginBottom: 20 },
  modalFieldStack: { gap: 6 },
  modalLabelTop: { color: '#b0b0b0', fontSize: 12, fontWeight: '700' },
  modalInputFull: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111',
  },
  modalInputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnHalf: {
    flex: 1,
    minHeight: 48,
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
