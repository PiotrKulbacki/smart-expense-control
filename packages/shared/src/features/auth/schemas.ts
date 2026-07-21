import { z } from 'zod';

export const AUTH_ERROR_CODES = {
  INVALID_EMAIL: 'auth.errors.invalidEmail',
  PASSWORD_REQUIRED: 'auth.errors.passwordRequired',
  PASSWORD_TOO_SHORT: 'auth.errors.passwordTooShort',
  PASSWORD_NEEDS_DIGIT: 'auth.errors.passwordNeedsDigit',
  PASSWORD_NEEDS_SPECIAL: 'auth.errors.passwordNeedsSpecial',
  PASSWORDS_MISMATCH: 'auth.errors.passwordsMismatch',
  CURRENT_PASSWORD_REQUIRED: 'auth.errors.currentPasswordRequired',
  INVALID_RESET_TOKEN: 'auth.errors.invalidResetToken',
  INVALID_VERIFICATION_TOKEN: 'auth.errors.invalidVerificationToken',
  NAME_TOO_SHORT: 'auth.errors.nameTooShort',
} as const;

const emailSchema = z
  .string()
  .min(1, AUTH_ERROR_CODES.INVALID_EMAIL)
  .email(AUTH_ERROR_CODES.INVALID_EMAIL);

export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, AUTH_ERROR_CODES.PASSWORD_TOO_SHORT)
  .regex(/\d/, AUTH_ERROR_CODES.PASSWORD_NEEDS_DIGIT)
  .regex(/[^A-Za-z0-9]/, AUTH_ERROR_CODES.PASSWORD_NEEDS_SPECIAL);

export type PasswordRequirements = {
  minLength: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
};

export function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasDigit: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

export function arePasswordRequirementsMet(password: string): boolean {
  const requirements = getPasswordRequirements(password);
  return requirements.minLength && requirements.hasDigit && requirements.hasSpecial;
}

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, AUTH_ERROR_CODES.PASSWORD_REQUIRED),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, AUTH_ERROR_CODES.PASSWORDS_MISMATCH),
    name: z.string().min(2, AUTH_ERROR_CODES.NAME_TOO_SHORT).max(100).optional(),
    locale: z.enum(['en', 'de', 'pl', 'es']).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_ERROR_CODES.PASSWORDS_MISMATCH,
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, AUTH_ERROR_CODES.CURRENT_PASSWORD_REQUIRED),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, AUTH_ERROR_CODES.PASSWORDS_MISMATCH),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: AUTH_ERROR_CODES.PASSWORDS_MISMATCH,
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  locale: z.enum(['en', 'de', 'pl', 'es']).optional(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, AUTH_ERROR_CODES.INVALID_RESET_TOKEN),
    password: passwordSchema,
    confirmPassword: z.string().min(1, AUTH_ERROR_CODES.PASSWORDS_MISMATCH),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_ERROR_CODES.PASSWORDS_MISMATCH,
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
