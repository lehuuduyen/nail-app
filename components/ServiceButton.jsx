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
      className="bg-neutral-200 rounded-lg px-2 py-3 m-1 flex-[1_1_45%] min-w-[140px] max-w-[48%]"
    >
      <Text className="text-xs font-semibold text-center text-neutral-800 leading-snug">
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
