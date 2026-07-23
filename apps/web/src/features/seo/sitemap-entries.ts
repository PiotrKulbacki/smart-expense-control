import { env } from '@web/env';

const PUBLIC_PATHS = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/impressum', changeFrequency: 'monthly', priority: 0.6 },
] as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getBaseUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
}

/**
 * Plain XML sitemap — avoids Next.js metadata route headers (e.g. Vary: RSC)
 * that confuse Google Search Console fetch.
 */
export function buildSitemapXml(): string {
  const baseUrl = getBaseUrl();
  const lastmod = new Date().toISOString();

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const item of PUBLIC_PATHS) {
    const loc = item.path === '/' ? baseUrl : `${baseUrl}${item.path}`;
    lines.push('<url>');
    lines.push(`<loc>${escapeXml(loc)}</loc>`);
    lines.push(`<lastmod>${lastmod}</lastmod>`);
    lines.push(`<changefreq>${item.changeFrequency}</changefreq>`);
    lines.push(`<priority>${item.priority}</priority>`);
    lines.push('</url>');
  }

  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
}
