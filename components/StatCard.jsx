import { Text, View } from 'react-native';

export default function StatCard({ label, value, sub }) {
  return (
    <View className="bg-white rounded-xl p-4 flex-1 min-w-[140px] border border-neutral-200 shadow-sm">
      <Text className="text-xs text-neutral-500 uppercase">{label}</Text>
      <Text className="text-xl font-bold text-neutral-900 mt-1">{value}</Text>
      {sub ? (
        <Text className="text-[11px] text-neutral-400 mt-1">{sub}</Text>
      ) : null}
    </View>
  );
}
