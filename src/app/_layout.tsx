// The absolute root of the app.
// We handle the global auth initialization here so it only runs once when the app boots up.

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/useAuthStore';

import { useFonts } from 'expo-font';

// Don't show the app until we know if the user is logged in or not
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initialize = useAuthStore((s) => s.initialize);

  // Load Roboto and Roboto Condensed fonts dynamically
  const [fontsLoaded, fontError] = useFonts({
    'Roboto-Regular': 'https://cdn.jsdelivr.net/npm/@fontsource/roboto/files/roboto-latin-400-normal.woff2',
    'Roboto-Bold': 'https://cdn.jsdelivr.net/npm/@fontsource/roboto/files/roboto-latin-700-normal.woff2',
    'RobotoCondensed-Bold': 'https://cdn.jsdelivr.net/npm/@fontsource/roboto-condensed/files/roboto-condensed-latin-700-normal.woff2',
  });

  // Boot up Supabase auth and start listening to token changes
  useEffect(() => {
    const cleanupPromise = initialize();
    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [initialize]);

  // Once auth is figured out, drop the splash screen immediately
  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [isInitialized]);

  // Only block on auth initialization to prevent blank screen freezes on slow networks
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
