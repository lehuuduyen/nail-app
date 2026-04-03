import { Text, TextInput, TouchableOpacity, View } from 'react-native';

export function DateNavRow({ label, onPrev, onNext }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        gap: 16,
      }}
    >
      <TouchableOpacity onPress={onPrev} style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8 }}>
        <Text style={{ fontSize: 18 }}>←</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#333', flexShrink: 1 }} numberOfLines={2}>
        {label}
      </Text>
      <TouchableOpacity onPress={onNext} style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8 }}>
        <Text style={{ fontSize: 18 }}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DateRangePicker({ startDate, endDate, onChangeStart, onChangeEnd }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 8, gap: 10 }}>
      <View>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Start (YYYY-MM-DD)</Text>
        <TextInput
          value={startDate}
          onChangeText={onChangeStart}
          placeholder="2025-01-01"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#fff',
            fontSize: 15,
          }}
        />
      </View>
      <View>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>End (YYYY-MM-DD)</Text>
        <TextInput
          value={endDate}
          onChangeText={onChangeEnd}
          placeholder="2025-01-31"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#fff',
            fontSize: 15,
          }}
        />
      </View>
    </View>
  );
}
