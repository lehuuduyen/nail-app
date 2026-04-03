import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOwnerStore } from '../store/ownerStore';

export default function OwnerGate({ children, title = 'Owner only' }) {
  const insets = useSafeAreaInsets();
  const isOwner = useOwnerStore((s) => s.isOwnerMode);

  if (isOwner) return children;

  return (
    <View
      className="flex-1 bg-neutral-200 items-center justify-center px-8"
      style={{ paddingTop: insets.top }}
    >
      <View className="bg-white rounded-2xl p-8 border border-neutral-300 items-center max-w-md">
        <Ionicons name="lock-closed" size={48} color="#666" />
        <Text className="text-lg font-bold text-neutral-800 mt-4 text-center">{title}</Text>
        <Text className="text-sm text-neutral-500 mt-2 text-center">
          Log in as owner from Home (Owner Login + PIN) to use this section.
        </Text>
      </View>
    </View>
  );
}
