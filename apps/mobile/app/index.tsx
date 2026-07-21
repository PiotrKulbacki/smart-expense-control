import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { DEFAULT_LOCALE, t } from '@shared/features/i18n';
import { useAuth } from '@mobile/features/auth/hooks/useAuth';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const locale = DEFAULT_LOCALE;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lyamo</Text>
      {user ? (
        <>
          <Text style={styles.subtitle}>{user.email}</Text>
          <Pressable style={styles.button} onPress={() => router.push('/change-password' as Href)}>
            <Text style={styles.buttonText}>{t('auth.labels.changePassword', locale)}</Text>
          </Pressable>
          <Pressable onPress={() => void logout()}>
            <Text style={styles.link}>{t('auth.labels.logout', locale)}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.subtitle}>Default locale: {DEFAULT_LOCALE}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  link: {
    marginTop: 16,
    color: '#2563eb',
    fontSize: 14,
  },
});
