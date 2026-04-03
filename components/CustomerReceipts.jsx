import { ScrollView, Text, View } from 'react-native';

const HEADER = '#9eccc9';
const HEADER_TEXT = '#004d40';
const PAID_BAND = '#c5e1a5';

export default function CustomerReceipts({
  paidReceipts = [],
  unpaidReceipts = [],
  daySubtext = '',
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#f7f7f7', margin: 4, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc' }}>
      <View style={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '900', color: '#111', letterSpacing: 0.5 }}>CUSTOMER RECEIPTS</Text>
        {daySubtext ? (
          <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{daySubtext}</Text>
        ) : null}
      </View>

      <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 6, paddingBottom: 12 }}>
          <View style={{ backgroundColor: PAID_BAND, paddingVertical: 4, paddingHorizontal: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#111' }}>Paid Receipts</Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              paddingVertical: 4,
              paddingHorizontal: 4,
              backgroundColor: HEADER,
              marginBottom: 2,
            }}
          >
            <Text style={{ flex: 1, fontSize: 8, fontWeight: '800', color: HEADER_TEXT }}>Receipt ID</Text>
            <Text style={{ flex: 1.4, fontSize: 8, fontWeight: '800', color: HEADER_TEXT }}>Payment Type</Text>
            <Text style={{ flex: 1, fontSize: 8, fontWeight: '800', color: HEADER_TEXT }}>Total Due</Text>
            <Text style={{ flex: 1, fontSize: 8, fontWeight: '800', color: HEADER_TEXT }}>Amount Due</Text>
          </View>
          {paidReceipts.map((r) => (
            <View key={String(r.id)} style={{ borderBottomWidth: 1, borderBottomColor: '#e8e8e8', paddingVertical: 6, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ flex: 1, fontSize: 10, fontWeight: '800', color: '#111' }}>{r.id}</Text>
                <Text style={{ flex: 1.4, fontSize: 10, fontWeight: '700', color: '#111' }} numberOfLines={2}>
                  {r.paymentType}
                </Text>
                <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: '#111' }}>${r.total}</Text>
                <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: '#111' }}>
                  {r.amountDue === '' || r.amountDue == null ? '' : `$${r.amountDue}`}
                </Text>
              </View>
              {r.serviceBy ? (
                <Text style={{ fontSize: 9, color: '#555', marginTop: 4 }}>Service By: {r.serviceBy}</Text>
              ) : null}
            </View>
          ))}

          <View style={{ backgroundColor: PAID_BAND, paddingVertical: 4, paddingHorizontal: 6, marginTop: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#111' }}>Unpaid Receipts</Text>
          </View>
          {unpaidReceipts.length === 0 ? (
            <Text style={{ fontSize: 10, color: '#888', fontStyle: 'italic', padding: 8 }}>None</Text>
          ) : (
            unpaidReceipts.map((r) => (
              <View key={String(r.id)} style={{ borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 6, paddingHorizontal: 4 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#111', marginRight: 8 }}>{r.id}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#111', marginRight: 8 }}>{r.paymentType}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#c62828' }}>${r.total}</Text>
                </View>
                {r.serviceBy ? (
                  <Text style={{ fontSize: 9, color: '#555', marginTop: 4 }}>{r.serviceBy}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
