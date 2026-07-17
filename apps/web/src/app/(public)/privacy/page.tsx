'use client';

import { LegalPageShell } from '@web/features/legal/components/LegalPageShell';
import { LegalSection } from '@web/features/legal/components/LegalSection';
import { useT } from '@web/features/i18n/LocaleProvider';

export default function PrivacyPage() {
  const t = useT();

  return (
    <LegalPageShell title={t('legal.privacy.title')}>
      <LegalSection
        title={t('legal.privacy.sections.dataProcessing.title')}
        paragraphs={[
          t('legal.privacy.sections.dataProcessing.p1'),
          t('legal.privacy.sections.dataProcessing.p2'),
          t('legal.privacy.sections.dataProcessing.p3'),
        ]}
      />
      <LegalSection
        title={t('legal.privacy.sections.security.title')}
        paragraphs={[t('legal.privacy.sections.security.p1')]}
      />
      <LegalSection
        title={t('legal.privacy.sections.cookies.title')}
        paragraphs={[
          t('legal.privacy.sections.cookies.intro'),
          t('legal.privacy.sections.cookies.outro'),
        ]}
        list={[
          t('legal.privacy.sections.cookies.list.necessary'),
          t('legal.privacy.sections.cookies.list.analytics'),
        ]}
      />
    </LegalPageShell>
  );
}
