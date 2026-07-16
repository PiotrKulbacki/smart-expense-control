import type { CategoryListItem } from '@shared/features/transactions/category-schemas';
import type { CategoryLimitRecord } from '@shared/features/transactions/category-limit-schemas';
import type { ExchangeRateMap } from '@shared/features/currency/types';
import type { SafeUser } from '@web/features/auth/types';
import type {
  DashboardData,
  DashboardDateRange,
} from '@web/features/dashboard/services/dashboard.service';
import type { ReceiptArchiveDocument } from '@web/features/scanner/services/receipt-archive.service';
import type { RecentTransaction } from '@web/features/transactions/components/RecentTransactionsList';

export type ScanQuotaPayload = {
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  quota: {
    used: number;
    limit: number;
    remaining: number;
    canScan?: boolean;
    isBlocked?: boolean;
  };
};

export type RecurringExpenseItem = {
  id: string;
  amount: number;
  currency: string;
  category: string;
};

export type ChatQuotaPayload = {
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  quota: {
    limit: number;
    used: number;
    remaining: number;
    canUse: boolean;
    isBlocked: boolean;
  };
};

export type HistoryMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type ChatHistoryPayload = {
  messages: HistoryMessage[];
  hasMore: boolean;
  page: number;
  limit: number;
};

function buildDashboardUrl(dateRange?: DashboardDateRange): string {
  if (!dateRange?.from || !dateRange?.to) {
    return '/api/dashboard';
  }

  const params = new URLSearchParams();
  params.set('from', dateRange.from.toISOString());
  params.set('to', dateRange.to.toISOString());
  return `/api/dashboard?${params.toString()}`;
}

export async function fetchCategories(): Promise<CategoryListItem[]> {
  const response = await fetch('/api/categories');
  const data = (await response.json()) as {
    categories?: CategoryListItem[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'auth.errors.generic');
  }

  return data.categories ?? [];
}

export async function fetchDashboard(dateRange?: DashboardDateRange): Promise<DashboardData> {
  const response = await fetch(buildDashboardUrl(dateRange));
  const data = (await response.json()) as DashboardData & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'auth.errors.generic');
  }

  return data;
}

export async function fetchScanQuota(): Promise<ScanQuotaPayload> {
  const response = await fetch('/api/ai/scan-quota');
  const data = (await response.json()) as ScanQuotaPayload & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'auth.errors.generic');
  }

  return data;
}

export async function fetchReceiptArchive(): Promise<ReceiptArchiveDocument[]> {
  const response = await fetch('/api/receipts/archive');
  const data = (await response.json()) as {
    documents?: ReceiptArchiveDocument[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'scanner.archive.errors.loadFailed');
  }

  return data.documents ?? [];
}

export async function fetchCategoryLimits(): Promise<CategoryLimitRecord[]> {
  const response = await fetch('/api/category-limits');
  const data = (await response.json()) as {
    limits?: CategoryLimitRecord[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'auth.errors.generic');
  }

  return data.limits ?? [];
}

export async function fetchRecurringExpenses(): Promise<RecurringExpenseItem[]> {
  const response = await fetch('/api/recurring-expenses');
  const data = (await response.json()) as {
    recurringExpenses?: RecurringExpenseItem[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'auth.errors.generic');
  }

  return data.recurringExpenses ?? [];
}

export async function fetchCurrencyRates(): Promise<ExchangeRateMap> {
  const response = await fetch('/api/currency/rates');
  const data = (await response.json()) as {
    rates?: ExchangeRateMap;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'currency.errors.fetchFailed');
  }

  return data.rates ?? {};
}

export async function fetchHistoryTransactions(options: {
  from?: string;
  to?: string;
  receiptGroupId?: string | null;
}): Promise<RecentTransaction[]> {
  const params = new URLSearchParams();

  if (options.receiptGroupId) {
    params.set('receiptGroupId', options.receiptGroupId);
  } else {
    if (options.from) {
      params.set('from', options.from);
    }
    if (options.to) {
      params.set('to', options.to);
    }
  }

  const response = await fetch(`/api/transactions?${params.toString()}`);
  const data = (await response.json()) as {
    transactions?: RecentTransaction[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'auth.errors.generic');
  }

  return data.transactions ?? [];
}

export async function fetchCurrentUser(): Promise<SafeUser> {
  const response = await fetch('/api/auth/me');
  const data = (await response.json()) as { user?: SafeUser; error?: string };

  if (!response.ok || !data.user) {
    throw new Error(data.error ?? 'auth.errors.generic');
  }

  return data.user;
}

export async function fetchChatQuota(): Promise<ChatQuotaPayload> {
  const response = await fetch('/api/ai/chat-quota');
  const data = (await response.json()) as ChatQuotaPayload & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'auth.errors.generic');
  }

  return data;
}

export async function fetchChatHistory(limit: number, page = 0): Promise<ChatHistoryPayload> {
  const response = await fetch(`/api/ai/history?limit=${limit}&page=${page}`);
  const data = (await response.json()) as ChatHistoryPayload & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'auth.errors.generic');
  }

  return data;
}
