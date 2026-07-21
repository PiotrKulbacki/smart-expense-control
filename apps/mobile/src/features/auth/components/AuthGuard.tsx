import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter, useSegments, type Href } from 'expo-router';
import { useAuth } from '@mobile/features/auth/hooks/useAuth';

const AUTH_ROUTES = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const currentRoute = segments[0];
  const isAuthRoute = currentRoute ? AUTH_ROUTES.has(currentRoute) : false;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user && !isAuthRoute) {
      router.replace('/login' as Href);
      return;
    }

    if (user && isAuthRoute) {
      router.replace('/' as Href);
    }
  }, [user, isLoading, isAuthRoute, router]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user && !isAuthRoute) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (user && isAuthRoute) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
});
