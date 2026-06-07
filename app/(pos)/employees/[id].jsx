import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useAuthStore } from '../../../store/authStore';

let ImagePicker = null;
try { ImagePicker = require('expo-image-picker'); } catch { /* needs eas build */ }

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';
import {
  CASH_CHECK_PICKS,
  COMMISSION_PICKS,
  MINIMUM_PAY_OPTIONS,
  formatCommissionLabel,
} from '../../../constants/employeePayOptions';
import { getApiErrorMessage } from '../../../utils/apiError';

export default function EditEmployeeScreen() {
  const { id: idParam } = useLocalSearchParams();
  const id = String(idParam);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickName, setNickName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [listOrder, setListOrder] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [tips, setTips] = useState(true);
  const [commissionTechPct, setCommissionTechPct] = useState(100);
  const [commissionOwnerPct, setCommissionOwnerPct] = useState(0);
  const [cashPortionPct, setCashPortionPct] = useState(50);
  const [minAmount, setMinAmount] = useState(0);
  const [minIsOther, setMinIsOther] = useState(false);
  const [minOther, setMinOther] = useState('');
  const [customTech, setCustomTech] = useState('');
  const [customOwner, setCustomOwner] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/employees/${id}`);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setNickName(data.nickName || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setListOrder(data.listOrder != null ? String(data.listOrder) : '');
      setIsActive(data.isActive !== false);
      setAvatarUrl(data.avatarUrl || null);
      setTips(data.tipsEnabled !== false);
      setCommissionTechPct(
        data.commissionTechPct != null ? Number(data.commissionTechPct) : 100
      );
      setCommissionOwnerPct(
        data.commissionOwnerPct != null ? Number(data.commissionOwnerPct) : 0
      );
      setCashPortionPct(
        data.cashPortionPct != null ? Number(data.cashPortionPct) : 50
      );
      const mp = Number(data.minimumPay) || 0;
      if (MINIMUM_PAY_OPTIONS.includes(mp)) {
        setMinAmount(mp);
        setMinIsOther(false);
      } else {
        setMinIsOther(true);
        setMinOther(String(mp));
        setMinAmount(0);
      }
    } catch (e) {
      Alert.alert('Lỗi', getApiErrorMessage(e));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const pickPhoto = async () => {
    if (!ImagePicker) {
      Alert.alert('Cần EAS Build', 'Tính năng upload ảnh cần rebuild app. Chạy: eas build --platform ios');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần cho phép truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPendingPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async () => {
    if (!pendingPhoto) return;
    setUploadingPhoto(true);
    try {
      const uri = pendingPhoto.uri;
      const filename = uri.split('/').pop();
      const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
      const formData = new FormData();
      formData.append('avatar', { uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      const token = useAuthStore.getState().token;
      const res = await fetch(`${API_URL}/api/employees/${id}/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      setAvatarUrl(json.avatarUrl);
      setPendingPhoto(null);
    } catch (e) {
      Alert.alert('Lỗi', `Không upload được ảnh: ${e?.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickCommission = (tech, owner) => {
    setCommissionTechPct(tech);
    setCommissionOwnerPct(owner);
  };

  const submit = async () => {
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
      firstName: firstName.trim() || 'Staff',
      lastName: (lastName || nickName || '—').trim(),
      nickName: nickName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      isActive,
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
    };

    setSaving(true);
    try {
      await api.put(`/api/employees/${id}`, body);
      if (pendingPhoto) await uploadPhoto();
      Alert.alert('Đã lưu', 'Cập nhật nhân viên.');
      router.back();
    } catch (e) {
      Alert.alert('Lỗi', getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const padTop = Math.max(insets.top, 10);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: padTop, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: padTop }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={26} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>EMPLOYEE DETAIL</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Pressable onPress={pickPhoto} style={{ position: 'relative' }}>
            {pendingPhoto?.uri || avatarUrl ? (
              <Image
                source={{ uri: pendingPhoto?.uri || avatarUrl }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
              />
            ) : (
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="person" size={44} color="#9ca3af" />
              </View>
            )}
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#0066CC', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
              {uploadingPhoto
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </Pressable>
          {pendingPhoto && !uploadingPhoto && (
            <Text style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>Ảnh sẽ upload khi bấm LƯU</Text>
          )}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Đang làm việc</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        <Text style={styles.section}>Thông tin</Text>
        <Field label="First name *" value={firstName} onChangeText={setFirstName} />
        <Field label="Last name" value={lastName} onChangeText={setLastName} />
        <Field label="Nick name" value={nickName} onChangeText={setNickName} />
        <Field label="Số hiển thị" value={listOrder} onChangeText={setListOrder} keyboardType="number-pad" />
        <Field label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Nhận tip</Text>
          <Switch value={tips} onValueChange={setTips} />
        </View>

        <Text style={styles.section}>COMMISSION THỢ – CHỦ</Text>
        <Text style={styles.sub}>
          {formatCommissionLabel(commissionTechPct, commissionOwnerPct)}
        </Text>
        {COMMISSION_PICKS.map((p) => {
          const on = p.tech === commissionTechPct && p.owner === commissionOwnerPct;
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
        <Text style={styles.mini}>Khác (thợ / chủ):</Text>
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

        <Text style={styles.section}>CASH – CHECK</Text>
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

        <Text style={styles.section}>BAO LƯƠNG</Text>
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
          <Field label="Số tiền" value={minOther} onChangeText={setMinOther} keyboardType="decimal-pad" />
        ) : null}

        <Pressable
          style={[styles.submit, saving && { opacity: 0.6 }]}
          onPress={submit}
          disabled={saving}
        >
          <Text style={styles.submitText}>{saving ? 'Đang lưu…' : 'LƯU'}</Text>
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
    marginBottom: 16,
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
