import { useCallback, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export const DEFAULT_ADMIN_PIN = '123456';

/**
 * Fullscreen PIN pad; same rules as admin (EXPO_PUBLIC_ADMIN_PIN or default).
 */
export default function AdminPinModal({
  title = 'Admin PIN',
  onVerified,
  onCancel,
  showHint = true,
}) {
  const [pin, setPin] = useState('');
  const [flash, setFlash] = useState(false);
  const shake = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const tryUnlock = useCallback(() => {
    const expected = process.env.EXPO_PUBLIC_ADMIN_PIN || DEFAULT_ADMIN_PIN;
    if (pin.length >= 4 && pin === expected) {
      setPin('');
      onVerified();
      return;
    }
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    shake.value = withSequence(
      withTiming(-12, { duration: 40 }),
      withTiming(12, { duration: 40 }),
      withTiming(-10, { duration: 40 }),
      withTiming(10, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
    setPin('');
  }, [onVerified, pin, shake]);

  const pad = (d) => {
    if (pin.length >= 6) return;
    setPin((p) => p + d);
  };

  const cancel = useCallback(() => {
    setPin('');
    onCancel();
  }, [onCancel]);

  return (
    <Modal visible animationType="fade" transparent>
      <View className="flex-1 bg-black/40 justify-center items-center px-6">
        <Pressable
          onPress={cancel}
          className="absolute top-12 right-6 z-10 bg-white/90 px-3 py-2 rounded-lg"
        >
          <Text className="text-primary font-bold text-sm">Huỷ</Text>
        </Pressable>
        <Animated.View style={shakeStyle} className="w-full max-w-sm">
          <View
            className={`rounded-2xl p-6 ${flash ? 'bg-red-100' : 'bg-white'}`}
          >
            <Text className="text-lg font-bold text-center mb-4">{title}</Text>
            <TextInput
              editable={false}
              value={'*'.repeat(pin.length)}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-center text-xl tracking-widest mb-4"
            />
            <View className="flex-row flex-wrap justify-center gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map(
                (k) => (
                  <Pressable
                    key={k}
                    onPress={() => {
                      if (k === '⌫') setPin((p) => p.slice(0, -1));
                      else if (k === 'OK') tryUnlock();
                      else pad(k);
                    }}
                    className="w-[28%] aspect-square bg-neutral-200 rounded-xl items-center justify-center mb-1"
                  >
                    <Text className="text-xl font-bold">{k}</Text>
                  </Pressable>
                )
              )}
            </View>
            <Pressable
              onPress={cancel}
              className="mt-4 py-3 border border-neutral-300 rounded-xl items-center"
            >
              <Text className="text-neutral-700 font-semibold">Huỷ & quay lại</Text>
            </Pressable>
            {showHint ? (
              <Text className="text-xs text-neutral-400 text-center mt-2">
                EXPO_PUBLIC_ADMIN_PIN hoặc mặc định {DEFAULT_ADMIN_PIN}
              </Text>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
