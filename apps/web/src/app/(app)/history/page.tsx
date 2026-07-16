import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getUserFromSession } from '@web/features/auth/services/auth.service';
import { HistoryView } from '@web/features/history/components/HistoryView';
import { resolveHistoryInitialState } from '@web/features/history/lib/history-initial-state';
import { HistoryLoadingSkeleton } from '@web/features/layout/components/RouteLoadingSkeletons';
import { getQueryClient } from '@web/features/query/query-client';
import { queryKeys } from '@web/features/query/query-keys';

type HistoryPageProps = {
  searchParams: Promise<{ receiptGroupId?: string }>;
};

async function HistoryPageContent({ searchParams }: HistoryPageProps) {
  const user = await getUserFromSession();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const initialState = await resolveHistoryInitialState(user, params.receiptGroupId);
  const queryClient = getQueryClient();

  queryClient.setQueryData(
    queryKeys.historyTransactions(user.id, {
      from: initialState.periodStart,
      to: initialState.periodEnd,
      receiptGroupId: params.receiptGroupId ?? null,
    }),
    initialState.transactions
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HistoryView
        initialPeriodStart={initialState.periodStart}
        initialTransactions={initialState.transactions}
        highlightReceiptGroupId={params.receiptGroupId ?? null}
      />
    </HydrationBoundary>
  );
}

export default function HistoryPage(props: HistoryPageProps) {
  return (
    <Suspense fallback={<HistoryLoadingSkeleton />}>
      <HistoryPageContent {...props} />
    </Suspense>
  );
}
