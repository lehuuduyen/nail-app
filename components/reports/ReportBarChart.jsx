import { Dimensions, ScrollView, Text, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const screenW = Dimensions.get('window').width;

/**
 * @param {Record<string, { amount?: number }>} data - keyed buckets, e.g. byDay / byMonth
 */
export default function ReportBarChart({ data, title, color = '#E53935' }) {
  if (!data || typeof data !== 'object') return null;
  const labels = Object.keys(data);
  if (!labels.length) return null;

  const amounts = labels.map((k) => parseFloat(data[k]?.amount || 0));
  const max = Math.max(...amounts, 0);
  if (max <= 0 && amounts.every((a) => a === 0)) {
    return (
      <View style={{ backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8 }}>{title}</Text>
        <Text style={{ color: '#999' }}>No revenue in this period.</Text>
      </View>
    );
  }

  const shortLabels = labels.map((l) => (l.length > 8 ? `${l.slice(0, 7)}…` : l));
  const chartW = Math.max(screenW - 48, shortLabels.length * 56);

  return (
    <View style={{ backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 }}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={{
            labels: shortLabels,
            datasets: [{ data: amounts.length ? amounts : [0] }],
          }}
          width={chartW}
          height={220}
          yAxisLabel="$"
          yAxisSuffix=""
          fromZero
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(229, 57, 53, ${opacity})`,
            labelColor: () => '#666',
            style: { borderRadius: 8 },
          }}
          style={{ borderRadius: 8 }}
          showValuesOnTopOfBars
        />
      </ScrollView>
    </View>
  );
}
