import { Modal, Pressable, Text, View } from 'react-native';
import { formatMoney } from '../utils/money';
import { isStripeTerminalSupported } from '../hooks/useStripeReaderConnection';

export default function PaymentModal({
  visible,
  onClose,
  cardAmount,
  cashAmount,
  onPayCard,
  onPayStripe,
  onPayCash,
  cardPaymentEnabled = false,
  stripeEnabled = false,
}) {
  const hasCard = cardPaymentEnabled || stripeEnabled;
  const sideHint = hasCard
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

              {stripeEnabled && onPayStripe ? (
                <>
                  <Pressable
                    onPress={onPayStripe}
                    className="bg-[#635BFF] rounded-2xl py-5 items-center"
                  >
                    <Text className="text-white text-3xl mb-1">💳</Text>
                    <Text className="text-white font-bold text-lg">Pay Card — Stripe</Text>
                    <Text className="text-white text-xs opacity-90 mt-0.5 px-2 text-center">
                      Máy đọc thẻ Stripe Terminal
                    </Text>
                    <Text className="text-white text-xl font-bold mt-1">
                      {formatMoney(cardAmount)}
                    </Text>
                  </Pressable>

                  {!isStripeTerminalSupported() && (
                    <View className="flex-row items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2">
                      <Text className="text-amber-500 text-base leading-tight">⚠️</Text>
                      <View className="flex-1">
                        <Text className="text-amber-800 font-bold text-xs">Cần rebuild app</Text>
                        <Text className="text-amber-700 text-xs leading-snug mt-0.5">
                          Stripe Terminal chưa sẵn sàng. Chạy{' '}
                          <Text className="font-mono font-bold">eas build</Text> rồi cài lại app để dùng máy đọc thẻ.
                        </Text>
                      </View>
                    </View>
                  )}
                </>
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
