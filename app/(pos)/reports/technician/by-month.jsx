import { addMonths, format, subMonths } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ReportBarChart from '../../../../components/reports/ReportBarChart';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildTechnicianSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import ReportTable from '../../../../components/reports/ReportTable';
import { getReportByMonth } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { exportTechnicianCSV, exportTechnicianPDF, printTechnicianReport } from '../../../../utils/reportExport';

export default function TechnicianReportByMonth() {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportByMonth(year, month);
      setData(result);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const label = format(cursor, 'MMMM yyyy');

  return (
    <ReportLayout
      title="Technician — By Month"
      loading={loading}
      error={error}
      toolbarDisabled={!data?.employees}
      onExportCSV={() => data && exportTechnicianCSV(data, `tech-by-month-${year}-${month}`)}
      onExportPDF={() => data && exportTechnicianPDF(data, 'Technician Report (Month)', label)}
      onPrint={() => data && printTechnicianReport(data, 'Technician Report (Month)', label)}
      headerBottom={
        <View style={{ backgroundColor: '#eee', paddingVertical: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              gap: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => setCursor(subMonths(cursor, 1))}
              style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8 }}
            >
              <Text style={{ fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#333', minWidth: 140, textAlign: 'center' }}>
              {label}
            </Text>
            <TouchableOpacity
              onPress={() => setCursor(addMonths(cursor, 1))}
              style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8 }}
            >
              <Text style={{ fontSize: 18 }}>→</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setCursor(new Date())} style={{ alignSelf: 'center', paddingBottom: 4 }}>
            <Text style={{ color: '#0066CC', fontWeight: '600' }}>Current month</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {data ? (
        <>
          <ReportSummaryCards items={buildTechnicianSummaryItems(data)} />
          {data.byWeek ? <ReportBarChart data={data.byWeek} title="Revenue by week segment" /> : null}
          <ReportTable employees={data.employees} />
        </>
      ) : null}
    </ReportLayout>
  );
}
