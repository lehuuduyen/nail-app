import api from '../api/client';

/** Ghép URL ảnh từ API khi server trả path tương đối hoặc host khác máy dev. */
export function resolveMediaUrl(u) {
  if (u == null || u === '') return u;
  const s = String(u).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = String(api.defaults.baseURL || '').replace(/\/$/, '');
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${base}${path}`;
}
