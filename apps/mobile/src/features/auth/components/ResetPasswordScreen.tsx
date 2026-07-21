import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Toast from 'react-native-toast-message';
import { resetPasswordSchema } from '@shared/features/auth/schemas';
import { DEFAULT_LOCALE, t, translateError } from '@shared/features/i18n';
import { resetPassword } from '@mobile/features/auth/services/auth.service';
import { PasswordField } from '@mobile/features/auth/components/PasswordField';
import { PasswordRequirementsList } from '@mobile/features/auth/components/PasswordRequirementsList';

export function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const locale = DEFAULT_LOCALE;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);

    const parsed = resetPasswordSchema.safeParse({ token, password, confirmPassword });
    if (!parsed.success) {
      const code = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      Toast.show({ type: 'error', text1: translateError(code, locale) });
      setIsLoading(false);
      return;
    }

    const ok = await resetPassword(parsed.data);
    setIsLoading(false);

    if (ok) {
      router.replace('/login' as Href);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.reset.title', locale)}</Text>
      <Text style={styles.subtitle}>{t('auth.reset.subtitle', locale)}</Text>
      <PasswordField
        label={t('auth.labels.newPassword', locale)}
        value={password}
        onChangeText={setPassword}
        editable={!isLoading}
        autoComplete="new-password"
      />
      <PasswordRequirementsList password={password} confirmPassword={confirmPassword} showMatch />
      <PasswordField
        label={t('auth.labels.confirmPassword', locale)}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        editable={!isLoading}
        autoComplete="new-password"
      />
      <Pressable
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading || !token}
      >
        <Text style={styles.buttonText}>{t('auth.labels.resetPassword', locale)}</Text>
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
