import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../../api/client';
import {
  CASH_CHECK_PICKS,
  COMMISSION_PICKS,
  MINIMUM_PAY_OPTIONS,
  formatCommissionLabel,
} from '../../../constants/employeePayOptions';
import { getApiErrorMessage } from '../../../utils/apiError';

export default function AddEmployeeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickName, setNickName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [listOrder, setListOrder] = useState('');
  const [tips, setTips] = useState(true);
  const [commissionTechPct, setCommissionTechPct] = useState(6);
  const [commissionOwnerPct, setCommissionOwnerPct] = useState(4);
  const [cashPortionPct, setCashPortionPct] = useState(50);
  const [minAmount, setMinAmount] = useState(0);
  const [minIsOther, setMinIsOther] = useState(false);
  const [minOther, setMinOther] = useState('');
  const [customTech, setCustomTech] = useState('');
  const [customOwner, setCustomOwner] = useState('');

  const pickCommission = (tech, owner) => {
    setCommissionTechPct(tech);
    setCommissionOwnerPct(owner);
  };

  const submit = async () => {
    const fn = firstName.trim() || 'Staff';
    const ln = (lastName || nickName || '—').trim();
    let tech = commissionTechPct;
    let owner = commissionOwnerPct;
    if (customTech !== '' || customOwner !== '') {
      const t = parseFloat(customTech);
      const o = parseFloat(customOwner);
      if (Number.isFinite(t) && Number.isFinite(o) && t + o > 0) {
        tech = Math.round(t * 10);
        owner = Math.round(o * 10);
      }
    }

    const min = minIsOther ? parseFloat(minOther) || 0 : Number(minAmount) || 0;

    const body = {
      firstName: fn,
      lastName: ln,
      nickName: nickName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      payType: 'commission',
      tipsEnabled: tips,
      commissionRate: null,
      hourlyRate: null,
      baseSalary: null,
      commissionTechPct: tech,
      commissionOwnerPct: owner,
      cashPortionPct,
      minimumPay: min,
      listOrder: listOrder.trim() ? parseInt(listOrder, 10) : null,
      isActive: true,
    };

    setSaving(true);
    try {
      await api.post('/api/employees', body);
      Alert.alert('Đã lưu', 'Đã thêm nhân viên.');
      router.back();
    } catch (e) {
      Alert.alert('Lỗi', getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const padTop = Math.max(insets.top, 10);

  return (
    <View style={[styles.root, { paddingTop: padTop }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={26} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>ADD NEW EMPLOYEE</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.section}>Thông tin</Text>
        <Field label="First name *" value={firstName} onChangeText={setFirstName} />
        <Field label="Last name" value={lastName} onChangeText={setLastName} />
        <Field label="Nick name" value={nickName} onChangeText={setNickName} />
        <Field label="Số hiển thị (vd 5 trong CHAU-5)" value={listOrder} onChangeText={setListOrder} keyboardType="number-pad" />
        <Field label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Nhận tip</Text>
          <Switch value={tips} onValueChange={setTips} />
        </View>

        <Text style={styles.section}>EMPLOYEE–OWNER COMMISSION (ĂN CHIA THỢ – CHỦ)</Text>
        <Text style={styles.sub}>
          Đang chọn: {formatCommissionLabel(commissionTechPct, commissionOwnerPct)}
        </Text>
        {COMMISSION_PICKS.map((p) => {
          const on =
            p.tech === commissionTechPct && p.owner === commissionOwnerPct;
          return (
            <Pressable
              key={p.label}
              style={[styles.pickRow, on && styles.pickRowOn]}
              onPress={() => pickCommission(p.tech, p.owner)}
            >
              <Text style={styles.pickText}>{p.label}</Text>
            </Pressable>
          );
        })}
        <Text style={styles.mini}>Khác (nhập tỉ lệ dạng 6 và 4):</Text>
        <View style={styles.row2}>
          <TextInput
            style={styles.inputHalf}
            placeholder="Thợ"
            value={customTech}
            onChangeText={setCustomTech}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={styles.inputHalf}
            placeholder="Chủ"
            value={customOwner}
            onChangeText={setCustomOwner}
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={styles.section}>CASH–CHECK % (CHIA CASH – CHECK)</Text>
        {CASH_CHECK_PICKS.map((p) => {
          const on = p.cashPct === cashPortionPct;
          return (
            <Pressable
              key={p.label}
              style={[styles.pickRow, on && styles.pickRowOn]}
              onPress={() => setCashPortionPct(p.cashPct)}
            >
              <Text style={styles.pickText}>{p.label}</Text>
            </Pressable>
          );
        })}

        <Text style={styles.section}>MINIMUM PAY (BAO LƯƠNG)</Text>
        {MINIMUM_PAY_OPTIONS.map((m) => {
          const on = !minIsOther && minAmount === m;
          return (
            <Pressable
              key={String(m)}
              style={[styles.pickRow, on && styles.pickRowOn]}
              onPress={() => {
                setMinIsOther(false);
                setMinAmount(m);
                setMinOther('');
              }}
            >
              <Text style={styles.pickText}>{m === 0 ? '$0' : `$${m}`}</Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.pickRow, minIsOther && styles.pickRowOn]}
          onPress={() => setMinIsOther(true)}
        >
          <Text style={styles.pickText}>$Other</Text>
        </Pressable>
        {minIsOther ? (
          <Field label="Số tiền bao lương" value={minOther} onChangeText={setMinOther} keyboardType="decimal-pad" />
        ) : null}

        <Pressable
          style={[styles.submit, saving && { opacity: 0.6 }]}
          onPress={submit}
          disabled={saving}
        >
          <Text style={styles.submitText}>{saving ? 'Đang lưu…' : 'SUBMIT'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#999"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', backgroundColor: '#f0f0f0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  headerTitle: { fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'center' },
  scroll: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 8,
    color: '#111',
  },
  sub: { fontSize: 12, color: '#444', marginBottom: 8 },
  mini: { fontSize: 11, color: '#666', marginTop: 8, marginBottom: 4 },
  label: { fontSize: 11, color: '#555', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputHalf: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginRight: 8,
  },
  row2: { flexDirection: 'row', marginBottom: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  pickRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#bbb',
    backgroundColor: '#fafafa',
  },
  pickRowOn: { backgroundColor: '#e3f2fd' },
  pickText: { fontSize: 16, fontWeight: '600' },
  submit: {
    marginTop: 28,
    alignSelf: 'flex-end',
    borderWidth: 2,
    borderColor: '#111',
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  submitText: { fontWeight: '800', fontSize: 15 },
});
