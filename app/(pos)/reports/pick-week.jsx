import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildWeekRowsDescending } from '../../../utils/reportWeekList';

const TEAL = '#26a69a';
const ROW_MIN_H = 52;

export default function PickWeekScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { target } = useLocalSearchParams();

  const weeks = useMemo(() => buildWeekRowsDescending(52), []);

  const destPath =
    target === 'store'
      ? '/(pos)/reports/store-income/by-week'
      : '/(pos)/reports/technician/by-week';

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View
        style={{
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
          backgroundColor: '#fff',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ position: 'absolute', left: 12, zIndex: 1 }}
        >
          <Text style={{ color: '#0066CC', fontSize: 15, fontWeight: '800' }}>&lt; REPORTS</Text>
        </Pressable>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '900',
            color: '#111',
            letterSpacing: 0.8,
          }}
        >
          PICK A WEEK
        </Text>
      </View>

      <FlatList
        data={weeks}
        keyExtractor={(item) => item.mondayYmd}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: destPath,
                params: { monday: item.mondayYmd },
              })
            }
            style={{
              minHeight: ROW_MIN_H,
              justifyContent: 'center',
              paddingHorizontal: 22,
              paddingVertical: 18,
              backgroundColor: index % 2 === 0 ? '#ffffff' : TEAL,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#000',
                letterSpacing: 0.2,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
