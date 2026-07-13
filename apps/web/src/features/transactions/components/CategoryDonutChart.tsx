'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { DatePickerWithRange } from '@web/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import { useT } from '@web/features/i18n/LocaleProvider';
import {
  getCategoryColor,
  getCategoryLabelKey,
} from '@web/features/transactions/lib/category-config';
import {
  aggregateCategoryTotals,
  type ChartDateRange,
  type ChartTransaction,
} from '@web/features/transactions/lib/chart-date-filter';
import { cn } from '@web/lib/utils';

type CategoryDonutChartProps = {
  chartTransactions: ChartTransaction[];
  periodStart: string;
  primaryCurrency: string;
  locale: string;
  onCustomRangeChange?: (range: DateRange | undefined) => void;
  customDateRange?: DateRange;
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
      <div className="mx-auto h-64 w-full max-w-sm animate-pulse rounded-full bg-gray-100" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-5 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export function CategoryDonutChart({
  chartTransactions,
  periodStart,
  primaryCurrency,
  locale,
  onCustomRangeChange,
  customDateRange,
}: CategoryDonutChartProps) {
  const t = useT();
  const [filterSelection, setFilterSelection] = useState<ChartDateRange>('period');
  const [appliedFilter, setAppliedFilter] = useState<ChartDateRange>('period');
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const filterContainerRef = useRef<HTMLDivElement>(null);

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

  const categoryTotals = useMemo(
    () => aggregateCategoryTotals(chartTransactions, appliedFilter, periodStart),
    [chartTransactions, appliedFilter, periodStart]
  );

  useEffect(() => {
    setHiddenCategories(new Set());
  }, [appliedFilter]);

  useEffect(() => {
    setIsFiltering(true);
    const timer = window.setTimeout(() => setIsFiltering(false), 200);
    return () => window.clearTimeout(timer);
  }, [appliedFilter]);

  const visibleCategoryTotals = useMemo(
    () => categoryTotals.filter((item) => !hiddenCategories.has(item.category)),
    [categoryTotals, hiddenCategories]
  );

  const chartData = visibleCategoryTotals.map((item) => ({
    ...item,
    fill: getCategoryColor(item.category),
    label: t(getCategoryLabelKey(item.category)),
  }));

  const total = visibleCategoryTotals.reduce((sum, item) => sum + item.amount, 0);

  function handleRangeChange(value: ChartDateRange) {
    setFilterSelection(value);

    if (value === 'custom') {
      return;
    }

    const wasCustomApplied = appliedFilter === 'custom';
    setAppliedFilter(value);

    if (wasCustomApplied && customDateRange) {
      onCustomRangeChange?.(undefined);
    }
  }

  function handleCustomRangeApply(range: DateRange | undefined) {
    if (!range?.from || !range?.to) {
      return;
    }

    setAppliedFilter('custom');
    setFilterSelection('custom');
    setIsCustomPickerOpen(false);
    onCustomRangeChange?.(range);
  }

  function toggleCategory(category: string) {
    setHiddenCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.categories.title')}</h2>
        <div ref={filterContainerRef} className="relative w-full sm:w-auto sm:min-w-[12rem]">
          <Select
            value={filterSelection}
            onValueChange={(value) => handleRangeChange(value as ChartDateRange)}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-auto sm:min-w-[9rem]">
              <SelectValue />
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

      {isFiltering ? (
        <ChartSkeleton />
      ) : categoryTotals.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{t('dashboard.chartFilter.empty')}</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div className="mx-auto h-64 w-full max-w-sm">
            {visibleCategoryTotals.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-full border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
                <p className="text-sm text-gray-500">{t('dashboard.chartFilter.allHidden')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={96}
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.category} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      typeof value === 'number'
                        ? formatMoney(value, primaryCurrency, locale)
                        : String(value ?? '')
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1">
            <p className="mb-2 text-xs text-gray-500">{t('dashboard.chartFilter.toggleHint')}</p>
            {categoryTotals.map((item) => {
              const isHidden = hiddenCategories.has(item.category);
              const percentage =
                !isHidden && total > 0 ? Math.round((item.amount / total) * 100) : null;
              const fill = getCategoryColor(item.category);
              const label = t(getCategoryLabelKey(item.category));

              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => toggleCategory(item.category)}
                  aria-pressed={!isHidden}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-gray-50',
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
                    <span className={cn('truncate text-gray-700', isHidden && 'line-through')}>
                      {label}
                    </span>
                    {!isHidden && percentage !== null && (
                      <span className="text-xs text-gray-400">{percentage}%</span>
                    )}
                  </div>
                  <span
                    className={cn('shrink-0 font-medium text-gray-900', isHidden && 'line-through')}
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
