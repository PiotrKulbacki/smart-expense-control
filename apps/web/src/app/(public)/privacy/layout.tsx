import type { Metadata } from 'next';
import { buildPageMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: '/privacy',
    titleKey: 'seo.privacy.title',
    descriptionKey: 'seo.privacy.description',
  });
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
