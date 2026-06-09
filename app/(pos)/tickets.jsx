import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { subDays } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { useOwnerStore } from '../../store/ownerStore';
import { usePosStore } from '../../store/posStore';
import { formatEmployeeNameFromDb } from '../../utils/staffDisplay';
import { formatMoney, splitTransactionAmountForDisplay } from '../../utils/money';
import { formatTxListTime, formatYmdAsTicketLabel } from '../../utils/ticketDisplay';
import { getSalonDateYmd } from '../../utils/salonTz';

const PINK_ROW = '#F5B7B1';
const TABLE_HEAD = '#2a2a2a';

/** Cột co giãn theo 100% chiều ngang màn hình (không fix width px). */
const COLS = [
  { key: 'workdate', label: 'WORKDATE', flex: 1.05 },
  { key: 'id', label: 'ID...', flex: 0.55 },
  { key: 'tech', label: 'TECH', flex: 1.35 },
  { key: 'amount', label: 'AMOUNT', flex: 0.95 },
  { key: 'tip', label: 'TIP', flex: 0.75 },
  { key: 'card', label: 'CARD', flex: 0.9 },
  { key: 'cash', label: 'CASH', flex: 0.9 },
  { key: 'gift', label: 'GIFT', flex: 0.65 },
  { key: 'check', label: 'CHECK', flex: 0.65 },
  { key: 'discount', label: 'DISCOUNT', flex: 0.85 },
];

const TABLE_HEADER_ROW_H = 40;

function isServerTicketId(id) {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 && !String(id).startsWith('local');
}

function cellStyle(flex, extra = {}) {
  return {
    flex,
    minWidth: 0,
    paddingHorizontal: 3,
    ...extra,
  };
}

function ymdFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const isOwnerMode = useOwnerStore((s) => s.isOwnerMode);
  const [selectedYmd, setSelectedYmd] = useState(null);
  const [rows, setRows] = useState([]);
  const [reversed, setReversed] = useState(false);

  const dateRows = useMemo(() => {
    const todayYmd = getSalonDateYmd();
    const [y, m, d] = todayYmd.split('-').map(Number);
    let cur = new Date(y, m - 1, d);
    const out = [];
    for (let i = 0; i < 30; i++) {
      const ymd = ymdFromDate(cur);
      out.push({ ymd, label: formatYmdAsTicketLabel(ymd) });
      cur = subDays(cur, 1);
    }
    return out;
  }, []);

  const loadForDate = useCallback(async (ymd) => {
    try {
      const { data } = await api.get('/api/transactions', {
        params: { limit: 500, date: ymd },
      });
      setRows(data || []);
    } catch {
      setRows([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selectedYmd) loadForDate(selectedYmd);
    }, [selectedYmd, loadForDate])
  );

  const displayRows = useMemo(() => {
    const r = [...rows];
    if (reversed) r.reverse();
    return r;
  }, [rows, reversed]);

  const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  const renderTicketRow = useCallback(
    ({ item: tx, index: idx }) => {
      const { withoutTip, tip, total } = splitTransactionAmountForDisplay(tx);
      const tech = formatEmployeeNameFromDb(tx?.Employee ?? tx?.employee) || '—';
      const notes = String(tx?.notes || '');
      const timeStr = formatTxListTime(tx);
      const pm = String(tx.paymentMethod || 'cash').toLowerCase();
      const cardAmt = pm === 'card' ? total : 0;
      const cashAmt = pm === 'cash' ? total : 0;
      const disc =
        notes.includes('disc:') ? notes.split('disc:')[1]?.split('·')[0]?.trim() || '0' : '0';

      const openTicketDetail = () => {
        const title = `Ticket #${tx.id}`;
        const msg = `${tech}\n${formatMoney(total)}`;
        if (isOwnerMode && isServerTicketId(tx.id)) {
          Alert.alert(title, msg, [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Xóa',
              style: 'destructive',
              onPress: () => {
                Alert.alert('Xóa ticket?', `Ticket #${tx.id} sẽ bị xóa vĩnh viễn.`, [
                  { text: 'Huỷ', style: 'cancel' },
                  {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.delete(`/api/transactions/${tx.id}`);
                        usePosStore.getState().bumpHomeRefresh();
                        setRows((r) => r.filter((t) => String(t.id) !== String(tx.id)));
                      } catch {
                        Alert.alert('Lỗi', 'Không xóa được ticket.');
                      }
                    },
                  },
                ]);
              },
            },
          ]);
          return;
        }
        Alert.alert(title, msg);
      };

      return (
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
            backgroundColor: idx % 2 === 0 ? '#fff' : '#f5f5f5',
            width: '100%',
          }}
        >
          <Pressable
            onPress={openTicketDetail}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: '100%',
              paddingVertical: 10,
              paddingHorizontal: 4,
            }}
          >
            <Text style={cellStyle(COLS[0].flex, { fontSize: 10, fontWeight: '600', color: '#111' })} numberOfLines={1}>
              {formatYmdAsTicketLabel(tx.date || selectedYmd)}
            </Text>
            <Text style={cellStyle(COLS[1].flex, { fontSize: 10, fontFamily: mono, fontWeight: '700', color: '#111' })} numberOfLines={1}>
              {tx.id}
            </Text>
            <Text style={cellStyle(COLS[2].flex, { fontSize: 10, fontWeight: '700', color: '#111' })} numberOfLines={2}>
              {tech}
            </Text>
            <Text
              style={cellStyle(COLS[3].flex, {
                fontSize: 10,
                fontWeight: '700',
                color: '#1565c0',
                textDecorationLine: 'underline',
              })}
              numberOfLines={1}
            >
              {formatMoney(withoutTip)}
            </Text>
            <Text style={cellStyle(COLS[4].flex, { fontSize: 10, fontWeight: '800', color: '#111' })} numberOfLines={1}>
              {formatMoney(tip)}
            </Text>
            <Text style={cellStyle(COLS[5].flex, { fontSize: 10, color: '#333' })} numberOfLines={1}>
              {formatMoney(cardAmt)}
            </Text>
            <Text style={cellStyle(COLS[6].flex, { fontSize: 10, color: '#333' })} numberOfLines={1}>
              {formatMoney(cashAmt)}
            </Text>
            <Text style={cellStyle(COLS[7].flex, { fontSize: 10, color: '#333' })} numberOfLines={1}>
              $0.00
            </Text>
            <Text style={cellStyle(COLS[8].flex, { fontSize: 10, color: '#333' })} numberOfLines={1}>
              $0.00
            </Text>
            <Text style={cellStyle(COLS[9].flex, { fontSize: 10, color: '#333' })} numberOfLines={1}>
              {disc === '0' || !disc ? '$0.00' : disc.startsWith('$') ? disc : `$${disc}`}
            </Text>
          </Pressable>
          {timeStr ? (
            <Text
              style={{
                fontSize: 9,
                color: '#9e9e9e',
                textAlign: 'right',
                paddingRight: 10,
                paddingBottom: 6,
              }}
            >
              {timeStr}
            </Text>
          ) : null}
        </View>
      );
    },
    [mono, selectedYmd, isOwnerMode]
  );

  if (selectedYmd == null) {
    return (
      <View style={{ flex: 1, width: '100%', backgroundColor: '#fff', paddingTop: insets.top }}>
        <Text
          style={{
            textAlign: 'center',
            fontWeight: '900',
            color: '#111',
            paddingVertical: 14,
            paddingHorizontal: 8,
            fontSize: 14,
            letterSpacing: 0.3,
          }}
        >
          SELECT A DATE (CHỌN 1 NGÀY)
        </Text>
        <View style={{ flex: 1, minHeight: 0, width: '100%' }}>
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 8 }}
            showsVerticalScrollIndicator={false}
          >
            {dateRows.map((item, i) => (
              <Pressable
                key={item.ymd}
                onPress={() => setSelectedYmd(item.ymd)}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: '#ccc',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  backgroundColor: i % 2 === 0 ? '#fff' : PINK_ROW,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, width: '100%', alignSelf: 'stretch', backgroundColor: '#fff', paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          paddingHorizontal: 4,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#ccc',
          backgroundColor: '#fff',
        }}
      >
        <Pressable
          onPress={() => setSelectedYmd(null)}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 6, maxWidth: '42%' }}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              color: '#222',
              marginLeft: 4,
              textTransform: 'uppercase',
            }}
            numberOfLines={2}
          >
            SELECT A DATE (CHỌN 1 NGÀY)
          </Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontWeight: '900',
            color: '#111',
            fontSize: 13,
            textTransform: 'uppercase',
          }}
          numberOfLines={1}
        >
          {formatYmdAsTicketLabel(selectedYmd)}
        </Text>
        <Pressable onPress={() => setReversed((v) => !v)} style={{ paddingHorizontal: 12, paddingVertical: 8, minWidth: 72 }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#111', textTransform: 'uppercase' }}>REORDER</Text>
        </Pressable>
      </View>

      <View
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          alignSelf: 'stretch',
          backgroundColor: '#fff',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            height: TABLE_HEADER_ROW_H,
            paddingHorizontal: 4,
            backgroundColor: TABLE_HEAD,
          }}
        >
          {COLS.map((c) => (
            <Text
              key={c.key}
              style={cellStyle(c.flex, {
                fontSize: 8,
                fontWeight: '800',
                color: '#fff',
                textTransform: 'uppercase',
              })}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {c.label}
            </Text>
          ))}
        </View>

        <FlatList
          data={displayRows}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTicketRow}
          style={{ flex: 1, width: '100%', alignSelf: 'stretch' }}
          showsVerticalScrollIndicator
          ListEmptyComponent={
            <Text style={{ padding: 24, textAlign: 'center', color: '#666', fontSize: 14 }}>
              No tickets for this date.
            </Text>
          }
          contentContainerStyle={
            displayRows.length === 0
              ? { flexGrow: 1, justifyContent: 'center', paddingBottom: insets.bottom + 8 }
              : { flexGrow: 1, paddingBottom: insets.bottom + 8 }
          }
        />
      </View>
    </View>
  );
}
