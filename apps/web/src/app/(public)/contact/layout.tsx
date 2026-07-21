import type { Metadata } from 'next';
import { buildPageMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: '/contact',
    titleKey: 'seo.contact.title',
    descriptionKey: 'seo.contact.description',
  });
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
