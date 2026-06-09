import { Pressable, Text } from 'react-native';
import { formatMoney } from '../utils/money';
import { isCardTerminalPaymentEnabled } from '../utils/featureFlags';

export default function ServiceButton({
  name,
  price,
  priceCard,
  duration,
  onPress,
}) {
  const cardPay = isCardTerminalPaymentEnabled();
  const showDual =
    cardPay &&
    priceCard != null &&
    Number.isFinite(Number(priceCard)) &&
    Math.abs(Number(priceCard) - Number(price)) > 0.009;
  const priceLine = showDual
    ? `${formatMoney(price)} / ${formatMoney(priceCard)}`
    : `${formatMoney(price)}+`;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      android_ripple={{ color: '#d4d4d4' }}
      style={({ pressed }) => [
        { opacity: pressed ? 0.6 : 1 },
      ]}
      className="bg-neutral-200 rounded-lg px-2 py-4 m-1.5 min-h-[76px] justify-center flex-[1_1_45%] min-w-[140px] max-w-[48%]"
    >
      <Text className="text-sm font-semibold text-center text-neutral-800 leading-snug">
        {name}
      </Text>
      {duration ? (
        <Text className="text-[10px] text-center text-neutral-500 mt-0.5">{duration} min</Text>
      ) : null}
      <Text className="text-xs text-center text-neutral-600 mt-1">{priceLine}</Text>
      {showDual ? (
        <Text className="text-[9px] text-center text-neutral-500 mt-0.5">cash / card</Text>
      ) : null}
    </Pressable>
  );
}
