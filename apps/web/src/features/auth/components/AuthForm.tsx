'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { loginSchema, registerSchema } from '@shared/features/auth/schemas';
import { translateError } from '@shared/features/i18n';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { AuthDivider, OAuthGoogleButton } from '@web/features/auth/components/OAuthGoogleButton';
import { PasswordInput } from '@web/features/auth/components/PasswordInput';
import { PasswordRequirementsList } from '@web/features/auth/components/PasswordRequirementsList';
import Link from 'next/link';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';

type AuthFormProps = {
  mode: 'login' | 'register';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const { locale } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const oauthError = searchParams.get('error');

  useEffect(() => {
    if (oauthError) {
      toast.error(translateError(oauthError, locale));
    }
  }, [oauthError, locale]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const payload =
        mode === 'login'
          ? { email, password }
          : {
              email,
              password,
              confirmPassword,
              name: name || undefined,
              acceptedLegal,
              locale,
            };

      const schema = mode === 'login' ? loginSchema : registerSchema;
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        const code = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
        toast.error(translateError(code, locale));
        return;
      }

      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
        email?: string;
        requiresEmailVerification?: boolean;
      };

      if (!response.ok) {
        if (mode === 'login' && data.error === 'auth.errors.emailNotVerified') {
          toast.error(translateError(data.error, locale));
          const verifyEmail = encodeURIComponent(data.email ?? email);
          router.push(`/verify-email?email=${verifyEmail}`);
          return;
        }
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      if (mode === 'register' && data.requiresEmailVerification) {
        toast.success(t('auth.success.register'));
        const verifyEmail = encodeURIComponent(data.email ?? email);
        router.push(`/verify-email?email=${verifyEmail}`);
        return;
      }

      toast.success(t(mode === 'login' ? 'auth.success.login' : 'auth.success.register'));
      const redirect = searchParams.get('redirect') ?? '/dashboard';
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="panel relative z-10 w-full max-w-md p-8">
      <OAuthGoogleButton
        label={t('auth.labels.continueWithGoogle')}
        disabled={isLoading || (mode === 'register' && !acceptedLegal)}
      />
      <div className="mt-3">
        <AuthDivider label={t('auth.labels.or')} />
      </div>
      <form onSubmit={handleSubmit} className="relative z-10 mt-4 flex flex-col gap-4">
        {mode === 'register' && (
          <div>
            <label htmlFor="name" className="auth-label">
              {t('auth.labels.name')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="auth-input"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="auth-label">
            {t('auth.labels.email')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="auth-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="auth-label">
            {t('auth.labels.password')}
          </label>
          <PasswordInput
            id="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          {mode === 'register' && (
            <PasswordRequirementsList
              password={password}
              confirmPassword={confirmPassword}
              showMatch
            />
          )}
        </div>

        {mode === 'register' && (
          <div>
            <label htmlFor="confirmPassword" className="auth-label">
              {t('auth.labels.confirmPassword')}
            </label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}

        {mode === 'login' && (
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-cool hover:text-warm text-xs font-medium">
              {t('auth.labels.forgotPassword')}
            </Link>
          </div>
        )}

        {mode === 'register' && (
          <label className="text-muted flex items-start gap-3 text-xs leading-relaxed">
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(event) => setAcceptedLegal(event.target.checked)}
              disabled={isLoading}
              className="mt-1"
            />
            <span>
              {t('auth.checkboxes.legalAcceptancePrefix')}{' '}
              <Link href="/terms" className="hover:text-warm underline">
                {t('layout.footer.terms')}
              </Link>
              {t('auth.checkboxes.legalAcceptanceMiddle')}{' '}
              <Link href="/privacy" className="hover:text-warm underline">
                {t('layout.footer.privacy')}
              </Link>
              {t('auth.checkboxes.legalAcceptanceSuffix')}
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={isLoading || (mode === 'register' && !acceptedLegal)}
          className="btn-primary relative z-10 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading && <LoadingSpinner />}
          {t(mode === 'login' ? 'auth.labels.login' : 'auth.labels.register')}
        </button>
      </form>
    </div>
  );
}
