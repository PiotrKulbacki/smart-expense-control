'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
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

type CategoryDonutChartProps = {
  chartTransactions: ChartTransaction[];
  periodStart: string;
  primaryCurrency: string;
  locale: string;
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
}: CategoryDonutChartProps) {
  const t = useT();
  const [dateRange, setDateRange] = useState<ChartDateRange>('period');
  const [isFiltering, setIsFiltering] = useState(false);

  const categoryTotals = useMemo(
    () => aggregateCategoryTotals(chartTransactions, dateRange, periodStart),
    [chartTransactions, dateRange, periodStart]
  );

  useEffect(() => {
    setIsFiltering(true);
    const timer = window.setTimeout(() => setIsFiltering(false), 200);
    return () => window.clearTimeout(timer);
  }, [dateRange]);

  const chartData = categoryTotals.map((item) => ({
    ...item,
    fill: getCategoryColor(item.category),
    label: t(getCategoryLabelKey(item.category)),
  }));

  const total = categoryTotals.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.categories.title')}</h2>
        <Select
          value={dateRange}
          onValueChange={(value) => setDateRange(value as ChartDateRange)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[9rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="period">{t('dashboard.chartFilter.period')}</SelectItem>
            <SelectItem value="7d">{t('dashboard.chartFilter.last7Days')}</SelectItem>
            <SelectItem value="today">{t('dashboard.chartFilter.today')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isFiltering ? (
        <ChartSkeleton />
      ) : categoryTotals.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{t('dashboard.chartFilter.empty')}</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div className="mx-auto h-64 w-full max-w-sm">
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
          </div>

          <div className="space-y-3">
            {chartData.map((item) => {
              const percentage = total > 0 ? Math.round((item.amount / total) * 100) : 0;

              return (
                <div key={item.category} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="truncate text-gray-700">{item.label}</span>
                    <span className="text-xs text-gray-400">{percentage}%</span>
                  </div>
                  <span className="shrink-0 font-medium text-gray-900">
                    {formatMoney(item.amount, primaryCurrency, locale)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
