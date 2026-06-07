import { Ionicons } from '@expo/vector-icons';
let ImagePicker = null;
try {
  ImagePicker = require('expo-image-picker');
} catch { /* chưa rebuild — picker disabled */ }
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import OwnerGate from '../../components/OwnerGate';
import StaffBubble from '../../components/StaffBubble';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCommissionLabel } from '../../constants/employeePayOptions';
import { formatEmployeeNameFromDb, mapApiEmployeeToPosStaff } from '../../utils/staffDisplay';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

function buildBody(firstName, lastName, nickname, phone, email, tips, existing) {
  const body = {
    firstName: firstName || 'Staff',
    lastName: lastName || nickname || '—',
    nickName: nickname.trim() || null,
    phone: phone || null,
    email: email || null,
    payType: 'commission',
    tipsEnabled: tips,
    commissionRate: null,
    hourlyRate: null,
    baseSalary: null,
  };
  if (existing) {
    body.commissionTechPct = existing.commissionTechPct;
    body.commissionOwnerPct = existing.commissionOwnerPct;
    body.cashPortionPct = existing.cashPortionPct;
    body.minimumPay = existing.minimumPay;
    if (existing.listOrder != null) body.listOrder = existing.listOrder;
  }
  return body;
}

export default function AdminEmployeesScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tips, setTips] = useState(true);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/employees');
      setRows(data || []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setNickname('');
    setPhone('');
    setEmail('');
    setTips(true);
    setCurrentAvatarUrl(null);
    setPendingPhoto(null);
  };

  const openAdd = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFirstName(item.firstName || '');
    setLastName(item.lastName || '');
    setNickname('');
    setPhone(item.phone || '');
    setEmail(item.email || '');
    setTips(item.tipsEnabled !== false);
    setCurrentAvatarUrl(item.avatarUrl || null);
    setPendingPhoto(null);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const pickPhoto = async () => {
    if (!ImagePicker) {
      Alert.alert('Cần rebuild', 'Tính năng upload ảnh cần EAS Build để kích hoạt. Chạy: eas build --platform ios --profile development');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to upload staff photos.');
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

  const uploadPhoto = async (employeeId) => {
    if (!pendingPhoto) return;
    setUploadingPhoto(true);
    try {
      const uri = pendingPhoto.uri;
      const filename = uri.split('/').pop();
      const ext = filename.split('.').pop() || 'jpg';
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: filename,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      });
      const token = useAuthStore.getState().token;
      const res = await fetch(`${API_URL}/api/employees/${employeeId}/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { avatarUrl } = await res.json();
      setCurrentAvatarUrl(avatarUrl);
      setPendingPhoto(null);
    } catch (e) {
      Alert.alert('Lỗi', `Không upload được ảnh: ${e?.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async () => {
    const existing = editingId != null ? rows.find((r) => r.id === editingId) : null;
    const body = buildBody(firstName, lastName, nickname, phone, email, tips, existing);
    try {
      let savedId = editingId;
      if (editingId != null) {
        await api.put(`/api/employees/${editingId}`, body);
      } else {
        const { data } = await api.post('/api/employees', body);
        savedId = data.id;
      }
      if (pendingPhoto && savedId) {
        await uploadPhoto(savedId);
      }
      closeModal();
      load();
    } catch (e) {
      Alert.alert('Lỗi', getApiErrorMessage(e));
    }
  };

  const avatarPreview = pendingPhoto?.uri || currentAvatarUrl;

  return (
    <OwnerGate title="Employees (owner only)">
      <View className="flex-1 bg-neutral-100" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-center px-3 py-4 bg-white border-b border-neutral-300">
          <Text className="text-lg font-black text-neutral-900 uppercase tracking-wide">Employees</Text>
        </View>
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => openEdit(item)}
              onLongPress={() =>
                Alert.alert('Delete?', `${item.firstName} ${item.lastName}`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.delete(`/api/employees/${item.id}`);
                        load();
                      } catch {
                        Alert.alert('Offline', 'Could not delete');
                      }
                    },
                  },
                ])
              }
              className="bg-white rounded-xl p-3 mb-2 flex-row items-center border border-neutral-300 active:bg-neutral-50"
            >
              {item.avatarUrl ? (
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={{ width: 48, height: 48, borderRadius: 24, marginRight: 8 }}
                />
              ) : (
                <StaffBubble staff={mapApiEmployeeToPosStaff(item, index)} onPress={() => openEdit(item)} />
              )}
              <View className="flex-1 ml-2">
                <Text className="font-bold">{formatEmployeeNameFromDb(item)}</Text>
                <Text className="text-xs text-neutral-500">
                  Thợ/chủ {formatCommissionLabel(item.commissionTechPct, item.commissionOwnerPct)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </Pressable>
          )}
        />
        <Pressable
          onPress={openAdd}
          className="absolute bottom-24 right-6 w-14 h-14 rounded-full bg-[#0066CC] items-center justify-center shadow-lg"
        >
          <Ionicons name="add" size={32} color="#fff" />
        </Pressable>

        <Modal visible={open} animationType="slide" transparent>
          <View className="flex-1 bg-black/40 justify-end">
            <View className="bg-white rounded-t-2xl max-h-[90%] p-4">
              <Text className="text-lg font-bold mb-3">{editingId != null ? 'Edit employee' : 'Add employee'}</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                {/* Avatar picker */}
                <View className="items-center mb-4">
                  <Pressable onPress={pickPhoto} className="relative">
                    {avatarPreview ? (
                      <Image
                        source={{ uri: avatarPreview }}
                        style={{ width: 88, height: 88, borderRadius: 44 }}
                      />
                    ) : (
                      <View className="w-[88px] h-[88px] rounded-full bg-neutral-200 items-center justify-center">
                        <Ionicons name="person" size={40} color="#aaa" />
                      </View>
                    )}
                    <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0066CC] items-center justify-center border-2 border-white">
                      <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                  </Pressable>
                  {pendingPhoto && (
                    <Text className="text-xs text-amber-600 mt-1">Ảnh sẽ upload khi bấm Save</Text>
                  )}
                </View>

                <Text className="text-xs text-neutral-500 mb-1">First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
                />
                <Text className="text-xs text-neutral-500 mb-1">Last name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
                />
                <Text className="text-xs text-neutral-500 mb-1">Nickname (VN)</Text>
                <TextInput
                  value={nickname}
                  onChangeText={setNickname}
                  className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
                  placeholder="Optional — used if last name empty (new only)"
                />
                <Text className="text-xs text-neutral-500 mb-1">Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
                />
                <Text className="text-xs text-neutral-500 mb-1">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
                />
                <Text className="text-neutral-400 text-xs mb-4">
                  Chia thợ/chủ, cash/check, bao lương: chỉnh trên POS → Employees.
                </Text>
                <View className="flex-row items-center justify-between mb-4">
                  <Text>Tips enabled</Text>
                  <Switch value={tips} onValueChange={setTips} />
                </View>
                <View className="flex-row gap-2">
                  <Pressable onPress={closeModal} className="flex-1 border border-neutral-300 rounded-xl py-3 items-center">
                    <Text>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={submit}
                    disabled={uploadingPhoto}
                    className="flex-1 bg-[#0066CC] rounded-xl py-3 items-center"
                  >
                    {uploadingPhoto ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-bold">{editingId != null ? 'Update' : 'Save'}</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </OwnerGate>
  );
}
