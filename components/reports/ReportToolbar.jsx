import { Text, TouchableOpacity, View } from 'react-native';

const exportBtnStyle = (bg) => ({
  backgroundColor: bg,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 6,
});

export default function ReportToolbar({ onExportCSV, onExportPDF, onPrint, disabled }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <TouchableOpacity
        onPress={onExportCSV}
        disabled={disabled}
        style={[exportBtnStyle('#2196F3'), disabled && { opacity: 0.4 }]}
      >
        <Text style={{ color: '#fff', fontSize: 11 }}>CSV</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onExportPDF}
        disabled={disabled}
        style={[exportBtnStyle('#E53935'), disabled && { opacity: 0.4 }]}
      >
        <Text style={{ color: '#fff', fontSize: 11 }}>PDF</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPrint}
        disabled={disabled}
        style={[exportBtnStyle('#4CAF50'), disabled && { opacity: 0.4 }]}
      >
        <Text style={{ color: '#fff', fontSize: 11 }}>Print</Text>
      </TouchableOpacity>
    </View>
  );
}
