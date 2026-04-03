import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatSalonTodayReadable, getSalonTzDisplayLabel } from '../utils/salonTz';

export default function CheckTurnModal({
  visible,
  onClose,
  turnData,
  suggested,
  dateLabel,
}) {
  const sorted = [...(turnData || [])].sort((a, b) => {
    if (a.turns !== b.turns) return a.turns - b.turns;
    if (!a.lastServed) return -1;
    if (!b.lastServed) return 1;
    return new Date(a.lastServed) - new Date(b.lastServed);
  });

  const total = (turnData || []).reduce((s, e) => s + e.turns, 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>CHECK TURNS</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.subDate}>
            {dateLabel ||
              `Hôm nay (${getSalonTzDisplayLabel()}) · ${formatSalonTodayReadable()}`}
          </Text>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Next (ít walk-in turn nhất)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.legendText}>Có hẹn</Text>
            </View>
          </View>

          <ScrollView style={styles.list} nestedScrollEnabled>
            {sorted.map((emp, i) => (
              <View
                key={String(emp.employeeId)}
                style={[
                  styles.row,
                  emp.employeeId === suggested && styles.suggestedRow,
                ]}
              >
                <Text style={styles.rank}>#{i + 1}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.empName} numberOfLines={1}>
                    {emp.name}
                  </Text>
                  {emp.employeeId === suggested ? (
                    <Text style={styles.nextTag}>★ NEXT TURN</Text>
                  ) : null}
                </View>
                <View style={styles.turnBadge}>
                  <Text style={styles.turnNum}>{emp.turns}</Text>
                  <Text style={styles.turnLabel2}>turns</Text>
                </View>
                {emp.appointments > 0 ? (
                  <View style={[styles.turnBadge, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={[styles.turnNum, { color: '#1565C0' }]}>
                      {emp.appointments}
                    </Text>
                    <Text style={[styles.turnLabel2, { color: '#1565C0' }]}>appt</Text>
                  </View>
                ) : null}
                <Text style={styles.lastServed} numberOfLines={1}>
                  {emp.lastServed
                    ? new Date(emp.lastServed).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.total}>
            <Text style={styles.totalText}>Tổng walk-in turns hôm nay: {total}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    backgroundColor: '#1a1a2e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  close: { color: '#fff', fontSize: 20, paddingHorizontal: 4 },
  subDate: {
    fontSize: 11,
    color: '#666',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: '#666' },
  list: { maxHeight: 420 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 8,
  },
  suggestedRow: { backgroundColor: '#F1F8E9' },
  rank: { width: 26, fontSize: 12, color: '#999', fontWeight: '600' },
  empName: { fontSize: 13, fontWeight: '700', color: '#333' },
  nextTag: { fontSize: 9, color: '#4CAF50', fontWeight: '600', marginTop: 2 },
  turnBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 48,
  },
  turnNum: { fontSize: 16, fontWeight: '700', color: '#333' },
  turnLabel2: { fontSize: 8, color: '#999' },
  lastServed: {
    fontSize: 10,
    color: '#999',
    width: 52,
    textAlign: 'right',
  },
  total: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  totalText: { fontSize: 12, color: '#555', fontWeight: '600' },
});
