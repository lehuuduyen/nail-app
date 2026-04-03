import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { formatMoney } from '../../utils/money';

function aggregateByEmployee(transactions, start, end) {
  const map = {};
  for (const t of transactions) {
    if (!t.date || t.date < start || t.date > end) continue;
    const id = t.employeeId;
    if (!map[id]) {
      map[id] = {
        employeeId: id,
        name: t.Employee
          ? `${t.Employee.firstName} ${t.Employee.lastName}`
          : `Employee ${id}`,
        count: 0,
        revenue: 0,
        tips: 0,
      };
    }
    map[id].count += 1;
    map[id].revenue += Number(t.amount || 0);
    map[id].tips += Number(t.tips || 0);
  }
  return Object.values(map);
}

export default function PayrollScreen() {
  const insets = useSafeAreaInsets();
  const [start, setStart] = useState(() =>
    format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd')
  );
  const [end, setEnd] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState([]);
  const [bonusByEmp, setBonusByEmp] = useState({});
  const [paidByEmp, setPaidByEmp] = useState({});

  const load = useCallback(async () => {
    try {
      const { data: txs } = await api.get('/api/transactions', { params: { limit: 500 } });
      const agg = aggregateByEmployee(txs || [], start, end);
      setRows(agg);
    } catch {
      setRows([
        {
          employeeId: 1,
          name: 'LISA TRAM',
          count: 42,
          revenue: 3200,
          tips: 410,
        },
      ]);
    }
  }, [start, end]);

  useEffect(() => {
    load();
  }, [load]);

  const csv = useMemo(() => {
    const header = 'Employee,Services,Revenue,Tips,Bonus,Total\n';
    const body = rows
      .map((r) => {
        const bonus = Number(bonusByEmp[r.employeeId] || 0);
        const total = r.revenue * 0.35 + r.tips + bonus;
        return `${r.name},${r.count},${r.revenue},${r.tips},${bonus},${total}`;
      })
      .join('\n');
    return header + body;
  }, [rows, bonusByEmp]);

  const exportCsv = () => {
    Alert.alert('CSV summary', csv.slice(0, 400) + (csv.length > 400 ? '…' : ''));
  };

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 py-3 bg-white border-b border-neutral-200">
        <Pressable onPress={() => router.back()} className="mr-2">
          <Ionicons name="arrow-back" size={24} />
        </Pressable>
        <Text className="text-xl font-bold flex-1">Payroll</Text>
        <Pressable onPress={exportCsv} className="bg-primary px-3 py-2 rounded-lg">
          <Text className="text-white text-xs font-bold">Export</Text>
        </Pressable>
      </View>
      <View className="flex-row gap-2 p-3 bg-white border-b border-neutral-200">
        <View className="flex-1">
          <Text className="text-[10px] text-neutral-500">Start</Text>
          <TextInput
            value={start}
            onChangeText={setStart}
            placeholder="YYYY-MM-DD"
            className="border border-neutral-200 rounded-lg px-2 py-1 text-sm"
          />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] text-neutral-500">End</Text>
          <TextInput
            value={end}
            onChangeText={setEnd}
            placeholder="YYYY-MM-DD"
            className="border border-neutral-200 rounded-lg px-2 py-1 text-sm"
          />
        </View>
      </View>
      <ScrollView className="p-3">
        {rows.map((r) => {
          const bonus = Number(bonusByEmp[r.employeeId] || 0);
          const commission = r.revenue * 0.35;
          const totalPay = commission + r.tips + bonus;
          return (
            <View
              key={r.employeeId}
              className="bg-white rounded-xl p-3 mb-3 border border-neutral-200"
            >
              <Text className="font-bold text-base">{r.name}</Text>
              <Text className="text-xs text-neutral-500 mt-1">
                Services: {r.count} · Revenue: {formatMoney(r.revenue)}
              </Text>
              <Text className="text-xs mt-1">
                Est. commission (35%): {formatMoney(commission)}
              </Text>
              <Text className="text-xs">Tips: {formatMoney(r.tips)}</Text>
              <View className="flex-row items-center mt-2 gap-2">
                <Text className="text-xs w-16">Bonus</Text>
                <TextInput
                  value={String(bonusByEmp[r.employeeId] ?? '')}
                  onChangeText={(v) =>
                    setBonusByEmp((b) => ({ ...b, [r.employeeId]: v }))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  className="flex-1 border border-neutral-200 rounded-lg px-2 py-1 text-sm"
                />
              </View>
              <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-neutral-100">
                <Text className="font-bold text-pay">TOTAL PAY</Text>
                <Text className="font-bold text-lg text-pay">{formatMoney(totalPay)}</Text>
              </View>
              <View className="flex-row items-center justify-end mt-2">
                <Text className="text-xs text-neutral-500 mr-2">Mark paid</Text>
                <Switch
                  value={!!paidByEmp[r.employeeId]}
                  onValueChange={(v) =>
                    setPaidByEmp((p) => ({ ...p, [r.employeeId]: v }))
                  }
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
