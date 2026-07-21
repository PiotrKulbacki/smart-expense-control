import type { Metadata } from 'next';
import { t } from '@shared/features/i18n';
import { env } from '@web/env';
import { getRequestLocale } from '@web/features/seo/get-request-locale';

function appBaseUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
}

function canonicalUrl(path: string): string {
  const base = appBaseUrl();
  return path === '/' ? base : `${base}${path}`;
}

type BuildPageMetadataOptions = {
  path: string;
  titleKey: string;
  descriptionKey: string;
  /** Full document title without `%s | Lyamo` template (e.g. home). */
  absoluteTitle?: boolean;
  noIndex?: boolean;
};

export async function buildPageMetadata(options: BuildPageMetadataOptions): Promise<Metadata> {
  const locale = await getRequestLocale();
  const title = t(options.titleKey, locale);
  const description = t(options.descriptionKey, locale);
  const canonical = canonicalUrl(options.path);

  return {
    title: options.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Lyamo',
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    ...(options.noIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  };
}

type BuildNoIndexMetadataOptions = {
  path: string;
  titleKey: string;
};

/** Auth / private UI: crawlable enough for users, not for search results. */
export async function buildNoIndexMetadata(
  options: BuildNoIndexMetadataOptions
): Promise<Metadata> {
  const locale = await getRequestLocale();
  const title = t(options.titleKey, locale);
  const canonical = canonicalUrl(options.path);

  return {
    title,
    alternates: { canonical },
    robots: {
      index: false,
      follow: false,
    },
  };
}
