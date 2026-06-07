import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useOwnerStore } from '../store/ownerStore';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

const DOT_COUNT = 6;

export default function OwnerPinModal({ visible, onVerified, onCancel }) {
  const [pin, setPin] = useState('');
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState(false);
  const shake = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const tryUnlock = useCallback(async () => {
    if (pin.length < 4) return;
    const ok = await useOwnerStore.getState().login(pin);
    if (ok) {
      setPin('');
      setError(false);
      onVerified?.();
      return;
    }
    setError(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 220);
    shake.value = withSequence(
      withTiming(-12, { duration: 40 }),
      withTiming(12, { duration: 40 }),
      withTiming(-10, { duration: 40 }),
      withTiming(10, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
    setPin('');
  }, [onVerified, pin, shake]);

  useEffect(() => {
    if (pin.length >= DOT_COUNT) tryUnlock();
  }, [pin, tryUnlock]);

  const append = (d) => {
    if (d === '*' || d === '#') return;
    if (pin.length >= DOT_COUNT) return;
    setError(false);
    setPin((p) => p + d);
  };

  const clearPin = () => {
    setPin('');
    setError(false);
  };

  const cancel = useCallback(() => {
    setPin('');
    setError(false);
    onCancel?.();
  }, [onCancel]);

  const filled = pin.length;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/70 justify-center items-center px-5">
        <Pressable
          onPress={cancel}
          className="absolute top-12 right-5 z-10 bg-white/95 px-3 py-2 rounded-lg border border-neutral-300"
        >
          <Text className="text-neutral-800 font-bold text-sm">Close</Text>
        </Pressable>
        <Animated.View style={shakeStyle} className="w-full max-w-sm">
          <View className={`rounded-2xl p-6 ${flash ? 'bg-red-100' : 'bg-white'}`}>
            <Text className="text-xl font-black text-center mb-1 text-neutral-900">OWNER LOGIN</Text>
            <Text className="text-xs text-neutral-500 text-center mb-5">Enter your PIN</Text>

            <View className="flex-row justify-center gap-3 mb-2">
              {Array.from({ length: DOT_COUNT }, (_, i) => (
                <Text
                  key={i}
                  className="text-2xl"
                  style={{ color: i < filled ? '#111' : '#ccc' }}
                >
                  ●
                </Text>
              ))}
            </View>
            {error ? (
              <Text className="text-center text-red-600 text-sm font-semibold mb-3">Incorrect PIN</Text>
            ) : (
              <View className="h-6 mb-3" />
            )}

            {KEYS.map((row, ri) => (
              <View key={ri} className="flex-row justify-center gap-3 mb-2">
                {row.map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => append(k)}
                    className="w-[26%] aspect-[1.15] bg-neutral-200 rounded-xl items-center justify-center"
                  >
                    <Text className="text-2xl font-bold text-neutral-900">{k}</Text>
                  </Pressable>
                ))}
              </View>
            ))}

            <View className="flex-row gap-3 mt-2">
              <Pressable
                onPress={clearPin}
                className="flex-1 py-3 rounded-xl bg-neutral-400 items-center active:opacity-80"
              >
                <Text className="text-white font-extrabold">Clear</Text>
              </Pressable>
              <Pressable
                onPress={tryUnlock}
                className="flex-1 py-3 rounded-xl bg-[#2BB5A0] items-center active:opacity-80"
              >
                <Text className="text-white font-extrabold">Submit</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
