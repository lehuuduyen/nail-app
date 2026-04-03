import { Stack } from 'expo-router';
import OwnerGate from '../../../components/OwnerGate';

export default function ReportsLayout() {
  return (
    <OwnerGate title="Reports (owner only)">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { flex: 1, backgroundColor: '#f5f5f5' },
        }}
      />
    </OwnerGate>
  );
}
