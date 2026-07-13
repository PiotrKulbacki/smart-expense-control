'use client';

import { useT } from '@web/features/i18n/LocaleProvider';

export default function TermsPage() {
  const t = useT();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">{t('legal.terms.title')}</h1>
      <p className="mt-6 text-sm leading-7 text-gray-600">{t('legal.terms.content')}</p>
    </div>
  );
}
