import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReportToolbar from './ReportToolbar';

export default function ReportLayout({
  title,
  children,
  onExportCSV,
  onExportPDF,
  onPrint,
  loading,
  error,
  toolbarDisabled,
  headerBottom,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View
        style={{
          backgroundColor: '#1a1a2e',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingBottom: 12,
          paddingTop: Math.max(insets.top, 12),
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10, padding: 4 }}>
          <Text style={{ color: '#fff', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            color: '#fff',
            fontSize: 15,
            fontWeight: '700',
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <ReportToolbar
          onExportCSV={onExportCSV}
          onExportPDF={onExportPDF}
          onPrint={onPrint}
          disabled={toolbarDisabled}
        />
      </View>

      {headerBottom}

      {loading ? (
        <ActivityIndicator size="large" color="#E53935" style={{ marginTop: 24, marginBottom: 8 }} />
      ) : null}
      {error ? (
        <Text style={{ color: '#c62828', padding: 16, fontSize: 14 }}>{error}</Text>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {children}
      </ScrollView>
    </View>
  );
}
