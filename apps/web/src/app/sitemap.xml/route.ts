import { buildSitemapXml } from '@web/features/seo/sitemap-entries';

export const revalidate = 86400;

export function GET() {
  const body = buildSitemapXml();

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
