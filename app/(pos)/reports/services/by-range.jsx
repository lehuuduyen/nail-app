import { format, subDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import DateRangePicker from '../../../../components/reports/DateRangePicker';
import { ServiceRankingTable } from '../../../../components/reports/ExtraReportTables';
import ReportLayout from '../../../../components/reports/ReportLayout';
import ReportSummaryCards from '../../../../components/reports/ReportSummaryCards';
import { getServicesByRange } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../utils/apiError';

const TEAL = '#00897b';
const ALL_KEY = '__all__';

export default function ServicesByRange() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(ALL_KEY);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServicesByRange(startDate, endDate);
      setData(result);
      setActiveCategory(ALL_KEY);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const summaryItems = useMemo(() => {
    if (!data) return [];
    const t = data.totals || {};
    return [
      { label: 'Tổng lượt DV', value: t.count || 0, color: '#2196F3', prefix: '' },
      { label: 'Doanh thu', value: t.revenue || 0, color: '#4CAF50', prefix: '$' },
      { label: 'Trung bình/lượt', value: t.avgPerTicket || 0, color: '#FF9800', prefix: '$' },
      { label: 'Loại DV', value: (data.categories || []).length, color: TEAL, prefix: '' },
    ];
  }, [data]);

  // Category tabs: ALL + sorted categories
  const categoryTabs = useMemo(() => {
    if (!data?.categories?.length) return [];
    return [
      { key: ALL_KEY, label: 'Tất cả', count: data.totals?.count || 0 },
      ...data.categories.map((c) => ({ key: c.name, label: c.label, count: c.count })),
    ];
  }, [data]);

  // Services to display based on active category
  const displayedServices = useMemo(() => {
    if (!data) return [];
    if (activeCategory === ALL_KEY) return data.services || [];
    const cat = (data.categories || []).find((c) => c.name === activeCategory);
    return cat?.services || [];
  }, [data, activeCategory]);

  const totalForDisplay = useMemo(() => {
    if (activeCategory === ALL_KEY) return data?.totals?.count || 0;
    const cat = (data?.categories || []).find((c) => c.name === activeCategory);
    return cat?.count || 0;
  }, [data, activeCategory]);

  const rangeLabel = `${startDate} → ${endDate}`;

  return (
    <ReportLayout
      title="Service Statistics — By Range"
      loading={loading}
      error={error}
      toolbarDisabled={!data?.services?.length}
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
              style={{ backgroundColor: TEAL, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Xem thống kê</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    >
      {data ? (
        <>
          <ReportSummaryCards items={summaryItems} />

          {/* Category tabs */}
          {categoryTabs.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: 12, marginBottom: 12 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {categoryTabs.map((tab) => {
                const isActive = tab.key === activeCategory;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveCategory(tab.key)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: isActive ? TEAL : '#fff',
                      borderWidth: 1,
                      borderColor: isActive ? TEAL : '#ddd',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? '700' : '400',
                        color: isActive ? '#fff' : '#555',
                      }}
                    >
                      {tab.label}
                      {'  '}
                      <Text style={{ fontSize: 11, opacity: 0.8 }}>{tab.count}</Text>
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Section header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 12,
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: '#1a1a2e',
              borderRadius: 8,
            }}
          >
            <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' }}>
              {activeCategory === ALL_KEY
                ? 'Xếp hạng tất cả dịch vụ'
                : `Xếp hạng — ${categoryTabs.find((t) => t.key === activeCategory)?.label}`}
            </Text>
            <Text style={{ color: '#aaa', fontSize: 12 }}>{displayedServices.length} dịch vụ</Text>
          </View>

          <ServiceRankingTable services={displayedServices} totalCount={totalForDisplay} />

          {/* Category overview khi đang ở ALL tab */}
          {activeCategory === ALL_KEY && (data.categories || []).length > 0 ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginHorizontal: 12,
                  marginTop: 16,
                  marginBottom: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: '#1a1a2e',
                  borderRadius: 8,
                }}
              >
                <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' }}>
                  Tổng quan theo danh mục
                </Text>
              </View>
              <View style={{ marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', backgroundColor: '#26a69a', paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ flex: 1, color: '#fff', fontSize: 12, fontWeight: '700' }}>Danh mục</Text>
                  <Text style={{ width: 56, color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>Lượt</Text>
                  <Text style={{ width: 80, color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'right' }}>Doanh thu</Text>
                </View>
                {(data.categories || []).map((cat, i) => (
                  <TouchableOpacity
                    key={cat.name}
                    onPress={() => setActiveCategory(cat.name)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
                      borderBottomWidth: i < (data.categories.length - 1) ? 0.5 : 0,
                      borderColor: '#eee',
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 13, color: '#1a1a2e', fontWeight: '500' }}>
                      {cat.label}
                    </Text>
                    <Text style={{ width: 56, fontSize: 13, textAlign: 'center', color: '#2196F3', fontWeight: '600' }}>
                      {cat.count}
                    </Text>
                    <Text style={{ width: 80, fontSize: 13, textAlign: 'right', color: '#4CAF50', fontWeight: '600' }}>
                      ${Number(cat.revenue).toFixed(0)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <View style={{ height: 24 }} />
        </>
      ) : null}
    </ReportLayout>
  );
}
