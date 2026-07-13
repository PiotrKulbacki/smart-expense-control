import { redirect } from 'next/navigation';
import { AppSidebar } from '@web/features/layout/components/AppSidebar';
import { getUserFromSession } from '@web/features/auth/services/auth.service';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserFromSession();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar userName={user.name} userEmail={user.email} userPlan={user.currentPlan} />
      <main className="bg-void/50 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
