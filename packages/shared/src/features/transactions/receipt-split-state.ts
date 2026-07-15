import { normalizeLegacyCategory } from './categories';
import { SPLIT_AMOUNT_TOLERANCE, type ReceiptSplitSuggestion } from './schemas';

export type ReceiptSplitItem = {
  name: string;
  amount: number;
};

export type ReceiptLineItem = {
  name: string;
  amount: number;
  category: string;
};

/** Slightly wider tolerance when accepting AI OCR line items before user review. */
export const RECEIPT_LINE_ITEM_SUM_TOLERANCE = 0.05;

const RECEIPT_DISCOUNT_LINE_PATTERN =
  /rabatt|preisvorteil|preisnachlass|coupon|discount|rückvergütung|gutschein|lidl plus|aktionspreis|ersparnis|nachlass|sofortrabatt/i;

export function isReceiptDiscountLine(item: Pick<ReceiptLineItem, 'name' | 'amount'>): boolean {
  if (item.amount < 0) {
    return true;
  }

  return item.amount > 0 && RECEIPT_DISCOUNT_LINE_PATTERN.test(item.name);
}

/** Applies discount/Rabatt lines to the immediately preceding product line (common on DE receipts). */
export function netReceiptLineDiscounts(lineItems: ReceiptLineItem[]): ReceiptLineItem[] {
  const netted: ReceiptLineItem[] = [];

  for (const item of lineItems) {
    if (isReceiptDiscountLine(item)) {
      const discountAmount = roundMoney(-Math.abs(item.amount));
      const target = netted[netted.length - 1];

      if (target) {
        target.amount = roundMoney(target.amount + discountAmount);
      }

      continue;
    }

    netted.push({
      ...item,
      amount: roundMoney(item.amount),
    });
  }

  return netted.filter((item) => item.amount > 0);
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function sumLineItemAmounts(items: Array<{ amount: number }>): number {
  return roundMoney(items.reduce((total, item) => total + item.amount, 0));
}

export function rebalanceAmountsToTotal<T extends { amount: number }>(
  items: T[],
  totalAmount: number
): T[] {
  if (items.length === 0) {
    return items;
  }

  const cloned = items.map((item) => ({ ...item, amount: roundMoney(item.amount) }));
  const currentTotal = sumLineItemAmounts(cloned);
  const difference = roundMoney(totalAmount - currentTotal);

  if (Math.abs(difference) <= SPLIT_AMOUNT_TOLERANCE) {
    return cloned;
  }

  const lastIndex = cloned.length - 1;
  const lastItem = cloned[lastIndex];
  if (!lastItem) {
    return cloned;
  }

  const adjustedAmount = roundMoney(lastItem.amount + difference);
  if (adjustedAmount > 0) {
    cloned[lastIndex] = { ...lastItem, amount: adjustedAmount };
  }

  return cloned;
}

export function groupLineItemsToSplits(lineItems: ReceiptLineItem[]): ReceiptSplitSuggestion[] {
  const buckets = new Map<string, { amount: number; items: ReceiptSplitItem[] }>();

  for (const item of lineItems) {
    const bucket = buckets.get(item.category) ?? { amount: 0, items: [] };
    bucket.amount += item.amount;
    bucket.items.push({ name: item.name, amount: item.amount });
    buckets.set(item.category, bucket);
  }

  const splits = Array.from(buckets.entries()).map(([category, bucket]) => ({
    category,
    amount: roundMoney(bucket.amount),
    items: bucket.items,
  }));

  return rebalanceAmountsToTotal(splits, sumLineItemAmounts(lineItems));
}

export function flattenSplitsToLineItems(splits: ReceiptSplitSuggestion[]): ReceiptLineItem[] {
  const lineItems: ReceiptLineItem[] = [];

  for (const split of splits) {
    if (split.items?.length) {
      const pricedItems = split.items.filter((item) => item.amount > 0);

      if (pricedItems.length === 0 && split.amount > 0) {
        const evenAmount = roundMoney(split.amount / split.items.length);
        let allocated = 0;

        split.items.forEach((item, index) => {
          const amount =
            index === split.items!.length - 1 ? roundMoney(split.amount - allocated) : evenAmount;
          allocated = roundMoney(allocated + amount);
          lineItems.push({
            name: item.name,
            amount,
            category: split.category,
          });
        });
        continue;
      }

      for (const item of pricedItems.length > 0 ? pricedItems : split.items) {
        if (item.amount <= 0) {
          continue;
        }

        lineItems.push({
          name: item.name,
          amount: item.amount,
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

  const categorized = lineItems
    .map((item) => ({
      ...item,
      category: normalizeLegacyCategory(item.category),
    }))
    .filter((item) => allowedCategories.has(item.category));

  if (!categorized.length) {
    return undefined;
  }

  const netted = netReceiptLineDiscounts(categorized);

  if (!netted.length) {
    return undefined;
  }

  const currentTotal = sumLineItemAmounts(netted);
  const difference = roundMoney(totalAmount - currentTotal);

  if (Math.abs(difference) <= RECEIPT_LINE_ITEM_SUM_TOLERANCE) {
    return rebalanceAmountsToTotal(netted, totalAmount);
  }

  return netted;
}

export function countDistinctCategories(lineItems: ReceiptLineItem[]): number {
  return new Set(lineItems.map((item) => item.category)).size;
}
