import { normalizeLegacyCategory } from '@shared/features/transactions/categories';
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
