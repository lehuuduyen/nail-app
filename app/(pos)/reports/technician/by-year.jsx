import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ReportBarChart from '../../../../components/reports/ReportBarChart';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildTechnicianSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import ReportTable from '../../../../components/reports/ReportTable';
import { getReportByYear } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { exportTechnicianCSV, exportTechnicianPDF, printTechnicianReport } from '../../../../utils/reportExport';

export default function TechnicianReportByYear() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportByYear(year);
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

  return (
    <ReportLayout
      title="Technician — By Year"
      loading={loading}
      error={error}
      toolbarDisabled={!data?.employees}
      onExportCSV={() => data && exportTechnicianCSV(data, `tech-by-year-${year}`)}
      onExportPDF={() => data && exportTechnicianPDF(data, 'Technician Report (Year)', label)}
      onPrint={() => data && printTechnicianReport(data, 'Technician Report (Year)', label)}
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
          <ReportSummaryCards items={buildTechnicianSummaryItems(data)} />
          {data.byMonth ? <ReportBarChart data={data.byMonth} title="Revenue by month" /> : null}
          <ReportTable employees={data.employees} />
        </>
      ) : null}
    </ReportLayout>
  );
}
