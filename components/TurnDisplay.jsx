import { Text, View } from 'react-native';

export default function TurnDisplay({ turns, appointments, isSuggested }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 4, width: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <View
          style={{
            backgroundColor: isSuggested ? '#4CAF50' : '#E0E0E0',
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: isSuggested ? '#fff' : '#555',
            }}
          >
            {turns} turn{turns !== 1 ? 's' : ''}
          </Text>
        </View>

        {appointments > 0 ? (
          <View
            style={{
              backgroundColor: '#2196F3',
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
              {appointments} appt
            </Text>
          </View>
        ) : null}
      </View>

      {appointments > 0 ? (
        <Text
          style={{
            fontSize: 8,
            fontWeight: '800',
            color: '#1565C0',
            marginTop: 2,
            letterSpacing: 0.3,
          }}
        >
          APPOINTMENT
        </Text>
      ) : null}

      {isSuggested ? (
        <Text
          style={{
            fontSize: 8,
            color: '#2E7D32',
            fontWeight: '700',
            marginTop: 2,
          }}
        >
          ★ NEXT TURN
        </Text>
      ) : null}
    </View>
  );
}
