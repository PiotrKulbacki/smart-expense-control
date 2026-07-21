'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ContactForm } from '@web/features/contact/components/ContactForm';
import { useT } from '@web/features/i18n/LocaleProvider';

type ContactPageViewProps = {
  backHref: string;
  backLabelKey: 'legal.backToHome' | 'contact.backToSettings';
  defaultName?: string;
  defaultEmail?: string;
};

export function ContactPageView({
  backHref,
  backLabelKey,
  defaultName,
  defaultEmail,
}: ContactPageViewProps) {
  const t = useT();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col">
      <Link
        href={backHref}
        className="text-muted hover:text-warm mb-8 inline-flex items-center gap-2 font-mono text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        {t(backLabelKey)}
      </Link>

      <div className="w-full space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">
            {t('contact.title')}
          </h1>
          <p className="text-muted mt-2 text-sm">{t('contact.subtitle')}</p>
        </div>

        <ContactForm defaultName={defaultName} defaultEmail={defaultEmail} />
      </div>
    </div>
  );
}
