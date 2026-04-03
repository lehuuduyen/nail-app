import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

const TEAL = '#2BB5A0';
const SIDEBAR_W = 118;

export default function LeftSidebar({
  onOwnerLogin,
  isOwnerMode = false,
  onAppSignOut,
}) {
  return (
    <View
      style={{
        width: SIDEBAR_W,
        backgroundColor: '#fff',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
        alignItems: 'center',
        paddingVertical: 14,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ alignItems: 'center', gap: 14 }}>
        {!isOwnerMode ? (
          <Pressable
            onPress={onOwnerLogin}
            style={{
              backgroundColor: TEAL,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 8,
              alignItems: 'center',
              width: 86,
            }}
          >
            <Ionicons name="person" size={22} color="#fff" style={{ marginBottom: 4 }} />
            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '800', textAlign: 'center' }}>
              OWNER{'\n'}LOGIN
            </Text>
          </Pressable>
        ) : (
          <View
            style={{
              backgroundColor: '#00897b',
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 8,
              alignItems: 'center',
              width: 86,
            }}
          >
            <Ionicons name="shield-checkmark" size={20} color="#fff" style={{ marginBottom: 4 }} />
            <Text style={{ fontSize: 8, color: '#fff', fontWeight: '800', textAlign: 'center' }}>
              OWNER{'\n'}MODE
            </Text>
          </View>
        )}

        <Pressable style={{ alignItems: 'center' }} onPress={() => {}}>
          <Ionicons name="key-outline" size={16} color="#888" />
          <Text style={{ fontSize: 9, color: '#666', marginTop: 2 }}>imp...</Text>
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
          <Ionicons name="call-outline" size={14} color="#E53935" style={{ marginTop: 2 }} />
          <Text style={{ fontSize: 8, color: '#c62828', textAlign: 'center', fontWeight: '600' }}>
            Support:{'\n'}(877) 489-5667
          </Text>
        </View>

        <View
          style={{
            width: 64,
            height: 44,
            backgroundColor: '#f5f5f5',
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#e0e0e0',
          }}
        >
          <Text style={{ fontSize: 7, color: '#666', fontWeight: '900', textAlign: 'center' }}>
            NAIL{'\n'}SOLUTION
          </Text>
        </View>

        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          onPress={() => {}}
        >
          <Ionicons name="print-outline" size={16} color="#555" />
          <Text style={{ fontSize: 8, color: '#555', textAlign: 'center', fontWeight: '600' }}>
            Connect{'\n'}Printer
          </Text>
        </Pressable>

        {onAppSignOut ? (
          <Pressable onPress={onAppSignOut} style={{ paddingVertical: 6 }}>
            <Text style={{ fontSize: 8, color: '#888', textDecorationLine: 'underline' }}>App sign out</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
