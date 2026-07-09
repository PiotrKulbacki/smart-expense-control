import { z } from 'zod';

export const AUTH_ERROR_CODES = {
  INVALID_EMAIL: 'auth.errors.invalidEmail',
  PASSWORD_TOO_SHORT: 'auth.errors.passwordTooShort',
  PASSWORD_NEEDS_DIGIT: 'auth.errors.passwordNeedsDigit',
  PASSWORD_NEEDS_SPECIAL: 'auth.errors.passwordNeedsSpecial',
  PASSWORDS_MISMATCH: 'auth.errors.passwordsMismatch',
  NAME_TOO_SHORT: 'auth.errors.nameTooShort',
} as const;

const emailSchema = z
  .string()
  .min(1, AUTH_ERROR_CODES.INVALID_EMAIL)
  .email(AUTH_ERROR_CODES.INVALID_EMAIL);

export const passwordSchema = z
  .string()
  .min(8, AUTH_ERROR_CODES.PASSWORD_TOO_SHORT)
  .regex(/\d/, AUTH_ERROR_CODES.PASSWORD_NEEDS_DIGIT)
  .regex(/[^A-Za-z0-9]/, AUTH_ERROR_CODES.PASSWORD_NEEDS_SPECIAL);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, AUTH_ERROR_CODES.PASSWORDS_MISMATCH),
    name: z.string().min(2, AUTH_ERROR_CODES.NAME_TOO_SHORT).max(100).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_ERROR_CODES.PASSWORDS_MISMATCH,
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
