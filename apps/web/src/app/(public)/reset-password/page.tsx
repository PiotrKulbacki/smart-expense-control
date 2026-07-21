'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { resetPasswordSchema } from '@shared/features/auth/schemas';
import { translateError } from '@shared/features/i18n';
import { PasswordInput } from '@web/features/auth/components/PasswordInput';
import { PasswordRequirementsList } from '@web/features/auth/components/PasswordRequirementsList';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

function ResetPasswordForm() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const parsed = resetPasswordSchema.safeParse({ token, password, confirmPassword });
      if (!parsed.success) {
        const code = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
        toast.error(translateError(code, locale));
        return;
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(t('auth.reset.success'));
      router.push('/login');
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="panel relative z-10 w-full p-8">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="relative z-10 flex flex-col gap-4"
      >
        <div>
          <label htmlFor="password" className="auth-label">
            {t('auth.labels.newPassword')}
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
          />
          <PasswordRequirementsList
            password={password}
            confirmPassword={confirmPassword}
            showMatch
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="auth-label">
            {t('auth.labels.confirmPassword')}
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !token}
          className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading && <LoadingSpinner />}
          {t('auth.labels.resetPassword')}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useT();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
      <Link
        href="/login"
        className="text-muted hover:text-warm mb-8 inline-flex items-center gap-2 font-mono text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        {t('auth.labels.backToLogin')}
      </Link>

      <div className="w-full space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">
            {t('auth.reset.title')}
          </h1>
          <p className="text-muted mt-2 text-sm">{t('auth.reset.subtitle')}</p>
        </div>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
