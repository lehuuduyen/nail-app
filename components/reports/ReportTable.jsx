import { ScrollView, Text, View } from 'react-native';

const COLS = ['Tech', 'Tickets', 'Sales', 'Tips', 'Card', 'Cash', 'Total'];

export default function ReportTable({ employees }) {
  if (!employees?.length) {
    return (
      <View style={{ margin: 12, padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
        <Text style={{ color: '#999', textAlign: 'center' }}>No rows for this period.</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: 12 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', minWidth: 640 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 10 }}>
          {COLS.map((h) => (
            <Text
              key={h}
              style={{
                width: h === 'Tech' ? 100 : 72,
                color: '#fff',
                fontSize: 11,
                fontWeight: '700',
                textAlign: h === 'Tech' ? 'left' : 'center',
              }}
            >
              {h}
            </Text>
          ))}
        </View>
        {employees.map((emp, i) => (
          <View
            key={String(emp.id ?? emp.name) + i}
            style={{
              flexDirection: 'row',
              padding: 10,
              backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
              borderBottomWidth: 0.5,
              borderColor: '#eee',
            }}
          >
            <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: '#333' }} numberOfLines={2}>
              {emp.name}
            </Text>
            <Text style={{ width: 72, fontSize: 12, textAlign: 'center', color: '#555' }}>{emp.tickets}</Text>
            <Text style={{ width: 72, fontSize: 12, textAlign: 'center', color: '#4CAF50' }}>
              ${Number(emp.amount || 0).toFixed(2)}
            </Text>
            <Text style={{ width: 72, fontSize: 12, textAlign: 'center', color: '#FF9800' }}>
              ${Number(emp.tips || 0).toFixed(2)}
            </Text>
            <Text style={{ width: 72, fontSize: 12, textAlign: 'center', color: '#9C27B0' }}>
              ${Number(emp.card || 0).toFixed(2)}
            </Text>
            <Text style={{ width: 72, fontSize: 12, textAlign: 'center', color: '#009688' }}>
              ${Number(emp.cash || 0).toFixed(2)}
            </Text>
            <Text style={{ width: 72, fontSize: 12, textAlign: 'center', color: '#E53935', fontWeight: '700' }}>
              ${(Number(emp.amount || 0) + Number(emp.tips || 0)).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
