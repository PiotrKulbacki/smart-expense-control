import type { Metadata } from 'next';
import { buildPageMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: '/impressum',
    titleKey: 'seo.impressum.title',
    descriptionKey: 'seo.impressum.description',
  });
}

export default function ImpressumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
