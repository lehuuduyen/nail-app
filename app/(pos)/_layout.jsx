import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Alert, AppState, Pressable, View } from 'react-native';
import { useOwnerStore } from '../../store/ownerStore';

const LOCKED_TAB_NAMES = new Set(['employees', 'services', 'reports', 'salary', 'settings', 'more']);

const TAB_ICONS = {
  index: { active: 'home', inactive: 'home-outline' },
  tickets: { active: 'receipt', inactive: 'receipt-outline' },
  employees: { active: 'people', inactive: 'people-outline' },
  services: { active: 'hand-left', inactive: 'hand-left-outline' },
  reports: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  salary: { active: 'person', inactive: 'person-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
  more: { active: 'ellipsis-horizontal', inactive: 'ellipsis-horizontal' },
};

function TabIcon({ name, color, focused, locked }) {
  const pair = TAB_ICONS[name] || TAB_ICONS.more;
  const iconName = focused ? pair.active : pair.inactive;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', opacity: locked ? 0.4 : 1 }}>
      <Ionicons name={iconName} size={22} color={color} />
      {locked ? (
        <View style={{ position: 'absolute', top: -4, right: -8 }} pointerEvents="none">
          <Ionicons name="lock-closed" size={11} color="#666" />
        </View>
      ) : null}
    </View>
  );
}

export default function PosLayout() {
  const pathname = usePathname();
  const isOwnerMode = useOwnerStore((s) => s.isOwnerMode);
  const touchActivity = useOwnerStore((s) => s.touchActivity);
  const checkSessionTimeout = useOwnerStore((s) => s.checkSessionTimeout);
  const syncPinFromStorage = useOwnerStore((s) => s.syncPinFromStorage);

  useEffect(() => {
    syncPinFromStorage();
  }, [syncPinFromStorage]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkSessionTimeout();
    });
    return () => sub.remove();
  }, [checkSessionTimeout]);

  useEffect(() => {
    touchActivity();
  }, [pathname, touchActivity]);

  return (
    <Tabs
      screenOptions={({ route }) => {
        const routeName = route.name;
        const locked = !isOwnerMode && LOCKED_TAB_NAMES.has(routeName);
        return {
          headerShown: false,
          sceneStyle: { flex: 1, width: '100%', alignSelf: 'stretch' },
          tabBarActiveTintColor: '#0066CC',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: isOwnerMode
            ? {
                backgroundColor: '#fff',
                borderTopWidth: 1,
                borderTopColor: '#eee',
                height: 60,
                paddingBottom: 8,
                paddingTop: 4,
              }
            : { display: 'none' },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 0 },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={routeName} color={color} focused={focused} locked={locked} />
          ),
          ...(locked
            ? {
                tabBarButton: (p) => (
                  <Pressable
                    {...p}
                    onPress={() =>
                      Alert.alert('Locked', 'Owner login required. Use Home → Owner Login.')
                    }
                  />
                ),
              }
            : {}),
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} />
      <Tabs.Screen name="employees" options={{ title: 'Employees' }} />
      <Tabs.Screen name="services" options={{ title: 'Services' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="salary" options={{ title: 'Salary' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />

      <Tabs.Screen name="new-ticket" options={{ href: null }} />
      <Tabs.Screen name="owner-add-ticket" options={{ href: null }} />
      <Tabs.Screen name="appointments" options={{ href: null }} />
      <Tabs.Screen name="gallery" options={{ href: null }} />
      <Tabs.Screen name="receipts" options={{ href: null }} />
      <Tabs.Screen name="checkin" options={{ href: null }} />
      <Tabs.Screen name="add-employee" options={{ href: null }} />
      <Tabs.Screen name="add-service" options={{ href: null }} />
    </Tabs>
  );
}
