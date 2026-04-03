/**
 * Catalog công khai — cùng nguồn với website (nail-website @/lib/api fetchServices / fetchEmployees).
 * Dùng cho POS để menu & bubble khớp web khi cùng một backend.
 */
import api from './client';

/** Trả về tên từ backend (`SALON_DISPLAY_NAME`) hoặc `null` nếu lỗi mạng/API. */
export async function fetchSalonDisplayName() {
  try {
    const { data } = await api.get('/api/public/salon');
    const name = typeof data?.name === 'string' ? data.name.trim() : '';
    return name || 'Nice Nails & Spa';
  } catch {
    return null;
  }
}

export async function fetchCatalogServices() {
  const { data } = await api.get('/api/public/services');
  return Array.isArray(data) ? data : [];
}

export async function fetchCatalogEmployees() {
  const { data } = await api.get('/api/public/employees');
  return Array.isArray(data) ? data : [];
}
