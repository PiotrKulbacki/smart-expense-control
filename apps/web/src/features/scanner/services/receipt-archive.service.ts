import { prisma } from '@lyamo/database';
import { createReceiptSignedUrl } from '@web/features/scanner/services/receipt-storage.service';

export type ReceiptArchiveDocument = {
  receiptGroupId: string;
  receiptImageUrl: string;
  previewUrl: string;
  description: string | null;
  date: string;
  totalAmount: number;
  currency: string;
};

export async function listReceiptArchiveDocuments(
  userId: string
): Promise<ReceiptArchiveDocument[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      receiptGroupId: { not: null },
      receiptImageUrl: { not: null },
    },
    orderBy: { date: 'desc' },
    select: {
      receiptGroupId: true,
      receiptImageUrl: true,
      description: true,
      date: true,
      amount: true,
      currency: true,
    },
  });

  const groups = new Map<
    string,
    {
      receiptImageUrl: string;
      description: string | null;
      date: Date;
      totalAmount: number;
      currency: string;
    }
  >();

  for (const transaction of transactions) {
    if (!transaction.receiptGroupId || !transaction.receiptImageUrl) {
      continue;
    }

    const existing = groups.get(transaction.receiptGroupId);
    if (existing) {
      existing.totalAmount += transaction.amount.toNumber();
      if (transaction.date > existing.date) {
        existing.date = transaction.date;
      }
      if (!existing.description && transaction.description) {
        existing.description = transaction.description;
      }
      continue;
    }

    groups.set(transaction.receiptGroupId, {
      receiptImageUrl: transaction.receiptImageUrl,
      description: transaction.description,
      date: transaction.date,
      totalAmount: transaction.amount.toNumber(),
      currency: transaction.currency,
    });
  }

  const documents: ReceiptArchiveDocument[] = [];

  for (const [receiptGroupId, group] of groups) {
    const previewUrl = await createReceiptSignedUrl(group.receiptImageUrl);
    if (!previewUrl) {
      continue;
    }

    documents.push({
      receiptGroupId,
      receiptImageUrl: group.receiptImageUrl,
      previewUrl,
      description: group.description,
      date: group.date.toISOString(),
      totalAmount: Math.round(group.totalAmount * 100) / 100,
      currency: group.currency,
    });
  }

  return documents.sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  );
}
