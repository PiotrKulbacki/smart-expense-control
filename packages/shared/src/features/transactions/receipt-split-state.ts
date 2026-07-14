import { normalizeLegacyCategory } from './categories';
import { splitAmountsMatchTotal, type ReceiptSplitSuggestion } from './schemas';

export type ReceiptSplitItem = {
  name: string;
  amount: number;
};

export type ReceiptLineItem = {
  name: string;
  amount: number;
  category: string;
};

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function groupLineItemsToSplits(lineItems: ReceiptLineItem[]): ReceiptSplitSuggestion[] {
  const buckets = new Map<string, { amount: number; items: ReceiptSplitItem[] }>();

  for (const item of lineItems) {
    const bucket = buckets.get(item.category) ?? { amount: 0, items: [] };
    bucket.amount += item.amount;
    bucket.items.push({ name: item.name, amount: item.amount });
    buckets.set(item.category, bucket);
  }

  return Array.from(buckets.entries()).map(([category, bucket]) => ({
    category,
    amount: roundMoney(bucket.amount),
    items: bucket.items,
  }));
}

export function flattenSplitsToLineItems(splits: ReceiptSplitSuggestion[]): ReceiptLineItem[] {
  const lineItems: ReceiptLineItem[] = [];

  for (const split of splits) {
    if (split.items?.length) {
      for (const item of split.items) {
        lineItems.push({
          name: item.name,
          amount: item.amount > 0 ? item.amount : 0,
          category: split.category,
        });
      }
      continue;
    }

    lineItems.push({
      name: split.category,
      amount: split.amount,
      category: split.category,
    });
  }

  return lineItems;
}

export function moveLineItemCategory(
  lineItems: ReceiptLineItem[],
  index: number,
  newCategory: string
): ReceiptLineItem[] {
  return lineItems.map((item, itemIndex) =>
    itemIndex === index ? { ...item, category: newCategory } : item
  );
}

export function normalizeReceiptLineItems(
  lineItems: ReceiptLineItem[] | undefined,
  allowedCategories: Set<string>,
  totalAmount: number
): ReceiptLineItem[] | undefined {
  if (!lineItems?.length) {
    return undefined;
  }

  const normalized = lineItems
    .map((item) => ({
      ...item,
      category: normalizeLegacyCategory(item.category),
    }))
    .filter((item) => allowedCategories.has(item.category) && item.amount > 0);

  if (!normalized.length) {
    return undefined;
  }

  if (!splitAmountsMatchTotal(normalized, totalAmount)) {
    return undefined;
  }

  return normalized;
}
