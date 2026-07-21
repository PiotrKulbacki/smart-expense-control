import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Toast from 'react-native-toast-message';
import { loginSchema, registerSchema } from '@shared/features/auth/schemas';
import { DEFAULT_LOCALE, t, translateError } from '@shared/features/i18n';
import { loginUser, registerUser } from '@mobile/features/auth/services/auth.service';
import { useAuth } from '@mobile/features/auth/hooks/useAuth';
import { PasswordField } from '@mobile/features/auth/components/PasswordField';
import { PasswordRequirementsList } from '@mobile/features/auth/components/PasswordRequirementsList';

type AuthScreenProps = {
  mode: 'login' | 'register';
};

export function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter();
  const { setUser } = useAuth();
  const locale = DEFAULT_LOCALE;
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  async function handleSubmit() {
    setIsLoading(true);

    const payload =
      mode === 'login'
        ? { email, password }
        : { email, password, confirmPassword, name: name || undefined };

    const schema = mode === 'login' ? loginSchema : registerSchema;
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      const code = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
      Toast.show({ type: 'error', text1: translateError(code, locale) });
      setIsLoading(false);
      return;
    }

    if (mode === 'login') {
      const result = await loginUser({ email, password });
      setIsLoading(false);
      if (result.ok) {
        setUser(result.user);
        router.replace('/');
        return;
      }
      if (result.emailNotVerified) {
        router.push(`/verify-email?email=${encodeURIComponent(result.email ?? email)}` as Href);
      }
      return;
    }

    const result = await registerUser({
      email,
      password,
      confirmPassword,
      name: name || undefined,
    });

    setIsLoading(false);

    if (result?.requiresEmailVerification) {
      router.push(`/verify-email?email=${encodeURIComponent(result.email ?? email)}` as Href);
      return;
    }

    if (result?.user) {
      setUser(result.user);
      router.replace('/');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t(mode === 'login' ? 'auth.labels.login' : 'auth.labels.register', locale)}
      </Text>

      {mode === 'register' && (
        <TextInput
          style={styles.input}
          placeholder={t('auth.labels.name', locale)}
          value={name}
          onChangeText={setName}
          editable={!isLoading}
          autoCapitalize="words"
        />
      )}

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

      <PasswordField
        label={t('auth.labels.password', locale)}
        value={password}
        onChangeText={setPassword}
        editable={!isLoading}
        autoComplete={mode === 'login' ? 'password' : 'new-password'}
      />

      {mode === 'register' && (
        <>
          <PasswordRequirementsList
            password={password}
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
        </>
      )}

      {mode === 'login' && (
        <Pressable
          onPress={() => router.push('/forgot-password' as Href)}
          disabled={isLoading}
          style={styles.forgotLink}
        >
          <Text style={styles.link}>{t('auth.labels.forgotPassword', locale)}</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {t(mode === 'login' ? 'auth.labels.login' : 'auth.labels.register', locale)}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push((mode === 'login' ? '/register' : '/login') as Href)}
        disabled={isLoading}
      >
        <Text style={styles.link}>
          {t(mode === 'login' ? 'auth.labels.noAccount' : 'auth.labels.hasAccount', locale)}{' '}
          {t(mode === 'login' ? 'auth.labels.signUp' : 'auth.labels.signIn', locale)}
        </Text>
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
    marginBottom: 24,
    textAlign: 'center',
    color: '#111827',
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 4,
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
