import {
  Car,
  CircleEllipsis,
  Coffee,
  Film,
  HeartPulse,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  FIXED_COSTS_CATEGORY,
  FIXED_COSTS_CHART_COLOR,
  FIXED_COSTS_I18N_KEY,
} from '@shared/features/transactions/fixed-costs';
import type { TransactionCategory } from '@shared/features/transactions/schemas';

export const CATEGORY_I18N_KEYS: Record<TransactionCategory, string> = {
  Groceries: 'transactions.categories.groceries',
  Transport: 'transactions.categories.transport',
  Coffee: 'transactions.categories.coffee',
  Restaurants: 'transactions.categories.restaurants',
  Entertainment: 'transactions.categories.entertainment',
  Shopping: 'transactions.categories.shopping',
  Utilities: 'transactions.categories.utilities',
  Health: 'transactions.categories.health',
  Other: 'transactions.categories.other',
};

export const CATEGORY_ICONS: Record<TransactionCategory, LucideIcon> = {
  Groceries: ShoppingCart,
  Transport: Car,
  Coffee: Coffee,
  Restaurants: Utensils,
  Entertainment: Film,
  Shopping: ShoppingBag,
  Utilities: Zap,
  Health: HeartPulse,
  Other: CircleEllipsis,
};

export const CATEGORY_CHART_COLORS: Record<TransactionCategory, string> = {
  Groceries: '#16a34a',
  Transport: '#2563eb',
  Coffee: '#d97706',
  Restaurants: '#ea580c',
  Entertainment: '#9333ea',
  Shopping: '#db2777',
  Utilities: '#64748b',
  Health: '#dc2626',
  Other: '#9ca3af',
};

export const CATEGORY_ICON_STYLES: Record<TransactionCategory, { bg: string; text: string }> = {
  Groceries: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  Transport: { bg: 'bg-blue-50', text: 'text-blue-600' },
  Coffee: { bg: 'bg-amber-50', text: 'text-amber-600' },
  Restaurants: { bg: 'bg-orange-50', text: 'text-orange-600' },
  Entertainment: { bg: 'bg-purple-50', text: 'text-purple-600' },
  Shopping: { bg: 'bg-pink-50', text: 'text-pink-600' },
  Utilities: { bg: 'bg-slate-100', text: 'text-slate-600' },
  Health: { bg: 'bg-red-50', text: 'text-red-600' },
  Other: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function isTransactionCategory(value: string): value is TransactionCategory {
  return value in CATEGORY_I18N_KEYS;
}

export function getCategoryIcon(category: string): LucideIcon {
  if (isTransactionCategory(category)) {
    return CATEGORY_ICONS[category];
  }

  return CircleEllipsis;
}

export function getCategoryColor(category: string): string {
  if (category === FIXED_COSTS_CATEGORY) {
    return FIXED_COSTS_CHART_COLOR;
  }

  if (isTransactionCategory(category)) {
    return CATEGORY_CHART_COLORS[category];
  }

  return '#9ca3af';
}

export function getCategoryLabelKey(category: string): string {
  if (category === FIXED_COSTS_CATEGORY) {
    return FIXED_COSTS_I18N_KEY;
  }

  if (isTransactionCategory(category)) {
    return CATEGORY_I18N_KEYS[category];
  }

  return category;
}

export function getCategoryIconStyles(category: string): { bg: string; text: string } {
  if (isTransactionCategory(category)) {
    return CATEGORY_ICON_STYLES[category];
  }

  return CATEGORY_ICON_STYLES.Other;
}
