/**
 * Auth layout: wraps login/register screens.
 * Redirects to the app if the user is already authenticated.
 */

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function AuthLayout() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initialize = useAuthStore((s) => s.initialize);

  // Initialize auth on first mount
  useEffect(() => {
    initialize();
  }, []);

  // Redirect authenticated users to the app
  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/(app)/map');
    }
  }, [isInitialized, user]);

  // Show splash while restoring session
  if (!isInitialized) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
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
