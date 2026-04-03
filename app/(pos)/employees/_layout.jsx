import { Stack } from 'expo-router';
import OwnerGate from '../../../components/OwnerGate';

export default function EmployeesLayout() {
  return (
    <OwnerGate title="Employees (owner only)">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { flex: 1, backgroundColor: '#e8e8e8' },
        }}
      />
    </OwnerGate>
  );
}
