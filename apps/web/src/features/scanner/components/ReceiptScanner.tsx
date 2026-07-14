'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import {
  MAX_TRANSACTION_SPLITS,
  splitAmountsMatchTotal,
  sumSplitAmounts,
  toCalendarDateInputValue,
  type ReceiptSplitSuggestion,
} from '@shared/features/transactions/schemas';
import {
  getCategoryOptionLabel,
  useCategories,
} from '@web/features/categories/hooks/useCategories';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type ScanQuota = {
  limit: number;
  used: number;
  remaining: number;
  canScan: boolean;
  isBlocked: boolean;
};

type SplitLine = ReceiptSplitSuggestion;

type ReceiptDraft = {
  amount: number;
  currency: 'PLN' | 'EUR' | 'GBP';
  category: string;
  description?: string;
  date: string;
  needsManualReview: boolean;
  isAiScanned: boolean;
  hasMultipleCategories?: boolean;
  suggestedSplits?: SplitLine[];
};

const VISIBLE_SPLIT_ITEMS = 5;

function createDefaultSplitLine(draft: ReceiptDraft): SplitLine {
  return {
    category: draft.category,
    amount: draft.amount,
  };
}

function initializeSplitState(draft: ReceiptDraft): {
  isSplitMode: boolean;
  splitLines: SplitLine[];
  hasAiSuggestion: boolean;
} {
  const suggestedSplits = draft.suggestedSplits;
  if (suggestedSplits && suggestedSplits.length > 1) {
    return {
      isSplitMode: true,
      splitLines: suggestedSplits.map((split) => ({ ...split })),
      hasAiSuggestion: true,
    };
  }

  return {
    isSplitMode: false,
    splitLines: [createDefaultSplitLine(draft)],
    hasAiSuggestion: false,
  };
}

