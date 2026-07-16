import type { DashboardDateRange } from '@web/features/dashboard/services/dashboard.service';

function serializeDateRange(dateRange?: DashboardDateRange): string {
  if (!dateRange?.from && !dateRange?.to) {
    return 'default';
  }

  return `${dateRange.from?.toISOString() ?? ''}:${dateRange.to?.toISOString() ?? ''}`;
}

export const queryKeys = {
  categories: () => ['categories'] as const,
  dashboard: (userId: string, dateRange?: DashboardDateRange) =>
    ['dashboard', userId, serializeDateRange(dateRange)] as const,
  scanQuota: (userId: string) => ['scan-quota', userId] as const,
  receiptArchive: (userId: string) => ['receipt-archive', userId] as const,
  categoryLimits: (userId: string) => ['category-limits', userId] as const,
  recurringExpenses: (userId: string) => ['recurring-expenses', userId] as const,
  currencyRates: (userId: string) => ['currency-rates', userId] as const,
  historyTransactions: (
    userId: string,
    options: { from?: string; to?: string; receiptGroupId?: string | null }
  ) => ['history-transactions', userId, options] as const,
  dashboardInsights: (userId: string, locale: string) =>
    ['dashboard-insights', userId, locale] as const,
  chatQuota: (userId: string) => ['chat-quota', userId] as const,
  chatHistory: (userId: string, page: number, limit: number) =>
    ['chat-history', userId, page, limit] as const,
};
