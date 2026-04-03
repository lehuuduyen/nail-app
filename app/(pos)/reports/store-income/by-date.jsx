import { format, addDays, subDays } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { DateNavRow } from '../../../../components/reports/DateRangePicker';
import {
  StoreTransactionsTable,
} from '../../../../components/reports/ExtraReportTables';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards, { buildStoreIncomeSummaryItems } from '../../../../components/reports/ReportSummaryCards';
import { getStoreIncomeByDate } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';
import {
  exportStoreIncomeCSV,
  exportStoreIncomePDF,
  printStoreIncomeReport,
} from '../../../../utils/reportExport';

export default function StoreIncomeByDate() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStoreIncomeByDate(date);
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
      title="Store Income — By Date"
      loading={loading}
      error={error}
      toolbarDisabled={!data}
      onExportCSV={() => data && exportStoreIncomeCSV(data, `store-income-${date}`)}
      onExportPDF={() => data && exportStoreIncomePDF(data, 'Store Income Report', dateLabel)}
      onPrint={() => data && printStoreIncomeReport(data, 'Store Income Report', dateLabel)}
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
          <ReportSummaryCards items={buildStoreIncomeSummaryItems(data)} />
          <StoreTransactionsTable transactions={data.transactions} />
        </>
      ) : null}
    </ReportLayout>
  );
}
