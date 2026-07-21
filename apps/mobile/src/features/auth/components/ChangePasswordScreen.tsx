import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { changePasswordSchema } from '@shared/features/auth/schemas';
import { DEFAULT_LOCALE, t, translateError } from '@shared/features/i18n';
import { changePassword } from '@mobile/features/auth/services/auth.service';
import { useAuth } from '@mobile/features/auth/hooks/useAuth';
import { PasswordField } from '@mobile/features/auth/components/PasswordField';
import { PasswordRequirementsList } from '@mobile/features/auth/components/PasswordRequirementsList';

export function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const locale = DEFAULT_LOCALE;
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSubmit() {
    if (!user?.hasPassword) {
      Toast.show({
        type: 'error',
        text1: t('auth.errors.oauthPasswordChangeUnavailable', locale),
      });
      return;
    }

    setIsLoading(true);

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!parsed.success) {
      const code = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      Toast.show({ type: 'error', text1: translateError(code, locale) });
      setIsLoading(false);
      return;
    }

    const ok = await changePassword(parsed.data);
    setIsLoading(false);

    if (ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.back();
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.security.title', locale)}</Text>

      {!user?.hasPassword ? (
        <Text style={styles.info}>{t('settings.security.oauthOnly', locale)}</Text>
      ) : (
        <>
          <Text style={styles.subtitle}>{t('settings.security.subtitle', locale)}</Text>
          <PasswordField
            label={t('auth.labels.currentPassword', locale)}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            editable={!isLoading}
            autoComplete="password"
          />
          <PasswordField
            label={t('auth.labels.newPassword', locale)}
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!isLoading}
            autoComplete="new-password"
          />
          <PasswordRequirementsList
            password={newPassword}
            confirmPassword={confirmPassword}
            showMatch
          />
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
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('auth.labels.savePassword', locale)}</Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={() => router.back()} disabled={isLoading}>
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
  info: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
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
