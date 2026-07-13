import { redirect } from 'next/navigation';
import { AppSidebar } from '@web/features/layout/components/AppSidebar';
import { getUserFromSession } from '@web/features/auth/services/auth.service';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserFromSession();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar userName={user.name} userEmail={user.email} userPlan={user.currentPlan} />
      <main className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
