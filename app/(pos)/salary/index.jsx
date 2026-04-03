import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BTN_ALL = '#1565C0';
const BTN_ONE = '#2E7D32';
const BTN_HIST = '#1976D2';

export default function SalaryMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.main}>
        <View style={styles.buttonColumn}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: BTN_ALL }]}
            onPress={() => router.push('/(pos)/salary/calculate-all')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Calculate Salary For All Employees</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: BTN_ONE }]}
            onPress={() => router.push('/(pos)/salary/calculate-one')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Calculate Salary For One Employee</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: BTN_HIST }]}
            onPress={() => router.push('/(pos)/salary/history')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>See Salary History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sideTitleWrap}>
        <Text style={styles.sideTitle}>Please select an action for Salary</Text>
      </View>
    </View>
  );
}

const SIDE_TITLE_WIDTH = 320;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonColumn: {
    width: '72%',
    maxWidth: 520,
    gap: 20,
  },
  btn: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  sideTitleWrap: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
  },
  sideTitle: {
    width: SIDE_TITLE_WIDTH,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    transform: [{ rotate: '-90deg' }],
  },
});
