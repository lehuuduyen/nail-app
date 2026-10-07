import { useEffect, useState } from 'react';
import { formatMoney } from '../utils/money';
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
  columns,
  dateLabel,
  unavailable = false,
}) {
  const [details, setDetails] = useState(null);
  useEffect(() => { setDetails(null); }, [visible]);
  const list = Array.isArray(columns) ? columns : [];
  const total = list.reduce((sum, column) => sum + column.totalTurns, 0);
  const close = () => { setDetails(null); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={details ? () => setDetails(null) : close}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>CHECK TURNS</Text>
            <Pressable onPress={close} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.subDate}>
            {dateLabel ||
              `Hôm nay (${getSalonTzDisplayLabel()}) · ${formatSalonTodayReadable()}`}
          </Text>

          {unavailable ? <Text style={styles.empty}>Không tải được dữ liệu server. Tổng bên dưới có thể chưa đầy đủ hoặc chưa cập nhật.</Text> : null}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#D32F2F' }]} />
              <Text style={styles.legendText}>Đỏ = ticket đang Save</Text>
            </View>
          </View>

          {details ? (
            <ScrollView style={styles.list} contentContainerStyle={styles.detailPanel}>
              <Pressable accessibilityRole="button" onPress={() => setDetails(null)}>
                <Text style={styles.back}>‹ Quay lại</Text>
              </Pressable>
              <Text style={styles.empName}>Chi tiết {details.isSaved ? '· Save' : ''}</Text>
              {details.services.map((service, index) => (
                <View key={index} style={styles.row}>
                  <Text style={styles.rowLabel}>{service.name || '—'}</Text>
                  <Text style={styles.rowText}>{formatMoney(service.price)}</Text>
                </View>
              ))}
              {details.customer ? (
                <View style={styles.customer}>
                  <Text style={styles.rowText}>
                    {details.customer.name || [details.customer.firstName, details.customer.lastName].filter(Boolean).join(' ') || 'Khách hàng'}
                  </Text>
                  {details.customer.phone ? <Text style={styles.rowText}>{details.customer.phone}</Text> : null}
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <ScrollView horizontal style={styles.list} contentContainerStyle={styles.columns}>
              {list.length === 0 ? <Text style={styles.empty}>Chưa có dữ liệu turn hôm nay.</Text> : null}
              {list.map((column) => (
                <View key={String(column.employeeId)} style={styles.column}>
                  <Text style={[styles.empName, column.hasSaved && styles.savedText]}>{column.name}</Text>
                  <Text style={styles.amount}>{formatMoney(column.totalAmount)}</Text>
                  <ScrollView nestedScrollEnabled style={styles.ticketList}>
                    {column.rows.map((row) => (
                      <Pressable
                        key={row.key}
                        style={[styles.row, row.isSaved && styles.savedRow]}
                      >
                        <Text style={[styles.rowLabel, row.isSaved && styles.savedText]}>{row.label}</Text>
                        {row.hasDetails ? <Pressable accessibilityRole="button" accessibilityLabel={`Chi tiết ${row.label}`} hitSlop={8} onPress={() => setDetails(row.details)} style={styles.infoBadge}><Text style={styles.infoText}>i</Text></Pressable> : null}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.total}>
            <Text style={styles.totalText}>Tổng turns hôm nay: {total}</Text>
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
  columns: { padding: 12, gap: 12 },
  column: { width: 180, borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingTop: 12, overflow: 'hidden' },
  empName: { fontSize: 14, fontWeight: '700', color: '#333', paddingHorizontal: 12 },
  amount: { fontSize: 16, fontWeight: '600', color: '#333', padding: 12 },
  ticketList: { maxHeight: 300 },
  rowLabel: { flex: 1, fontSize: 14, color: '#333' },
  rowText: { fontSize: 14, color: '#333' },
  savedText: { color: '#D32F2F', fontWeight: '700' },
  savedRow: { backgroundColor: '#FFEBEE' },
  infoBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  infoText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  detailPanel: { padding: 16 },
  back: { color: '#333', fontWeight: '700', paddingVertical: 12 },
  customer: { padding: 12, gap: 6 },
  empty: { padding: 16, color: '#666' },
  total: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  totalText: { fontSize: 12, color: '#555', fontWeight: '600' },
});
