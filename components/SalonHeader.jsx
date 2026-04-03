import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

const BADGE = '#E53935';

function NavBadgeButton({ icon, label, count, onPress }) {
  const showBadge = typeof count === 'number';
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', padding: 4, flex: 1 }}>
      <View style={{ position: 'relative' }}>
        <Ionicons name={icon} size={22} color="#444" />
        {showBadge ? (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -8,
              backgroundColor: BADGE,
              borderRadius: 9,
              minWidth: 18,
              height: 18,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 8, color: '#555', marginTop: 3, fontWeight: '600', textAlign: 'center' }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SalonHeader({
  salonName,
  appointments = 0,
  checkIns = 12,
  onAppointments,
  onCheckIns,
  onReceipts,
}) {
  return (
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 52,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '900',
            color: '#222',
            textAlign: 'center',
            letterSpacing: 0.3,
          }}
          numberOfLines={2}
        >
          {salonName}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, paddingHorizontal: 4 }}>
        <NavBadgeButton
          icon="calendar-outline"
          label="Appointments"
          count={appointments}
          onPress={onAppointments}
        />
        <NavBadgeButton
          icon="checkmark-circle-outline"
          label="Check-ins"
          count={checkIns}
          onPress={onCheckIns}
        />
        <NavBadgeButton icon="document-text-outline" label="Receipts" onPress={onReceipts} />
      </View>
    </View>
  );
}
