import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@web/features/seo/build-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildNoIndexMetadata({
    path: '/reset-password',
    titleKey: 'auth.reset.title',
  });
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
