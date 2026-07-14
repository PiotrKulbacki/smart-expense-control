'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@web/components/ui/alert-dialog';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';

type DeleteTransactionDialogProps = {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function DeleteTransactionDialog({
  transactionId,
  open,
  onOpenChange,
  onSuccess,
}: DeleteTransactionDialogProps) {
  const t = useT();
  const { locale } = useLocale();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!transactionId) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(t('transactions.success.deleted'));
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dashboard.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('dashboard.delete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t('dashboard.form.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            {isDeleting && <LoadingSpinner />}
            {t('transactions.labels.deleteTransaction')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
