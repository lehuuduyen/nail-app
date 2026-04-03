import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { DateNavRow } from '../../../../components/reports/DateRangePicker';
import {
  StoreByDateTable,
  StoreTransactionsTable,
} from '../../../../components/reports/ExtraReportTables';
import ReportBarChart from '../../../../components/reports/ReportBarChart';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildStoreIncomeSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import { getStoreIncomeByWeek } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { storeByDateToChart } from '../../../../utils/reportAggregates';
import { formatWeekRangeLabel } from '../../../../utils/reportWeekList';
import {
  exportStoreIncomeCSV,
  exportStoreIncomePDF,
  printStoreIncomeReport,
} from '../../../../utils/reportExport';
import { mondayOfCurrentWeek, shiftWeekMonday, weekRangeFromPayload } from '../../../../utils/weekBounds';

function mondayFromParams(raw) {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export default function StoreIncomeByWeek() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const paramMonday = mondayFromParams(params.monday);

  const [startDate, setStartDate] = useState(() => paramMonday || mondayOfCurrentWeek());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (paramMonday) setStartDate(paramMonday);
  }, [paramMonday]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStoreIncomeByWeek(startDate);
      setData(result);
      if (result?.startDate) setStartDate(result.startDate);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate]);

  useEffect(() => {
    load();
  }, [load]);

  const { start: monday, end: weekEnd, rangeLabel } = weekRangeFromPayload(data, startDate);
  const legacyLabel = formatWeekRangeLabel(monday);
  const chartData = data?.byDate ? storeByDateToChart(data.byDate) : null;

  return (
    <ReportLayout
      title="Store Income — By Week"
      loading={loading}
      error={error}
      toolbarDisabled={!data}
      onExportCSV={() => data && exportStoreIncomeCSV(data, `store-income-week-${monday}`)}
      onExportPDF={() => data && exportStoreIncomePDF(data, 'Store Income (Week)', `${monday}–${weekEnd}`)}
      onPrint={() => data && printStoreIncomeReport(data, 'Store Income (Week)', `${monday}–${weekEnd}`)}
      headerBottom={
        <View style={{ backgroundColor: '#eee' }}>
          <DateNavRow
            label={legacyLabel}
            onPrev={() => setStartDate((s) => shiftWeekMonday(s, -1))}
            onNext={() => setStartDate((s) => shiftWeekMonday(s, 1))}
          />
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              paddingBottom: 10,
              gap: 12,
            }}
          >
            <TouchableOpacity onPress={() => setStartDate(mondayOfCurrentWeek())}>
              <Text style={{ color: '#0066CC', fontWeight: '700' }}>This week</Text>
            </TouchableOpacity>
            <Text style={{ color: '#ccc' }}>|</Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(pos)/reports/pick-week',
                  params: { target: 'store' },
                })
              }
            >
              <Text style={{ color: '#0066CC', fontWeight: '700' }}>Pick a week</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ textAlign: 'center', fontSize: 11, color: '#888', paddingBottom: 6 }}>
            {rangeLabel}
          </Text>
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
