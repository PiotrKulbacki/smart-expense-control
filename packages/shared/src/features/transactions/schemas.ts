import { z } from 'zod';

export const TRANSACTION_ERROR_CODES = {
  INVALID_AMOUNT: 'transactions.errors.invalidAmount',
  INVALID_CATEGORY: 'transactions.errors.invalidCategory',
  INVALID_DATE: 'transactions.errors.invalidDate',
  INVALID_DESCRIPTION: 'transactions.errors.invalidDescription',
  NOT_FOUND: 'transactions.errors.notFound',
  FORBIDDEN: 'transactions.errors.forbidden',
} as const;

export const RECURRING_EXPENSE_ERROR_CODES = {
  INVALID_AMOUNT: 'recurring.errors.invalidAmount',
  INVALID_CATEGORY: 'recurring.errors.invalidCategory',
  INVALID_FREQUENCY: 'recurring.errors.invalidFrequency',
  INVALID_NEXT_DUE_DATE: 'recurring.errors.invalidNextDueDate',
  NOT_FOUND: 'recurring.errors.notFound',
  FORBIDDEN: 'recurring.errors.forbidden',
} as const;

export const RECEIPT_SCAN_ERROR_CODES = {
  INVALID_FILE: 'scanner.errors.invalidFile',
  FILE_TOO_LARGE: 'scanner.errors.fileTooLarge',
  UNREADABLE: 'scanner.errors.unreadable',
  QUOTA_EXCEEDED: 'scanner.errors.quotaExceeded',
  MONTHLY_LIMIT_REACHED: 'scanner.errors.monthlyLimitReached',
  AI_FAILED: 'scanner.errors.aiFailed',
  PARSE_FAILED: 'scanner.errors.parseFailed',
} as const;

export const TRANSACTION_CATEGORIES = [
  'Groceries',
  'Transport',
  'Coffee',
  'Restaurants',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Health',
  'Other',
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

const currencyEnum = z.enum(['PLN', 'EUR', 'GBP']);

const transactionBaseSchema = z.object({
  amount: z
    .number({ invalid_type_error: TRANSACTION_ERROR_CODES.INVALID_AMOUNT })
    .positive(TRANSACTION_ERROR_CODES.INVALID_AMOUNT)
    .max(999_999_999.99, TRANSACTION_ERROR_CODES.INVALID_AMOUNT),
  currency: currencyEnum,
  category: z.enum(TRANSACTION_CATEGORIES, {
    errorMap: () => ({ message: TRANSACTION_ERROR_CODES.INVALID_CATEGORY }),
  }),
  description: z.string().max(500, TRANSACTION_ERROR_CODES.INVALID_DESCRIPTION).optional(),
  date: z.coerce.date({ invalid_type_error: TRANSACTION_ERROR_CODES.INVALID_DATE }),
  isAiScanned: z.boolean().optional().default(false),
});

export const createTransactionSchema = transactionBaseSchema;

export const transactionFormSchema = transactionBaseSchema
  .omit({ date: true, isAiScanned: true })
  .extend({
    date: z.string().min(1, TRANSACTION_ERROR_CODES.INVALID_DATE),
  });

export const updateTransactionSchema = transactionBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: TRANSACTION_ERROR_CODES.INVALID_AMOUNT,
  });

export const receiptScanResultSchema = z.object({
  amount: z
    .number({ invalid_type_error: TRANSACTION_ERROR_CODES.INVALID_AMOUNT })
    .positive(TRANSACTION_ERROR_CODES.INVALID_AMOUNT)
    .max(999_999_999.99, TRANSACTION_ERROR_CODES.INVALID_AMOUNT),
  currency: currencyEnum,
  category: z.enum(TRANSACTION_CATEGORIES, {
    errorMap: () => ({ message: TRANSACTION_ERROR_CODES.INVALID_CATEGORY }),
  }),
  description: z.string().max(500, TRANSACTION_ERROR_CODES.INVALID_DESCRIPTION).optional(),
  date: z.coerce.date({ invalid_type_error: TRANSACTION_ERROR_CODES.INVALID_DATE }),
  needsManualReview: z.boolean().default(false),
});

const frequencyEnum = z.enum(['MONTHLY', 'YEARLY']);

export const createRecurringExpenseSchema = z.object({
  amount: z
    .number({ invalid_type_error: RECURRING_EXPENSE_ERROR_CODES.INVALID_AMOUNT })
    .positive(RECURRING_EXPENSE_ERROR_CODES.INVALID_AMOUNT)
    .max(999_999_999.99, RECURRING_EXPENSE_ERROR_CODES.INVALID_AMOUNT),
  currency: currencyEnum,
  category: z
    .string()
    .min(1, RECURRING_EXPENSE_ERROR_CODES.INVALID_CATEGORY)
    .max(100, RECURRING_EXPENSE_ERROR_CODES.INVALID_CATEGORY),
  frequency: frequencyEnum,
  nextDueDate: z.coerce.date({
    invalid_type_error: RECURRING_EXPENSE_ERROR_CODES.INVALID_NEXT_DUE_DATE,
  }),
  isActive: z.boolean().optional().default(true),
});

export const updateRecurringExpenseSchema = createRecurringExpenseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: RECURRING_EXPENSE_ERROR_CODES.INVALID_AMOUNT,
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ReceiptScanResult = z.infer<typeof receiptScanResultSchema>;
export type CreateRecurringExpenseInput = z.infer<typeof createRecurringExpenseSchema>;
export type UpdateRecurringExpenseInput = z.infer<typeof updateRecurringExpenseSchema>;
export type CurrencyCode = z.infer<typeof currencyEnum>;
