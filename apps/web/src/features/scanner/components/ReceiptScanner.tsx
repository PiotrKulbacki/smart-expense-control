'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import {
  flattenSplitsToLineItems,
  groupLineItemsToSplits,
  moveLineItemCategory,
  type ReceiptLineItem,
} from '@shared/features/transactions/receipt-split-state';
import {
  MAX_TRANSACTION_SPLITS,
  splitAmountsMatchTotal,
  sumSplitAmounts,
  toCalendarDateInputValue,
  type ReceiptSplitSuggestion,
} from '@shared/features/transactions/schemas';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import { CategorySelectWithCreate } from '@web/features/scanner/components/CategorySelectWithCreate';
import { ReceiptArchive } from '@web/features/scanner/components/ReceiptArchive';
import { compressReceiptImage } from '@web/features/scanner/lib/compress-receipt-image';
import {
  getCategoryOptionLabel,
  useCategories,
} from '@web/features/categories/hooks/useCategories';

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
  lineItems?: ReceiptLineItem[];
  suggestedSplits?: SplitLine[];
  receiptGroupId: string;
  receiptImageUrl: string;
};

function createDefaultSplitLine(draft: ReceiptDraft): SplitLine {
  return {
    category: draft.category,
    amount: draft.amount,
  };
}

function initializeDraftState(draft: ReceiptDraft): {
  isSplitMode: boolean;
  lineItems: ReceiptLineItem[] | null;
  manualSplitLines: SplitLine[];
  hasAiSuggestion: boolean;
} {
  if (draft.lineItems?.length && draft.lineItems.length >= 2) {
    return {
      isSplitMode: true,
      lineItems: draft.lineItems.map((item) => ({ ...item })),
      manualSplitLines: [],
      hasAiSuggestion: true,
    };
  }

  const suggestedSplits = draft.suggestedSplits;
  if (suggestedSplits && suggestedSplits.length > 1) {
    const flattened = flattenSplitsToLineItems(suggestedSplits);
    return {
      isSplitMode: true,
      lineItems: flattened.length >= 2 ? flattened : null,
      manualSplitLines: flattened.length >= 2 ? [] : suggestedSplits.map((split) => ({ ...split })),
      hasAiSuggestion: true,
    };
  }

  return {
    isSplitMode: false,
    lineItems: null,
    manualSplitLines: [createDefaultSplitLine(draft)],
    hasAiSuggestion: false,
  };
}

function formatItemMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
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
  const [lineItems, setLineItems] = useState<ReceiptLineItem[] | null>(null);
  const [manualSplitLines, setManualSplitLines] = useState<SplitLine[]>([]);
  const [hasAiSuggestion, setHasAiSuggestion] = useState(false);
  const [expandedCategoryKeys, setExpandedCategoryKeys] = useState<Record<string, boolean>>({});
  const [isDragActive, setIsDragActive] = useState(false);
  const [archiveRefreshKey, setArchiveRefreshKey] = useState(0);

  const splitLines = useMemo(() => {
    if (lineItems?.length) {
      return groupLineItemsToSplits(lineItems);
    }

    return manualSplitLines;
  }, [lineItems, manualSplitLines]);

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
    const splitState = initializeDraftState(nextDraft);
    setDraft(nextDraft);
    setIsSplitMode(splitState.isSplitMode);
    setLineItems(splitState.lineItems);
    setManualSplitLines(splitState.manualSplitLines);
    setHasAiSuggestion(splitState.hasAiSuggestion);
    setExpandedCategoryKeys({});
  }

  function resetDraftState() {
    setDraft(null);
    setIsSplitMode(false);
    setLineItems(null);
    setManualSplitLines([]);
    setHasAiSuggestion(false);
    setExpandedCategoryKeys({});
  }

  async function discardPendingReceipt(nextDraft: ReceiptDraft | null) {
    if (!nextDraft?.receiptGroupId || !nextDraft.receiptImageUrl) {
      return;
    }

    try {
      await fetch('/api/receipts/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptGroupId: nextDraft.receiptGroupId,
          receiptImageUrl: nextDraft.receiptImageUrl,
        }),
      });
    } catch {
      // Best-effort cleanup for unsaved scans.
    }
  }

  async function cancelDraft() {
    const pendingDraft = draft;
    resetDraftState();
    await discardPendingReceipt(pendingDraft);
  }

  function enableSplitMode() {
    if (!draft) {
      return;
    }

    setIsSplitMode(true);
    setHasAiSuggestion(false);

    if (!lineItems?.length) {
      setManualSplitLines((current) =>
        current.length > 0 ? current : [createDefaultSplitLine(draft)]
      );
    }
  }

  function disableSplitMode() {
    if (!draft) {
      return;
    }

    setIsSplitMode(false);
    setHasAiSuggestion(false);
    setLineItems(null);
    setExpandedCategoryKeys({});
    setManualSplitLines([createDefaultSplitLine(draft)]);
  }

  function updateManualSplitLine(index: number, patch: Partial<SplitLine>) {
    setManualSplitLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  }

  function addManualSplitLine() {
    if (!draft || manualSplitLines.length >= MAX_TRANSACTION_SPLITS) {
      return;
    }

    setManualSplitLines((current) => [
      ...current,
      {
        category: draft.category,
        amount: 0,
      },
    ]);
  }

  function removeManualSplitLine(index: number) {
    setManualSplitLines((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((_, lineIndex) => lineIndex !== index);
    });
  }

  function handleMoveLineItem(index: number, newCategory: string) {
    if (!lineItems) {
      return;
    }

    setLineItems(moveLineItemCategory(lineItems, index, newCategory));
  }

  async function handleScan(file: File) {
    if (!quota?.canScan) {
      toast.error(t('scanner.errors.quotaExceeded'));
      return;
    }

    setIsScanning(true);

    try {
      const compressedFile = await compressReceiptImage(file);
      const formData = new FormData();
      formData.append('receipt', compressedFile);

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

    if (isSplitMode && splitLines.length > MAX_TRANSACTION_SPLITS) {
      toast.error(t('transactions.errors.tooManySplits'));
      return;
    }

    setIsSaving(true);

    try {
      const shouldUseBatch = isSplitMode && splitLines.length > 1;
      const receiptMeta = {
        receiptGroupId: draft.receiptGroupId,
        receiptImageUrl: draft.receiptImageUrl,
      };
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
                ...receiptMeta,
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
              ...receiptMeta,
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
      setArchiveRefreshKey((current) => current + 1);
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
  const hasInteractiveItems = Boolean(lineItems?.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">
          {t('scanner.labels.scanDocument')}
        </h1>
        <p className="text-muted mt-1 text-sm">{t('scanner.status.readyToConfirm')}</p>
      </div>

      <section
        className={`panel relative z-10 p-6 transition ${
          isDragActive ? 'border-cool ring-cool/30 ring-2' : ''
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isScanning && !isBlocked) {
            setIsDragActive(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) {
            setIsDragActive(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);

          if (isScanning || isBlocked) {
            return;
          }

          const file = event.dataTransfer.files?.[0];
          if (file) {
            void handleScan(file);
          }
        }}
      >
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="border-[var(--border-cool)]/80 bg-elevated/40 w-full rounded-2xl border border-dashed px-6 py-10">
            <p className="font-display text-base font-semibold text-[var(--text)]">
              {isDragActive ? t('scanner.labels.dropDocument') : t('scanner.labels.uploadDocument')}
            </p>
            <p className="text-muted mt-2 text-sm">{t('scanner.labels.dragDropHint')}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
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
                className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isScanning && <LoadingSpinner />}
                {isScanning ? t('scanner.status.analyzing') : t('scanner.labels.chooseFile')}
              </button>
              {isBlocked && (
                <span className="chip chip-needed">{t('scanner.labels.scanBlocked')}</span>
              )}
            </div>
          </div>
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
                disabled={isSaving || isSplitMode}
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
                <CategorySelectWithCreate
                  value={draft.category}
                  disabled={isSaving}
                  onChange={(category) => setDraft({ ...draft, category })}
                />
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
              {hasInteractiveItems ? (
                <>
                  <div className="space-y-2">
                    {lineItems?.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="bg-elevated/60 flex flex-col gap-3 rounded-xl border border-[var(--border-cool)] p-4 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--text)]">
                            {item.name}
                          </p>
                          <p className="text-muted mt-0.5 text-xs">
                            {formatItemMoney(item.amount, draft.currency, locale)}
                          </p>
                        </div>
                        <div className="w-full sm:w-56">
                          <CategorySelectWithCreate
                            value={item.category}
                            disabled={isSaving}
                            onChange={(category) => handleMoveLineItem(index, category)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {splitLines.map((line) => {
                      const isExpanded = expandedCategoryKeys[line.category] ?? false;
                      const categoryLabel =
                        categories.find((category) => category.key === line.category) ??
                        categories[0];

                      return (
                        <div
                          key={line.category}
                          className="bg-elevated/40 rounded-xl border border-[var(--border)] p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[var(--text)]">
                              {categoryLabel
                                ? getCategoryOptionLabel(categoryLabel, t)
                                : line.category}
                              : {formatItemMoney(line.amount, draft.currency, locale)}
                            </p>
                            {line.items && line.items.length > 0 && (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() =>
                                  setExpandedCategoryKeys((current) => ({
                                    ...current,
                                    [line.category]: !isExpanded,
                                  }))
                                }
                                className="text-muted text-xs hover:underline"
                              >
                                {isExpanded
                                  ? t('scanner.split.collapseItems')
                                  : t('scanner.split.expandItems')}
                              </button>
                            )}
                          </div>
                          {isExpanded && line.items && (
                            <ul className="text-muted mt-2 list-disc space-y-1 pl-5 text-xs">
                              {line.items.map((item) => (
                                <li key={`${line.category}-${item.name}`}>
                                  {item.name} —{' '}
                                  {formatItemMoney(item.amount, draft.currency, locale)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {manualSplitLines.map((line, index) => (
                    <div
                      key={`split-${index}`}
                      className="bg-elevated/60 rounded-xl border border-[var(--border-cool)] p-4"
                    >
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
                        <label className="block text-sm">
                          <span className="auth-label">{t('dashboard.form.category')}</span>
                          <CategorySelectWithCreate
                            value={line.category}
                            disabled={isSaving}
                            onChange={(category) => updateManualSplitLine(index, { category })}
                          />
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
                              updateManualSplitLine(index, { amount: Number(event.target.value) })
                            }
                            className="auth-input"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={isSaving || manualSplitLines.length <= 1}
                          onClick={() => removeManualSplitLine(index)}
                          className="btn-ghost h-10 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={t('scanner.split.removeCategory')}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}

                  {manualSplitLines.length < MAX_TRANSACTION_SPLITS && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={addManualSplitLine}
                      className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t('scanner.split.addCategory')}
                    </button>
                  )}
                </>
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
              className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSaving && <LoadingSpinner />}
              {t('transactions.labels.saveTransaction')}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void cancelDraft()}
              className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('dashboard.form.cancel')}
            </button>
          </div>
        </section>
      )}

      <ReceiptArchive refreshKey={archiveRefreshKey} />
    </div>
  );
}
