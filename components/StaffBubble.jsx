import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';
import TurnDisplay from './TurnDisplay';

const AVATAR = 64;

function CircleAvatar({ color, letter }) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: AVATAR, height: AVATAR, backgroundColor: color }}
    >
      <Text className="text-white text-2xl font-bold">{letter}</Text>
    </View>
  );
}

function DiamondAvatar({ color, letter }) {
  const inner = 46;
  return (
    <View
      className="items-center justify-center"
      style={{ width: AVATAR, height: AVATAR }}
    >
      <View
        className="items-center justify-center"
        style={{
          width: inner,
          height: inner,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      >
        <Text
          className="text-white text-xl font-bold"
          style={{ transform: [{ rotate: '-45deg' }] }}
        >
          {letter}
        </Text>
      </View>
    </View>
  );
}

function HeartAvatar({ color, letter }) {
  return (
    <View
      className="items-center justify-center"
      style={{ width: AVATAR, height: AVATAR }}
    >
      <Ionicons name="heart" size={58} color={color} style={{ position: 'absolute' }} />
      <Text
        className="text-white text-2xl font-extrabold"
        style={{
          zIndex: 1,
          marginTop: -4,
          textShadowColor: 'rgba(0,0,0,0.35)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

function PhotoAvatar({ color, uri }) {
  if (uri) {
    return (
      <View
        className="rounded-lg overflow-hidden border-2 border-neutral-300 bg-neutral-200"
        style={{ width: AVATAR, height: AVATAR }}
      >
        <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
      </View>
    );
  }
  return (
    <View
      className="rounded-lg items-center justify-center border-2 border-neutral-300"
      style={{ width: AVATAR, height: AVATAR, backgroundColor: color }}
    >
      <Ionicons name="person" size={38} color="rgba(255,255,255,0.92)" />
    </View>
  );
}

export default function StaffBubble({
  staff,
  onPress,
  turns = 0,
  appointments = 0,
  isSuggested = false,
}) {
  const letter = (
    staff.initial ||
    (staff.displayName || staff.firstName || '?').charAt(0)
  ).toUpperCase();
  const shape = staff.bubbleShape || 'circle';
  const color = staff.color || '#0288D1';

  const fn = (staff.firstName || '').trim();
  const ln = (staff.lastName || '').trim();
  const shortPair =
    fn &&
    ln &&
    fn.length <= 3 &&
    ln.length <= 3 &&
    fn.toUpperCase() !== ln.toUpperCase();

  let primaryLabel;
  let subLabel;
  if (fn.toUpperCase() === 'CHAU' && ln) {
    primaryLabel = ln.toUpperCase();
    subLabel = null;
  } else if (staff.nickname) {
    primaryLabel = (fn || staff.displayName || '?').toUpperCase();
    subLabel = String(staff.nickname).toUpperCase();
  } else if (shortPair) {
    primaryLabel = `${fn} ${ln}`.toUpperCase();
    subLabel = null;
  } else if (fn && ln) {
    primaryLabel = fn.toUpperCase();
    subLabel = ln.toUpperCase();
  } else {
    primaryLabel = (
      staff.displayName ||
      `${fn} ${ln}`.trim() ||
      '?'
    ).toUpperCase();
    subLabel = null;
  }

  let mark;
  if (shape === 'diamond') {
    mark = <DiamondAvatar color={color} letter={letter} />;
  } else if (shape === 'heart') {
    mark = <HeartAvatar color={color} letter={letter} />;
  } else if (shape === 'photo') {
    mark = <PhotoAvatar color={color} uri={staff.photoUrl} />;
  } else {
    mark = <CircleAvatar color={color} letter={letter} />;
  }

  return (
    <Pressable
      onPress={() => onPress?.(staff)}
      className="items-center w-[23%] min-w-[76px] max-w-[120px] mb-5 px-0.5"
    >
      <View
        className="mb-1.5 rounded-full"
        style={
          isSuggested
            ? {
                padding: 3,
                borderWidth: 3,
                borderColor: '#4CAF50',
                borderRadius: 999,
                shadowColor: '#4CAF50',
                shadowOpacity: 0.45,
                shadowRadius: 8,
                elevation: 6,
              }
            : undefined
        }
      >
        {mark}
      </View>
      <Text className="text-[11px] font-bold text-center text-neutral-900 leading-tight">
        {primaryLabel}
      </Text>
      {subLabel ? (
        <Text className="text-[10px] text-[#2e7d32] text-center font-semibold">
          ({subLabel})
        </Text>
      ) : null}
      <TurnDisplay
        turns={turns}
        appointments={appointments}
        isSuggested={isSuggested}
      />
    </Pressable>
  );
}
