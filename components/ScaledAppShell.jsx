import { View, useWindowDimensions } from 'react-native';
import { shouldScaleUi, UI_SCALE } from '../utils/uiScale';

/**
 * Co hệ tọa độ layout rồi scale từ góc trên-trái → chữ/nút lớn hơn, vẫn full màn hình.
 */
export default function ScaledAppShell({ children }) {
  const { width: W, height: H } = useWindowDimensions();
  const scale = UI_SCALE;

  if (!shouldScaleUi()) {
    return children;
  }

  const w = W / scale;
  const h = H / scale;

  return (
    <View style={{ flex: 1, width: W, height: H, overflow: 'hidden' }}>
      <View
        style={{
          width: w,
          height: h,
          transform: [{ scale }],
          /* Góc trên-trái — chỉ dùng số (một số bản RN không chấp nhận 'left'/'top'). */
          transformOrigin: [0, 0, 0],
        }}
      >
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}
