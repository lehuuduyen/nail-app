import { StyleSheet, Text, View } from 'react-native';

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

/**
 * Tóm tắt P&L từ /api/salary/calculate → shopSummary.
 * scope="shop" = cả tiệm (tất cả thợ). scope="employee" = chỉ thợ đang lọc (màn một người).
 */
export default function SalaryShopSummaryBar({ summary, scope = 'shop' }) {
  if (!summary) return null;

  const sub = Number(summary.minPaySubsidyTotal || 0) > 0.005;
  const title =
    scope === 'employee' ? 'TÓM TẮT — THỢ ĐANG XEM' : 'TIỆM — KỲ NÀY';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {scope === 'employee' ? (
        <Text style={styles.scopeNote}>Chỉ một nhân viên — không phải cả tiệm.</Text>
      ) : null}
      <Text style={styles.line}>
        <Text style={styles.muted}>Doanh thu dịch vụ (không tip): </Text>
        <Text style={styles.bold}>{money(summary.serviceRevenueTotal)}</Text>
        <Text style={styles.muted}> · Tip trả thợ: </Text>
        <Text style={styles.amber}>{money(summary.tipsToStaff)}</Text>
      </Text>
      <Text style={styles.line}>
        <Text style={styles.muted}>Tổng trả nhân viên: </Text>
        <Text style={styles.bold}>{money(summary.staffTotalPay)}</Text>
        <Text style={styles.muted}> (gồm lương chia + tip − fee… theo từng dòng)</Text>
      </Text>
      {sub ? (
        <Text style={styles.line}>
          <Text style={styles.muted}>Phần chủ (trước bù bao lương): </Text>
          <Text style={styles.teal}>{money(summary.ownerSplitGrossTotal)}</Text>
          <Text style={styles.muted}> · Bù bao lương / trả thêm: </Text>
          <Text style={styles.red}>({money(summary.minPaySubsidyTotal)})</Text>
        </Text>
      ) : null}
      <Text style={styles.profitLine}>
        <Text style={styles.muted}>Lời chủ (sau bù): </Text>
        <Text
          style={[
            styles.profitAmt,
            Number(summary.ownerNetProfitTotal || 0) < 0 ? styles.negative : styles.positive,
          ]}
        >
          {money(summary.ownerNetProfitTotal)}
        </Text>
      </Text>
      {(Number(summary.tipCreditTotal || 0) > 0 || Number(summary.cleanFeeTotal || 0) > 0) && (
        <Text style={styles.note}>
          Tip credit {money(summary.tipCreditTotal)} · Clean {money(summary.cleanFeeTotal)} (đã vào từng thợ)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 6,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  title: { fontSize: 11, fontWeight: '900', color: '#1B5E20', marginBottom: 4 },
  scopeNote: { fontSize: 9, color: '#2E7D32', marginBottom: 6, fontStyle: 'italic' },
  line: { fontSize: 10, color: '#333', lineHeight: 16, marginBottom: 2 },
  profitLine: { marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#81C784' },
  profitAmt: { fontSize: 14, fontWeight: '900' },
  positive: { color: '#2E7D32' },
  negative: { color: '#C62828' },
  muted: { color: '#555', fontWeight: '600' },
  bold: { fontWeight: '800', color: '#111' },
  amber: { fontWeight: '800', color: '#E65100' },
  teal: { fontWeight: '800', color: '#00695C' },
  red: { fontWeight: '800', color: '#B71C1C' },
  note: { fontSize: 9, color: '#666', marginTop: 6 },
});
