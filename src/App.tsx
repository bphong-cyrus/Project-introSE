// SmartSpend AI - Main App Entry Point

import { Platform } from 'react-native';
import AdminApp from './apps/admin/AdminApp';
import MobileApp from './apps/mobile/MobileApp';

export default function App() {
  const isAdminRoute =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/admin');

  return isAdminRoute ? <AdminApp /> : <MobileApp />;
}
