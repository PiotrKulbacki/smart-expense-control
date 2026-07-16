'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, FolderOpen, ImageIcon, X, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { useAppUser } from '@web/features/auth/components/AppUserProvider';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { fetchReceiptArchive } from '@web/features/query/fetchers';
import { queryKeys } from '@web/features/query/query-keys';
import { cn } from '@web/lib/utils';

export type ReceiptArchiveDocument = {
  receiptGroupId: string;
  receiptImageUrl: string;
  previewUrl: string;
  description: string | null;
  date: string;
  totalAmount: number;
  currency: string;
};

type MonthBucket = {
  key: string;
  year: number;
  month: number;
  documents: ReceiptArchiveDocument[];
};

type ReceiptArchiveProps = {
  refreshKey?: number;
};

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDocumentDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

function groupDocumentsByMonth(documents: ReceiptArchiveDocument[]): MonthBucket[] {
  const buckets = new Map<string, MonthBucket>();

  for (const document of documents) {
    const date = new Date(document.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;

    const bucket = buckets.get(key) ?? {
      key,
      year,
      month,
      documents: [],
    };

    bucket.documents.push(document);
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((left, right) => {
    if (left.year !== right.year) {
      return right.year - left.year;
    }

    return right.month - left.month;
  });
}

function sortDocumentsByDate(documents: ReceiptArchiveDocument[]): ReceiptArchiveDocument[] {
  return [...documents].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  );
}

function ArchiveSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-elevated h-28 animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}

function ReceiptPreviewModal({
  document,
  locale,
  onClose,
}: {
  document: ReceiptArchiveDocument;
  locale: string;
  onClose: () => void;
}) {
  const t = useT();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('scanner.archive.previewTitle')}
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          aria-label={t('scanner.archive.closePreview')}
        >
          <X className="h-4 w-4" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.previewUrl}
          alt={document.description ?? t('scanner.archive.untitledDocument')}
          className="max-h-[70vh] w-full bg-black/5 object-contain"
        />
        <div className="border-t border-[var(--border)] p-4">
          <p className="font-display text-lg font-semibold text-[var(--text)]">
            {document.description ?? t('scanner.archive.untitledDocument')}
          </p>
          <p className="text-muted mt-1 text-sm">
            {formatMoney(document.totalAmount, document.currency, locale)}
          </p>
        </div>
      </div>
    </div>
  );
}

function FolderCard({
  month,
  isSelected,
  onSelect,
}: {
  month: MonthBucket;
  isSelected: boolean;
  onSelect: (key: string) => void;
}) {
  const t = useT();

  return (
    <button
      type="button"
      onClick={() => onSelect(month.key)}
      className={cn(
        'bg-elevated/60 hover:border-[var(--cool)]/40 group flex flex-col items-start rounded-2xl border p-4 text-left transition hover:shadow-md sm:p-5',
        isSelected
          ? 'ring-[var(--cool)]/30 border-[var(--cool)] shadow-md ring-1'
          : 'border-[var(--border-cool)]'
      )}
      aria-pressed={isSelected}
    >
      <span className="bg-cool/10 text-cool flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-105">
        <FolderOpen className="h-5 w-5" />
      </span>
      <span className="font-display mt-4 text-2xl font-bold tracking-tight text-[var(--text)]">
        {String(month.month).padStart(2, '0')} / {month.year}
      </span>
      <span className="text-muted mt-1 text-xs">
        {t('scanner.archive.documentCount', { count: month.documents.length })}
      </span>
    </button>
  );
}

