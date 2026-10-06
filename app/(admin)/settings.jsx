import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OwnerGate from '../../components/OwnerGate';
import StripeReaderModal from '../../components/StripeReaderModal';
import { isStripeTerminalSupported } from '../../hooks/useStripeReaderConnection';
import { isBluetoothPrinterSupported, isPrinterSupported, isWifiPrinterSupported, usePrinterConnection } from '../../hooks/usePrinterConnection';
import { buildTestPrintEscPos } from '../../utils/escpos';
import { useOwnerStore } from '../../store/ownerStore';
import { fetchSalonDisplayName } from '../../api/catalog';
import { loadAllSettings, saveSetting, SETTING_KEYS } from '../../utils/settingsStorage';

const BG = '#1a1a1a';
const RED = '#d32f2f';
const BLUE = '#0066CC';

function RedSubmit({ label = 'SUBMIT', onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="px-3 py-2 rounded-md min-w-[72px] items-center justify-center active:opacity-90"
      style={{ backgroundColor: RED }}
    >
      <Text className="text-white text-[10px] font-extrabold">{label}</Text>
    </Pressable>
  );
}

function RowField({ label, value, onChangeText, onSubmit, keyboardType, editable = true }) {
  return (
    <View className="mb-3">
      <Text className="text-[10px] font-bold text-white uppercase mb-1">{label}</Text>
      <View className="flex-row items-center gap-2">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType}
          className="flex-1 text-neutral-900 text-[12px] font-semibold px-2 py-2 rounded border border-neutral-500 min-h-[40px]"
          style={{ backgroundColor: editable ? '#fff' : '#888' }}
        />
        {onSubmit ? <RedSubmit onPress={onSubmit} /> : null}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const updatePin = useOwnerStore((s) => s.updatePin);

  const [tab, setTab] = useState('store');
  const [salaryPeriod, setSalaryPeriod] = useState('1 WEEK');
  const [keepOpen, setKeepOpen] = useState(true);
  const [minTurn, setMinTurn] = useState('25.0');
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerSsn, setOwnerSsn] = useState('');
  const [reward, setReward] = useState('500.0');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [sellProduct, setSellProduct] = useState(false);
  const [serviceSort, setServiceSort] = useState(true);
  const [customTax, setCustomTax] = useState('0.0');
  const [cardReceipts, setCardReceipts] = useState('1');
  const [moreDays, setMoreDays] = useState(false);
  const [noncardReceipts, setNoncardReceipts] = useState('1');
  const [newPin, setNewPin] = useState('');
  const [showReaderModal, setShowReaderModal] = useState(false);
  const [connectedReaderName, setConnectedReaderName] = useState(null);

  const printer = usePrinterConnection();
  const [printerIpInput, setPrinterIpInput] = useState(printer.ip);
  const [printerPortInput, setPrinterPortInput] = useState(String(printer.port || 9100));
  const [showBtModal, setShowBtModal] = useState(false);

  useEffect(() => {
    setPrinterIpInput(printer.ip);
    setPrinterPortInput(String(printer.port || 9100));
  }, [printer.ip, printer.port]);

  const handleConnectPrinter = useCallback(async () => {
    const ip = printerIpInput.trim();
    const port = Number(printerPortInput) || 9100;
    if (!ip) {
      Alert.alert('Máy in', 'Hãy nhập địa chỉ IP của máy in.');
      return;
    }
    printer.saveConfig(ip, port);
    const ok = await printer.testConnect(ip, port);
    if (ok) {
      Alert.alert('Máy in', `Kết nối thành công tới ${ip}:${port}`);
    } else {
      Alert.alert('Máy in', printer.lastError || 'Không kết nối được máy in. Kiểm tra IP và mạng WiFi.');
    }
  }, [printer, printerIpInput, printerPortInput]);

  const handleTestPrint = useCallback(async () => {
    let ok = false;
    if (printer.connectionType === 'bluetooth') {
      const { BluetoothEscposPrinter } = require('react-native-bluetooth-escpos-printer');
      try {
        await BluetoothEscposPrinter.printerInit();
        await BluetoothEscposPrinter.printText('TEST PRINT\n', {});
        await BluetoothEscposPrinter.printText('Ket noi may in thanh cong!\n', {});
        await BluetoothEscposPrinter.printAndFeed(3);
        ok = true;
      } catch (e) {
        Alert.alert('Máy in', e?.message || 'In thử Bluetooth thất bại.');
        return;
      }
    } else {
      ok = await printer.send(buildTestPrintEscPos());
    }
    if (!ok) {
      Alert.alert('Máy in', printer.lastError || 'In thử thất bại — kiểm tra kết nối máy in.');
    }
  }, [printer]);

  const handleDisconnectPrinter = useCallback(() => {
    printer.disconnect();
    Alert.alert('Máy in', 'Đã ngắt kết nối máy in.');
  }, [printer]);

  const handleOpenBtScan = useCallback(() => {
    setShowBtModal(true);
    printer.scanBtDevices();
  }, [printer]);

  const handleConnectBtDevice = useCallback(async (device) => {
    setShowBtModal(false);
    const ok = await printer.connectBt(device.name, device.address);
    if (ok) {
      Alert.alert('Bluetooth', `Đã kết nối máy in: ${device.name || device.address}`);
    } else {
      Alert.alert('Bluetooth', printer.lastError || 'Không kết nối được. Kiểm tra máy in đã bật chưa.');
    }
  }, [printer]);

  const hydrate = useCallback(async () => {
    const s = await loadAllSettings();
    setSalaryPeriod(s[SETTING_KEYS.salaryPeriod] || '1 WEEK');
    setKeepOpen(s[SETTING_KEYS.keepTicketsOpen] === 'true');
    setMinTurn(s[SETTING_KEYS.minTurn] || '25.0');
    const localStore = s[SETTING_KEYS.storeName] || '';
    setStoreName(localStore);
    const remoteName = await fetchSalonDisplayName();
    if (remoteName != null) setStoreName(remoteName);
    setStoreAddress(s[SETTING_KEYS.storeAddress] || '');
    setStorePhone(s[SETTING_KEYS.storePhone] || '');
    setOwnerName(s[SETTING_KEYS.ownerName] || '');
    setOwnerSsn(s[SETTING_KEYS.ownerSsnFein] || '');
    setReward(s[SETTING_KEYS.rewardAmount] || '500.0');
    setOwnerEmail(s[SETTING_KEYS.ownerEmail] || '');
    setSellProduct(s[SETTING_KEYS.sellProduct] === 'true');
    setServiceSort(s[SETTING_KEYS.serviceSort] !== 'false');
    setCustomTax(s[SETTING_KEYS.customTax] || '0.0');
    setCardReceipts(s[SETTING_KEYS.cardReceipts] || '1');
    setMoreDays(s[SETTING_KEYS.moreDays] === 'true');
    setNoncardReceipts(s[SETTING_KEYS.noncardReceipts] || '1');
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const saveKey = async (key, val) => {
    await saveSetting(key, val);
    Alert.alert('Saved', key.replace('SETTING_', ''));
  };

  const submitPin = async () => {
    const p = newPin.replace(/\D/g, '');
    if (p.length < 4) {
      Alert.alert('PIN', 'Enter at least 4 digits.');
      return;
    }
    try {
      await updatePin(p);
      setNewPin('');
      Alert.alert('Saved', 'Owner PIN updated. Use the new PIN on Home → Owner Login.');
    } catch (e) {
      Alert.alert('PIN', e?.message || 'Could not save PIN');
    }
  };

  const sidebarBtn = (id, label) => (
    <Pressable
      key={id}
      onPress={() => setTab(id)}
      className="py-4 px-3 mb-2 rounded-md border-2 active:opacity-90"
      style={{
        backgroundColor: tab === id ? BLUE : '#0d47a1',
        borderColor: tab === id ? '#fff' : 'transparent',
      }}
    >
      <Text className="text-white text-[11px] font-extrabold text-center uppercase">{label}</Text>
    </Pressable>
  );

  return (
    <OwnerGate title="Settings (owner only)">
      <View className="flex-1 flex-row min-h-0" style={{ paddingTop: insets.top, backgroundColor: BG }}>
        <View className="w-[140px] border-r border-neutral-700 px-2 py-4 bg-black">
          <Text className="text-white font-black text-center text-xs mb-4 uppercase">Settings</Text>
          {sidebarBtn('store', 'STORE INFORMATION')}
          {sidebarBtn('secrets', 'SECRETS')}
          {sidebarBtn('devices', 'DEVICES')}
          {sidebarBtn('hours', 'STORE HOURS')}
        </View>

        <ScrollView className="flex-1 px-3 py-3" contentContainerStyle={{ paddingBottom: 120 }}>
          {tab === 'store' ? (
            <>
              <View className="flex-row items-center justify-between mb-3 flex-wrap gap-2">
                <Text className="text-[10px] font-bold text-white uppercase">SALARY EVERY:</Text>
                <Pressable
                  onPress={() => {
                    const next = salaryPeriod === '1 WEEK' ? '2 WEEKS' : '1 WEEK';
                    setSalaryPeriod(next);
                    saveSetting(SETTING_KEYS.salaryPeriod, next);
                  }}
                  className="px-4 py-2 rounded-md"
                  style={{ backgroundColor: BLUE }}
                >
                  <Text className="text-white font-extrabold text-xs">{salaryPeriod}</Text>
                </Pressable>
              </View>

              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[10px] font-bold text-white uppercase flex-1 pr-2">
                  KEEP TECH TICKETS OPEN
                </Text>
                <Switch
                  value={keepOpen}
                  onValueChange={(v) => {
                    setKeepOpen(v);
                    saveSetting(SETTING_KEYS.keepTicketsOpen, v ? 'true' : 'false');
                  }}
                  trackColor={{ false: '#767577', true: '#4caf50' }}
                  thumbColor="#f4f3f4"
                />
              </View>

              <View className="flex-row items-end gap-2 mb-4">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-white uppercase mb-1">$ MINIMUM TURN</Text>
                  <TextInput
                    value={minTurn}
                    onChangeText={setMinTurn}
                    keyboardType="decimal-pad"
                    className="bg-white text-neutral-900 px-2 py-2 rounded border border-neutral-500"
                  />
                </View>
                <RedSubmit onPress={() => saveKey(SETTING_KEYS.minTurn, minTurn)} />
              </View>

              <RowField
                label="STORE NAME"
                value={storeName}
                onChangeText={setStoreName}
                onSubmit={() => saveKey(SETTING_KEYS.storeName, storeName)}
              />
              <RowField
                label="STORE ADDRESS"
                value={storeAddress}
                onChangeText={setStoreAddress}
                onSubmit={() => saveKey(SETTING_KEYS.storeAddress, storeAddress)}
              />
              <RowField
                label="STORE PHONE"
                value={storePhone}
                onChangeText={setStorePhone}
                keyboardType="phone-pad"
                onSubmit={() => saveKey(SETTING_KEYS.storePhone, storePhone)}
              />
              <RowField
                label="OWNER'S NAME (USE FOR 1099)"
                value={ownerName}
                onChangeText={setOwnerName}
                onSubmit={() => saveKey(SETTING_KEYS.ownerName, ownerName)}
              />
              <RowField
                label="OWNER'S SSN OR FEIN (USE FOR 1099)"
                value={ownerSsn}
                onChangeText={setOwnerSsn}
                onSubmit={() => saveKey(SETTING_KEYS.ownerSsnFein, ownerSsn)}
              />
              <RowField
                label="SET REWARD AMOUNT"
                value={reward}
                onChangeText={setReward}
                keyboardType="decimal-pad"
                onSubmit={() => saveKey(SETTING_KEYS.rewardAmount, reward)}
              />
              <RowField
                label="OWNER EMAIL"
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                editable={false}
                onSubmit={null}
              />

              <View className="flex-row gap-2 mb-3 mt-2">
                <Pressable
                  onPress={() => Alert.alert('Printer', 'Connect receipt printer (placeholder).')}
                  className="flex-1 border-2 py-3 px-2 rounded-md items-center"
                  style={{ borderColor: BLUE }}
                >
                  <Text className="text-[#64b5f6] text-[10px] font-bold text-center uppercase">
                    CONNECT TO RECEIPT PRINTER
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => Alert.alert('Printer', 'Disconnected (placeholder).')}
                  className="flex-1 border-2 py-3 px-2 rounded-md items-center"
                  style={{ borderColor: BLUE }}
                >
                  <Text className="text-[#64b5f6] text-[10px] font-bold text-center uppercase">
                    DISCONNECT PRINTER
                  </Text>
                </Pressable>
              </View>
              <Text className="text-white text-xs mb-4">Printer</Text>

              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[10px] font-bold text-white uppercase">SELL PRODUCT?</Text>
                <Switch
                  value={sellProduct}
                  onValueChange={(v) => {
                    setSellProduct(v);
                    saveSetting(SETTING_KEYS.sellProduct, v ? 'true' : 'false');
                  }}
                  trackColor={{ false: '#767577', true: '#4caf50' }}
                />
              </View>

              <View className="flex-row items-center justify-between mb-3 flex-wrap gap-2">
                <Text className="text-[10px] font-bold text-white uppercase">SERVICE SORT</Text>
                <Switch
                  value={serviceSort}
                  onValueChange={(v) => {
                    setServiceSort(v);
                    saveSetting(SETTING_KEYS.serviceSort, v ? 'true' : 'false');
                  }}
                  trackColor={{ false: '#767577', true: '#4caf50' }}
                />
                <View className="flex-row items-center gap-2 flex-1 justify-end">
                  <Text className="text-[10px] text-[#64b5f6] font-bold">Reader?</Text>
                  <View className="w-3 h-3 rounded-full bg-red-600" />
                  <Pressable onPress={() => Alert.alert('Reader', 'MOBY5500')}>
                    <Text className="text-[#64b5f6] text-[10px] font-bold underline">MOBY5500</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable
                onPress={() => Alert.alert('Moby', 'Update Moby (placeholder).')}
                className="self-start px-4 py-2 rounded-md mb-4"
                style={{ backgroundColor: BLUE }}
              >
                <Text className="text-white text-xs font-bold">Update Moby</Text>
              </Pressable>

              <View className="flex-row items-end gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-white uppercase mb-1">
                    Custom Amt Tax (10 for 10%)
                  </Text>
                  <TextInput
                    value={customTax}
                    onChangeText={setCustomTax}
                    keyboardType="decimal-pad"
                    className="bg-white text-neutral-900 px-2 py-2 rounded border border-neutral-500"
                  />
                </View>
                <RedSubmit onPress={() => saveKey(SETTING_KEYS.customTax, customTax)} />
              </View>

              <View className="flex-row items-end gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-white uppercase mb-1">Card Receipts?</Text>
                  <TextInput
                    value={cardReceipts}
                    onChangeText={setCardReceipts}
                    keyboardType="number-pad"
                    className="bg-white text-neutral-900 px-2 py-2 rounded border border-neutral-500"
                  />
                </View>
                <RedSubmit onPress={() => saveKey(SETTING_KEYS.cardReceipts, cardReceipts)} />
              </View>

              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[10px] font-bold text-white uppercase">MORE DAYS?</Text>
                <Switch
                  value={moreDays}
                  onValueChange={(v) => {
                    setMoreDays(v);
                    saveSetting(SETTING_KEYS.moreDays, v ? 'true' : 'false');
                  }}
                  trackColor={{ false: '#767577', true: '#4caf50' }}
                />
              </View>

              <View className="flex-row items-end gap-2 mb-6">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-white uppercase mb-1">NonCard Receip...</Text>
                  <TextInput
                    value={noncardReceipts}
                    onChangeText={setNoncardReceipts}
                    keyboardType="number-pad"
                    className="bg-white text-neutral-900 px-2 py-2 rounded border border-neutral-500"
                  />
                </View>
                <RedSubmit onPress={() => saveKey(SETTING_KEYS.noncardReceipts, noncardReceipts)} />
              </View>
            </>
          ) : null}

          {tab === 'secrets' ? (
            <View className="py-4">
              <Text className="text-white font-bold mb-3 text-sm">Change owner PIN</Text>
              <Text className="text-[10px] text-neutral-400 mb-2">
                Stored in AsyncStorage as OWNER_PIN. Default is 1234 until you change it here.
              </Text>
              <Text className="text-[10px] font-bold text-white uppercase mb-1">NEW PIN (4–6 DIGITS)</Text>
              <View className="flex-row items-center gap-2 mb-4">
                <TextInput
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  placeholder="••••"
                  className="flex-1 bg-white text-neutral-900 px-2 py-2 rounded border border-neutral-500"
                />
                <RedSubmit onPress={submitPin} />
              </View>
              <Text className="text-[10px] text-neutral-500">
                After saving, use Home → Owner Login with the new PIN.
              </Text>
            </View>
          ) : null}

          {tab === 'devices' ? (
            <View className="py-3">
              <Text className="text-[10px] font-bold text-white uppercase mb-3">
                STRIPE CARD READER (BLUETOOTH / WIFI)
              </Text>
              <View className="bg-neutral-800 rounded-xl p-4 mb-5 border border-neutral-700">
                <View className="flex-row items-center mb-2">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: connectedReaderName ? '#4caf50' : '#d32f2f' }}
                  />
                  <Text className="text-white text-xs font-semibold flex-1">
                    {connectedReaderName ?? 'Chưa kết nối'}
                  </Text>
                </View>
                <Text className="text-neutral-400 text-[10px] mb-4">
                  {isStripeTerminalSupported()
                    ? 'Stripe M2 (Bluetooth) hoặc WisePOS E / S700 (WiFi/LAN).\nCần bật Bluetooth và cấp quyền Location.'
                    : 'Cần EAS Build để dùng Stripe Terminal.\nChạy: eas build --platform ios --profile development'}
                </Text>
                <Pressable
                  onPress={() => setShowReaderModal(true)}
                  className="py-3 rounded-xl items-center mb-2"
                  style={{ backgroundColor: BLUE }}
                >
                  <Text className="text-white font-bold text-xs">
                    {connectedReaderName ? 'ĐỔI MÁY ĐỌC THẺ' : 'TÌM & KẾT NỐI MÁY ĐỌC THẺ'}
                  </Text>
                </Pressable>
                {connectedReaderName ? (
                  <Pressable
                    onPress={() => setConnectedReaderName(null)}
                    className="py-2 rounded-xl items-center border"
                    style={{ borderColor: RED }}
                  >
                    <Text className="font-bold text-xs" style={{ color: RED }}>
                      NGẮT KẾT NỐI
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Text className="text-[10px] font-bold text-white uppercase mb-3">
                MÁY IN HOÁ ĐƠN (EPSON)
              </Text>
              <View className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">

                {/* Trạng thái kết nối */}
                <View className="flex-row items-center mb-3">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: printer.connected ? '#4caf50' : '#d32f2f' }}
                  />
                  <Text className="text-white text-xs font-semibold flex-1" numberOfLines={1}>
                    {printer.connected
                      ? printer.connectionType === 'bluetooth'
                        ? `Bluetooth — ${printer.btDeviceName || printer.btDeviceAddress}`
                        : `WiFi — ${printer.ip}:${printer.port}`
                      : 'Chưa kết nối'}
                  </Text>
                </View>

                {/* Toggle WiFi / Bluetooth */}
                <View className="flex-row mb-4 rounded-lg overflow-hidden border border-neutral-600">
                  <Pressable
                    onPress={() => printer.setConnectionType('wifi')}
                    className="flex-1 py-2 items-center"
                    style={{ backgroundColor: printer.connectionType === 'wifi' ? BLUE : '#2a2a2a' }}
                  >
                    <Text className="font-bold text-[11px]" style={{ color: printer.connectionType === 'wifi' ? '#fff' : '#888' }}>
                      WiFi / LAN
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => printer.setConnectionType('bluetooth')}
                    className="flex-1 py-2 items-center"
                    style={{ backgroundColor: printer.connectionType === 'bluetooth' ? BLUE : '#2a2a2a' }}
                  >
                    <Text className="font-bold text-[11px]" style={{ color: printer.connectionType === 'bluetooth' ? '#fff' : '#888' }}>
                      Bluetooth
                    </Text>
                  </Pressable>
                </View>

                {/* ── WiFi panel ── */}
                {printer.connectionType === 'wifi' && (
                  <>
                    <Text className="text-neutral-400 text-[10px] mb-3">
                      {isWifiPrinterSupported()
                        ? 'Giao thức RAW TCP cổng 9100. Máy in Epson TM-T88, TM-T20, TM-m30 có cổng LAN/WiFi.'
                        : 'Cần EAS Build để dùng máy in qua mạng.'}
                    </Text>
                    <View className="flex-row gap-2 mb-2">
                      <TextInput
                        value={printerIpInput}
                        onChangeText={setPrinterIpInput}
                        placeholder="Địa chỉ IP (vd: 192.168.1.50)"
                        placeholderTextColor="#777"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="numbers-and-punctuation"
                        className="bg-neutral-900 text-white text-xs rounded-lg px-3 py-2 border border-neutral-700"
                        style={{ flex: 2 }}
                      />
                      <TextInput
                        value={printerPortInput}
                        onChangeText={setPrinterPortInput}
                        placeholder="9100"
                        placeholderTextColor="#777"
                        keyboardType="number-pad"
                        className="bg-neutral-900 text-white text-xs rounded-lg px-3 py-2 border border-neutral-700"
                        style={{ flex: 1 }}
                      />
                    </View>
                    <View className="flex-row gap-2 mb-2">
                      <Pressable
                        onPress={handleConnectPrinter}
                        disabled={printer.connecting}
                        className="flex-1 py-3 rounded-xl items-center border-2"
                        style={{ borderColor: BLUE, opacity: printer.connecting ? 0.5 : 1 }}
                      >
                        <Text className="font-bold text-[10px]" style={{ color: '#64b5f6' }}>
                          {printer.connecting ? 'ĐANG KẾT NỐI…' : 'KẾT NỐI'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleDisconnectPrinter}
                        className="flex-1 py-3 rounded-xl items-center border-2"
                        style={{ borderColor: '#555' }}
                      >
                        <Text className="font-bold text-[10px] text-neutral-400">NGẮT</Text>
                      </Pressable>
                    </View>
                  </>
                )}

                {/* ── Bluetooth panel ── */}
                {printer.connectionType === 'bluetooth' && (
                  <>
                    <Text className="text-neutral-400 text-[10px] mb-3">
                      {isBluetoothPrinterSupported()
                        ? 'Epson TM-m30, TM-T88 với adapter Bluetooth. Ghép đôi máy in trong Settings Android/iOS trước.'
                        : 'Cần EAS Build để dùng Bluetooth.'}
                    </Text>
                    {printer.btDeviceAddress ? (
                      <View className="bg-neutral-700 rounded-lg px-3 py-2 mb-2 flex-row items-center">
                        <Ionicons name="bluetooth" size={14} color="#64b5f6" style={{ marginRight: 8 }} />
                        <Text className="text-white text-xs flex-1" numberOfLines={1}>
                          {printer.btDeviceName || printer.btDeviceAddress}
                        </Text>
                      </View>
                    ) : null}
                    <View className="flex-row gap-2 mb-2">
                      <Pressable
                        onPress={handleOpenBtScan}
                        disabled={printer.btScanning || printer.connecting}
                        className="flex-1 py-3 rounded-xl items-center border-2"
                        style={{ borderColor: BLUE, opacity: (printer.btScanning || printer.connecting) ? 0.5 : 1 }}
                      >
                        <Text className="font-bold text-[10px]" style={{ color: '#64b5f6' }}>
                          {printer.btScanning ? 'ĐANG QUÉT…' : 'CHỌN MÁY IN BT'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleDisconnectPrinter}
                        className="flex-1 py-3 rounded-xl items-center border-2"
                        style={{ borderColor: '#555' }}
                      >
                        <Text className="font-bold text-[10px] text-neutral-400">NGẮT</Text>
                      </Pressable>
                    </View>
                  </>
                )}

                {/* Nút in thử — hiện khi đã kết nối */}
                {printer.connected && (
                  <Pressable
                    onPress={handleTestPrint}
                    disabled={printer.connecting}
                    className="mt-1 py-3 rounded-xl items-center"
                    style={{ backgroundColor: BLUE, opacity: printer.connecting ? 0.5 : 1 }}
                  >
                    <Text className="text-white font-bold text-[10px]">IN THỬ</Text>
                  </Pressable>
                )}
              </View>

              {/* Modal chọn thiết bị Bluetooth */}
              <Modal visible={showBtModal} transparent animationType="slide" onRequestClose={() => setShowBtModal(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
                  <View style={{ backgroundColor: '#1e1e1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, maxHeight: '70%' }}>
                    <View className="flex-row items-center mb-4">
                      <Text className="text-white font-extrabold text-base flex-1">CHỌN MÁY IN BLUETOOTH</Text>
                      <Pressable onPress={() => setShowBtModal(false)}>
                        <Ionicons name="close" size={22} color="#aaa" />
                      </Pressable>
                    </View>

                    {printer.btScanning && (
                      <View className="items-center py-8">
                        <ActivityIndicator color={BLUE} size="large" />
                        <Text className="text-neutral-400 text-xs mt-3">Đang quét thiết bị…</Text>
                      </View>
                    )}

                    {!printer.btScanning && printer.btDevices.length === 0 && (
                      <View className="items-center py-8">
                        <Ionicons name="bluetooth-outline" size={40} color="#555" />
                        <Text className="text-neutral-400 text-xs mt-3 text-center">
                          Không tìm thấy thiết bị.{'\n'}Ghép đôi máy in trong Settings của điện thoại trước.
                        </Text>
                        <Pressable
                          onPress={() => printer.scanBtDevices()}
                          className="mt-4 px-6 py-2 rounded-lg border border-neutral-600"
                        >
                          <Text className="text-neutral-300 text-xs font-bold">QUÉT LẠI</Text>
                        </Pressable>
                      </View>
                    )}

                    {!printer.btScanning && printer.btDevices.length > 0 && (
                      <FlatList
                        data={printer.btDevices}
                        keyExtractor={(item) => item.address}
                        renderItem={({ item }) => (
                          <Pressable
                            onPress={() => handleConnectBtDevice(item)}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' }}
                          >
                            <Ionicons name="print-outline" size={20} color="#64b5f6" style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{item.name || '(Không tên)'}</Text>
                              <Text style={{ color: '#888', fontSize: 10, marginTop: 2 }}>{item.address}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#555" />
                          </Pressable>
                        )}
                      />
                    )}
                  </View>
                </View>
              </Modal>

            </View>
          ) : null}

          {tab === 'hours' ? (
            <View className="py-8 items-center px-4">
              <Ionicons name="time-outline" size={48} color="#888" />
              <Text className="text-neutral-400 text-center mt-4 text-sm">
                Store hours editor — connect to your backend when ready.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <StripeReaderModal
        visible={showReaderModal}
        onClose={() => setShowReaderModal(false)}
        onConnect={(reader) => {
          setConnectedReaderName(reader.label || reader.serialNumber || 'Reader');
          setShowReaderModal(false);
        }}
      />
    </OwnerGate>
  );
}
