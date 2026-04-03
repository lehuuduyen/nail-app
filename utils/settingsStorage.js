import AsyncStorage from '@react-native-async-storage/async-storage';

export const SETTING_KEYS = {
  salaryPeriod: 'SETTING_SALARY_PERIOD',
  minTurn: 'SETTING_MIN_TURN',
  storeName: 'SETTING_STORE_NAME',
  storeAddress: 'SETTING_STORE_ADDRESS',
  storePhone: 'SETTING_STORE_PHONE',
  ownerName: 'SETTING_OWNER_NAME',
  ownerSsnFein: 'SETTING_OWNER_SSN_FEIN',
  rewardAmount: 'SETTING_REWARD_AMOUNT',
  ownerEmail: 'SETTING_OWNER_EMAIL',
  keepTicketsOpen: 'SETTING_KEEP_TICKETS_OPEN',
  sellProduct: 'SETTING_SELL_PRODUCT',
  serviceSort: 'SETTING_SERVICE_SORT',
  customTax: 'SETTING_CUSTOM_TAX',
  cardReceipts: 'SETTING_CARD_RECEIPTS',
  moreDays: 'SETTING_MORE_DAYS',
  noncardReceipts: 'SETTING_NONCARD_RECEIPTS',
};

const DEFAULTS = {
  [SETTING_KEYS.salaryPeriod]: '1 WEEK',
  [SETTING_KEYS.minTurn]: '25.0',
  [SETTING_KEYS.storeName]: 'Nice Nails & Spa',
  [SETTING_KEYS.storeAddress]: '8048 N 19TH AVE, PHOENIX AZ 85021',
  [SETTING_KEYS.storePhone]: '(602) 759-9184',
  [SETTING_KEYS.ownerName]: 'HUU PHUOC LE',
  [SETTING_KEYS.ownerSsnFein]: '',
  [SETTING_KEYS.rewardAmount]: '500.0',
  [SETTING_KEYS.ownerEmail]: 'LHPHUOC1703@GMAIL.COM',
  [SETTING_KEYS.keepTicketsOpen]: 'true',
  [SETTING_KEYS.sellProduct]: 'false',
  [SETTING_KEYS.serviceSort]: 'true',
  [SETTING_KEYS.customTax]: '0.0',
  [SETTING_KEYS.cardReceipts]: '1',
  [SETTING_KEYS.moreDays]: 'false',
  [SETTING_KEYS.noncardReceipts]: '1',
};

export async function loadSetting(key) {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v != null) return v;
  } catch {
    /* ignore */
  }
  return DEFAULTS[key] ?? '';
}

export async function saveSetting(key, value) {
  await AsyncStorage.setItem(key, String(value));
}

export async function loadAllSettings() {
  const out = { ...DEFAULTS };
  for (const key of Object.values(SETTING_KEYS)) {
    out[key] = await loadSetting(key);
  }
  return out;
}