function DocumentRow({
  document,
  locale,
  onPreview,
}: {
  document: ReceiptArchiveDocument;
  locale: string;
  onPreview: (document: ReceiptArchiveDocument) => void;
}) {
  const t = useT();
  const title = document.description ?? t('scanner.archive.untitledDocument');

  return (
    <article className="bg-elevated/60 hover:border-[var(--cool)]/40 flex gap-3 rounded-xl border border-[var(--border-cool)] p-3 transition hover:shadow-sm sm:gap-4 sm:p-3.5">
      <button
        type="button"
        onClick={() => onPreview(document)}
        className="group/thumb relative shrink-0 overflow-hidden rounded-md shadow-sm"
        aria-label={t('scanner.archive.previewAction', { name: title })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.previewUrl}
          alt={title}
          className="h-24 w-16 object-cover transition duration-300 group-hover/thumb:scale-105 sm:h-28 sm:w-20"
          loading="lazy"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white transition group-hover/thumb:bg-black/35">
          <ZoomIn className="h-4 w-4 opacity-0 transition group-hover/thumb:opacity-100" />
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text)]">{title}</p>
          <p className="text-muted mt-0.5 text-xs">{formatDocumentDate(document.date, locale)}</p>
          <p className="mt-1 text-sm font-medium text-[var(--text)]">
            {formatMoney(document.totalAmount, document.currency, locale)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onPreview(document)}
            className="btn-ghost h-7 px-2.5 text-xs"
          >
            <ImageIcon className="mr-1 h-3.5 w-3.5" />
            {t('scanner.archive.previewActionShort')}
          </button>
          <Link
            href={`/history?receiptGroupId=${encodeURIComponent(document.receiptGroupId)}`}
            className="btn-ghost inline-flex h-7 items-center px-2.5 text-xs"
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            {t('scanner.archive.viewTransactions')}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ReceiptArchive({ refreshKey = 0 }: ReceiptArchiveProps) {
  const t = useT();
  const { locale } = useLocale();
  const user = useAppUser();
  const queryClient = useQueryClient();
  const [openMonthKey, setOpenMonthKey] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<ReceiptArchiveDocument | null>(null);

  const archiveQuery = useQuery({
    queryKey: queryKeys.receiptArchive(user.id),
    queryFn: fetchReceiptArchive,
  });

  useEffect(() => {
    if (!archiveQuery.isError) {
      return;
    }

    toast.error(
      translateError(
        archiveQuery.error instanceof Error
          ? archiveQuery.error.message
          : 'scanner.archive.errors.loadFailed',
        locale
      )
    );
  }, [archiveQuery.error, archiveQuery.isError, locale]);

  useEffect(() => {
    if (refreshKey <= 0) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.receiptArchive(user.id) });
  }, [queryClient, refreshKey, user.id]);

  const documents = archiveQuery.data ?? [];
  const isLoading = archiveQuery.isLoading && archiveQuery.data === undefined;

  const monthBuckets = useMemo(() => groupDocumentsByMonth(documents), [documents]);
  const selectedMonth = useMemo(
    () => monthBuckets.find((month) => month.key === openMonthKey) ?? null,
    [monthBuckets, openMonthKey]
  );
  const selectedDocuments = useMemo(
    () => (selectedMonth ? sortDocumentsByDate(selectedMonth.documents) : []),
    [selectedMonth]
  );

  useEffect(() => {
    if (openMonthKey && !monthBuckets.some((month) => month.key === openMonthKey)) {
      setOpenMonthKey(null);
    }
  }, [monthBuckets, openMonthKey]);

  return (
    <section className="panel relative z-10 p-6">
      <div className="relative z-10">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">
          {t('scanner.archive.title')}
        </h2>
        <p className="text-muted mt-1 text-sm">{t('scanner.archive.subtitle')}</p>
      </div>

      <div className="relative z-10 mt-6">
        {isLoading ? (
          <ArchiveSkeleton />
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-cool)] py-12 text-center">
            <span className="bg-cool/10 text-cool flex h-14 w-14 items-center justify-center rounded-2xl">
              <FolderOpen className="h-7 w-7" />
            </span>
            <p className="mt-4 max-w-sm text-sm font-medium text-[var(--text)]">
              {t('scanner.archive.emptyTitle')}
            </p>
            <p className="text-muted mt-1 max-w-sm text-sm">{t('scanner.archive.emptyHint')}</p>
          </div>
        ) : selectedMonth ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setOpenMonthKey(null)}
              className="btn-ghost inline-flex h-9 items-center gap-2 px-3 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('scanner.archive.backToFolders')}
            </button>

            <div className="bg-[var(--surface)]/40 rounded-2xl border border-[var(--border-cool)] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="bg-cool/10 text-cool flex h-10 w-10 items-center justify-center rounded-xl">
                  <FolderOpen className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
                    {String(selectedMonth.month).padStart(2, '0')} / {selectedMonth.year}
                  </p>
                  <p className="text-muted text-xs">
                    {t('scanner.archive.documentCount', { count: selectedDocuments.length })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {selectedDocuments.map((document) => (
                  <DocumentRow
                    key={document.receiptGroupId}
                    document={document}
                    locale={locale}
                    onPreview={setPreviewDocument}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {monthBuckets.map((month) => (
              <FolderCard
                key={month.key}
                month={month}
                isSelected={false}
                onSelect={setOpenMonthKey}
              />
            ))}
          </div>
        )}
      </div>

      {previewDocument && (
        <ReceiptPreviewModal
          document={previewDocument}
          locale={locale}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </section>
  );
}
