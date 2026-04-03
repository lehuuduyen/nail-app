import { Pressable, Text, View } from 'react-native';

const RED = '#E53935';

export default function RightActionButtons({ onTechTickets, onCheckTurns }) {
  return (
    <View
      style={{
        width: 52,
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 4,
        backgroundColor: '#e8e8e8',
        borderLeftWidth: 1,
        borderLeftColor: '#ccc',
      }}
    >
      <Pressable
        onPress={onTechTickets}
        style={{
          backgroundColor: RED,
          paddingVertical: 18,
          paddingHorizontal: 4,
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 120,
        }}
      >
        <View style={{ transform: [{ rotate: '90deg' }], width: 100, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', textAlign: 'center' }}>TECH TICKETS</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onCheckTurns}
        style={{
          backgroundColor: RED,
          paddingVertical: 18,
          paddingHorizontal: 4,
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 120,
        }}
      >
        <View style={{ transform: [{ rotate: '90deg' }], width: 100, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', textAlign: 'center' }}>CHECK TURNS</Text>
        </View>
      </Pressable>
    </View>
  );
}
