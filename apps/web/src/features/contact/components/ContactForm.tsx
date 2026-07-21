'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { contactFormSchema } from '@shared/features/contact/schemas';
import { translateError } from '@shared/features/i18n';
import { Button } from '@web/components/ui/button';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type ContactFormProps = {
  defaultName?: string;
  defaultEmail?: string;
};

export function ContactForm({ defaultName = '', defaultEmail = '' }: ContactFormProps) {
  const t = useT();
  const router = useRouter();
  const { locale } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        name,
        email,
        subject: subject || undefined,
        message,
        website,
      };

      const parsed = contactFormSchema.safeParse(payload);
      if (!parsed.success) {
        const code = parsed.error.errors[0]?.message ?? 'contact.errors.generic';
        toast.error(translateError(code, locale));
        return;
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'contact.errors.generic', locale));
        return;
      }

      toast.success(t('contact.success.sent'));
      router.push('/');
      router.refresh();
    } catch {
      toast.error(t('contact.errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel relative z-10 flex w-full flex-col gap-4 p-8">
      <div>
        <label htmlFor="contact-name" className="auth-label">
          {t('contact.labels.name')}
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="contact-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          className="auth-input"
          required
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="auth-label">
          {t('contact.labels.email')}
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="auth-input"
          required
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="contact-subject" className="auth-label">
          {t('contact.labels.subject')}
        </label>
        <input
          id="contact-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isLoading}
          className="auth-input"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="auth-label">
          {t('contact.labels.message')}
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
          className="auth-input min-h-32 resize-y"
          required
          aria-required="true"
        />
      </div>

      {/* Honeypot — hidden from users */}
      <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="contact-website">{t('contact.labels.website')}</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <Button type="submit" loading={isLoading} disabled={isLoading} className="mt-2 w-full">
        {t('contact.labels.submit')}
      </Button>
    </form>
  );
}
