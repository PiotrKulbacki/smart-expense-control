'use client';

import type { CurrencyCode } from '@shared/features/transactions/schemas';
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
import { useT } from '@web/features/i18n/LocaleProvider';
import {
  TransactionForm,
  type TransactionFormInitialValues,
} from '@web/features/transactions/components/TransactionForm';
import { useMediaQuery } from '@web/features/transactions/hooks/useMediaQuery';

type TransactionFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryCurrency: CurrencyCode;
  transactionId?: string;
  initialValues?: TransactionFormInitialValues;
  onSuccess: () => void;
};

export function TransactionFormModal({
  open,
  onOpenChange,
  primaryCurrency,
  transactionId,
  initialValues,
  onSuccess,
}: TransactionFormModalProps) {
  const t = useT();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isEditing = Boolean(transactionId);

  const title = isEditing
    ? t('transactions.labels.editTransaction')
    : t('transactions.labels.addManualExpense');
  const description = isEditing
    ? t('transactions.labels.editTransactionHint')
    : t('transactions.labels.addManualExpenseHint');

  function handleSuccess() {
    onOpenChange(false);
    onSuccess();
  }

  function handleCancel() {
    onOpenChange(false);
  }

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <TransactionForm
              key={transactionId ?? 'new'}
              primaryCurrency={primaryCurrency}
              transactionId={transactionId}
              initialValues={initialValues}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <TransactionForm
            key={transactionId ?? 'new'}
            primaryCurrency={primaryCurrency}
            transactionId={transactionId}
            initialValues={initialValues}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
