import { DEFAULT_LOCALE, isLocale, t, type Locale } from '@shared/features/i18n';
import {
  getAppUrl,
  greetingHtml,
  paragraphHtml,
  wrapEmailHtml,
} from '@web/features/email/templates/layout';

export type VerifyEmailParams = {
  token: string;
  locale?: string | null;
  name?: string | null;
};

function resolveLocale(locale?: string | null): Locale {
  return locale && isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function buildVerifyEmail(params: VerifyEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = resolveLocale(params.locale);
  const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(params.token)}`;
  const name = params.name?.trim() || null;

  const subject = t('email.verify.subject', locale);

  const text = [
    name
      ? t('email.layout.greetingWithName', locale, { name })
      : t('email.layout.greeting', locale),
    '',
    t('email.verify.intro', locale),
    '',
    t('email.verify.ctaHint', locale),
    verifyUrl,
    '',
    t('email.verify.expires', locale),
    '',
    t('email.verify.ignore', locale),
  ].join('\n');

  const bodyHtml = [
    greetingHtml(locale, name),
    paragraphHtml(t('email.verify.intro', locale)),
    paragraphHtml(t('email.verify.ctaHint', locale)),
    paragraphHtml(t('email.verify.expires', locale)),
    paragraphHtml(t('email.verify.ignore', locale), 0),
  ].join('');

  const html = wrapEmailHtml({
    locale,
    bodyHtml,
    cta: { label: t('email.verify.cta', locale), url: verifyUrl },
    fallbackUrl: verifyUrl,
  });

  return { subject, html, text };
}
