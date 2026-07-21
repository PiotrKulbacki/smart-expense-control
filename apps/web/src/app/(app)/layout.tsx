import { redirect } from 'next/navigation';
import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { AppSidebar } from '@web/features/layout/components/AppSidebar';
import { AppUserProvider } from '@web/features/auth/components/AppUserProvider';
import { CategoriesProvider } from '@web/features/categories/components/CategoriesProvider';
import { getUserFromSession } from '@web/features/auth/services/auth.service';
import { prefetchAppShellData } from '@web/features/query/server-prefetch';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserFromSession();

  if (!user) {
    redirect('/login');
  }

  const dehydratedState = await prefetchAppShellData(user);

  return (
    <HydrationBoundary state={dehydratedState}>
      <AppUserProvider user={user}>
        <CategoriesProvider>
          <div className="flex h-screen flex-col overflow-hidden md:flex-row">
            <AppSidebar userName={user.name} userEmail={user.email} userPlan={user.currentPlan} />
            <main className="bg-void/50 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </CategoriesProvider>
      </AppUserProvider>
    </HydrationBoundary>
  );
}
