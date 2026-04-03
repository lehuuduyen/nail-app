import { Dimensions, Text, View } from 'react-native';

const W = Dimensions.get('window').width;
const CARD_GAP = 10;
const CARD_W = Math.min(160, (W - 24 - CARD_GAP * 2) / 3);

export function buildTechnicianSummaryItems(data) {
  const t = data?.totals || {};
  return [
    { label: 'Total Tickets', value: t.tickets || 0, color: '#2196F3', prefix: '' },
    { label: 'Sales (no tip)', value: t.amount || 0, color: '#4CAF50', prefix: '$' },
    { label: 'Total Tips', value: t.tips || 0, color: '#FF9800', prefix: '$' },
    { label: 'Card Payment', value: t.card || 0, color: '#9C27B0', prefix: '$' },
    { label: 'Cash Payment', value: t.cash || 0, color: '#009688', prefix: '$' },
    {
      label: 'Grand Total',
      value: (Number(t.amount || 0) + Number(t.tips || 0)),
      color: '#E53935',
      prefix: '$',
    },
  ];
}

export function buildStoreIncomeSummaryItems(data) {
  const t = data?.totals || {};
  const revenue = Number(t.total || 0);
  const tips = Number(t.tips || 0);
  return [
    { label: 'Tickets', value: t.tickets || 0, color: '#2196F3', prefix: '' },
    { label: 'Revenue', value: revenue, color: '#4CAF50', prefix: '$' },
    { label: 'Tips', value: tips, color: '#FF9800', prefix: '$' },
    { label: 'Card', value: t.card || 0, color: '#9C27B0', prefix: '$' },
    { label: 'Cash', value: t.cash || 0, color: '#009688', prefix: '$' },
    { label: 'Grand Total', value: revenue + tips, color: '#E53935', prefix: '$' },
  ];
}

export function buildOwnerAdvancedSummaryItems(data) {
  const t = data?.totals || {};
  const tickets = (data?.employees || []).reduce((s, e) => s + (e.tickets || 0), 0);
  return [
    { label: 'Tickets', value: tickets, color: '#2196F3', prefix: '' },
    { label: 'Revenue', value: t.revenue || 0, color: '#4CAF50', prefix: '$' },
    { label: 'Commission', value: t.commission || 0, color: '#9C27B0', prefix: '$' },
    { label: 'Tips', value: t.tips || 0, color: '#FF9800', prefix: '$' },
  ];
}

export function buildPedicureSummaryItems(data) {
  const tx = data?.transactions || [];
  const count = tx.length;
  const sales = tx.reduce((s, t) => {
    const a = Number(t.amount || 0);
    const tip = Number(t.tips || 0);
    return s + Math.max(0, a - tip);
  }, 0);
  const tips = tx.reduce((s, t) => s + Number(t.tips || 0), 0);
  const collected = tx.reduce((s, t) => s + Number(t.amount || 0), 0);
  return [
    { label: 'Services', value: count, color: '#2196F3', prefix: '' },
    { label: 'Sales (no tip)', value: sales, color: '#4CAF50', prefix: '$' },
    { label: 'Tips', value: tips, color: '#FF9800', prefix: '$' },
    { label: 'Collected', value: collected, color: '#E53935', prefix: '$' },
  ];
}

export default function ReportSummaryCards({ items }) {
  if (!items?.length) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        gap: CARD_GAP,
        justifyContent: 'flex-start',
      }}
    >
      {items.map((card) => (
        <View
          key={card.label}
          style={{
            width: CARD_W,
            minWidth: CARD_W,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 12,
            borderTopWidth: 4,
            borderTopColor: card.color,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{card.label}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: card.color }}>
            {card.prefix}
            {typeof card.value === 'number'
              ? card.prefix === ''
                ? String(Math.round(card.value))
                : card.value.toFixed(2)
              : card.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
