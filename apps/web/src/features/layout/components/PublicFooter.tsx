'use client';

import Link from 'next/link';
import { useT } from '@web/features/i18n/LocaleProvider';

export function PublicFooter() {
  const t = useT();

  return (
    <footer className="bg-surface/50 border-t border-[var(--border)]">
      <div className="text-muted mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{t('layout.footer.copyright', { year: new Date().getFullYear() })}</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/terms" className="hover:text-warm transition">
            {t('layout.footer.terms')}
          </Link>
          <Link href="/privacy" className="hover:text-warm transition">
            {t('layout.footer.privacy')}
          </Link>
          <a href="mailto:support@smartexpensecontrol.app" className="hover:text-warm transition">
            {t('layout.footer.contact')}
          </a>
        </div>
      </div>
    </footer>
  );
}
