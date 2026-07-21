import { DEFAULT_LOCALE, isLocale, t, type Locale } from '@shared/features/i18n';
import {
  EMAIL_BRAND,
  escapeHtml,
  mutedParagraphHtml,
  wrapEmailHtml,
} from '@web/features/email/templates/layout';

export type ContactFormEmailParams = {
  name: string;
  email: string;
  subject: string;
  message: string;
  locale?: string | null;
};

function resolveLocale(locale?: string | null): Locale {
  return locale && isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function buildContactFormEmail(params: ContactFormEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = resolveLocale(params.locale);
  const subjectLine = params.subject.trim() || t('email.contact.defaultSubject', locale);
  const subject = t('email.contact.subject', locale, { subject: subjectLine });
  const replyUrl = `mailto:${encodeURIComponent(params.email)}`;

  const text = [
    t('email.contact.title', locale),
    '',
    `${t('email.contact.nameLabel', locale)}: ${params.name}`,
    `${t('email.contact.emailLabel', locale)}: ${params.email}`,
    `${t('email.contact.subjectLabel', locale)}: ${subjectLine}`,
    '',
    `${t('email.contact.messageLabel', locale)}:`,
    params.message,
  ].join('\n');

  const bodyHtml = [
    `<h2 style="margin:0 0 20px;font-size:18px;font-weight:700;color:${EMAIL_BRAND.text};">${escapeHtml(t('email.contact.title', locale))}</h2>`,
    `<p style="margin:0 0 8px;"><strong>${escapeHtml(t('email.contact.nameLabel', locale))}:</strong> ${escapeHtml(params.name)}</p>`,
    `<p style="margin:0 0 8px;"><strong>${escapeHtml(t('email.contact.emailLabel', locale))}:</strong> ${escapeHtml(params.email)}</p>`,
    `<p style="margin:0 0 16px;"><strong>${escapeHtml(t('email.contact.subjectLabel', locale))}:</strong> ${escapeHtml(subjectLine)}</p>`,
    `<p style="margin:0 0 8px;"><strong>${escapeHtml(t('email.contact.messageLabel', locale))}:</strong></p>`,
    `<p style="margin:0;white-space:pre-wrap;">${escapeHtml(params.message)}</p>`,
    mutedParagraphHtml(t('email.contact.replyHint', locale)),
  ].join('');

  const html = wrapEmailHtml({
    locale,
    bodyHtml,
    cta: { label: t('email.contact.cta', locale), url: replyUrl },
  });

  return { subject, html, text };
}
