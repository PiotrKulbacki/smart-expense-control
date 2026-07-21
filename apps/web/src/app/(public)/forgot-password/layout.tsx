import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildNoIndexMetadata({
    path: '/forgot-password',
    titleKey: 'auth.forgot.title',
  });
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
