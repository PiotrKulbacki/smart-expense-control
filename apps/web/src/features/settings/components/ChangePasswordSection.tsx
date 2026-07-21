'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { changePasswordSchema } from '@shared/features/auth/schemas';
import { translateError } from '@shared/features/i18n';
import { PasswordInput } from '@web/features/auth/components/PasswordInput';
import { PasswordRequirementsList } from '@web/features/auth/components/PasswordRequirementsList';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type ChangePasswordSectionProps = {
  hasPassword: boolean;
  email: string;
};

export function ChangePasswordSection({ hasPassword, email }: ChangePasswordSectionProps) {
  const t = useT();
  const { locale } = useLocale();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const parsed = changePasswordSchema.safeParse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!parsed.success) {
        const code = parsed.error.errors[0]?.message ?? 'auth.errors.generic';
        toast.error(translateError(code, locale));
        return;
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('auth.success.passwordChanged'));
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendResetLink() {
    setIsSendingReset(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
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
      setIsSendingReset(false);
    }
  }

  const isBusy = isSaving || isSendingReset;

  return (
    <section className="panel relative z-10 p-6">
      <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
        {t('settings.security.title')}
      </h2>

      {!hasPassword ? (
        <p className="text-muted relative z-10 mt-3 text-sm leading-relaxed">
          {t('settings.security.oauthOnly')}
        </p>
      ) : (
        <>
          <p className="text-muted relative z-10 mt-2 text-sm">{t('settings.security.subtitle')}</p>
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="relative z-10 mt-4 space-y-4"
          >
            <div>
              <label htmlFor="currentPassword" className="auth-label">
                {t('auth.labels.currentPassword')}
              </label>
              <PasswordInput
                id="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={isBusy}
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="auth-label">
                {t('auth.labels.newPassword')}
              </label>
              <PasswordInput
                id="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={isBusy}
                required
              />
              <PasswordRequirementsList
                password={newPassword}
                confirmPassword={confirmPassword}
                showMatch
              />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="auth-label">
                {t('auth.labels.confirmPassword')}
              </label>
              <PasswordInput
                id="confirmNewPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isBusy}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSaving && <LoadingSpinner />}
              {t('auth.labels.savePassword')}
            </button>
          </form>

          <div className="relative z-10 mt-6 border-t border-[var(--border)] pt-5">
            <p className="text-muted text-sm leading-relaxed">
              {t('settings.security.forgotHint')}
            </p>
            <button
              type="button"
              onClick={() => void handleSendResetLink()}
              disabled={isBusy}
              className="btn-ghost mt-3 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSendingReset && <LoadingSpinner />}
              {t('auth.labels.sendResetLink')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
