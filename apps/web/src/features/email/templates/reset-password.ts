import { DEFAULT_LOCALE, isLocale, t, type Locale } from '@shared/features/i18n';
import {
  escapeHtml,
  getAppUrl,
  greetingHtml,
  paragraphHtml,
  wrapEmailHtml,
} from '@web/features/email/templates/layout';

export type ResetPasswordEmailParams = {
  token: string;
  locale?: string | null;
  name?: string | null;
};

function resolveLocale(locale?: string | null): Locale {
  return locale && isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function buildResetPasswordEmail(params: ResetPasswordEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = resolveLocale(params.locale);
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(params.token)}`;
  const name = params.name?.trim() || null;

  const subject = t('email.reset.subject', locale);

  const text = [
    name
      ? t('email.layout.greetingWithName', locale, { name })
      : t('email.layout.greeting', locale),
    '',
    t('email.reset.intro', locale),
    '',
    t('email.reset.ctaHint', locale),
    resetUrl,
    '',
    t('email.reset.expires', locale),
    '',
    t('email.reset.ignore', locale),
  ].join('\n');

  const bodyHtml = [
    greetingHtml(locale, name),
    paragraphHtml(t('email.reset.intro', locale)),
    paragraphHtml(t('email.reset.ctaHint', locale)),
    paragraphHtml(t('email.reset.expires', locale)),
    paragraphHtml(t('email.reset.ignore', locale), 0),
  ].join('');

  const html = wrapEmailHtml({
    locale,
    bodyHtml,
    cta: { label: t('email.reset.cta', locale), url: resetUrl },
    fallbackUrl: resetUrl,
  });

  return { subject, html, text };
}
