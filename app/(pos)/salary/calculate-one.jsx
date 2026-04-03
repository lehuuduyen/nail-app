import { useCallback, useEffect, useMemo, useState } from 'react';
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
  fetchEmployeesList,
  generateWeeklyPeriods,
  printSalaryStatement,
  saveSalaryRecord,
  updateEmployee,
  updateSalaryRecord,
} from '../../../services/salaryService';

const RED_CARD = '#C62828';
const SUBMIT_RED = '#D32F2F';

function num(v, d = 0) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : d;
}

function errMsg(e) {
  return e?.response?.data?.error || e?.message || 'Request failed';
}

function empCardLabel(e) {
  const name = String(e.firstName || '')
    .trim()
    .toUpperCase();
  const ord = e.listOrder != null && e.listOrder !== '' ? e.listOrder : e.id;
  return `${name || '—'}-${ord}`;
}

function sortEmployeesForCards(list) {
  return [...(list || [])].sort((a, b) => {
    const la = a.listOrder != null && a.listOrder !== '' ? Number(a.listOrder) : 9999;
    const lb = b.listOrder != null && b.listOrder !== '' ? Number(b.listOrder) : 9999;
    if (la !== lb) return la - lb;
    return `${a.firstName || ''}`.localeCompare(`${b.firstName || ''}`);
  });
}

function tipPayInLabel(cashPortionPct) {
  const c = num(cashPortionPct, 50);
  if (c <= 0) return 'CHECK';
  if (c >= 100) return 'CASH';
  return 'MIX';
}

function fmtBonusCheckFromCashPct(cashPct) {
  const c = Math.min(100, Math.max(0, Math.round(num(cashPct, 50))));
  return `${c / 10} - ${(100 - c) / 10}`;
}

/** draft | approved | paid */
function normalizePayrollStatus(s) {
  const v = String(s ?? 'draft')
    .trim()
    .toLowerCase();
  if (v === 'paid' || v === 'approved' || v === 'draft') return v;
  return 'draft';
}

function isPaidPayrollStatus(s) {
  return normalizePayrollStatus(s) === 'paid';
}

