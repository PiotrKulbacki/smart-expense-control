'use client';

import { useT } from '@web/features/i18n/LocaleProvider';

export default function PrivacyPage() {
  const t = useT();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-[var(--text)]">
        {t('legal.privacy.title')}
      </h1>
      <p className="text-muted mt-6 text-sm leading-7">{t('legal.privacy.content')}</p>
    </div>
  );
}
