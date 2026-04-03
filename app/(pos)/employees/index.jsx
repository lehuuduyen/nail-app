import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../../api/client';
import { getApiErrorMessage } from '../../../utils/apiError';

function displayLine(e) {
  const num = e.listOrder != null ? e.listOrder : e.id;
  const nick = (e.nickName || '').trim();
  const base = `${(e.firstName || '').toUpperCase()}-${num}`;
  return nick ? `${base} (${nick})` : base;
}

function groupEmployees(rows) {
  const sorted = [...rows].sort((a, b) => {
    const fa = (a.firstName || '').toUpperCase();
    const fb = (b.firstName || '').toUpperCase();
    if (fa !== fb) return fa.localeCompare(fb, 'vi');
    return (a.lastName || '').localeCompare(b.lastName || '', 'vi');
  });
  const by = {};
  for (const r of sorted) {
    const letter = (r.firstName || '?').charAt(0).toUpperCase();
    if (!by[letter]) by[letter] = [];
    by[letter].push(r);
  }
  return Object.keys(by)
    .sort()
    .map((title) => ({ title, data: by[title] }));
}

export default function EmployeesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('active');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/employees');
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(
    () => rows.filter((e) => (tab === 'active' ? e.isActive !== false : e.isActive === false)),
    [rows, tab]
  );

  const sections = useMemo(() => groupEmployees(filtered), [filtered]);

  const onDeactivate = (e) => {
    Alert.alert('Ngưng hoạt động?', displayLine(e), [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          try {
            await api.put(`/api/employees/${e.id}`, { isActive: false });
            load();
          } catch (err) {
            Alert.alert('Lỗi', getApiErrorMessage(err));
          }
        },
      },
    ]);
  };

  const onDeleteInactive = (e) => {
    Alert.alert('Xóa nhân viên?', 'Không hoàn tác nếu có dữ liệu liên quan.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/employees/${e.id}`);
            load();
          } catch (err) {
            Alert.alert('Lỗi', getApiErrorMessage(err));
          }
        },
      },
    ]);
  };

  const padTop = Math.max(insets.top, 8);

  return (
    <View style={[styles.root, { paddingTop: padTop }]}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>ACTIVE EMPLOYEES (THỢ CÒN LÀM)</Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setTab('active')}
          style={[styles.tab, tab === 'active' && styles.tabOn]}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextOn]}>ĐANG LÀM</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('inactive')}
          style={[styles.tab, tab === 'inactive' && styles.tabOn]}
        >
          <Text style={[styles.tabText, tab === 'inactive' && styles.tabTextOn]}>ĐÃ NGHỈ</Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <Pressable style={styles.addBtn} onPress={() => router.push('/(pos)/employees/add')}>
          <Text style={styles.addBtnText}>ADD</Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={styles.hint}>Đang tải…</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLetter}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => router.push(`/(pos)/employees/${item.id}`)}
                onLongPress={() => tab === 'active' && onDeactivate(item)}
              >
                <Text style={styles.rowText}>{displayLine(item)}</Text>
              </Pressable>
              {tab === 'inactive' ? (
                <Pressable onPress={() => onDeleteInactive(item)} hitSlop={8}>
                  <Text style={styles.del}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>{tab === 'active' ? 'Chưa có nhân viên.' : 'Không có thợ đã nghỉ.'}</Text>
          }
        />
      )}

      {tab === 'active' ? (
        <Pressable style={styles.fabInactive} onPress={() => setTab('inactive')}>
          <Text style={styles.fabInactiveText}>INACTIVE EMPLOYEES</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', backgroundColor: '#e8e8e8' },
  titleBar: {
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#bbb',
  },
  title: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },
  tabRow: { flexDirection: 'row', backgroundColor: '#ddd', padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#eee' },
  tabOn: { backgroundColor: '#fff' },
  tabText: { fontWeight: '700', fontSize: 12, color: '#555' },
  tabTextOn: { color: '#0066CC' },
  toolbar: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row' },
  addBtn: {
    borderWidth: 2,
    borderColor: '#111',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  addBtnText: { fontWeight: '800', fontSize: 14 },
  list: { flex: 1, width: '100%' },
  sectionHead: {
    backgroundColor: '#d0d0d0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#999',
  },
  sectionLetter: { fontSize: 18, fontWeight: '800', color: '#333' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#bbb',
  },
  rowMain: { flex: 1 },
  rowText: { fontSize: 17, fontWeight: '600', color: '#111' },
  del: { color: '#c62828', fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 15 },
  hint: { textAlign: 'center', marginTop: 24, color: '#666' },
  fabInactive: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    borderWidth: 2,
    borderColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  fabInactiveText: { fontWeight: '800', fontSize: 11 },
});
