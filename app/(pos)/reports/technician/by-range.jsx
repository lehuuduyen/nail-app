import { format, subDays } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import DateRangePicker from '../../../../components/reports/DateRangePicker';
import ReportBarChart from '../../../../components/reports/ReportBarChart';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildTechnicianSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import ReportTable from '../../../../components/reports/ReportTable';
import { getReportByRange } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { transactionsToByDayChart } from '../../../../utils/reportAggregates';
import { exportTechnicianCSV, exportTechnicianPDF, printTechnicianReport } from '../../../../utils/reportExport';

export default function TechnicianReportByRange() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportByRange(startDate, endDate);
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
  const chartData = data?.transactions ? transactionsToByDayChart(data.transactions) : null;

  return (
    <ReportLayout
      title="Technician — By Range"
      loading={loading}
      error={error}
      toolbarDisabled={!data?.employees}
      onExportCSV={() => data && exportTechnicianCSV(data, `tech-by-range-${startDate}_${endDate}`)}
      onExportPDF={() => data && exportTechnicianPDF(data, 'Technician Report (Range)', rangeLabel)}
      onPrint={() => data && printTechnicianReport(data, 'Technician Report (Range)', rangeLabel)}
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
          <ReportSummaryCards items={buildTechnicianSummaryItems(data)} />
          {chartData && Object.keys(chartData).length ? (
            <ReportBarChart data={chartData} title="Revenue by day" />
          ) : null}
          <ReportTable employees={data.employees} />
        </>
      ) : null}
    </ReportLayout>
  );
}
