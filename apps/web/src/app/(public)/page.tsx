import type { Metadata } from 'next';
import { LandingPage } from '@web/features/landing/components/LandingPage';
import { buildPageMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: '/',
    titleKey: 'seo.home.title',
    descriptionKey: 'seo.home.description',
    absoluteTitle: true,
  });
}

export default function HomePage() {
  return <LandingPage />;
}
