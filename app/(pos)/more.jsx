import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OwnerGate from '../../components/OwnerGate';

function Row({ icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center bg-white border border-neutral-300 rounded-xl p-4 mb-3 active:bg-neutral-100"
    >
      <Ionicons name={icon} size={24} color="#0066CC" />
      <Text className="flex-1 ml-3 font-semibold text-neutral-900">{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </Pressable>
  );
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <OwnerGate title="More (owner only)">
      <View className="flex-1 bg-neutral-200" style={{ paddingTop: insets.top }}>
        <Text className="text-center text-lg font-black text-neutral-900 py-4 bg-white border-b border-neutral-300">
          More
        </Text>
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
          <Row
            icon="calendar-outline"
            label="Appointments"
            onPress={() => router.push('/(pos)/appointments')}
          />
          <Row
            icon="checkmark-circle-outline"
            label="Check-ins"
            onPress={() => router.push('/(pos)/checkin')}
          />
          <Row
            icon="document-text-outline"
            label="Receipts"
            onPress={() => router.push('/(pos)/receipts')}
          />
          <Row
            icon="images-outline"
            label="Gallery"
            onPress={() => router.push('/(pos)/gallery')}
          />
          <Row
            icon="person-add-outline"
            label="Add employee (legacy)"
            onPress={() => router.push('/(pos)/employees/add')}
          />
          <Row
            icon="cut-outline"
            label="Add service (legacy)"
            onPress={() => router.push('/(pos)/add-service')}
          />
          <Pressable
            onPress={() => Alert.alert('Admin dashboard', 'Legacy admin home with charts.')}
            className="py-3"
          >
            <Text className="text-center text-[#0066CC] font-semibold text-sm">Open legacy admin dashboard</Text>
          </Pressable>
        </ScrollView>
      </View>
    </OwnerGate>
  );
}
