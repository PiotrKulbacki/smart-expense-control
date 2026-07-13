'use client';

import Link from 'next/link';
import { useT } from '@web/features/i18n/LocaleProvider';
import { LocaleSwitcher } from '@web/features/layout/components/LocaleSwitcher';

export function PublicHeader() {
  const t = useT();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
          {t('layout.brand')}
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <a href="#features" className="transition hover:text-gray-900">
            {t('layout.nav.features')}
          </a>
          <a href="#pricing" className="transition hover:text-gray-900">
            {t('layout.nav.pricing')}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 sm:inline-flex"
          >
            {t('auth.labels.login')}
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t('auth.labels.register')}
          </Link>
        </div>
      </div>
    </header>
  );
}
