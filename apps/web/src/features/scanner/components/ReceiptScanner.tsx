'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { TRANSACTION_CATEGORIES } from '@shared/features/transactions/schemas';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type ScanQuota = {
  limit: number;
  used: number;
  remaining: number;
  canScan: boolean;
  isBlocked: boolean;
};

type ReceiptDraft = {
  amount: number;
  currency: 'PLN' | 'EUR' | 'GBP';
  category: string;
  description?: string;
  date: string;
  needsManualReview: boolean;
  isAiScanned: boolean;
};

export function ReceiptScanner() {
  const t = useT();
  const { locale } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);

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
        setDraft(data.draft);
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
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: draft.amount,
          currency: draft.currency,
          category: draft.category,
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

      toast.success(t('transactions.success.created'));
      setDraft(null);
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  const isBlocked = quota?.isBlocked ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('scanner.labels.scanReceipt')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('scanner.status.readyToConfirm')}</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
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
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isScanning ? t('scanner.status.analyzing') : t('scanner.labels.uploadReceipt')}
          </button>
          {isBlocked && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              {t('scanner.labels.scanBlocked')}
            </span>
          )}
          {quota && !isBlocked && (
            <span className="text-sm text-gray-500">
              {t('scanner.status.scansRemaining', { count: quota.remaining })}
            </span>
          )}
        </div>
      </section>

      {draft && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('scanner.labels.confirmExpense')}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                {t('dashboard.form.amount')}
              </span>
              <input
                type="number"
                step="0.01"
                value={draft.amount}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                {t('dashboard.form.currency')}
              </span>
              <select
                value={draft.currency}
                disabled={isSaving}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    currency: event.target.value as ReceiptDraft['currency'],
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              >
                {(['PLN', 'EUR', 'GBP'] as const).map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                {t('dashboard.form.category')}
              </span>
              <select
                value={draft.category}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              >
                {TRANSACTION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                {t('dashboard.form.date')}
              </span>
              <input
                type="date"
                value={draft.date.slice(0, 10)}
                disabled={isSaving}
                onChange={(event) =>
                  setDraft({ ...draft, date: new Date(event.target.value).toISOString() })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">
                {t('dashboard.form.description')}
              </span>
              <input
                type="text"
                value={draft.description ?? ''}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
              />
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {t('transactions.labels.saveTransaction')}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setDraft(null)}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {t('dashboard.form.cancel')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
