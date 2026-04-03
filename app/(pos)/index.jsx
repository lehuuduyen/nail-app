import PublicHomeScreen from '../../components/PublicHomeScreen';
import OwnerHomeScreen from '../../components/OwnerHomeScreen';
import { useOwnerStore } from '../../store/ownerStore';

export default function HomeScreen() {
  const isOwnerMode = useOwnerStore((s) => s.isOwnerMode);
  return isOwnerMode ? <OwnerHomeScreen /> : <PublicHomeScreen />;
}
