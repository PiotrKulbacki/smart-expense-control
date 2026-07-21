import type { Metadata } from 'next';
import { buildPageMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: '/terms',
    titleKey: 'seo.terms.title',
    descriptionKey: 'seo.terms.description',
  });
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
