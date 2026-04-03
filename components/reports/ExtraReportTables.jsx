import { ScrollView, Text, View } from 'react-native';
import { formatCommissionLabel } from '../../constants/employeePayOptions';

export function StoreTransactionsTable({ transactions }) {
  if (!transactions?.length) {
    return (
      <View style={{ margin: 12, padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
        <Text style={{ color: '#999', textAlign: 'center' }}>No transactions.</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: 12 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', minWidth: 520 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 10 }}>
          {['Date', 'Employee', 'Amount', 'Tips', 'Method'].map((h) => (
            <Text
              key={h}
              style={{
                width: h === 'Employee' ? 120 : 88,
                color: '#fff',
                fontSize: 11,
                fontWeight: '700',
                textAlign: h === 'Employee' ? 'left' : 'center',
              }}
            >
              {h}
            </Text>
          ))}
        </View>
        {transactions.map((t, i) => {
          const emp = t.Employee ? `${t.Employee.firstName || ''} ${t.Employee.lastName || ''}`.trim() : '—';
          return (
            <View
              key={String(t.id) + i}
              style={{
                flexDirection: 'row',
                padding: 10,
                backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
                borderBottomWidth: 0.5,
                borderColor: '#eee',
              }}
            >
              <Text style={{ width: 88, fontSize: 12, color: '#333' }}>{t.date}</Text>
              <Text style={{ width: 120, fontSize: 12, color: '#333' }} numberOfLines={2}>
                {emp}
              </Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center', color: '#4CAF50' }}>
                ${Number(t.amount || 0).toFixed(2)}
              </Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center', color: '#FF9800' }}>
                ${Number(t.tips || 0).toFixed(2)}
              </Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center', color: '#555' }}>
                {t.paymentMethod}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function StoreByDateTable({ byDate }) {
  const keys = Object.keys(byDate || {}).sort();
  if (!keys.length) {
    return (
      <View style={{ margin: 12, padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
        <Text style={{ color: '#999', textAlign: 'center' }}>No daily totals.</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: 12 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', minWidth: 480 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 10 }}>
          {['Date', 'Tickets', 'Total', 'Tips', 'Card', 'Cash'].map((h) => (
            <Text
              key={h}
              style={{ width: 88, color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' }}
            >
              {h}
            </Text>
          ))}
        </View>
        {keys.map((day, i) => {
          const row = byDate[day];
          return (
            <View
              key={day}
              style={{
                flexDirection: 'row',
                padding: 10,
                backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
                borderBottomWidth: 0.5,
                borderColor: '#eee',
              }}
            >
              <Text style={{ width: 88, fontSize: 12, color: '#333' }}>{day}</Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center' }}>{row.tickets}</Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center', color: '#4CAF50' }}>
                ${Number(row.total || 0).toFixed(2)}
              </Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center', color: '#FF9800' }}>
                ${Number(row.tips || 0).toFixed(2)}
              </Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center', color: '#9C27B0' }}>
                ${Number(row.card || 0).toFixed(2)}
              </Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center', color: '#009688' }}>
                ${Number(row.cash || 0).toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function OwnerAdvancedTable({ employees }) {
  if (!employees?.length) {
    return (
      <View style={{ margin: 12, padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
        <Text style={{ color: '#999', textAlign: 'center' }}>No data.</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: 12 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', minWidth: 560 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 10 }}>
          {['Name', 'Pay', 'Tickets', 'Revenue', 'Commission', 'Tips'].map((h) => (
            <Text
              key={h}
              style={{
                width: h === 'Name' ? 110 : 78,
                color: '#fff',
                fontSize: 11,
                fontWeight: '700',
                textAlign: h === 'Name' ? 'left' : 'center',
              }}
            >
              {h}
            </Text>
          ))}
        </View>
        {employees.map((e, i) => (
          <View
            key={String(e.id ?? e.name) + i}
            style={{
              flexDirection: 'row',
              padding: 10,
              backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
              borderBottomWidth: 0.5,
              borderColor: '#eee',
            }}
          >
            <Text style={{ width: 110, fontSize: 12, fontWeight: '600' }} numberOfLines={2}>
              {e.name}
            </Text>
            <Text style={{ width: 78, fontSize: 11, textAlign: 'center' }} numberOfLines={2}>
              {formatCommissionLabel(e.commissionTechPct ?? 0, e.commissionOwnerPct ?? 0)}
            </Text>
            <Text style={{ width: 78, fontSize: 12, textAlign: 'center' }}>{e.tickets}</Text>
            <Text style={{ width: 78, fontSize: 12, textAlign: 'center', color: '#4CAF50' }}>
              ${Number(e.revenue || 0).toFixed(2)}
            </Text>
            <Text style={{ width: 78, fontSize: 12, textAlign: 'center', color: '#9C27B0' }}>
              ${Number(e.commission || 0).toFixed(2)}
            </Text>
            <Text style={{ width: 78, fontSize: 12, textAlign: 'center', color: '#FF9800' }}>
              ${Number(e.tips || 0).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function PedicureLogTable({ transactions }) {
  if (!transactions?.length) {
    return (
      <View style={{ margin: 12, padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
        <Text style={{ color: '#999', textAlign: 'center' }}>No pedicure services in range.</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: 12 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', minWidth: 560 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 10 }}>
          {['Date', 'Tech', 'Service', 'Amount', 'Tips', 'Pay'].map((h) => (
            <Text
              key={h}
              style={{
                width: h === 'Service' ? 140 : 88,
                color: '#fff',
                fontSize: 11,
                fontWeight: '700',
                textAlign: h === 'Service' || h === 'Tech' ? 'left' : 'center',
              }}
            >
              {h}
            </Text>
          ))}
        </View>
        {transactions.map((t, i) => {
          const emp = t.Employee ? `${t.Employee.firstName || ''} ${t.Employee.lastName || ''}`.trim() : '—';
          return (
            <View
              key={String(t.id) + i}
              style={{
                flexDirection: 'row',
                padding: 10,
                backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
                borderBottomWidth: 0.5,
                borderColor: '#eee',
              }}
            >
              <Text style={{ width: 88, fontSize: 12 }}>{t.date}</Text>
              <Text style={{ width: 88, fontSize: 12 }} numberOfLines={2}>
                {emp}
              </Text>
              <Text style={{ width: 140, fontSize: 12 }} numberOfLines={2}>
                {t.Service?.name || '—'}
              </Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center', color: '#4CAF50' }}>
                ${Number(t.amount || 0).toFixed(2)}
              </Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center', color: '#FF9800' }}>
                ${Number(t.tips || 0).toFixed(2)}
              </Text>
              <Text style={{ width: 88, fontSize: 12, textAlign: 'center' }}>{t.paymentMethod}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
