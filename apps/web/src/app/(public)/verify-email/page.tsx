'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

function VerifyEmailContent() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const emailParam = searchParams.get('email') ?? '';
  const [email, setEmail] = useState(emailParam);
  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (!token || verifyStarted.current) {
      return;
    }
    verifyStarted.current = true;

    async function verify() {
      setIsVerifying(true);
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
          return;
        }

        setVerified(true);
        toast.success(t('auth.verify.success'));
        router.push('/login');
      } catch {
        toast.error(t('auth.errors.networkError'));
      } finally {
        setIsVerifying(false);
      }
    }

    void verify();
  }, [token, locale, router, t]);

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsResending(true);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(t('auth.verify.resent'));
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="panel relative z-10 w-full p-8">
      {isVerifying ? (
        <div className="relative z-10 flex items-center justify-center gap-2 py-6">
          <LoadingSpinner />
          <span className="text-muted text-sm">{t('auth.labels.verifyEmail')}</span>
        </div>
      ) : verified ? (
        <p className="text-muted relative z-10 text-sm">{t('auth.verify.success')}</p>
      ) : (
        <div className="relative z-10 space-y-4">
          <p className="text-muted text-sm">
            {t('auth.verify.checkInbox', { email: email || '…' })}
          </p>
          <form onSubmit={(event) => void handleResend(event)} className="flex flex-col gap-4">
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
                disabled={isResending}
                className="auth-input"
              />
            </div>
            <button
              type="submit"
              disabled={isResending}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isResending && <LoadingSpinner />}
              {t('auth.labels.resendVerification')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
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
            {t('auth.verify.title')}
          </h1>
        </div>
        <Suspense fallback={null}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
