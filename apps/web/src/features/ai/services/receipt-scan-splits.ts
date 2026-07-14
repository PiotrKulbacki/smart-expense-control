import { normalizeLegacyCategory } from '@shared/features/transactions/categories';
import {
  groupLineItemsToSplits,
  type ReceiptLineItem,
} from '@shared/features/transactions/receipt-split-state';
import {
  splitAmountsMatchTotal,
  type ReceiptSplitSuggestion,
} from '@shared/features/transactions/schemas';

export function normalizeReceiptSuggestedSplits(
  suggestedSplits: ReceiptSplitSuggestion[] | undefined,
  allowedCategories: Set<string>,
  totalAmount: number
): ReceiptSplitSuggestion[] | undefined {
  if (!suggestedSplits?.length) {
    return undefined;
  }

  const normalized = suggestedSplits
    .map((split) => ({
      ...split,
      category: normalizeLegacyCategory(split.category),
      items: split.items?.map((item) => ({
        name: item.name,
        amount: item.amount,
      })),
    }))
    .filter((split) => allowedCategories.has(split.category));

  if (normalized.length <= 1) {
    return undefined;
  }

  if (!splitAmountsMatchTotal(normalized, totalAmount)) {
    return undefined;
  }

  return normalized;
}

export function resolveReceiptSplitDraft(
  input: {
    lineItems?: ReceiptLineItem[];
    suggestedSplits?: ReceiptSplitSuggestion[];
    amount: number;
  },
  allowedCategories: Set<string>
): {
  lineItems?: ReceiptLineItem[];
  suggestedSplits?: ReceiptSplitSuggestion[];
} {
  const normalizedLineItems = input.lineItems
    ?.map((item) => ({
      ...item,
      category: normalizeLegacyCategory(item.category),
    }))
    .filter((item) => allowedCategories.has(item.category) && item.amount > 0);

  if (normalizedLineItems?.length && splitAmountsMatchTotal(normalizedLineItems, input.amount)) {
    const splitsFromLines = groupLineItemsToSplits(normalizedLineItems);
    const normalizedSplits = normalizeReceiptSuggestedSplits(
      splitsFromLines,
      allowedCategories,
      input.amount
    );

    if (normalizedSplits) {
      return {
        lineItems: normalizedLineItems,
        suggestedSplits: normalizedSplits,
      };
    }
  }

  const normalizedSplits = normalizeReceiptSuggestedSplits(
    input.suggestedSplits,
    allowedCategories,
    input.amount
  );

  if (!normalizedSplits) {
    return {};
  }

  return { suggestedSplits: normalizedSplits };
}
