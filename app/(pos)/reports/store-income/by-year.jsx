import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { StoreByDateTable, StoreTransactionsTable } from '../../../../components/reports/ExtraReportTables';
import ReportBarChart from '../../../../components/reports/ReportBarChart';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildStoreIncomeSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import { getStoreIncomeByYear } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { byDateToByMonthChart } from '../../../../utils/reportAggregates';
import {
  exportStoreIncomeCSV,
  exportStoreIncomePDF,
  printStoreIncomeReport,
} from '../../../../utils/reportExport';

export default function StoreIncomeByYear() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStoreIncomeByYear(year);
      setData(result);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const label = `Year ${year}`;
  const byMonth = data?.byDate ? byDateToByMonthChart(data.byDate) : null;

  return (
    <ReportLayout
      title="Store Income — By Year"
      loading={loading}
      error={error}
      toolbarDisabled={!data}
      onExportCSV={() => data && exportStoreIncomeCSV(data, `store-income-year-${year}`)}
      onExportPDF={() => data && exportStoreIncomePDF(data, 'Store Income (Year)', label)}
      onPrint={() => data && printStoreIncomeReport(data, 'Store Income (Year)', label)}
      headerBottom={
        <View style={{ backgroundColor: '#eee', paddingVertical: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              gap: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => setYear((y) => y - 1)}
              style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8 }}
            >
              <Text style={{ fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#333' }}>{year}</Text>
            <TouchableOpacity
              onPress={() => setYear((y) => y + 1)}
              style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8 }}
            >
              <Text style={{ fontSize: 18 }}>→</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setYear(new Date().getFullYear())} style={{ alignSelf: 'center' }}>
            <Text style={{ color: '#0066CC', fontWeight: '600' }}>Current year</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {data ? (
        <>
          <ReportSummaryCards items={buildStoreIncomeSummaryItems(data)} />
          {byMonth ? <ReportBarChart data={byMonth} title="Revenue by month" /> : null}
          <StoreByDateTable byDate={byMonth} />
          <StoreTransactionsTable transactions={data.transactions} />
        </>
      ) : null}
    </ReportLayout>
  );
}
