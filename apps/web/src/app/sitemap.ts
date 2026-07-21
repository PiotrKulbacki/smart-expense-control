import type { MetadataRoute } from 'next';
import { env } from '@web/env';

const PUBLIC_PATHS = ['/', '/contact', '/terms', '/privacy', '/impressum'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  return PUBLIC_PATHS.map((path) => ({
    url: path === '/' ? baseUrl : `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
