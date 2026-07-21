import type { MetadataRoute } from 'next';
import { env } from '@web/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard',
        '/history',
        '/settings',
        '/chat',
        '/scanner',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
