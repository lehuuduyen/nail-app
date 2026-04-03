import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { openAdminRoute } from '../../utils/openAdmin';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import AdminPinModal from '../../components/AdminPinModal';
import { POS_CATEGORIES } from '../../constants/sampleData';
import { useAuthStore } from '../../store/authStore';
import { useLocalCatalogStore } from '../../store/localCatalogStore';
import { getApiErrorMessage } from '../../utils/apiError';

const CATEGORY_TO_API = {
  'ADDITIONAL - THÊM': 'other',
  'ARYLIC - BỘT': 'acrylic',
  EYELASH: 'other',
  FACIAL: 'other',
  'HEAD SPA': 'other',
  'KID < 10YO': 'other',
  'MANICURE - TAY': 'manicure',
  'PEDICURE - CHÂN': 'pedicure',
  WAXING: 'waxing',
};

export default function AddServiceScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const addLocal = useLocalCatalogStore((s) => s.addService);
  const [nameEn, setNameEn] = useState('');
  const [nameVi, setNameVi] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [catTab, setCatTab] = useState(POS_CATEGORIES[0]);
  const [saving, setSaving] = useState(false);
  const [pinOk, setPinOk] = useState(false);

  useFocusEffect(
    useCallback(() => {
      useAuthStore.getState().clearAdminSession();
      setPinOk(false);
    }, [])
  );

  const isOfflineToken = !token || String(token).startsWith('local-demo');

  const save = async () => {
    const apiCat = CATEGORY_TO_API[catTab] || 'other';
    const label = nameVi ? `${nameEn.trim()} | ${nameVi.trim()}` : nameEn.trim();
    if (!label) {
      Alert.alert('Thiếu tên', 'Nhập tên dịch vụ.');
      return;
    }
    const priceNum = parseFloat(price) || 0;
    const dur = parseInt(duration, 10) || 30;

    setSaving(true);
    try {
      if (isOfflineToken) {
        addLocal({
          id: `local-svc-${Date.now()}`,
          name: label,
          price: priceNum,
          category: catTab,
        });
        Alert.alert('Đã lưu', 'Dịch vụ đã thêm vào danh sách cục bộ.');
        router.back();
        return;
      }
      await api.post('/api/services', {
        name: label,
        price: priceNum,
        duration: dur,
        category: apiCat,
        description: nameVi.trim() || null,
      });
      Alert.alert('Thành công', 'Đã thêm dịch vụ lên server.');
      router.back();
    } catch (e) {
      Alert.alert('Lỗi', getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!pinOk) {
    return (
      <AdminPinModal
        title="PIN — Thêm dịch vụ"
        onVerified={() => setPinOk(true)}
        onCancel={() => router.back()}
      />
    );
  }

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 py-3 bg-white border-b border-neutral-200">
        <Pressable onPress={() => router.back()} className="mr-2 p-1">
          <Ionicons name="arrow-back" size={24} />
        </Pressable>
        <Text className="text-lg font-bold flex-1">Thêm dịch vụ</Text>
      </View>
      <ScrollView className="flex-1 px-4 pt-3" keyboardShouldPersistTaps="handled">
        {isOfflineToken ? (
          <Text className="text-xs text-amber-800 bg-amber-100 p-2 rounded-lg mb-3">
            Offline / demo: lưu trên máy. Đăng nhập API để đồng bộ lên server.
          </Text>
        ) : null}
        <Text className="text-xs text-neutral-500 mb-1">Tên (Anh)</Text>
        <TextInput
          value={nameEn}
          onChangeText={setNameEn}
          placeholder="VD: GEL FULL SET"
          className="bg-white border border-neutral-200 rounded-lg px-3 py-2 mb-2"
        />
        <Text className="text-xs text-neutral-500 mb-1">Tên (Việt, tùy)</Text>
        <TextInput
          value={nameVi}
          onChangeText={setNameVi}
          placeholder="VD: SƠN GEL"
          className="bg-white border border-neutral-200 rounded-lg px-3 py-2 mb-2"
        />
        <Text className="text-xs text-neutral-500 mb-1">Nhóm (tab POS)</Text>
        <ScrollView horizontal className="mb-3 max-h-24">
          <View className="flex-row flex-wrap gap-1 pr-2" style={{ maxWidth: 600 }}>
            {POS_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCatTab(c)}
                className={`px-2 py-2 rounded-lg border mb-1 ${
                  catTab === c ? 'bg-primary border-primary' : 'bg-white border-neutral-200'
                }`}
              >
                <Text
                  className={`text-[9px] ${catTab === c ? 'text-white' : 'text-neutral-800'}`}
                  numberOfLines={2}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Text className="text-xs text-neutral-500 mb-1">Giá ($)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="25"
          className="bg-white border border-neutral-200 rounded-lg px-3 py-2 mb-2"
        />
        <Text className="text-xs text-neutral-500 mb-1">Thời lượng (phút)</Text>
        <TextInput
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          className="bg-white border border-neutral-200 rounded-lg px-3 py-2 mb-6"
        />
        <Pressable
          onPress={save}
          disabled={saving}
          className="bg-primary rounded-xl py-4 items-center mb-2"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          <Text className="text-white font-bold text-base">
            {saving ? 'Đang lưu…' : 'Lưu dịch vụ'}
          </Text>
        </Pressable>
        <Pressable onPress={() => openAdminRoute('/(admin)/services')} className="py-3 mb-8">
          <Text className="text-center text-gift text-sm underline">
            Mở trang Admin (PIN) — quản lý đầy đủ
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
