import { redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getUserAiScanQuota } from '@web/features/ai/services/receipt-scanner.service';
import { getUserFromSession } from '@web/features/auth/services/auth.service';
import { DashboardView } from '@web/features/dashboard/components/DashboardView';
import { getDashboardData } from '@web/features/dashboard/services/dashboard.service';
import { getQueryClient } from '@web/features/query/query-client';
import { queryKeys } from '@web/features/query/query-keys';

export default async function DashboardPage() {
  const user = await getUserFromSession();

  if (!user) {
    redirect('/login');
  }

  const queryClient = getQueryClient();
  const [dashboardData, scanQuota] = await Promise.all([
    getDashboardData(user.id),
    getUserAiScanQuota(user.id),
  ]);

  if (dashboardData) {
    queryClient.setQueryData(queryKeys.dashboard(user.id), dashboardData);
  }

  if (scanQuota) {
    queryClient.setQueryData(queryKeys.scanQuota(user.id), {
      plan: user.currentPlan,
      quota: scanQuota,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardView
        initialDashboardData={dashboardData ?? undefined}
        initialScanQuota={
          scanQuota
            ? {
                plan: user.currentPlan,
                quota: scanQuota,
              }
            : undefined
        }
      />
    </HydrationBoundary>
  );
}
