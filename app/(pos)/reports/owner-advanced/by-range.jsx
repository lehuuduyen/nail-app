import { format, subDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import DateRangePicker from '../../../../components/reports/DateRangePicker';
import { OwnerAdvancedTable } from '../../../../components/reports/ExtraReportTables';
import ReportBarChart from '../../../../components/reports/ReportBarChart';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildOwnerAdvancedSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import { getOwnerAdvancedByRange } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import {
  exportOwnerAdvancedCSV,
  exportOwnerAdvancedPDF,
  printOwnerAdvancedReport,
} from '../../../../utils/reportExport';

export default function OwnerAdvancedByRange() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOwnerAdvancedByRange(startDate, endDate);
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

  const chartData = useMemo(() => {
    const out = {};
    (data?.employees || []).forEach((e, i) => {
      const nm = (e.name || '?').length > 10 ? `${(e.name || '?').slice(0, 9)}…` : e.name || '?';
      out[`${i + 1}. ${nm}`] = { amount: parseFloat(e.revenue || 0) };
    });
    return out;
  }, [data]);

  return (
    <ReportLayout
      title="Owner Advanced — By Range"
      loading={loading}
      error={error}
      toolbarDisabled={!data?.employees}
      onExportCSV={() => data && exportOwnerAdvancedCSV(data, `owner-advanced-${startDate}_${endDate}`)}
      onExportPDF={() => data && exportOwnerAdvancedPDF(data, 'Owner Advanced Report', rangeLabel)}
      onPrint={() => data && printOwnerAdvancedReport(data, 'Owner Advanced Report', rangeLabel)}
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
          <ReportSummaryCards items={buildOwnerAdvancedSummaryItems(data)} />
          {Object.keys(chartData).length ? (
            <ReportBarChart data={chartData} title="Revenue by technician" />
          ) : null}
          <OwnerAdvancedTable employees={data.employees} />
        </>
      ) : null}
    </ReportLayout>
  );
}
