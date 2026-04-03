import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { DateNavRow } from '../../../../components/reports/DateRangePicker';
import ReportBarChart from '../../../../components/reports/ReportBarChart';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildTechnicianSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import ReportTable from '../../../../components/reports/ReportTable';
import { getReportByWeek } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { formatWeekRangeLabel } from '../../../../utils/reportWeekList';
import { exportTechnicianCSV, exportTechnicianPDF, printTechnicianReport } from '../../../../utils/reportExport';
import { mondayOfCurrentWeek, shiftWeekMonday, weekRangeFromPayload } from '../../../../utils/weekBounds';

function mondayFromParams(raw) {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export default function TechnicianReportByWeek() {
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
      const result = await getReportByWeek(startDate);
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

  return (
    <ReportLayout
      title="Technician — By Week"
      loading={loading}
      error={error}
      toolbarDisabled={!data?.employees}
      onExportCSV={() => data && exportTechnicianCSV(data, `tech-by-week-${monday}`)}
      onExportPDF={() => data && exportTechnicianPDF(data, 'Technician Report (Week)', `${monday}–${weekEnd}`)}
      onPrint={() => data && printTechnicianReport(data, 'Technician Report (Week)', `${monday}–${weekEnd}`)}
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
                  params: { target: 'technician' },
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
          <ReportSummaryCards items={buildTechnicianSummaryItems(data)} />
          {data.byDay ? <ReportBarChart data={data.byDay} title="Revenue by day" /> : null}
          <ReportTable employees={data.employees} />
        </>
      ) : null}
    </ReportLayout>
  );
}
