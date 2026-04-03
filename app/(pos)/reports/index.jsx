import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TEAL = '#26a69a';

const REPORT_SECTIONS = [
  {
    title: 'TECHNICIAN REPORT (TICKETS)',
    items: [
      { key: 't-date', label: 'Report By Date (Theo Ngày)', icon: '1', route: '/(pos)/reports/technician/by-date' },
      {
        key: 't-week',
        label: 'Report By Week (Theo Tuần)',
        icon: '7',
        pickWeekTarget: 'technician',
      },
      { key: 't-range', label: 'Report By Range', icon: '📊', route: '/(pos)/reports/technician/by-range' },
      { key: 't-month', label: 'Report By Month (Theo Tháng)', icon: '31', route: '/(pos)/reports/technician/by-month' },
      { key: 't-year', label: 'Report By Year (Theo Năm)', icon: '12', route: '/(pos)/reports/technician/by-year' },
    ],
  },
  {
    title: 'STORE INCOME REPORT (RECEIPTS)',
    items: [
      { key: 's-date', label: 'Report By Date (Theo Ngày)', icon: '1', route: '/(pos)/reports/store-income/by-date' },
      {
        key: 's-week',
        label: 'Report By Week (Theo Tuần)',
        icon: '7',
        pickWeekTarget: 'store',
      },
      { key: 's-range', label: 'Report By Range', icon: '📊', route: '/(pos)/reports/store-income/by-range' },
      { key: 's-year', label: 'Report By Year', icon: '12', route: '/(pos)/reports/store-income/by-year' },
    ],
  },
  {
    title: 'OWNER ADVANCED REPORT',
    items: [
      { key: 'o-range', label: 'Report By Range', icon: '📊', route: '/(pos)/reports/owner-advanced/by-range' },
      { key: 'o-ped', label: 'Pedicure Log By Range', icon: '📊', route: '/(pos)/reports/owner-advanced/pedicure-log' },
    ],
  },
];

function ReportRow({ label, iconText, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-4 border-b border-neutral-300 bg-white active:bg-neutral-100"
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: TEAL }}
      >
        <Text className="text-white font-bold text-sm">{iconText}</Text>
      </View>
      <Text className="flex-1 text-[14px] font-semibold text-neutral-900">{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </Pressable>
  );
}

export default function ReportsMenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-neutral-200" style={{ paddingTop: insets.top }}>
      <Text className="text-center text-lg font-black text-neutral-900 py-4 bg-white border-b border-neutral-300">
        REPORTS
      </Text>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {REPORT_SECTIONS.map((section) => (
          <View key={section.title}>
            <Text className="text-center text-[13px] font-black text-neutral-900 py-4 uppercase tracking-wide">
              {section.title}
            </Text>
            {section.items.map((item) => (
              <ReportRow
                key={item.key}
                label={item.label}
                iconText={item.icon}
                onPress={() =>
                  item.pickWeekTarget
                    ? router.push({
                        pathname: '/(pos)/reports/pick-week',
                        params: { target: item.pickWeekTarget },
                      })
                    : router.push(item.route)
                }
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
