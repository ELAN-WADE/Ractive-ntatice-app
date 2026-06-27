import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';

// Entry point: checks if we have a logged-in user and routes them accordingly.
// If they're authenticated, they go straight to the map. Otherwise, login screen.
export default function Index() {
  const user = useAuthStore((s) => s.user);

  if (user) {
    return <Redirect href="/(app)/map" />;
  }

  return <Redirect href="/(auth)/login" />;
}
