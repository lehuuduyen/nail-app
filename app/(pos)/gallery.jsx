import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const { width: WIN_W } = Dimensions.get('window');
const COLS = 2;
const GAP = 8;
const PAD = 12;
const INNER = WIN_W - PAD * 2;
const TILE_W = (INNER - GAP * (COLS - 1)) / COLS;

export default function PosGalleryScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.get('/api/gallery', { params: { category: 'all' } });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || 'Không tải được gallery');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 py-2 border-b border-neutral-200 bg-white">
        <Pressable onPress={() => router.back()} className="mr-3 p-1" hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>
        <Text className="flex-1 text-center font-bold text-lg text-neutral-900 pr-8">
          Gallery
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E53935" />
        </View>
      ) : err ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-600 text-center mb-4">{err}</Text>
          <Pressable onPress={load} className="bg-primary rounded-xl px-6 py-3">
            <Text className="text-white font-bold">Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: PAD, paddingBottom: insets.bottom + 24 }}
        >
          <Text className="text-xs text-neutral-500 mb-3 text-center">
            Ảnh từ salon (đồng bộ backend / website)
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: GAP }}>
            {items.map((g) => (
              <View
                key={g.id}
                className="rounded-xl overflow-hidden bg-neutral-200 border border-neutral-300"
                style={{ width: TILE_W }}
              >
                <Image
                  source={{
                    uri: resolveMediaUrl(g.thumbnailUrl || g.imageUrl),
                  }}
                  style={{ width: '100%', aspectRatio: 1 }}
                  resizeMode="cover"
                />
                {g.title ? (
                  <Text className="text-[10px] font-semibold text-neutral-800 px-2 py-1" numberOfLines={2}>
                    {g.title}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
          {!items.length ? (
            <Text className="text-center text-neutral-500 mt-8">Chưa có ảnh trong gallery.</Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
