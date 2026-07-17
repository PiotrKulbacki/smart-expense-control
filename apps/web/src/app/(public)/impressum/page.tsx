'use client';

import { LegalPageShell } from '@web/features/legal/components/LegalPageShell';
import { useT } from '@web/features/i18n/LocaleProvider';

export default function ImpressumPage() {
  const t = useT();

  return (
    <LegalPageShell title={t('legal.impressum.title')}>
      <section>
        <h2 className="font-display mb-4 text-xl font-semibold text-[var(--text)]">
          {t('legal.impressum.sections.provider.title')}
        </h2>
        <p className="mb-4 font-medium text-[var(--text)]">
          {t('legal.impressum.sections.provider.name')}
        </p>
        <dl className="space-y-3">
          <div>
            <dt className="font-medium text-[var(--text)]">
              {t('legal.impressum.sections.provider.labels.address')}
            </dt>
            <dd>{t('legal.impressum.sections.provider.items.address')}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)]">
              {t('legal.impressum.sections.provider.labels.email')}
            </dt>
            <dd>
              <a
                href={`mailto:${t('legal.impressum.sections.provider.items.email')}`}
                className="text-warm hover:underline"
              >
                {t('legal.impressum.sections.provider.items.email')}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)]">
              {t('legal.impressum.sections.provider.labels.phone')}
            </dt>
            <dd>{t('legal.impressum.sections.provider.items.phone')}</dd>
          </div>
        </dl>
      </section>
    </LegalPageShell>
  );
}
