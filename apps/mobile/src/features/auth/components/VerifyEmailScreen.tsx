import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { DEFAULT_LOCALE, t } from '@shared/features/i18n';
import {
  resendVerificationEmail,
  verifyEmailToken,
} from '@mobile/features/auth/services/auth.service';

export function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const emailParam = typeof params.email === 'string' ? params.email : '';
  const locale = DEFAULT_LOCALE;
  const [email, setEmail] = useState(emailParam);
  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [isResending, setIsResending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) {
      return;
    }
    started.current = true;

    async function verify() {
      setIsVerifying(true);
      const ok = await verifyEmailToken(token);
      setIsVerifying(false);
      if (ok) {
        router.replace('/login' as Href);
      }
    }

    void verify();
  }, [token, router]);

  async function handleResend() {
    setIsResending(true);
    await resendVerificationEmail(email);
    setIsResending(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.verify.title', locale)}</Text>

      {isVerifying ? (
        <ActivityIndicator size="large" color="#2563eb" />
      ) : (
        <>
          <Text style={styles.subtitle}>
            {t('auth.verify.checkInbox', locale, { email: email || '…' })}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.labels.email', locale)}
            value={email}
            onChangeText={setEmail}
            editable={!isResending}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Pressable
            style={[styles.button, isResending && styles.buttonDisabled]}
            onPress={handleResend}
            disabled={isResending}
          >
            <Text style={styles.buttonText}>{t('auth.labels.resendVerification', locale)}</Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={() => router.push('/login' as Href)}>
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
