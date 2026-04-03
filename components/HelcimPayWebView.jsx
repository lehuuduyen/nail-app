import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/client';
import { buildHelcimPayHtml, parseHelcimSuccessPayload } from '../utils/helcimPay';

/** UA trình duyệt đầy đủ — một số thiết bị giúp reCAPTCHA / iframe Helcim */
const WEBVIEW_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

/** Mặc định dùng HTML nhúng + baseUrl Helcim — tránh iframe bị từ chối khi trang cha là http://IP LAN. */
function wantsHostedHelcimPayPage() {
  const v = String(process.env.EXPO_PUBLIC_HELCIM_PAY_HOSTED_PAGE ?? '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Helcim Pay.js trong WebView (test / live tùy HELCIM_API_TOKEN trên server).
 */
export default function HelcimPayWebView({
  visible,
  checkoutToken,
  onClose,
  onSuccess,
  onAborted,
}) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const loadFallbackTimerRef = useRef(null);

  useEffect(() => {
    if (!visible || !checkoutToken) return undefined;
    setLoading(true);
    if (loadFallbackTimerRef.current) clearTimeout(loadFallbackTimerRef.current);
    loadFallbackTimerRef.current = setTimeout(() => {
      setLoading(false);
    }, 45000);
    return () => {
      if (loadFallbackTimerRef.current) clearTimeout(loadFallbackTimerRef.current);
    };
  }, [visible, checkoutToken]);

  const paySource = useMemo(() => {
    if (!checkoutToken) return null;
    const base = String(api.defaults.baseURL || '').replace(/\/$/, '');
    if (wantsHostedHelcimPayPage() && base) {
      return {
        uri: `${base}/helcim-pos-pay.html?t=${encodeURIComponent(checkoutToken)}`,
      };
    }
    return {
      html: buildHelcimPayHtml(checkoutToken),
      baseUrl: 'https://secure.helcim.app',
    };
  }, [checkoutToken]);

  const handleMessage = useCallback(
    (event) => {
      try {
        const raw = event?.nativeEvent?.data;
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.type !== 'helcim') return;
        if (d.status === 'READY') {
          setLoading(false);
          return;
        }
        if (d.status === 'SUCCESS') {
          const meta = parseHelcimSuccessPayload(d.message);
          if (meta) {
            onSuccess?.(meta);
          } else {
            onAborted?.('Không đọc được mã giao dịch Helcim.');
          }
          return;
        }
        if (d.status === 'ABORTED') {
          onAborted?.(typeof d.message === 'string' ? d.message : 'Thẻ bị từ chối.');
          return;
        }
        if (d.status === 'HIDE') {
          onClose?.();
        }
      } catch {
        /* ignore */
      }
    },
    [onSuccess, onAborted, onClose]
  );

  if (!visible || !checkoutToken || !paySource) return null;

  return (
    <Modal visible animationType="slide">
      <View className="flex-1 bg-neutral-900" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between px-3 py-2 bg-black border-b border-neutral-700">
          <Text className="text-white font-bold text-sm flex-1">Thanh toán thẻ — Helcim</Text>
          <Pressable onPress={onClose} className="py-2 px-3" hitSlop={12}>
            <Text className="text-red-400 font-bold text-sm">Đóng</Text>
          </Pressable>
        </View>
        {loading ? (
          <View className="absolute inset-0 items-center justify-center z-10 pt-20" pointerEvents="none">
            <ActivityIndicator size="large" color="#fff" />
            <Text className="text-white text-xs mt-3 px-6 text-center">Đang mở form thanh toán…</Text>
          </View>
        ) : null}
        <WebView
          key={checkoutToken}
          source={paySource}
          onMessage={handleMessage}
          onError={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled={false}
          originWhitelist={['*']}
          mixedContentMode="always"
          allowsInlineMediaPlayback
          {...(Platform.OS === 'android'
            ? {
                setSupportMultipleWindows: true,
                thirdPartyCookiesEnabled: true,
                sharedCookiesEnabled: true,
              }
            : {})}
          userAgent={WEBVIEW_UA}
          style={{ flex: 1, backgroundColor: '#ececec' }}
        />
      </View>
    </Modal>
  );
}