export default function CalculateOneSalary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 720;

  const periods = useMemo(() => generateWeeklyPeriods(52), []);
  const [step, setStep] = useState('pick');
  const [showInactive, setShowInactive] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [pickedEmployee, setPickedEmployee] = useState(null);

  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [draftTipCredit, setDraftTipCredit] = useState('0');
  const [draftBonus, setDraftBonus] = useState('0');
  const [draftCheck, setDraftCheck] = useState('0');
  const [totalPayTouched, setTotalPayTouched] = useState(false);

  const [commModal, setCommModal] = useState(false);
  const [minPayModal, setMinPayModal] = useState(false);
  const [tipPayModal, setTipPayModal] = useState(false);
  const [commTech, setCommTech] = useState('60');
  const [commOwner, setCommOwner] = useState('40');
  const [minPayDraft, setMinPayDraft] = useState('0');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchEmployeesList();
        if (!cancelled) setEmployees(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setEmployees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const list = employees.filter((e) => (showInactive ? e.isActive === false : e.isActive !== false));
    return sortEmployeesForCards(list);
  }, [employees, showInactive]);

  const empRow = salaryData?.employees?.[0];

  const loadPeriod = useCallback(async (period, emp, opts = {}) => {
    const { resetTouched = true } = opts;
    if (!period || !emp?.id) return null;
    setLoading(true);
    if (resetTouched) setTotalPayTouched(false);
    try {
      const data = await calculateSalary(period.startDate, period.endDate, emp.id);
      setSalaryData(data);
      return data;
    } catch (err) {
      Alert.alert('Error', errMsg(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!salaryData || loading || !empRow) return;
    setDraftTipCredit(String(num(empRow.tipCredit)));
    setDraftBonus(String(num(empRow.cash ?? empRow.bonusDue)));
    setDraftCheck(String(num(empRow.check ?? empRow.checkDue)));
  }, [salaryData, loading, empRow?.employeeId, empRow?.payrollId]);

  useEffect(() => {
    if (!pickedEmployee) return;
    setCommTech(String(num(pickedEmployee.commissionTechPct, 60)));
    setCommOwner(String(num(pickedEmployee.commissionOwnerPct, 40)));
    setMinPayDraft(String(num(pickedEmployee.minimumPay)));
  }, [pickedEmployee?.id, pickedEmployee?.commissionTechPct, pickedEmployee?.minimumPay]);

  const baseNetLive = useMemo(() => {
    if (!empRow) return 0;
    return (
      num(empRow.commission) + num(empRow.totalTips) - num(draftTipCredit) - num(empRow.cleanFee)
    );
  }, [empRow, draftTipCredit]);

  const displayTotalPay = useMemo(() => {
    if (!empRow || !pickedEmployee) return 0;
    const minP = num(pickedEmployee.minimumPay);
    const recomputed = Math.max(baseNetLive, minP);
    if (totalPayTouched) return recomputed;
    return num(empRow.totalPay);
  }, [empRow, pickedEmployee, baseNetLive, totalPayTouched]);

  const onTipCreditChange = (t) => {
    setDraftTipCredit(t);
    setTotalPayTouched(true);
  };

  const pickEmployee = (emp) => {
    setPickedEmployee(emp);
    setStep('calc');
    setSelectedPeriod(null);
    setSalaryData(null);
  };

  const openCommModal = () => {
    if (!pickedEmployee) return;
    setCommTech(String(num(pickedEmployee.commissionTechPct, 60)));
    setCommOwner(String(num(pickedEmployee.commissionOwnerPct, 40)));
    setCommModal(true);
  };

  const saveCommModal = async () => {
    if (!pickedEmployee) return;
    const t = Math.min(100, Math.max(0, Math.round(num(commTech, 0))));
    const o = Math.min(100, Math.max(0, Math.round(num(commOwner, 0))));
    try {
      setLoading(true);
      const updated = await updateEmployee(pickedEmployee.id, {
        commissionTechPct: t,
        commissionOwnerPct: o,
      });
      const next = { ...pickedEmployee, ...updated };
      setPickedEmployee(next);
      setCommModal(false);
      if (selectedPeriod) await loadPeriod(selectedPeriod, next);
    } catch (e) {
      Alert.alert('Error', errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const saveMinPayModal = async () => {
    if (!pickedEmployee) return;
    const m = Math.max(0, num(minPayDraft));
    try {
      setLoading(true);
      const updated = await updateEmployee(pickedEmployee.id, { minimumPay: m });
      const next = { ...pickedEmployee, ...updated };
      setPickedEmployee(next);
      setMinPayModal(false);
      if (selectedPeriod) await loadPeriod(selectedPeriod, next);
    } catch (e) {
      Alert.alert('Error', errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const saveTipPayModal = async (cashPct) => {
    if (!pickedEmployee) return;
    try {
      setLoading(true);
      const updated = await updateEmployee(pickedEmployee.id, { cashPortionPct: cashPct });
      const next = { ...pickedEmployee, ...updated };
      setPickedEmployee(next);
      setTipPayModal(false);
      if (selectedPeriod) await loadPeriod(selectedPeriod, next);
    } catch (e) {
      Alert.alert('Error', errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePaidOut = async () => {
    if (!empRow || !pickedEmployee || !selectedPeriod) return;
    const pid = Number(empRow.payrollId);
    if (!Number.isFinite(pid) || pid <= 0) {
      Alert.alert(
        'Chưa lưu',
        'Bấm SUBMIT để lưu bảng lương kỳ này trước, rồi mới đánh dấu đã thanh toán.'
      );
      return;
    }
    const paidNow = isPaidPayrollStatus(empRow.payrollStatus);
    const next = paidNow ? 'draft' : 'paid';
    try {
      setLoading(true);
      const res = await updateSalaryRecord(pid, { status: next });
      const st = res?.payroll?.status ?? res?.payroll?.dataValues?.status;
      if (st != null) {
        const normalized = normalizePayrollStatus(st);
        setSalaryData((prev) => {
          if (!prev?.employees?.[0]) return prev;
          const em = prev.employees[0];
          if (Number(em.payrollId) !== pid) return prev;
          return {
            ...prev,
            employees: [{ ...em, payrollStatus: normalized }],
          };
        });
      } else {
        await loadPeriod(selectedPeriod, pickedEmployee, { resetTouched: false });
      }
    } catch (e) {
      Alert.alert('Error', errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!empRow || !pickedEmployee || !selectedPeriod) {
      Alert.alert('Submit', 'Chọn tuần và đợi dữ liệu tải xong.');
      return;
    }
    const tc = num(draftTipCredit);
    const cf = num(empRow.cleanFee);
    const comm = num(empRow.commission);
    const tips = num(empRow.totalTips);
    const baseNet = comm + tips - tc - cf;
    const totalPaySubmit = displayTotalPay;
    const subsidy = Math.max(0, totalPaySubmit - baseNet);
    const profit = num(empRow.ownerSplitGross) - subsidy + Math.max(0, num(empRow.cleanFee));
    const b = num(draftBonus);
    const c = num(draftCheck);

    try {
      setLoading(true);
      if (empRow.payrollId) {
        await updateSalaryRecord(empRow.payrollId, {
          bonusAmount: b,
          checkDue: c,
          totalPay: totalPaySubmit,
          tipCredit: tc,
          ownerProfit: profit,
        });
      } else {
        await saveSalaryRecord({
          employeeId: empRow.employeeId,
          startDate: selectedPeriod.startDate,
          endDate: selectedPeriod.endDate,
          totalSales: empRow.totalSales,
          totalTips: empRow.totalTips,
          commission: empRow.commission,
          tipCredit: tc,
          cleanFee: empRow.cleanFee,
          totalPay: totalPaySubmit,
          bonusAmount: b,
          checkDue: c,
          notes: empRow.note || '',
          ownerProfit: profit,
        });
      }
      setTotalPayTouched(false);
      const fresh = await loadPeriod(selectedPeriod, pickedEmployee);
      const row = fresh?.employees?.[0];
      if (row && pickedEmployee && selectedPeriod) {
        try {
          await printSalaryStatement({
            empRow: row,
            employee: pickedEmployee,
            period: selectedPeriod,
          });
        } catch (printErr) {
          Alert.alert('In', errMsg(printErr));
        }
      }
      Alert.alert('Saved', 'Đã lưu lương kỳ này.');
    } catch (e) {
      Alert.alert('Error', errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const padTop = Math.max(insets.top, 10);

  const paidOut = isPaidPayrollStatus(empRow?.payrollStatus);
  const bonusCheckLabel = pickedEmployee
    ? fmtBonusCheckFromCashPct(pickedEmployee.cashPortionPct)
    : '—';
  const commSplitLabel = empRow?.commSplitLabel || '—';

  /** --- Pick employees (red cards) --- */
  if (step === 'pick') {
    return (
      <View style={[styles.root, { paddingTop: padTop }]}>
        <View style={styles.pickHeader}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={14} style={styles.pickBackRow}>
            <Text style={styles.pickBackChev}>‹</Text>
            <Text style={styles.pickBackText}>Please select an action for Salary</Text>
          </TouchableOpacity>
          <Text style={styles.pickTitle}>SALARY (TRẢ LƯƠNG)</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.cardScrollContent}
          style={styles.cardScroll}
        >
          {filteredEmployees.map((e) => (
            <TouchableOpacity
              key={e.id}
              style={styles.empCard}
              onPress={() => pickEmployee(e)}
              activeOpacity={0.88}
            >
              <Text style={styles.empCardText}>{empCardLabel(e)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredEmployees.length === 0 ? (
          <Text style={styles.emptyList}>
            {showInactive ? 'Không có nhân viên inactive.' : 'Không có nhân viên active.'}
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.inactiveFab}
          onPress={() => setShowInactive((v) => !v)}
          activeOpacity={0.85}
        >
          <Text style={styles.inactiveFabText}>{showInactive ? 'ACTIVE EMPLOYEES' : 'INACTIVE EMPLOYEES'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /** --- Calc: period + detail --- */
  const leftCol = (
    <View style={[styles.leftCol, !isWide && styles.leftColStack]}>
      <Text style={styles.rangeTitle}>Pick A Range</Text>
      <ScrollView style={styles.periodScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {periods.map((p, i) => {
          const sel = selectedPeriod?.startDate === p.startDate;
          return (
            <TouchableOpacity
              key={p.startDate}
              onPress={() => {
                setSelectedPeriod(p);
                loadPeriod(p, pickedEmployee);
              }}
              style={[styles.periodRow, sel && styles.periodRowSel, i > 0 && styles.periodRowBorder]}
            >
              <Text style={[styles.periodText, sel && styles.periodTextSel]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const rightCol = (
    <View style={[styles.rightCol, !isWide && styles.rightColStack]}>
      <Text style={styles.empHero}>{pickedEmployee ? empCardLabel(pickedEmployee) : ''}</Text>

      <View style={styles.configBlock}>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Commission (Ăn chia)</Text>
          <Text style={styles.configValue}>{commSplitLabel}</Text>
          <TouchableOpacity onPress={openCommModal} style={styles.changeBtn}>
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Minimum pay (Bao lương)</Text>
          <Text style={styles.configValue}>${num(pickedEmployee?.minimumPay).toFixed(2)}</Text>
          <TouchableOpacity
            onPress={() => {
              setMinPayDraft(String(num(pickedEmployee?.minimumPay)));
              setMinPayModal(true);
            }}
            style={styles.changeBtn}
          >
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Bonus-Check</Text>
          <Text style={styles.configValue}>{bonusCheckLabel}</Text>
          <TouchableOpacity onPress={() => setTipPayModal(true)} style={styles.changeBtn}>
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!selectedPeriod ? (
        <Text style={styles.hint}>Chọn tuần bên trái để xem lương.</Text>
      ) : loading && !empRow ? (
        <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 24 }} />
      ) : empRow ? (
        <>
          <SalaryShopSummaryBar summary={salaryData?.shopSummary} scope="employee" />

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Đã thanh toán?</Text>
            <Text style={[styles.statusBadge, paidOut ? styles.statusOn : styles.statusOff]}>
              {paidOut ? 'APPLIED' : 'NOT APPLIED'}
            </Text>
            <Pressable
              onPress={handleTogglePaidOut}
              style={({ pressed }) => [styles.changeBtn, pressed && styles.changeBtnPressed]}
              hitSlop={12}
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </Pressable>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Total Sales</Text>
            <Text style={styles.fieldMoney}>${num(empRow.totalSales).toFixed(2)}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Total Tips</Text>
            <Text style={styles.fieldMoney}>${num(empRow.totalTips).toFixed(2)}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Commission</Text>
            <Text style={styles.fieldMoney}>${num(empRow.commission).toFixed(2)}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tip Credit</Text>
            <TextInput
              value={draftTipCredit}
              onChangeText={onTipCreditChange}
              keyboardType="decimal-pad"
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Total Pay</Text>
            <Text style={styles.fieldMoneyBold}>${displayTotalPay.toFixed(2)}</Text>
          </View>

          <View style={styles.configRow}>
            <Text style={styles.fieldLabel}>Tip Pay In?</Text>
            <Text style={styles.configValue}>{tipPayInLabel(pickedEmployee?.cashPortionPct)}</Text>
            <TouchableOpacity onPress={() => setTipPayModal(true)} style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Bonus (cash)</Text>
            <TextInput
              value={draftBonus}
              onChangeText={setDraftBonus}
              keyboardType="decimal-pad"
              style={styles.fieldInput}
            />
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Check</Text>
            <TextInput
              value={draftCheck}
              onChangeText={setDraftCheck}
              keyboardType="decimal-pad"
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.9}>
              <Text style={styles.submitBtnText}>SUBMIT</Text>
            </TouchableOpacity>
            <Pressable
              style={styles.printLink}
              onPress={() =>
                printSalaryStatement({
                  empRow: {
                    ...empRow,
                    cash: num(draftBonus),
                    check: num(draftCheck),
                    bonusDue: num(draftBonus),
                    checkDue: num(draftCheck),
                    totalPay: displayTotalPay,
                    tipCredit: num(draftTipCredit),
                  },
                  employee: pickedEmployee,
                  period: selectedPeriod,
                }).catch((e) => Alert.alert('Print', errMsg(e)))
              }
            >
              <Text style={styles.printLinkText}>Print</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: padTop }]}>
      <View style={styles.calcTopBar}>
        <TouchableOpacity
          onPress={() => {
            setStep('pick');
            setSelectedPeriod(null);
            setSalaryData(null);
          }}
          hitSlop={12}
          style={styles.calcBackRow}
        >
          <Text style={styles.pickBackChev}>‹</Text>
          <Text style={styles.calcBackText}>Employees</Text>
        </TouchableOpacity>
        <Text style={styles.calcTitle}>SALARY (TRẢ LƯƠNG)</Text>
        <View style={{ width: 88 }} />
      </View>

      <View style={[styles.twoCol, !isWide && styles.twoColStack]}>
        {leftCol}
        {rightCol}
      </View>

      <Modal visible={commModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ăn chia (thợ — chủ %)</Text>
            <Text style={styles.modalHint}>Tổng 100 ví dụ: 60 + 40 = 6-4</Text>
            <Text style={styles.modalLabel}>Tech %</Text>
            <TextInput
              value={commTech}
              onChangeText={setCommTech}
              keyboardType="number-pad"
              style={styles.modalInput}
            />
            <Text style={styles.modalLabel}>Owner %</Text>
            <TextInput
              value={commOwner}
              onChangeText={setCommOwner}
              keyboardType="number-pad"
              style={styles.modalInput}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setCommModal(false)}>
                <Text style={styles.modalBtnTextDark}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalOk]} onPress={saveCommModal}>
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={minPayModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bao lương (minimum pay)</Text>
            <TextInput
              value={minPayDraft}
              onChangeText={setMinPayDraft}
              keyboardType="decimal-pad"
              style={styles.modalInput}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setMinPayModal(false)}>
                <Text style={styles.modalBtnTextDark}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalOk]} onPress={saveMinPayModal}>
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={tipPayModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tip pay in (cash / check)</Text>
            <Text style={styles.modalHint}>Chia lương ròng: cash vs check</Text>
            <TouchableOpacity style={styles.choiceRow} onPress={() => saveTipPayModal(100)}>
              <Text style={styles.choiceText}>CASH (100% cash)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.choiceRow} onPress={() => saveTipPayModal(50)}>
              <Text style={styles.choiceText}>50 — 50</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.choiceRow} onPress={() => saveTipPayModal(0)}>
              <Text style={styles.choiceText}>CHECK (100% check)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseOnly} onPress={() => setTipPayModal(false)}>
              <Text style={styles.modalBtnTextDark}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e0e0e0' },
  pickHeader: { paddingHorizontal: 12, paddingBottom: 8 },
  pickBackRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  pickBackChev: { fontSize: 28, color: '#222', fontWeight: '300' },
  pickBackText: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
  pickTitle: { fontSize: 20, fontWeight: '900', color: '#111', textAlign: 'center' },
  cardScroll: { flexGrow: 0, maxHeight: 220, marginTop: 16 },
  cardScrollContent: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'stretch', gap: 0 },
  empCard: {
    width: 128,
    minHeight: 168,
    marginRight: 12,
    backgroundColor: RED_CARD,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  empCardText: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyList: { textAlign: 'center', marginTop: 24, color: '#666', fontSize: 15 },
  inactiveFab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: '#424242',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  inactiveFabText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  calcTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#bbb',
    backgroundColor: '#e8e8e8',
  },
  calcBackRow: { flexDirection: 'row', alignItems: 'center', width: 120, gap: 4 },
  calcBackText: { fontSize: 14, fontWeight: '700', color: '#222' },
  calcTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '900', color: '#111' },

  twoCol: { flex: 1, flexDirection: 'row' },
  twoColStack: { flexDirection: 'column' },
  leftCol: {
    width: '36%',
    maxWidth: 320,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#bbb',
    backgroundColor: '#ececec',
  },
  leftColStack: { width: '100%', maxWidth: '100%', borderRightWidth: 0, maxHeight: 200, borderBottomWidth: 1, borderBottomColor: '#bbb' },
  rangeTitle: { fontSize: 16, fontWeight: '800', padding: 12, color: '#111' },
  periodScroll: { flex: 1 },
  periodRow: { paddingVertical: 16, paddingHorizontal: 12, backgroundColor: '#f5f5f5' },
  periodRowSel: { backgroundColor: '#BBDEFB' },
  periodRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ccc' },
  periodText: { fontSize: 14, fontWeight: '600', color: '#333' },
  periodTextSel: { color: '#0D47A1', fontWeight: '800' },

  rightCol: { flex: 1, paddingHorizontal: 14, paddingBottom: 24 },
  rightColStack: { flex: 1, minHeight: 400 },
  empHero: { fontSize: 22, fontWeight: '900', color: '#111', marginTop: 8, marginBottom: 12 },
  configBlock: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 12 },
  configRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8, gap: 8 },
  configLabel: { flex: 1, minWidth: 140, fontSize: 13, fontWeight: '700', color: '#444' },
  configValue: { fontSize: 14, fontWeight: '800', color: '#111' },
  changeBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#1976D2', borderRadius: 4 },
  changeBtnPressed: { opacity: 0.85 },
  changeBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  hint: { marginTop: 20, fontSize: 15, color: '#666', fontStyle: 'italic' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  statusLabel: { fontSize: 14, fontWeight: '700', color: '#333' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, overflow: 'hidden', fontWeight: '900', fontSize: 12 },
  statusOn: { backgroundColor: '#C8E6C9', color: '#1B5E20' },
  statusOff: { backgroundColor: '#FFCDD2', color: '#B71C1C' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1 },
  fieldMoney: { fontSize: 16, fontWeight: '700', color: '#1B5E20' },
  fieldMoneyBold: { fontSize: 17, fontWeight: '900', color: '#111' },
  fieldInput: {
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlign: 'right',
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 20 },
  submitBtn: {
    flex: 1,
    backgroundColor: SUBMIT_RED,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  printLink: { padding: 12 },
  printLinkText: { color: '#1565C0', fontWeight: '800', fontSize: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18 },
  modalTitle: { fontSize: 17, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  modalHint: { fontSize: 12, color: '#666', marginBottom: 12, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4, color: '#555' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  modalCancel: { backgroundColor: '#eee' },
  modalOk: { backgroundColor: '#1565C0' },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalBtnTextDark: { color: '#333', fontWeight: '800', fontSize: 15 },
  choiceRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  choiceText: { fontSize: 16, fontWeight: '700', textAlign: 'center', color: '#1565C0' },
  modalCloseOnly: { marginTop: 12, alignItems: 'center', padding: 12 },
});
