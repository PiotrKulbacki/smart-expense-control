import { z } from 'zod';
import { FINANCIAL_MONTH_DAY_MAX, FINANCIAL_MONTH_DAY_MIN } from '../billing/financial-month';

export const USER_ERROR_CODES = {
  INVALID_NAME: 'settings.errors.invalidName',
  INVALID_CURRENCY: 'settings.errors.invalidCurrency',
  INVALID_FINANCIAL_DAY: 'settings.errors.invalidFinancialDay',
  INVALID_BUDGET: 'settings.errors.invalidBudget',
  DELETE_FAILED: 'settings.errors.deleteFailed',
  UPDATE_FAILED: 'settings.errors.updateFailed',
} as const;

const currencyEnum = z.enum(['PLN', 'EUR', 'GBP']);

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .min(2, USER_ERROR_CODES.INVALID_NAME)
      .max(100, USER_ERROR_CODES.INVALID_NAME)
      .optional(),
    primaryCurrency: currencyEnum.optional(),
    financialMonthStartDay: z
      .number({ invalid_type_error: USER_ERROR_CODES.INVALID_FINANCIAL_DAY })
      .int(USER_ERROR_CODES.INVALID_FINANCIAL_DAY)
      .min(FINANCIAL_MONTH_DAY_MIN, USER_ERROR_CODES.INVALID_FINANCIAL_DAY)
      .max(FINANCIAL_MONTH_DAY_MAX, USER_ERROR_CODES.INVALID_FINANCIAL_DAY)
      .optional(),
    defaultMonthlyBudget: z
      .number({ invalid_type_error: USER_ERROR_CODES.INVALID_BUDGET })
      .positive(USER_ERROR_CODES.INVALID_BUDGET)
      .max(999_999_999.99, USER_ERROR_CODES.INVALID_BUDGET)
      .nullable()
      .optional(),
    currentMonthBudget: z
      .number({ invalid_type_error: USER_ERROR_CODES.INVALID_BUDGET })
      .positive(USER_ERROR_CODES.INVALID_BUDGET)
      .max(999_999_999.99, USER_ERROR_CODES.INVALID_BUDGET)
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: USER_ERROR_CODES.UPDATE_FAILED,
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
