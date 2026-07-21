'use client';

import Link from 'next/link';
import { useT } from '@web/features/i18n/LocaleProvider';
import { useCookieConsent } from '@web/features/cookie-consent';
import { LyamoLogo } from '@web/features/layout/components/LyamoLogo';

export function PublicFooter() {
  const t = useT();
  const { openPreferences } = useCookieConsent();

  return (
    <footer className="bg-surface/50 border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3">
          <Link href="/" className="inline-flex w-fit">
            <LyamoLogo markClassName="h-8 w-8" />
          </Link>
          <p className="text-muted text-sm">
            {t('layout.footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>

        <nav className="text-muted flex flex-wrap gap-x-5 gap-y-2 text-sm sm:justify-end">
          <Link href="/terms" className="hover:text-warm transition">
            {t('layout.footer.terms')}
          </Link>
          <Link href="/privacy" className="hover:text-warm transition">
            {t('layout.footer.privacy')}
          </Link>
          <Link href="/impressum" className="hover:text-warm transition">
            {t('layout.footer.impressum')}
          </Link>
          <button type="button" onClick={openPreferences} className="hover:text-warm transition">
            {t('layout.footer.cookieSettings')}
          </button>
          <Link href="/contact" className="hover:text-warm transition">
            {t('layout.footer.contact')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
