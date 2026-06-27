// The authenticated portion of the app.
// If you're not logged in, you shouldn't be here.

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);

  // Redirect unauthenticated users to the login screen.
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    />
  );
}
