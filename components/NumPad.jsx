import { Pressable, Text, View } from 'react-native';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

export function applyNumPadKey(current, key, { allowDecimal = true, maxDecimals = 2 } = {}) {
  if (key === '⌫') return current.slice(0, -1);
  if (key === '.') {
    if (!allowDecimal || current.includes('.')) return current;
    return current === '' ? '0.' : current + '.';
  }
  const next = (current + key).replace(/^0+(\d)/, '$1');
  const dotIdx = next.indexOf('.');
  if (dotIdx !== -1 && next.length - dotIdx - 1 > maxDecimals) return current;
  return next;
}

/**
 * NumPad — màn hình hiển thị số + grid nút 3×4, không mở bàn phím hệ thống.
 *
 * Props:
 *   value        string   giá trị hiện tại (e.g. "30.5")
 *   onChange     fn(str)  callback
 *   label        string   nhãn nhỏ phía trên màn hình (optional)
 *   prefix       string   ký hiệu trước số — default '$'
 *   allowDecimal bool     default true
 *   maxDecimals  number   default 2
 *   accentColor  string   màu viền + số hiển thị — default '#0066CC'
 *   btnColor     string   màu nền nút số — default '#f3f4f6'
 *   delColor     string   màu nền nút xoá — default '#fee2e2'
 *   style        object   style wrapper ngoài
 */
export default function NumPad({
  value,
  onChange,
  label,
  prefix = '$',
  allowDecimal = true,
  maxDecimals = 2,
  accentColor = '#0066CC',
  btnColor = '#f3f4f6',
  delColor = '#fee2e2',
  style,
}) {
  const handleKey = (key) => {
    onChange(applyNumPadKey(value ?? '', key, { allowDecimal, maxDecimals }));
  };

  const isEmpty = !value || value === '';

  return (
    <View style={[{ alignSelf: 'stretch', width: '100%' }, style]}>
    {/* ── Màn hình hiển thị số ── */}
    <View
      style={{
        backgroundColor: '#1a1a2e',
        borderRadius: 14,
        paddingVertical: 18,
        paddingHorizontal: 20,
        alignItems: 'flex-end',
        justifyContent: 'center',
        minHeight: 80,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: accentColor,
        width: '100%',
      }}
    >
      {label ? (
        <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, alignSelf: 'flex-start' }}>
          {label}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: isEmpty ? 32 : 44,
          fontWeight: '800',
          color: isEmpty ? '#4b5563' : '#ffffff',
          letterSpacing: 1,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {prefix}{isEmpty ? '0' : value}
      </Text>
    </View>
  
    {/* ── Grid nút ── */}
    <View style={{ width: '100%' }}>
      {ROWS.map((row, ri) => (
        <View 
          key={ri} 
          style={{ 
            flexDirection: 'row', 
            width: '100%', 
            marginBottom: ri === ROWS.length - 1 ? 0 : 12 
          }}
        >
          {row.map((key, index) => {
            const isDel = key === '⌫';
            const isDot = key === '.';
            const disabled = isDot && !allowDecimal;
            
            // BÍ QUYẾT TOÁN HỌC ĐỂ CANH LỀ HOÀN HẢO:
            // - Cột 1: Sát lề trái (0), hở lề phải (8) 
            // - Cột 2: Hở lề trái (4), hở lề phải (4) 
            // - Cột 3: Hở lề trái (8), sát lề phải (0) 
            // => Tổng không gian bị hao hụt của mỗi cột đều là 8px, giúp 3 nút có chiều ngang bự bằng y chang nhau.
            // => Khoảng cách giữa các nút luôn là 12px (8+4).
            // => Lề ngoài cùng của bàn phím dính sát vào mép, phẳng lì với mép hộp $30!
            let paddingLeft = 0;
            let paddingRight = 0;
            
            if (index === 0) { 
              paddingLeft = 25; 
              paddingRight = 8; 
            } else if (index === 1) { 
              paddingLeft = 25; 
              paddingRight = 4; 
            } else if (index === 2) { 
              paddingLeft = 25; 
              paddingRight = 0; 
            }
  
            return (
              <View key={key} style={{ flex: 1, paddingLeft, paddingRight }}>
                <Pressable
                  onPress={() => !disabled && handleKey(key)}
                  style={({ pressed }) => ({
                    width: '100%', // Nút tự bung đầy không gian đã được căn chỉnh của View bọc ngoài
                    height: 70, 
                    borderRadius: 12,
                    backgroundColor: isDel ? delColor : btnColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.5 : disabled ? 0.25 : 1,
                    borderWidth: 1,
                    borderColor: isDel ? '#fca5a5' : '#e5e7eb',
                  })}
                >
                  <Text
                    style={{
                      fontSize: 32, 
                      fontWeight: '700',
                      color: isDel ? '#dc2626' : '#1f2937',
                    }}
                  >
                    {key}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  </View>
  );
}
