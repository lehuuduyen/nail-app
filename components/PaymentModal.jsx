import { Modal, Pressable, Text, View } from 'react-native';
import { formatMoney } from '../utils/money';

export default function PaymentModal({
  visible,
  onClose,
  cardAmount,
  cashAmount,
  onPayCard,
  onPayCash,
  cardPaymentEnabled = false,
}) {
  const sideHint = cardPaymentEnabled
    ? 'Please have the customer select the pay options below'
    : 'Cash / gift / other — thanh toán thẻ qua máy đang tắt';

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/50 justify-center items-stretch px-4">
        <View className="bg-white rounded-lg overflow-hidden flex-row min-h-[320px]">
          <View className="flex-1 p-4 justify-between">
            <View className="gap-3 flex-1 justify-center">
              {cardPaymentEnabled && onPayCard ? (
                <Pressable
                  onPress={onPayCard}
                  className="bg-pay rounded-2xl py-5 items-center"
                >
                  <Text className="text-white text-3xl mb-1">💳</Text>
                  <Text className="text-white font-bold text-lg">Pay Card — chạm thẻ</Text>
                  <Text className="text-white text-xs opacity-90 mt-0.5 px-2 text-center">
                    Máy Ingenico / Helcim Smart Terminal (chạm hoặc cắm thẻ)
                  </Text>
                  <Text className="text-white text-xl font-bold mt-1">
                    {formatMoney(cardAmount)}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onPayCash}
                className="bg-[#2196F3] rounded-2xl py-5 items-center"
              >
                <Text className="text-white text-3xl mb-1">💵</Text>
                <Text className="text-white font-bold text-lg text-center px-2">
                  Pay Cash/Gift/Other
                </Text>
                <Text className="text-white text-xl font-bold mt-1">
                  {formatMoney(cashAmount)}
                </Text>
              </Pressable>
            </View>
            <Pressable onPress={onClose} className="self-start mt-2">
              <Text className="text-primary font-bold text-base">CANCEL (X)</Text>
            </Pressable>
          </View>
          <View className="w-[26%] bg-primary justify-center px-2">
            <Text className="text-white text-center text-sm font-medium leading-snug">
              {sideHint}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
