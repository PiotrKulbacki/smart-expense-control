import { PublicFooter } from '@web/features/layout/components/PublicFooter';
import { PublicHeader } from '@web/features/layout/components/PublicHeader';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
