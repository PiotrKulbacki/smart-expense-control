import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Toast from 'react-native-toast-message';
import { forgotPasswordSchema } from '@shared/features/auth/schemas';
import { DEFAULT_LOCALE, t, translateError } from '@shared/features/i18n';
import { requestPasswordReset } from '@mobile/features/auth/services/auth.service';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const locale = DEFAULT_LOCALE;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      const code = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      Toast.show({ type: 'error', text1: translateError(code, locale) });
      setIsLoading(false);
      return;
    }

    const ok = await requestPasswordReset(parsed.data.email);
    setIsLoading(false);

    if (ok) {
      router.push('/login' as Href);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.forgot.title', locale)}</Text>
      <Text style={styles.subtitle}>{t('auth.forgot.subtitle', locale)}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('auth.labels.email', locale)}
        value={email}
        onChangeText={setEmail}
        editable={!isLoading}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Pressable
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>{t('auth.labels.sendResetLink', locale)}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/login' as Href)} disabled={isLoading}>
        <Text style={styles.link}>{t('auth.labels.backToLogin', locale)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    color: '#2563eb',
    fontSize: 14,
  },
});
