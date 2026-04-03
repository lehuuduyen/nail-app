import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import OwnerGate from '../../components/OwnerGate';
import {
  DISPLAY_GROUP_TO_API,
  SERVICE_DISPLAY_GROUPS,
  apiCategoryToDisplayGroup,
} from '../../constants/serviceDisplayGroups';
import { formatMoney } from '../../utils/money';
import { getApiErrorMessage } from '../../utils/apiError';

export default function AdminServicesScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const sectionY = useRef({});

  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [nameEn, setNameEn] = useState('');
  const [nameVi, setNameVi] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [catTab, setCatTab] = useState(SERVICE_DISPLAY_GROUPS[0]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/services');
      setRows(data || []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    for (const g of SERVICE_DISPLAY_GROUPS) map[g] = [];
    for (const s of rows) {
      const g = apiCategoryToDisplayGroup(s.category);
      if (!map[g]) map[g] = [];
      map[g].push(s);
    }
    return map;
  }, [rows]);

  const submitAdd = async () => {
    const apiCat = DISPLAY_GROUP_TO_API[catTab] || 'other';
    const label = nameVi ? `${nameEn} | ${nameVi}` : nameEn;
    try {
      await api.post('/api/services', {
        name: label || 'Service',
        price: parseFloat(price) || 0,
        duration: parseInt(duration, 10) || 30,
        category: apiCat,
        description: nameVi || null,
      });
      setOpen(false);
      setNameEn('');
      setNameVi('');
      setPrice('');
      setDuration('30');
      load();
    } catch (e) {
      Alert.alert('Lỗi', getApiErrorMessage(e));
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const apiCat = DISPLAY_GROUP_TO_API[catTab] || 'other';
    const label = nameVi ? `${nameEn} | ${nameVi}` : nameEn;
    try {
      await api.put(`/api/services/${editRow.id}`, {
        name: label || editRow.name,
        price: parseFloat(price) || 0,
        duration: parseInt(duration, 10) || 30,
        category: apiCat,
        description: nameVi || null,
      });
      setEditRow(null);
      load();
    } catch (e) {
      Alert.alert('Lỗi', getApiErrorMessage(e));
    }
  };

  const openEdit = (s) => {
    const parts = String(s.name || '').split('|').map((x) => x.trim());
    setNameEn(parts[0] || '');
    setNameVi(parts[1] || s.description || '');
    setPrice(String(s.price ?? ''));
    setDuration(String(s.duration ?? 30));
    setCatTab(apiCategoryToDisplayGroup(s.category));
    setEditRow(s);
  };

  const scrollToGroup = (g) => {
    const y = sectionY.current[g];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  return (
    <OwnerGate title="Services (owner only)">
      <View className="flex-1 bg-neutral-200" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-2 py-3 bg-white border-b border-neutral-300">
          <View className="flex-row items-center gap-2 flex-1">
            <Pressable
              onPress={() => setOpen(true)}
              className="border border-neutral-800 px-3 py-2 rounded-md bg-white"
            >
              <Text className="text-[11px] font-extrabold text-neutral-900">ADD</Text>
            </Pressable>
            <Pressable onPress={() => Alert.alert('Manage Groups', 'Group editor (placeholder).')}>
              <Text className="text-[11px] font-bold text-neutral-800">Manage Groups</Text>
            </Pressable>
          </View>
          <Text className="text-sm font-black text-neutral-900 uppercase text-center flex-[1.2]">
            SERVICES (DỊCH VỤ)
          </Text>
          <View className="flex-1" />
        </View>

        <View className="flex-1 flex-row min-h-0">
          <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
            {SERVICE_DISPLAY_GROUPS.map((group) => (
              <View
                key={group}
                onLayout={(e) => {
                  sectionY.current[group] = e.nativeEvent.layout.y;
                }}
              >
                <Text className="text-[12px] font-black text-neutral-600 uppercase px-3 pt-4 pb-2">
                  {group}
                </Text>
                {(grouped[group] || []).map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => openEdit(s)}
                    className="bg-white border-b border-neutral-300 px-3 py-3 active:bg-neutral-100"
                  >
                    <Text className="text-[13px] font-bold text-neutral-900 uppercase">
                      {s.name} <Text className="font-black">{formatMoney(s.price)}</Text>
                    </Text>
                    <Text className="text-[11px] text-neutral-600 mt-1">
                      Tax: 0.0% Deduction: $0.00 Turn:
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>

          <ScrollView
            className="w-[120px] border-l border-neutral-400 bg-neutral-100 py-2"
            showsVerticalScrollIndicator={false}
          >
            {SERVICE_DISPLAY_GROUPS.map((g) => (
              <Pressable key={g} onPress={() => scrollToGroup(g)} className="py-2 px-2">
                <Text className="text-[9px] font-bold text-[#0066CC] uppercase leading-tight">{g}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Modal visible={open} animationType="slide" transparent>
          <View className="flex-1 bg-black/40 justify-end">
            <View className="bg-white rounded-t-2xl p-4 max-h-[85%]">
              <Text className="text-lg font-bold mb-3">Add service</Text>
              <Text className="text-xs text-neutral-500 mb-1">Name (English)</Text>
              <TextInput
                value={nameEn}
                onChangeText={setNameEn}
                className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
              />
              <Text className="text-xs text-neutral-500 mb-1">Name (Vietnamese)</Text>
              <TextInput
                value={nameVi}
                onChangeText={setNameVi}
                className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
              />
              <Text className="text-xs text-neutral-500 mb-1">Category</Text>
              <ScrollView className="max-h-32 mb-2">
                {SERVICE_DISPLAY_GROUPS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCatTab(c)}
                    className={`px-2 py-2 rounded-lg border mb-1 ${catTab === c ? 'bg-[#0066CC] border-[#0066CC]' : 'border-neutral-200'}`}
                  >
                    <Text
                      className={`text-[10px] uppercase ${catTab === c ? 'text-white' : 'text-neutral-800'}`}
                      numberOfLines={2}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text className="text-xs text-neutral-500 mb-1">Price</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
              />
              <Text className="text-xs text-neutral-500 mb-1">Duration (min)</Text>
              <TextInput
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                className="border border-neutral-200 rounded-lg px-3 py-2 mb-4"
              />
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setOpen(false)}
                  className="flex-1 border border-neutral-300 rounded-xl py-3 items-center"
                >
                  <Text>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submitAdd}
                  className="flex-1 bg-[#0066CC] rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-bold">Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={!!editRow} animationType="fade" transparent>
          <Pressable className="flex-1 bg-black/50 justify-center px-4" onPress={() => setEditRow(null)}>
            <Pressable className="bg-white rounded-2xl p-4 border border-neutral-300" onPress={(e) => e.stopPropagation()}>
              <Text className="text-lg font-bold mb-3">Edit service</Text>
              <Text className="text-xs text-neutral-500 mb-1">Name (English)</Text>
              <TextInput
                value={nameEn}
                onChangeText={setNameEn}
                className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
              />
              <Text className="text-xs text-neutral-500 mb-1">Name (Vietnamese)</Text>
              <TextInput
                value={nameVi}
                onChangeText={setNameVi}
                className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
              />
              <Text className="text-xs text-neutral-500 mb-1">Category</Text>
              <ScrollView className="max-h-28 mb-2">
                {SERVICE_DISPLAY_GROUPS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCatTab(c)}
                    className={`px-2 py-2 rounded-lg border mb-1 ${catTab === c ? 'bg-[#0066CC]' : 'border-neutral-200'}`}
                  >
                    <Text className={`text-[10px] uppercase ${catTab === c ? 'text-white' : ''}`} numberOfLines={2}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text className="text-xs text-neutral-500 mb-1">Price</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                className="border border-neutral-200 rounded-lg px-3 py-2 mb-2"
              />
              <Text className="text-xs text-neutral-500 mb-1">Duration</Text>
              <TextInput
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                className="border border-neutral-200 rounded-lg px-3 py-2 mb-4"
              />
              <View className="flex-row gap-2 mb-2">
                <Pressable
                  onPress={async () => {
                    try {
                      await api.delete(`/api/services/${editRow.id}`);
                      setEditRow(null);
                      load();
                    } catch {
                      Alert.alert('Could not delete');
                    }
                  }}
                  className="flex-1 border border-red-400 rounded-xl py-3 items-center"
                >
                  <Text className="text-red-700 font-bold">Delete</Text>
                </Pressable>
                <Pressable
                  onPress={saveEdit}
                  className="flex-1 bg-[#0066CC] rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-bold">Save</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => setEditRow(null)} className="py-2 items-center">
                <Text className="text-neutral-600">Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </OwnerGate>
  );
}
