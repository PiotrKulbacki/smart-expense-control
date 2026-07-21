import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildNoIndexMetadata({
    path: '/verify-email',
    titleKey: 'auth.verify.title',
  });
}

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
