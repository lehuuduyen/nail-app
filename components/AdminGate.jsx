import { router } from 'expo-router';
import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import AdminPinModal from './AdminPinModal';

export default function AdminGate({ children }) {
  const unlockAdmin = useAuthStore((s) => s.unlockAdmin);
  const clearAdminSession = useAuthStore((s) => s.clearAdminSession);
  const adminUnlocked = useAuthStore((s) => s.adminUnlocked);

  const cancelAndBack = useCallback(() => {
    clearAdminSession();
    router.back();
  }, [clearAdminSession]);

  if (adminUnlocked) {
    return <>{children}</>;
  }

  return (
    <AdminPinModal
      title="Admin PIN"
      onVerified={unlockAdmin}
      onCancel={cancelAndBack}
    />
  );
}
