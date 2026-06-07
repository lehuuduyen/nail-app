import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { formatMoney } from '../utils/money';

/**
 * Modal hiển thị trong khi collectPaymentMethod đang chờ khách chạm thẻ.
 * Props:
 *   visible       — bool
 *   ready         — bool: true khi SDK báo reader đã thực sự sẵn sàng nhận chạm
 *                   (onDidRequestReaderInput / onDidChangePaymentStatus === 'waitingForInput').
 *                   Trước thời điểm này, máy còn đang bật ăng-ten NFC qua Bluetooth (~1-2s)
 *                   nên khách chạm thẻ sẽ KHÔNG được nhận diện — hiện thông báo "đang khởi động"
 *                   để khách đợi đúng lúc thay vì chạm hụt rồi phải thử lại.
 *   amount        — số tiền (dollar)
 *   readerName    — tên reader đang kết nối
 *   onCancel      — callback khi bấm Cancel
 */
export default function StripeTerminalPaymentModal({ visible, ready, amount, readerName, onCancel }) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm items-center gap-4">
          <Text className="text-2xl">💳</Text>
          <Text className="text-lg font-bold text-center">
            {ready ? 'Chạm thẻ ngay bây giờ' : 'Đang khởi động máy đọc thẻ…'}
          </Text>

          {readerName ? (
            <Text className="text-xs text-neutral-500 text-center">{readerName}</Text>
          ) : null}

          <Text className="text-3xl font-bold text-primary">{formatMoney(amount)}</Text>

          <ActivityIndicator size="large" color="#c9a96e" />

          <Text className="text-sm text-neutral-500 text-center px-2">
            {ready
              ? 'Đưa thẻ / điện thoại chạm vào máy đọc thẻ'
              : 'Máy đang kết nối qua Bluetooth — vui lòng đợi vài giây, đừng chạm thẻ vội'}
          </Text>

          <Pressable
            onPress={onCancel}
            className="mt-2 bg-neutral-100 rounded-xl px-6 py-3"
          >
            <Text className="text-primary font-bold">HỦY</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
