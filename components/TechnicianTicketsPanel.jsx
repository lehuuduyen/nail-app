import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { techTicketRowSummary } from '../utils/ticketDisplay';

const HEADER_BG = '#b0b0b0';

const COL = { flex: 1, minWidth: 0, paddingHorizontal: 2 };

export default function TechnicianTicketsPanel({ transactions, onRowPress }) {
  return (
    <View style={styles.panel}>
      <View style={[styles.headerRow, { backgroundColor: HEADER_BG }]}>
        <Text style={styles.th}>Date</Text>
        <Text style={styles.th}>Employee</Text>
        <Text style={styles.th}>Amount</Text>
        <Text style={styles.th}>Tip Card</Text>
      </View>
      <View style={styles.bannerWrap}>
        <Text style={styles.banner}>TECHNICIAN TICKETS</Text>
        <Text style={styles.bannerHint}>Chạm dòng để sửa</Text>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
        {(transactions || []).map((tx) => {
          const row = techTicketRowSummary(tx);
          return (
            <Pressable
              key={String(tx.id)}
              onPress={() => onRowPress?.(tx)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.dataRow}>
                <Text style={[COL, styles.tdDate]} numberOfLines={1}>
                  {row.dateLabel}
                </Text>
                <Text style={[COL, styles.tdEmp]} numberOfLines={2}>
                  {row.employee}
                </Text>
                <Text style={[COL, styles.tdAmt]} numberOfLines={1}>
                  {row.amountStr}
                </Text>
                <Text style={[COL, styles.tdTip]} numberOfLines={1}>
                  {row.tipStr}
                </Text>
              </View>
              {row.timeStr ? <Text style={styles.timeLine}>{row.timeStr}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, minWidth: 200, backgroundColor: '#fff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#737373',
  },
  th: {
    ...COL,
    fontSize: 9,
    fontWeight: '800',
    color: '#171717',
    textAlign: 'center',
  },
  bannerWrap: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d4',
    paddingVertical: 6,
  },
  banner: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    color: '#262626',
  },
  bannerHint: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
    color: '#737373',
    marginTop: 2,
  },
  scroll: { flex: 1 },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  rowPressed: { backgroundColor: '#f5f5f5' },
  dataRow: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  tdDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1d4ed8',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  tdEmp: { fontSize: 10, fontWeight: '700', color: '#171717', textAlign: 'center' },
  tdAmt: { fontSize: 10, fontWeight: '600', color: '#1d4ed8', textAlign: 'center' },
  tdTip: { fontSize: 10, fontWeight: '800', color: '#171717', textAlign: 'center' },
  timeLine: { fontSize: 9, color: '#737373', textAlign: 'right', marginTop: 2, paddingRight: 4 },
});
