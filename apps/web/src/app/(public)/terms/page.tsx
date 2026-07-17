'use client';

import { LegalPageShell } from '@web/features/legal/components/LegalPageShell';
import { LegalSection } from '@web/features/legal/components/LegalSection';
import { useT } from '@web/features/i18n/LocaleProvider';

export default function TermsPage() {
  const t = useT();

  return (
    <LegalPageShell title={t('legal.terms.title')}>
      <LegalSection
        paragraphs={[t('legal.terms.sections.overview.p1'), t('legal.terms.sections.overview.p2')]}
      />
      <LegalSection
        title={t('legal.terms.sections.subscription.title')}
        paragraphs={[t('legal.terms.sections.subscription.p1')]}
      />
      <LegalSection
        title={t('legal.terms.sections.withdrawal.title')}
        paragraphs={[t('legal.terms.sections.withdrawal.p1')]}
      />
      <LegalSection
        title={t('legal.terms.sections.refund.title')}
        paragraphs={[t('legal.terms.sections.refund.p1'), t('legal.terms.sections.refund.p2')]}
      />
      <LegalSection
        title={t('legal.terms.sections.complaints.title')}
        paragraphs={[t('legal.terms.sections.complaints.p1')]}
      />
    </LegalPageShell>
  );
}
