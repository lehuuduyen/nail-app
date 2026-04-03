export function getApiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d === 'string') return d;
  if (d?.message) return String(d.message);
  if (d?.error) return String(d.error);
  if (Array.isArray(d?.errors)) {
    return d.errors.map((x) => (typeof x === 'string' ? x : x?.message || '')).join('\n');
  }
  return err?.message || 'Không thể kết nối máy chủ';
}
