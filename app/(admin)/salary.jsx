import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OwnerGate from '../../components/OwnerGate';

export default function SalaryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <OwnerGate title="Salary (owner only)">
      <View className="flex-1 bg-neutral-200 justify-center px-8" style={{ paddingTop: insets.top }}>
        <Text className="text-center text-base font-semibold text-neutral-900 mb-10 px-4">
          Please select an action for Salary
        </Text>
        <Pressable
          onPress={() => router.push('/(admin)/payroll')}
          className="py-5 px-4 rounded-lg mb-5 items-center active:opacity-90"
          style={{ backgroundColor: '#1a237e' }}
        >
          <Text className="text-white font-extrabold text-center text-[13px]">
            Calculate Salary for All Employees
          </Text>
        </Pressable>
        <Pressable
          onPress={() => Alert.alert('Salary', 'Calculate for one employee — pick from list (placeholder).')}
          className="py-5 px-4 rounded-lg mb-5 items-center active:opacity-90"
          style={{ backgroundColor: '#1b5e20' }}
        >
          <Text className="text-white font-extrabold text-center text-[13px]">
            Calculate Salary for One Employee
          </Text>
        </Pressable>
        <Pressable
          onPress={() => Alert.alert('Salary history', 'History viewer (placeholder).')}
          className="py-5 px-4 rounded-lg items-center active:opacity-90"
          style={{ backgroundColor: '#1565c0' }}
        >
          <Text className="text-white font-extrabold text-center text-[13px]">See Salary History</Text>
        </Pressable>
      </View>
    </OwnerGate>
  );
}
