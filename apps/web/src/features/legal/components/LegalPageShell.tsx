'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '@web/features/i18n/LocaleProvider';

type LegalPageShellProps = {
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ title, children }: LegalPageShellProps) {
  const t = useT();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/"
        className="text-muted hover:text-warm mb-8 inline-flex items-center gap-2 font-mono text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        {t('legal.backToHome')}
      </Link>

      <h1 className="font-display text-3xl font-bold text-[var(--text)]">{title}</h1>

      <div className="text-muted mt-8 space-y-8 text-sm leading-7">{children}</div>
    </div>
  );
}
