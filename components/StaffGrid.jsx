import { ScrollView, View } from 'react-native';
import StaffBubble from './StaffBubble';

export default function StaffGrid({ staff, onSelectStaff, turnByEmployeeId, suggestedEmployeeId }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{
        paddingVertical: 20,
        paddingHorizontal: 10,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'flex-start' }}>
        {staff.map((s) => {
          const tid = s.id;
          const n = Number(tid);
          const row =
            turnByEmployeeId?.get?.(n) ??
            turnByEmployeeId?.get?.(tid) ??
            turnByEmployeeId?.get?.(String(tid));
          const turns = row?.turns ?? 0;
          const appointments = row?.appointments ?? 0;
          const isSuggested =
            suggestedEmployeeId != null && String(tid) === String(suggestedEmployeeId);
          return (
            <StaffBubble
              key={s.id}
              staff={s}
              onPress={onSelectStaff}
              turns={turns}
              appointments={appointments}
              isSuggested={isSuggested}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}
