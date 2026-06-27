// The authenticated portion of the app.
// If you're not logged in, you shouldn't be here.

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function AppLayout() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Boot unauthenticated users back to the login screen.
    // We don't need to check isInitialized here because the root layout
    // guarantees it's true before this component ever renders.
    if (!user) {
      router.replace('/(auth)/login');
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0F172A' },
      }}
    />
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
