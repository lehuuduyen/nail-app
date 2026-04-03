import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OwnerGate from '../../components/OwnerGate';

const TEAL = '#26a69a';

function ReportRow({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-4 border-b border-neutral-300 bg-white active:bg-neutral-100"
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: TEAL }}
      >
        <Ionicons name="calendar" size={20} color="#fff" />
      </View>
      <Text className="flex-1 text-[14px] font-semibold text-neutral-900">{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </Pressable>
  );
}

function SectionTitle({ children }) {
  return (
    <Text className="text-center text-[13px] font-black text-neutral-900 py-4 uppercase tracking-wide">
      {children}
    </Text>
  );
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();

  const stub = (title) => () => Alert.alert('Reports', `${title} — coming soon.`);

  return (
    <OwnerGate title="Reports (owner only)">
      <View className="flex-1 bg-neutral-200" style={{ paddingTop: insets.top }}>
        <Text className="text-center text-lg font-black text-neutral-900 py-4 bg-white border-b border-neutral-300">
          REPORTS
        </Text>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          <SectionTitle>TECHNICIAN REPORT (TICKETS)</SectionTitle>
          <ReportRow label="Report By Date (Theo Ngày)" onPress={stub('Report By Date')} />
          <ReportRow label="Report By Week (Theo Tuần)" onPress={stub('Report By Week')} />
          <ReportRow label="Report By Range" onPress={stub('Report By Range')} />
          <ReportRow label="Report By Month (Theo Tháng)" onPress={stub('Report By Month')} />
          <ReportRow label="Report By Year (Theo Năm)" onPress={stub('Report By Year')} />

          <SectionTitle>STORE INCOME REPORT (RECEIPTS)</SectionTitle>
          <ReportRow label="Report By Date (Theo Ngày)" onPress={stub('Receipts By Date')} />
          <ReportRow label="Report By Week (Theo Tuần)" onPress={stub('Receipts By Week')} />
          <ReportRow label="Report By Range" onPress={stub('Receipts By Range')} />
          <ReportRow label="Report By Year" onPress={stub('Receipts By Year')} />

          <SectionTitle>OWNER ADVANCED REPORT</SectionTitle>
          <ReportRow label="Report By Range" onPress={stub('Owner Report By Range')} />
          <ReportRow label="Pedicure Log By Range" onPress={stub('Pedicure Log')} />
        </ScrollView>
      </View>
    </OwnerGate>
  );
}
