'use client';

import Link from 'next/link';
import { useT } from '@web/features/i18n/LocaleProvider';
import { LocaleSwitcher } from '@web/features/layout/components/LocaleSwitcher';
import { LyamoLogo } from '@web/features/layout/components/LyamoLogo';

export function PublicHeader() {
  const t = useT();

  return (
    <header className="panel-cut bg-void/90 sticky top-0 z-40 border-b border-[var(--border)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="group inline-flex">
          <LyamoLogo markClassName="h-9 w-9" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="#features" className="nav-link">
            {t('layout.nav.features')}
          </a>
          <a href="#pricing" className="nav-link">
            {t('layout.nav.pricing')}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link href="/login" className="btn-ghost hidden px-3 py-2 sm:inline-flex">
            {t('auth.labels.login')}
          </Link>
          <Link href="/register" className="btn-primary px-3 py-2">
            {t('auth.labels.register')}
          </Link>
        </div>
      </div>
    </header>
  );
}
