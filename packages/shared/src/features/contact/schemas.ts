import { z } from 'zod';

export const CONTACT_ERROR_CODES = {
  NAME_REQUIRED: 'contact.errors.nameRequired',
  INVALID_EMAIL: 'contact.errors.invalidEmail',
  MESSAGE_REQUIRED: 'contact.errors.messageRequired',
  MESSAGE_TOO_LONG: 'contact.errors.messageTooLong',
  SUBJECT_TOO_LONG: 'contact.errors.subjectTooLong',
} as const;

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, CONTACT_ERROR_CODES.NAME_REQUIRED).max(100),
  email: z
    .string()
    .trim()
    .min(1, CONTACT_ERROR_CODES.INVALID_EMAIL)
    .email(CONTACT_ERROR_CODES.INVALID_EMAIL),
  subject: z.string().trim().max(120, CONTACT_ERROR_CODES.SUBJECT_TOO_LONG).optional(),
  message: z
    .string()
    .trim()
    .min(10, CONTACT_ERROR_CODES.MESSAGE_REQUIRED)
    .max(5000, CONTACT_ERROR_CODES.MESSAGE_TOO_LONG),
  /** Honeypot — ignored by humans; non-empty values are discarded server-side. */
  website: z.string().optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
