import { BUBBLE_PALETTE } from '../constants/theme';

/**
 * Giống nail-frontend: `{firstName} {lastName}` từ DB — không đổi tên theo rule POS cũ.
 * Màu bubble theo thứ tự danh sách.
 */
export function formatEmployeeNameFromDb(e) {
  if (!e) return '—';
  const t = `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim();
  return t || '—';
}

/** Hình bubble giống POS tablet mẫu (tròn / kim cương / tim / khung ảnh). */
function bubbleVisualForEmployee(employee, index) {
  const fn = String(employee.firstName || '')
    .trim()
    .toUpperCase();
  let bubbleShape = 'circle';
  let color = BUBBLE_PALETTE[index % BUBBLE_PALETTE.length];

  if (fn === 'CHAU') {
    color = '#F57C00';
  } else if (fn === 'CO') {
    color = '#F57C00';
  } else if (fn === 'MAN') {
    color = '#7B1FA2';
  } else if (fn === 'MIMI') {
    bubbleShape = 'diamond';
    color = '#E91E8C';
  } else if (fn === 'SUSAN') {
    bubbleShape = 'heart';
    color = '#795548';
  } else if (fn === 'LEO') {
    bubbleShape = 'photo';
    color = '#5D4037';
  } else if (fn === 'LISA') {
    bubbleShape = 'photo';
    color = '#8D6E63';
  }

  return { bubbleShape, color };
}

export function mapApiEmployeeToPosStaff(employee, index) {
  const fn = (employee.firstName || '').trim();
  const ln = (employee.lastName || '').trim();
  const displayName = formatEmployeeNameFromDb(employee);
  const initial = (fn || ln || '?').charAt(0).toUpperCase();
  const { bubbleShape, color } = bubbleVisualForEmployee(employee, index);
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    displayName,
    nickname: employee.nickName || employee.nickname || null,
    initial,
    color,
    bubbleShape,
    photoUrl: employee.avatarUrl || employee.photoUrl || null,
  };
}
