import { format, addDays, subDays } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { DateNavRow } from '../../../../components/reports/DateRangePicker';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildTechnicianSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import ReportTable from '../../../../components/reports/ReportTable';
import { getReportByDate } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { exportTechnicianCSV, exportTechnicianPDF, printTechnicianReport } from '../../../../utils/reportExport';

export default function TechnicianReportByDate() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportByDate(date);
      setData(result);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const dateLabel = format(new Date(`${date}T12:00:00`), 'EEEE, MMM dd yyyy');

  return (
    <ReportLayout
      title="Technician — By Date"
      loading={loading}
      error={error}
      toolbarDisabled={!data?.employees}
      onExportCSV={() => data && exportTechnicianCSV(data, `tech-by-date-${date}`)}
      onExportPDF={() => data && exportTechnicianPDF(data, 'Technician Report', dateLabel)}
      onPrint={() => data && printTechnicianReport(data, 'Technician Report', dateLabel)}
      headerBottom={
        <View style={{ backgroundColor: '#eee' }}>
          <DateNavRow
            label={dateLabel}
            onPrev={() => setDate(format(subDays(new Date(`${date}T12:00:00`), 1), 'yyyy-MM-dd'))}
            onNext={() => setDate(format(addDays(new Date(`${date}T12:00:00`), 1), 'yyyy-MM-dd'))}
          />
        </View>
      }
    >
      {data ? (
        <>
          <ReportSummaryCards items={buildTechnicianSummaryItems(data)} />
          <ReportTable employees={data.employees} />
        </>
      ) : null}
    </ReportLayout>
  );
}
