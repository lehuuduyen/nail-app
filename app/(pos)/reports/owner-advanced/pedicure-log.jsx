import { format, subDays } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import DateRangePicker from '../../../../components/reports/DateRangePicker';
import { PedicureLogTable } from '../../../../components/reports/ExtraReportTables';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildPedicureSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import { getPedicureLog } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { exportPedicureCSV, exportPedicurePDF, printPedicureReport } from '../../../../utils/reportExport';

export default function PedicureLogByRange() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPedicureLog(startDate, endDate);
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

  return (
    <ReportLayout
      title="Pedicure Log — By Range"
      loading={loading}
      error={error}
      toolbarDisabled={!data}
      onExportCSV={() => data && exportPedicureCSV(data, `pedicure-log-${startDate}_${endDate}`)}
      onExportPDF={() => data && exportPedicurePDF(data, 'Pedicure Log', rangeLabel)}
      onPrint={() => data && printPedicureReport(data, 'Pedicure Log', rangeLabel)}
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
          <ReportSummaryCards items={buildPedicureSummaryItems(data)} />
          <PedicureLogTable transactions={data.transactions} />
        </>
      ) : null}
    </ReportLayout>
  );
}
