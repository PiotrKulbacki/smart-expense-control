'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@web/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import { useT } from '@web/features/i18n/LocaleProvider';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import {
  getCategoryColor,
  resolveCategoryLabel,
  type CategoryDisplayContext,
} from '@web/features/transactions/lib/category-config';
import type { ChartDateRange } from '@web/features/transactions/lib/chart-date-filter';
import { cn } from '@web/lib/utils';

const CategoryDonutChartPie = dynamic(
  () =>
    import('@web/features/transactions/components/CategoryDonutChartPie').then(
      (module) => module.CategoryDonutChartPie
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-elevated mx-auto h-64 w-full max-w-sm animate-pulse rounded-full" />
    ),
  }
);

type CategoryDonutChartProps = {
  primaryCurrency: string;
  locale: string;
  categoryTotals: Array<{ category: string; amount: number }>;
  filterSelection: ChartDateRange;
  appliedFilter: ChartDateRange;
  hiddenCategories: Set<string>;
  onFilterSelectionChange: (value: ChartDateRange) => void;
  onAppliedFilterChange: (value: ChartDateRange) => void;
  onToggleCategory: (category: string) => void;
  onCustomRangeChange?: (range: DateRange | undefined) => void;
  customDateRange?: DateRange;
  categoryDisplayContext?: CategoryDisplayContext;
  isRefreshing?: boolean;
};

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function ChartSkeleton() {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
      <div className="bg-elevated mx-auto h-64 w-full max-w-sm animate-pulse rounded-full" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-elevated h-5 animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function CategoryDonutChart({
  primaryCurrency,
  locale,
  categoryTotals,
  filterSelection,
  appliedFilter,
  hiddenCategories,
  onFilterSelectionChange,
  onAppliedFilterChange,
  onToggleCategory,
  onCustomRangeChange,
  customDateRange,
  categoryDisplayContext,
  isRefreshing = false,
}: CategoryDonutChartProps) {
  const t = useT();
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const showChartLoading = isFiltering || isRefreshing;

  useEffect(() => {
    if (filterSelection !== 'custom') {
      setIsCustomPickerOpen(false);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setIsCustomPickerOpen(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, [filterSelection]);

  useEffect(() => {
    setIsFiltering(true);
    const timer = window.setTimeout(() => setIsFiltering(false), 200);
    return () => window.clearTimeout(timer);
  }, [appliedFilter, categoryTotals]);

  const visibleCategoryTotals = useMemo(
    () => categoryTotals.filter((item) => !hiddenCategories.has(item.category)),
    [categoryTotals, hiddenCategories]
  );

  const chartData = visibleCategoryTotals.map((item) => ({
    ...item,
    fill: getCategoryColor(item.category, categoryDisplayContext),
    label: resolveCategoryLabel(item.category, t, categoryDisplayContext),
  }));

  const total = visibleCategoryTotals.reduce((sum, item) => sum + item.amount, 0);

  function handleRangeChange(value: ChartDateRange) {
    onFilterSelectionChange(value);

    if (value === 'custom') {
      return;
    }

    const wasCustomApplied = appliedFilter === 'custom';
    onAppliedFilterChange(value);

    if (wasCustomApplied && customDateRange) {
      onCustomRangeChange?.(undefined);
    }
  }

  function handleCustomRangeApply(range: DateRange | undefined) {
    if (!range?.from || !range?.to) {
      return;
    }

    onAppliedFilterChange('custom');
    onFilterSelectionChange('custom');
    setIsCustomPickerOpen(false);
    onCustomRangeChange?.(range);
  }

  return (
    <section className="panel relative z-10 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
          {t('dashboard.categories.title')}
        </h2>
        <div ref={filterContainerRef} className="relative w-full sm:w-auto sm:min-w-[12rem]">
          <Select
            value={filterSelection}
            disabled={isRefreshing}
            onValueChange={(value) => handleRangeChange(value as ChartDateRange)}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-auto sm:min-w-[9rem]">
              <span className="flex items-center gap-2">
                {isRefreshing && <LoadingSpinner className="h-3 w-3" />}
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="period">{t('dashboard.chartFilter.period')}</SelectItem>
              <SelectItem value="7d">{t('dashboard.chartFilter.last7Days')}</SelectItem>
              <SelectItem value="today">{t('dashboard.chartFilter.today')}</SelectItem>
              <SelectItem value="custom">{t('dashboard.chartFilter.customRange')}</SelectItem>
            </SelectContent>
          </Select>
          {filterSelection === 'custom' && onCustomRangeChange && (
            <DatePickerWithRange
              hideTrigger
              focusGuardRef={filterContainerRef}
              dateRange={customDateRange}
              onDateRangeChange={handleCustomRangeApply}
              open={isCustomPickerOpen}
              onOpenChange={setIsCustomPickerOpen}
            />
          )}
        </div>
      </div>

      {showChartLoading ? (
        <ChartSkeleton />
      ) : categoryTotals.length === 0 ? (
        <p className="text-muted relative z-10 mt-6 text-sm">{t('dashboard.chartFilter.empty')}</p>
      ) : (
        <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div className="mx-auto h-64 w-full max-w-sm">
            {visibleCategoryTotals.length === 0 ? (
              <div className="bg-elevated/50 flex h-full items-center justify-center rounded-full border border-dashed border-[var(--border)] px-6 text-center">
                <p className="text-muted text-sm">{t('dashboard.chartFilter.allHidden')}</p>
              </div>
            ) : (
              <CategoryDonutChartPie
                chartData={chartData}
                primaryCurrency={primaryCurrency}
                locale={locale}
                formatMoney={formatMoney}
              />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-muted mb-2 text-xs">{t('dashboard.chartFilter.toggleHint')}</p>
            {categoryTotals.map((item) => {
              const isHidden = hiddenCategories.has(item.category);
              const percentage =
                !isHidden && total > 0 ? Math.round((item.amount / total) * 100) : null;
              const fill = getCategoryColor(item.category, categoryDisplayContext);
              const label = resolveCategoryLabel(item.category, t, categoryDisplayContext);

              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => onToggleCategory(item.category)}
                  aria-pressed={!isHidden}
                  disabled={isRefreshing}
                  className={cn(
                    'hover:bg-elevated/50 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm transition',
                    isHidden && 'opacity-40'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'h-3 w-3 shrink-0 rounded-full transition',
                        isHidden && 'opacity-50'
                      )}
                      style={{ backgroundColor: fill }}
                    />
                    <span className={cn('truncate text-[var(--text)]', isHidden && 'line-through')}>
                      {label}
                    </span>
                    {!isHidden && percentage !== null && (
                      <span className="text-muted text-xs">{percentage}%</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-medium text-[var(--text)]',
                      isHidden && 'line-through'
                    )}
                  >
                    {formatMoney(item.amount, primaryCurrency, locale)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
