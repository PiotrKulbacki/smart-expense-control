'use client';

import { Cookie } from 'lucide-react';
import { useT } from '@web/features/i18n/LocaleProvider';
import { useCookieConsent } from '../CookieConsentProvider';

export function CookieConsentBanner() {
  const t = useT();
  const { acceptAll, rejectOptional, openPreferences } = useCookieConsent();

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-4 left-4 right-4 z-[60] duration-300 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md"
    >
      <div className="rounded-2xl border border-[var(--border)] bg-zinc-900/90 p-4 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-5">
        <div className="via-[var(--warm)]/50 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />

        <div className="flex items-start gap-3">
          <div className="bg-warm/10 text-warm border-warm/20 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border">
            <Cookie className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2
              id="cookie-consent-title"
              className="font-display text-sm font-semibold text-[var(--text)]"
            >
              {t('cookies.banner.title')}
            </h2>
            <p
              id="cookie-consent-description"
              className="text-muted text-xs leading-relaxed sm:text-sm"
            >
              {t('cookies.banner.description')}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={acceptAll} className="btn-primary w-full sm:w-auto">
            {t('cookies.banner.acceptAll')}
          </button>
          <button type="button" onClick={rejectOptional} className="btn-ghost w-full sm:w-auto">
            {t('cookies.banner.rejectOptional')}
          </button>
          <button
            type="button"
            onClick={openPreferences}
            className="text-muted hover:text-warm w-full px-2 py-2 font-mono text-xs uppercase tracking-wider transition-colors sm:w-auto"
          >
            {t('cookies.banner.managePreferences')}
          </button>
        </div>
      </div>
    </div>
  );
}
