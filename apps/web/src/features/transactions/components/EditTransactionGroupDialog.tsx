'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { toCalendarDateInputValue } from '@shared/features/transactions/schemas';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@web/components/ui/drawer';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@web/components/ui/sheet';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import { useMediaQuery } from '@web/features/transactions/hooks/useMediaQuery';

type EditTransactionGroupDialogProps = {
  receiptGroupId: string | null;
  initialDescription: string;
  initialDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

function EditGroupForm({
  description,
  date,
  isSaving,
  onDescriptionChange,
  onDateChange,
  onCancel,
  onSave,
}: {
  description: string;
  date: string;
  isSaving: boolean;
  onDescriptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useT();

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="auth-label">{t('dashboard.form.description')}</span>
        <input
          type="text"
          value={description}
          disabled={isSaving}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="auth-input"
        />
      </label>
      <label className="block text-sm">
        <span className="auth-label">{t('dashboard.form.date')}</span>
        <input
          type="date"
          value={date}
          disabled={isSaving}
          onChange={(event) => onDateChange(event.target.value)}
          className="auth-input"
        />
      </label>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('dashboard.form.cancel')}
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving && <LoadingSpinner />}
          {t('transactions.labels.saveTransaction')}
        </button>
      </div>
    </div>
  );
}

export function EditTransactionGroupDialog({
  receiptGroupId,
  initialDescription,
  initialDate,
  open,
  onOpenChange,
  onSuccess,
}: EditTransactionGroupDialogProps) {
  const t = useT();
  const { locale } = useLocale();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [description, setDescription] = useState(initialDescription);
  const [date, setDate] = useState(initialDate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription(initialDescription);
      setDate(toCalendarDateInputValue(initialDate));
    }
  }, [initialDate, initialDescription, open]);

  async function handleSave() {
    if (!receiptGroupId) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/transactions/group/${receiptGroupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim() || undefined,
          date,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        return;
      }

      toast.success(t('history.split.editGroupSuccess'));
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSaving(false);
    }
  }

  const form = (
    <EditGroupForm
      description={description}
      date={date}
      isSaving={isSaving}
      onDescriptionChange={setDescription}
      onDateChange={setDate}
      onCancel={() => onOpenChange(false)}
      onSave={() => void handleSave()}
    />
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('history.split.editGroupTitle')}</SheetTitle>
            <SheetDescription>{t('history.split.editGroupDescription')}</SheetDescription>
          </SheetHeader>
          <SheetBody>{form}</SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('history.split.editGroupTitle')}</DrawerTitle>
          <DrawerDescription>{t('history.split.editGroupDescription')}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>{form}</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
