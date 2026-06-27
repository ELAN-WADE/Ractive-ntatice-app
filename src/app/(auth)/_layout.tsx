/**
 * Auth layout: wraps login/register screens.
 * Redirects to the app if the user is already authenticated.
 */

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  // Show splash while restoring session
  if (!isInitialized) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Redirect authenticated users to the app
  if (user) {
    return <Redirect href="/(app)/map" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    />
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
