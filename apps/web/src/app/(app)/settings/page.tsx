import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getUserFromSession } from '@web/features/auth/services/auth.service';
import { getExchangeRates } from '@web/features/currency/services/currency.service';
import { getQueryClient } from '@web/features/query/query-client';
import { queryKeys } from '@web/features/query/query-keys';
import { SettingsView } from '@web/features/settings/components/SettingsView';
import { listCategoryLimits } from '@web/features/settings/services/category-limits.service';
import { listRecurringExpenses } from '@web/features/transactions/services/recurring-expense.service';
import { SettingsLoadingSkeleton } from '@web/features/layout/components/RouteLoadingSkeletons';

export default async function SettingsPage() {
  const user = await getUserFromSession();

  if (!user) {
    redirect('/login');
  }

  const queryClient = getQueryClient();
  const [categoryLimits, recurringExpenses, currencyRates] = await Promise.all([
    listCategoryLimits(user.id),
    listRecurringExpenses(user.id),
    getExchangeRates(),
  ]);

  queryClient.setQueryData(queryKeys.categoryLimits(user.id), categoryLimits);
  queryClient.setQueryData(queryKeys.recurringExpenses(user.id), recurringExpenses);
  queryClient.setQueryData(queryKeys.currencyRates(user.id), currencyRates);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <SettingsView initialUser={user} />
      </Suspense>
    </HydrationBoundary>
  );
}
