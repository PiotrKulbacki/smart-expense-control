'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { AiInsightContent } from '@shared/features/ai/schemas';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type NoSpendDaysSummary = {
  noSpendDays: number;
  totalDays: number;
  ratio: string;
};

type InsightApiResponse = {
  insight?: AiInsightContent;
  cached?: boolean;
  updatedAt?: string;
  error?: string;
};

const INSIGHT_TYPE_STYLES: Record<
  AiInsightContent['type'],
  { border: string; bg: string; icon: string }
> = {
  success: {
    border: 'border-emerald-400/35',
    bg: 'bg-emerald-400/8',
    icon: 'text-emerald-300',
  },
  warning: {
    border: 'border-amber-400/40',
    bg: 'bg-amber-400/8',
    icon: 'text-amber-300',
  },
  anomaly: {
    border: 'border-rose-400/35',
    bg: 'bg-rose-400/8',
    icon: 'text-rose-300',
  },
  tip: {
    border: 'border-sky-400/35',
    bg: 'bg-sky-400/8',
    icon: 'text-sky-300',
  },
};

type TransactionsInsightsCardProps = {
  transactionCount: number;
  noSpendDays: NoSpendDaysSummary | null;
};

export function TransactionsInsightsCard({
  transactionCount,
  noSpendDays,
}: TransactionsInsightsCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const [insight, setInsight] = useState<AiInsightContent | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInsight = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoadingInsight(true);
      }

      try {
        const params = new URLSearchParams({ locale });
        if (forceRefresh) {
          params.set('force', 'true');
        }

        const response = await fetch(`/api/dashboard/insights?${params.toString()}`);
        const data = (await response.json()) as InsightApiResponse;

        if (!response.ok) {
          toast.error(translateError(data.error ?? 'dashboard.insights.errors.aiFailed', locale));
          return;
        }

        if (data.insight) {
          setInsight(data.insight);
        }
      } catch {
        toast.error(t('auth.errors.networkError'));
      } finally {
        setIsLoadingInsight(false);
        setIsRefreshing(false);
      }
    },
    [locale, t]
  );

  useEffect(() => {
    void loadInsight(false);
  }, [loadInsight]);

  const typeStyles = insight ? INSIGHT_TYPE_STYLES[insight.type] : INSIGHT_TYPE_STYLES.tip;

  return (
    <article className="panel relative z-10 flex h-full flex-col p-5 sm:p-6">
      <div className="relative z-10 grid flex-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-5">
        {/* Left: transactions + no-spend days as one unit */}
        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div>
            <p className="text-muted text-sm font-medium">{t('dashboard.summary.transactions')}</p>
            <p className="font-display mt-2 text-3xl font-bold text-[var(--text)]">
              {transactionCount}
            </p>
          </div>

          <div className="border-cool/15 bg-cool/5 flex min-w-0 items-start gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5">
            <div className="bg-cool/10 text-cool mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-muted break-words text-[11px] font-medium leading-snug">
                {t('dashboard.noSpendDays.title')}
              </p>
              {noSpendDays ? (
                <p className="font-display mt-1 truncate whitespace-nowrap text-base font-semibold text-[var(--text)] sm:text-lg">
                  {t('dashboard.noSpendDays.value', {
                    noSpend: noSpendDays.noSpendDays,
                    total: noSpendDays.totalDays,
                  })}
                </p>
              ) : (
                <div className="bg-elevated mt-2 h-5 w-24 animate-pulse rounded-md" />
              )}
            </div>
          </div>
        </div>

        {/* Right: AI insight — full text on stacked layouts; scroll when side-by-side */}
        <div
          className={`relative flex min-w-0 flex-col rounded-xl border ${typeStyles.border} ${typeStyles.bg} p-3 sm:p-3.5 lg:min-h-0 lg:overflow-hidden`}
        >
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <Sparkles className={`h-3.5 w-3.5 shrink-0 ${typeStyles.icon}`} aria-hidden />
              <p className="text-muted truncate text-[11px] font-medium leading-snug">
                {t('dashboard.insights.title')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadInsight(true)}
              disabled={isLoadingInsight || isRefreshing}
              className="text-muted hover:text-cool hover:bg-cool/10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('dashboard.insights.refresh')}
              title={t('dashboard.insights.refresh')}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden
              />
            </button>
          </div>

          {isLoadingInsight && !insight ? (
            <div className="mt-2 space-y-2" aria-hidden>
              <div className="bg-elevated/80 h-3.5 w-36 animate-pulse rounded-md" />
              <div className="bg-elevated/80 h-3 w-full animate-pulse rounded-md" />
              <div className="bg-elevated/80 h-3 w-4/5 animate-pulse rounded-md" />
            </div>
          ) : insight ? (
            <div className="recent-transactions-scroll mt-2 min-h-0 lg:max-h-[10.5rem] lg:overflow-y-auto lg:pr-1.5">
              <p className="font-display text-sm font-semibold text-[var(--text)]">
                {insight.metric}
              </p>
              <p className="text-muted mt-1 text-xs leading-relaxed sm:text-sm">
                {insight.message}
              </p>
              {insight.actionableStep ? (
                <p className="text-cool/90 mt-1.5 text-[11px] leading-snug sm:text-xs">
                  {t('dashboard.insights.actionablePrefix')} {insight.actionableStep}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted mt-2 text-xs sm:text-sm">{t('dashboard.insights.empty')}</p>
          )}
        </div>
      </div>
    </article>
  );
}
