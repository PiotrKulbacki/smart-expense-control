import { normalizeLegacyCategory } from '@shared/features/transactions/categories';
import {
  countDistinctCategories,
  flattenSplitsToLineItems,
  groupLineItemsToSplits,
  normalizeReceiptLineItems,
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
    .filter((split) => allowedCategories.has(split.category) && split.amount > 0);

  if (normalized.length <= 1) {
    return undefined;
  }

  if (!splitAmountsMatchTotal(normalized, totalAmount)) {
    return undefined;
  }

  return normalized;
}

function buildSplitDraftFromLineItems(
  lineItems: ReceiptLineItem[],
  allowedCategories: Set<string>,
  totalAmount: number
): {
  lineItems: ReceiptLineItem[];
  suggestedSplits: ReceiptSplitSuggestion[];
} | null {
  if (lineItems.length < 2) {
    return null;
  }

  const splitsFromLines = groupLineItemsToSplits(lineItems);
  const normalizedSplits = normalizeReceiptSuggestedSplits(
    splitsFromLines,
    allowedCategories,
    totalAmount
  );

  if (normalizedSplits) {
    return {
      lineItems,
      suggestedSplits: normalizedSplits,
    };
  }

  if (countDistinctCategories(lineItems) >= 2) {
    return {
      lineItems,
      suggestedSplits: splitsFromLines,
    };
  }

  return null;
}

function buildSplitDraftFromSuggestedSplits(
  suggestedSplits: ReceiptSplitSuggestion[],
  allowedCategories: Set<string>,
  totalAmount: number
): {
  lineItems?: ReceiptLineItem[];
  suggestedSplits: ReceiptSplitSuggestion[];
} | null {
  const normalizedSplits = normalizeReceiptSuggestedSplits(
    suggestedSplits,
    allowedCategories,
    totalAmount
  );

  if (!normalizedSplits) {
    return null;
  }

  const lineItems = flattenSplitsToLineItems(normalizedSplits);

  return {
    lineItems: lineItems.length >= 2 ? lineItems : undefined,
    suggestedSplits: normalizedSplits,
  };
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
  const normalizedLineItems = normalizeReceiptLineItems(
    input.lineItems,
    allowedCategories,
    input.amount
  );

  if (normalizedLineItems?.length) {
    const fromLineItems = buildSplitDraftFromLineItems(
      normalizedLineItems,
      allowedCategories,
      input.amount
    );
    if (fromLineItems) {
      return fromLineItems;
    }
  }

  if (input.suggestedSplits?.length) {
    const fromSuggested = buildSplitDraftFromSuggestedSplits(
      input.suggestedSplits,
      allowedCategories,
      input.amount
    );
    if (fromSuggested) {
      return fromSuggested;
    }
  }

  if (normalizedLineItems && normalizedLineItems.length >= 2) {
    const splitsFromLines = groupLineItemsToSplits(normalizedLineItems);
    if (splitsFromLines.length >= 2) {
      return {
        lineItems: normalizedLineItems,
        suggestedSplits: splitsFromLines,
      };
    }
  }

  return {};
}
