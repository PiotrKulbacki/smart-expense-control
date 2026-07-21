import { t, type Locale } from '@shared/features/i18n';
import { env } from '@web/env';

export const EMAIL_BRAND = {
  void: '#08080c',
  surface: '#111118',
  text: '#1a1a22',
  muted: '#5c5c72',
  cool: '#3dd6c3',
  coolDark: '#2bb8a8',
  pageBg: '#f0f0f5',
  white: '#ffffff',
  border: '#e4e4ec',
} as const;

export const CONTACT_EMAIL = 'kontakt@lyamo.eu';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function getAppUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
}

type WrapEmailHtmlParams = {
  locale: Locale;
  bodyHtml: string;
  /** Optional primary CTA (green button). */
  cta?: { label: string; url: string };
  /** Plain URL shown under the button when CTA is present. */
  fallbackUrl?: string;
};

/**
 * Shared Lyamo transactional email chrome: dark header + logo mark, body, green CTA, footer.
 * Logo uses inline HTML (not SVG img) for Gmail/Outlook compatibility.
 */
export function wrapEmailHtml(params: WrapEmailHtmlParams): string {
  const { locale, bodyHtml, cta, fallbackUrl } = params;
  const brand = escapeHtml(t('layout.brand', locale));
  const footerLead = escapeHtml(t('email.layout.footerContact', locale));
  const appUrl = escapeHtml(getAppUrl());

  const ctaBlock = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
        <tr>
          <td align="center" style="border-radius:8px;background:${EMAIL_BRAND.cool};">
            <a href="${escapeHtml(cta.url)}"
               style="display:inline-block;padding:14px 28px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;font-weight:600;line-height:1.2;color:${EMAIL_BRAND.void};text-decoration:none;border-radius:8px;">
              ${escapeHtml(cta.label)}
            </a>
          </td>
        </tr>
      </table>
    `
    : '';

  const fallbackBlock =
    cta && fallbackUrl
      ? `
      <p style="margin:16px 0 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.muted};">
        ${escapeHtml(t('email.layout.fallbackHint', locale))}
      </p>
      <p style="margin:8px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5;word-break:break-all;">
        <a href="${escapeHtml(fallbackUrl)}" style="color:${EMAIL_BRAND.coolDark};text-decoration:underline;">
          ${escapeHtml(fallbackUrl)}
        </a>
      </p>
    `
      : '';

  const headerHtml = `
    <a href="${appUrl}" style="text-decoration:none;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;padding-right:12px;width:36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="36" height="36" style="width:36px;height:36px;">
              <tr>
                <td style="width:12px;height:36px;background:#e8a849;border-radius:6px 0 0 6px;"></td>
                <td style="width:24px;height:36px;vertical-align:bottom;background:${EMAIL_BRAND.surface};">
                  <div style="height:12px;background:#3dd6c3;border-radius:0 6px 6px 0;"></div>
                </td>
              </tr>
            </table>
          </td>
          <td style="vertical-align:middle;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#e8e8ed;">
            ${brand}
          </td>
        </tr>
      </table>
    </a>
  `;

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.pageBg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_BRAND.pageBg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${EMAIL_BRAND.white};border-radius:12px;overflow:hidden;border:1px solid ${EMAIL_BRAND.border};">
          <tr>
            <td style="background:${EMAIL_BRAND.surface};padding:24px 28px;">
              ${headerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.55;color:${EMAIL_BRAND.text};">
              ${bodyHtml}
              ${ctaBlock}
              ${fallbackBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid ${EMAIL_BRAND.border};font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.muted};text-align:center;">
              <p style="margin:0 0 4px;">${footerLead}</p>
              <p style="margin:0;">
                <a href="mailto:${CONTACT_EMAIL}" style="color:${EMAIL_BRAND.coolDark};text-decoration:none;">${CONTACT_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function greetingHtml(locale: Locale, name?: string | null): string {
  const text = name?.trim()
    ? t('email.layout.greetingWithName', locale, { name: name.trim() })
    : t('email.layout.greeting', locale);
  return `<p style="margin:0 0 16px;">${escapeHtml(text)}</p>`;
}

export function paragraphHtml(text: string, marginBottom = 16): string {
  return `<p style="margin:0 0 ${marginBottom}px;">${escapeHtml(text)}</p>`;
}

export function mutedParagraphHtml(text: string, marginTop = 24): string {
  return `<p style="margin:${marginTop}px 0 0;font-size:14px;color:${EMAIL_BRAND.muted};">${escapeHtml(text)}</p>`;
}
