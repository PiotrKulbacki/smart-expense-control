'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { forgotPasswordSchema } from '@shared/features/auth/schemas';
import { translateError } from '@shared/features/i18n';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

export default function ForgotPasswordPage() {
  const t = useT();
  const { locale } = useLocale();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const parsed = forgotPasswordSchema.safeParse({ email });
      if (!parsed.success) {
        const code = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
        toast.error(translateError(code, locale));
        return;
      }

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(t('auth.forgot.success'));
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  }

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
            {t('auth.forgot.title')}
          </h1>
          <p className="text-muted mt-2 text-sm">{t('auth.forgot.subtitle')}</p>
        </div>

        <div className="panel relative z-10 w-full p-8">
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="relative z-10 flex flex-col gap-4"
          >
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
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
                className="auth-input"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading && <LoadingSpinner />}
              {t('auth.labels.sendResetLink')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
