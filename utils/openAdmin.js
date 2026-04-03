import { router } from 'expo-router';

/** Map legacy admin hrefs to main tab routes (owner mode unlocks those tabs). */
export function openAdminRoute(href) {
  const h = String(href || '');
  if (h.includes('employees')) {
    router.push('/(pos)/employees');
    return;
  }
  if (h.includes('services')) {
    router.push('/(pos)/services');
    return;
  }
  if (h.includes('payroll')) {
    router.push('/(admin)/payroll');
    return;
  }
  if (/\/\(admin\)\/?$/.test(h)) {
    router.push('/(pos)/settings');
    return;
  }
  router.push(href);
}
