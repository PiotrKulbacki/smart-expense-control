import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildNoIndexMetadata({
    path: '/login',
    titleKey: 'auth.labels.login',
  });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
