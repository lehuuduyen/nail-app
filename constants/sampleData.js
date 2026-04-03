import { mapApiEmployeeToPosStaff } from '../utils/staffDisplay';

/** Bản sao của repo `shared/employeesSeed.json` — phải nằm trong nail-app để EAS bundle được */
const employeesSeed = require('./employeesSeed.json');

/** Bản ghi giống API (id tạm 1..n khi offline, khớp thứ tự seed) */
export const FALLBACK_EMPLOYEE_ROWS = employeesSeed.map((row, i) => ({
  id: i + 1,
  ...row,
}));

/** Bubble POS khi không gọi được API — tên hiển thị = firstName + lastName như web */
export const SAMPLE_STAFF = FALLBACK_EMPLOYEE_ROWS.map((e, i) =>
  mapApiEmployeeToPosStaff(e, i)
);

export function appointmentColLabel(e) {
  if (e.firstName === 'CO' && String(e.lastName).toUpperCase() === 'UT') return 'CO UT';
  return e.firstName;
}

/** Cột lịch từ danh sách employee API (id tăng dần = hàng khớp seed) */
export function buildAppointmentStaffCols(employees) {
  const sorted = [...(employees || [])].sort((a, b) => a.id - b.id);
  return ['ANYONE', ...sorted.map(appointmentColLabel)];
}

export function employeeIdToScheduleRow(employees) {
  const sorted = [...(employees || [])].sort((a, b) => a.id - b.id);
  const map = new Map();
  sorted.forEach((e, i) => map.set(e.id, i + 1));
  return map;
}

/** Cột lịch: ANYONE + nhãn ngắn theo firstName (CO+UT → CO UT), cùng thứ tự seed */
export var APPOINTMENT_STAFF_COLS = [
  'ANYONE',
  ...employeesSeed.map(appointmentColLabel),
];

export { POS_TAB_ORDER as POS_CATEGORIES } from '../utils/serviceCategories';

export const SAMPLE_SERVICES = [
  { id: 's1', name: 'ADDITIONAL - THÊM', price: 10, category: 'ADDITIONAL - THÊM' },
  { id: 's2', name: 'MASSAGE 10 MIN', price: 10, category: 'ADDITIONAL - THÊM' },
  { id: 's3', name: 'TAKE OFF - THẢO MÓNG', price: 10, category: 'ADDITIONAL - THÊM' },
  { id: 's4', name: 'CHANGE COLOR', price: 20, category: 'ADDITIONAL - THÊM' },
  { id: 's5', name: 'PEDI 1', price: 35, category: 'PEDICURE - CHÂN' },
  { id: 's6', name: 'PEDI 1+', price: 40, category: 'PEDICURE - CHÂN' },
  { id: 's7', name: 'CLN-NẾ', price: 25, category: 'MANICURE - TAY' },
];

export const SAMPLE_CHECKINS = [
  {
    id: '1',
    name: 'SAFI MUHINDO',
    phoneMasked: '(xxx) xxx-2421',
    checkInTime: '3:21:43 PM',
    hasAppt: false,
    service: 'PEDI+',
  },
  {
    id: '2',
    name: 'GLORIA',
    phoneMasked: '(xxx) xxx-2421',
    checkInTime: '3:18:12 PM',
    hasAppt: false,
    service: '',
  },
  {
    id: '3',
    name: 'PEARL BJO',
    phoneMasked: '(xxx) xxx-2421',
    checkInTime: '3:05:00 PM',
    hasAppt: true,
    service: 'PEDI 1+',
  },
];

