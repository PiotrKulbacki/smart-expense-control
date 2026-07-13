'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { TRANSACTION_CATEGORIES } from '@shared/features/transactions/schemas';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { getCategoryLabelKey } from '@web/features/transactions/lib/category-config';

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
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">
          {t('scanner.labels.scanReceipt')}
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
            {isScanning ? t('scanner.status.analyzing') : t('scanner.labels.uploadReceipt')}
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
          <div className="relative z-10 mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="auth-label">{t('dashboard.form.amount')}</span>
              <input
                type="number"
                step="0.01"
                value={draft.amount}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
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
            <label className="block text-sm">
              <span className="auth-label">{t('dashboard.form.category')}</span>
              <select
                value={draft.category}
                disabled={isSaving}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                className="auth-input"
              >
                {TRANSACTION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(getCategoryLabelKey(category))}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="auth-label">{t('dashboard.form.date')}</span>
              <input
                type="date"
                value={draft.date.slice(0, 10)}
                disabled={isSaving}
                onChange={(event) =>
                  setDraft({ ...draft, date: new Date(event.target.value).toISOString() })
                }
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
          <div className="relative z-10 mt-6 flex gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {t('transactions.labels.saveTransaction')}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setDraft(null)}
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
