import { z } from 'zod';

export const TRANSACTION_ERROR_CODES = {
  INVALID_AMOUNT: 'transactions.errors.invalidAmount',
  INVALID_CATEGORY: 'transactions.errors.invalidCategory',
  INVALID_DATE: 'transactions.errors.invalidDate',
  INVALID_DESCRIPTION: 'transactions.errors.invalidDescription',
} as const;

const currencyEnum = z.enum(['PLN', 'EUR', 'GBP']);

const transactionBaseSchema = z.object({
  amount: z
    .number({ invalid_type_error: TRANSACTION_ERROR_CODES.INVALID_AMOUNT })
    .positive(TRANSACTION_ERROR_CODES.INVALID_AMOUNT)
    .max(999_999_999.99, TRANSACTION_ERROR_CODES.INVALID_AMOUNT),
  currency: currencyEnum,
  category: z
    .string()
    .min(1, TRANSACTION_ERROR_CODES.INVALID_CATEGORY)
    .max(100, TRANSACTION_ERROR_CODES.INVALID_CATEGORY),
  description: z.string().max(500, TRANSACTION_ERROR_CODES.INVALID_DESCRIPTION).optional(),
  date: z.coerce.date({ invalid_type_error: TRANSACTION_ERROR_CODES.INVALID_DATE }),
  isAiScanned: z.boolean().optional().default(false),
});

export const createTransactionSchema = transactionBaseSchema;

export const updateTransactionSchema = transactionBaseSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: TRANSACTION_ERROR_CODES.INVALID_AMOUNT },
);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CurrencyCode = z.infer<typeof currencyEnum>;