export function ReceiptScanner() {
  const t = useT();
  const { locale } = useLocale();
  const { categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitLines, setSplitLines] = useState<SplitLine[]>([]);
  const [hasAiSuggestion, setHasAiSuggestion] = useState(false);
  const [expandedSplitIndexes, setExpandedSplitIndexes] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadQuota() {
      try {
        const response = await fetch('/api/ai/scan-quota');
        const data = (await response.json()) as { quota?: ScanQuota; error?: string };

        if (!response.ok) {
          toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
          return;
        }

        setQuota(data.quota ?? null);
      } catch {
        toast.error(t('auth.errors.networkError'));
      }
    }

    void loadQuota();
  }, [locale, t]);

  function applyDraft(nextDraft: ReceiptDraft) {
    const splitState = initializeSplitState(nextDraft);
    setDraft(nextDraft);
    setIsSplitMode(splitState.isSplitMode);
    setSplitLines(splitState.splitLines);
    setHasAiSuggestion(splitState.hasAiSuggestion);
    setExpandedSplitIndexes({});
  }

  function resetDraftState() {
    setDraft(null);
    setIsSplitMode(false);
    setSplitLines([]);
    setHasAiSuggestion(false);
    setExpandedSplitIndexes({});
  }

  function enableSplitMode() {
    if (!draft) {
      return;
    }

    setIsSplitMode(true);
    setHasAiSuggestion(false);
    setSplitLines((current) => {
      if (current.length > 0) {
        return current;
      }

      return [createDefaultSplitLine(draft)];
    });
  }

  function disableSplitMode() {
    if (!draft) {
      return;
    }

    setIsSplitMode(false);
    setHasAiSuggestion(false);
    setExpandedSplitIndexes({});
    setSplitLines([createDefaultSplitLine(draft)]);
  }

  function updateSplitLine(index: number, patch: Partial<SplitLine>) {
    setSplitLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  }

  function addSplitLine() {
    if (!draft || splitLines.length >= MAX_TRANSACTION_SPLITS) {
      return;
    }

    setSplitLines((current) => [
      ...current,
      {
        category: draft.category,
        amount: 0,
      },
    ]);
  }

  function removeSplitLine(index: number) {
    setSplitLines((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((_, lineIndex) => lineIndex !== index);
    });
    setExpandedSplitIndexes((current) => {
      const next: Record<number, boolean> = {};
      Object.entries(current).forEach(([key, value]) => {
        const lineIndex = Number(key);
        if (lineIndex < index) {
          next[lineIndex] = value;
        } else if (lineIndex > index) {
          next[lineIndex - 1] = value;
        }
      });
      return next;
    });
  }

  async function handleScan(file: File) {
    if (!quota?.canScan) {
      toast.error(t('scanner.errors.quotaExceeded'));
      return;
    }

    setIsScanning(true);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as { draft?: ReceiptDraft; error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'scanner.errors.aiFailed', locale));
        return;
      }

      if (data.draft) {
        applyDraft(data.draft);
        toast.success(t('scanner.success.readyToConfirm'));
        if (data.draft.needsManualReview) {
          toast.warning(t('scanner.warnings.needsReview'));
        }
      }

      const quotaResponse = await fetch('/api/ai/scan-quota');
      const quotaData = (await quotaResponse.json()) as { quota?: ScanQuota };
      setQuota(quotaData.quota ?? null);
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsScanning(false);
    }
  }

  async function handleSave() {
    if (!draft) {
      return;
    }

    setIsSaving(true);

    try {
      const shouldUseBatch = isSplitMode && splitLines.length > 1;
      const response = shouldUseBatch
        ? await fetch('/api/transactions/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shared: {
                totalAmount: draft.amount,
                currency: draft.currency,
                description: draft.description,
                date: draft.date,
                isAiScanned: true,
              },
              splits: splitLines.map(({ category, amount }) => ({ category, amount })),
            }),
          })
        : await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: isSplitMode ? (splitLines[0]?.amount ?? draft.amount) : draft.amount,
              currency: draft.currency,
              category: isSplitMode ? (splitLines[0]?.category ?? draft.category) : draft.category,
              description: draft.description,
              date: draft.date,
              isAiScanned: true,
            }),
          });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(
        shouldUseBatch ? t('transactions.success.batchCreated') : t('transactions.success.created')
      );
      resetDraftState();
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  const isBlocked = quota?.isBlocked ?? false;
  const splitTotal = sumSplitAmounts(splitLines);
  const splitMatchesTotal = draft ? splitAmountsMatchTotal(splitLines, draft.amount) : true;
  const canSaveSplit =
    !isSplitMode ||
    splitLines.length <= 1 ||
    (splitLines.every((line) => line.amount > 0) && splitMatchesTotal);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">
          {t('scanner.labels.scanDocument')}
        </h1>
        <p className="text-muted mt-1 text-sm">{t('scanner.status.readyToConfirm')}</p>
      </div>

      <section className="panel relative z-10 p-6">
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={isScanning || isBlocked}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleScan(file);
              }
              event.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={isScanning || isBlocked}
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {isScanning ? t('scanner.status.analyzing') : t('scanner.labels.uploadDocument')}
          </button>
          {isBlocked && <span className="chip chip-needed">{t('scanner.labels.scanBlocked')}</span>}
          {quota && !isBlocked && (
            <span className="text-muted text-sm">
              {t('scanner.status.scansRemaining', { count: quota.remaining })}
            </span>
          )}
        </div>
      </section>

      {draft && (
        <section className="panel relative z-10 p-6">
          <h2 className="font-display relative z-10 text-lg font-semibold text-[var(--text)]">
            {t('scanner.labels.confirmExpense')}
          </h2>

          {hasAiSuggestion && (
            <p className="text-muted relative z-10 mt-2 text-sm">
              {t('scanner.split.aiSuggested')}
            </p>
          )}

          <div className="relative z-10 mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="auth-label">{t('dashboard.form.amount')}</span>
              <input
                type="number"
                step="0.01"
                value={draft.amount}
                disabled={isSaving}
                onChange={(event) => {
                  const amount = Number(event.target.value);
                  setDraft({ ...draft, amount });
                }}
                className="auth-input"
              />
            </label>
            <label className="block text-sm">
              <span className="auth-label">{t('dashboard.form.currency')}</span>
              <select
                value={draft.currency}
                disabled={isSaving}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    currency: event.target.value as ReceiptDraft['currency'],
                  })
                }
                className="auth-input"
              >
                {(['PLN', 'EUR', 'GBP'] as const).map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>

            {!isSplitMode && (
              <label className="block text-sm">
                <span className="auth-label">{t('dashboard.form.category')}</span>
                <select
                  value={draft.category}
                  disabled={isSaving}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  className="auth-input"
                >
                  {categories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {getCategoryOptionLabel(category, t)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-sm">
              <span className="auth-label">{t('dashboard.form.date')}</span>
              <input
                type="date"
                value={toCalendarDateInputValue(draft.date)}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                className="auth-input"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="auth-label">{t('dashboard.form.description')}</span>
              <input
                type="text"
                value={draft.description ?? ''}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className="auth-input"
              />
            </label>
          </div>

          <div className="relative z-10 mt-4">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => (isSplitMode ? disableSplitMode() : enableSplitMode())}
              className="text-sm font-medium text-[var(--cool)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSplitMode ? t('scanner.split.toggleOff') : t('scanner.split.toggleOn')}
            </button>
          </div>

          {isSplitMode && (
            <div className="relative z-10 mt-4 space-y-3">
              {splitLines.map((line, index) => {
                const visibleItems = line.items?.slice(0, VISIBLE_SPLIT_ITEMS) ?? [];
                const hiddenItemCount = Math.max(
                  (line.items?.length ?? 0) - VISIBLE_SPLIT_ITEMS,
                  0
                );
                const isExpanded = expandedSplitIndexes[index] ?? false;

                return (
                  <div
                    key={`split-${index}`}
                    className="bg-elevated/60 rounded-xl border border-[var(--border-cool)] p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
                      <label className="block text-sm">
                        <span className="auth-label">{t('dashboard.form.category')}</span>
                        <select
                          value={line.category}
                          disabled={isSaving}
                          onChange={(event) =>
                            updateSplitLine(index, { category: event.target.value })
                          }
                          className="auth-input"
                        >
                          {categories.map((category) => (
                            <option key={category.key} value={category.key}>
                              {getCategoryOptionLabel(category, t)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="auth-label">{t('dashboard.form.amount')}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.amount}
                          disabled={isSaving}
                          onChange={(event) =>
                            updateSplitLine(index, { amount: Number(event.target.value) })
                          }
                          className="auth-input"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={isSaving || splitLines.length <= 1}
                        onClick={() => removeSplitLine(index)}
                        className="btn-ghost h-10 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t('scanner.split.removeCategory')}
                      >
                        ×
                      </button>
                    </div>

                    {line.items && line.items.length > 0 && (
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            setExpandedSplitIndexes((current) => ({
                              ...current,
                              [index]: !isExpanded,
                            }))
                          }
                          className="text-muted text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isExpanded
                            ? t('scanner.split.collapseItems')
                            : t('scanner.split.expandItems')}
                        </button>
                        {isExpanded && (
                          <ul className="text-muted mt-2 list-disc space-y-1 pl-5 text-xs">
                            {visibleItems.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                            {hiddenItemCount > 0 && (
                              <li>{t('scanner.split.moreItems', { count: hiddenItemCount })}</li>
                            )}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {splitLines.length < MAX_TRANSACTION_SPLITS && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={addSplitLine}
                  className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('scanner.split.addCategory')}
                </button>
              )}

              <p
                className={`text-sm ${splitMatchesTotal ? 'text-[var(--cool)]' : 'text-[var(--warm)]'}`}
              >
                {t('scanner.split.sumLabel')}: {splitTotal.toFixed(2)} / {draft.amount.toFixed(2)}{' '}
                {draft.currency} —{' '}
                {splitMatchesTotal ? t('scanner.split.sumValid') : t('scanner.split.sumInvalid')}
              </p>
            </div>
          )}

          <div className="relative z-10 mt-6 flex gap-3">
            <button
              type="button"
              disabled={isSaving || !canSaveSplit}
              onClick={() => void handleSave()}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {t('transactions.labels.saveTransaction')}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={resetDraftState}
              className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('dashboard.form.cancel')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
