import { format, subDays } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import DateRangePicker from '../../../../components/reports/DateRangePicker';
import {
  StoreByDateTable,
  StoreTransactionsTable,
} from '../../../../components/reports/ExtraReportTables';
import ReportBarChart from '../../../../components/reports/ReportBarChart';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildStoreIncomeSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import { getStoreIncomeByRange } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { storeByDateToChart } from '../../../../utils/reportAggregates';
import {
  exportStoreIncomeCSV,
  exportStoreIncomePDF,
  printStoreIncomeReport,
} from '../../../../utils/reportExport';

export default function StoreIncomeByRange() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStoreIncomeByRange(startDate, endDate);
      setData(result);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const rangeLabel = `${startDate} → ${endDate}`;
  const chartData = data?.byDate ? storeByDateToChart(data.byDate) : null;

  return (
    <ReportLayout
      title="Store Income — By Range"
      loading={loading}
      error={error}
      toolbarDisabled={!data}
      onExportCSV={() => data && exportStoreIncomeCSV(data, `store-income-range-${startDate}_${endDate}`)}
      onExportPDF={() => data && exportStoreIncomePDF(data, 'Store Income (Range)', rangeLabel)}
      onPrint={() => data && printStoreIncomeReport(data, 'Store Income (Range)', rangeLabel)}
      headerBottom={
        <View style={{ backgroundColor: '#eee' }}>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChangeStart={setStartDate}
            onChangeEnd={setEndDate}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 12 }}>
            <TouchableOpacity
              onPress={load}
              style={{ backgroundColor: '#0066CC', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    >
      {data ? (
        <>
          <ReportSummaryCards items={buildStoreIncomeSummaryItems(data)} />
          {chartData && Object.keys(chartData).length ? (
            <ReportBarChart data={chartData} title="Daily revenue" />
          ) : null}
          <StoreByDateTable byDate={data.byDate} />
          <StoreTransactionsTable transactions={data.transactions} />
        </>
      ) : null}
    </ReportLayout>
  );
}
