import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildNoIndexMetadata({
    path: '/register',
    titleKey: 'auth.labels.register',
  });
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
