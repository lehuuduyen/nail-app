import { Ionicons } from '@expo/vector-icons';
import { Pressable, Switch, Text, View } from 'react-native';
import { formatMoney } from '../utils/money';

export default function TicketSummary({
  staffLabel,
  activeStaffHint,
  lines,
  taxEnabled,
  onTaxToggle,
  subtotal,
  taxAmount,
  total,
  cardTotal,
  cashTotal,
  onRemoveLine,
  onAddCustom,
  onAddDiscount,
  onAddTip,
  onSellGift,
  onPay,
  showCardPricing = false,
}) {
  return (
    <View className="w-full bg-white rounded-xl p-3 border border-neutral-200">
      <Text className="text-lg font-bold text-blue-600 mb-0.5">{staffLabel}</Text>
      {activeStaffHint ? (
        <Text className="text-[10px] text-neutral-500 mb-2 leading-snug">{activeStaffHint}</Text>
      ) : (
        <View className="mb-2" />
      )}
      <View className="min-h-[80px] mb-2">
        {lines.map((line) => (
          <View
            key={line.id}
            className="flex-row items-center border-l-4 border-blue-500 pl-2 py-1 mb-1 bg-neutral-50 rounded"
          >
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-800">
                {line.name}
              </Text>
              <Text className="text-xs text-neutral-500">
                {formatMoney(line.price)}
                {line.employeeName ? ` · ${line.employeeName}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => onRemoveLine(line.id)} hitSlop={8}>
              <Text className="text-red-500 text-sm font-bold px-1">✕</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <View className="border-t border-neutral-200 pt-2">
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm text-neutral-700">SubTotal</Text>
          <Text className="text-sm font-semibold">{formatMoney(subtotal)}</Text>
        </View>
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm text-neutral-700">Tax</Text>
          <Switch value={taxEnabled} onValueChange={onTaxToggle} />
        </View>
        <Text className="text-xs text-neutral-500 text-right mb-1">
          {formatMoney(taxAmount)}
        </Text>
        <View className="flex-row justify-between border-t border-dashed border-neutral-300 pt-2 mt-1">
          <Text className="text-base font-bold">Total</Text>
          <Text className="text-base font-bold">{formatMoney(total)}</Text>
        </View>
        {showCardPricing ? (
          <>
            <Text className="text-primary text-xs font-semibold mt-2">
              Card Payment: {formatMoney(cardTotal)} | Cash Payment:{' '}
              {formatMoney(cashTotal)}
            </Text>
            <Text className="text-[10px] text-neutral-500 mt-1 leading-snug">
              Phí thẻ 3% chỉ trên (Subtotal + Tax − Discount), không tính trên tip.
            </Text>
          </>
        ) : (
          <Text className="text-[#2196F3] text-xs font-semibold mt-2">
            Cash / other: {formatMoney(cashTotal)}
          </Text>
        )}
      </View>
      <View className="gap-2 mt-3">
        <Pressable
          onPress={onSellGift}
          className="bg-gift rounded-xl py-3 items-center"
        >
          <Text className="text-white font-bold">SELL GIFT</Text>
        </Pressable>
        <Pressable
          onPress={onAddCustom}
          className="border-2 border-primary rounded-xl py-3 items-center bg-white"
        >
          <Text className="text-primary font-bold">ADD CUSTOM AMOUNT</Text>
        </Pressable>
        <Pressable
          onPress={onAddDiscount}
          className="border-2 border-primary rounded-xl py-3 items-center bg-white"
        >
          <Text className="text-primary font-bold">ADD DISCOUNT</Text>
        </Pressable>
        <Pressable
          onPress={onAddTip}
          className="border-2 border-primary rounded-xl py-3 items-center bg-white"
        >
          <Text className="text-primary font-bold">ADD TIP</Text>
        </Pressable>
        <Pressable
          onPress={onPay}
          className="bg-pay rounded-2xl py-4 items-center flex-row justify-center gap-2"
        >
          <Ionicons name="logo-apple" size={26} color="#fff" />
          <Text className="text-white text-xl font-bold">PAY</Text>
        </Pressable>
      </View>
      <View className="mt-3 gap-1">
        <Text className="text-blue-600 text-xs underline">Show the next screen to customer</Text>
        <Text className="text-blue-600 text-xs underline">Open Cash Drawer</Text>
        <Text className="text-blue-600 text-xs underline">Check Gift Balance</Text>
      </View>
    </View>
  );
}
