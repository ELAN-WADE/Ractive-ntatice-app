// The absolute root of the app.
// We handle the global auth initialization here so it only runs once when the app boots up.

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/useAuthStore';

// Don't show the app until we know if the user is logged in or not
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initialize = useAuthStore((s) => s.initialize);

  // Boot up Supabase auth and start listening to token changes
  useEffect(() => {
    const cleanupPromise = initialize();
    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [initialize]);

  // Once auth is figured out, drop the native splash screen
  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [isInitialized]);

  // Keep rendering null so the native splash screen stays locked on screen
  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
