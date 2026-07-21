import type { ContactFormInput } from '@shared/features/contact/schemas';
import { env } from '@web/env';
import {
  getDefaultSenderEmail,
  isEmailConfigured,
  sendTransactionalEmail,
} from '@web/features/email/services/brevo.service';
import { buildContactFormEmail } from '@web/features/email/templates/contact-form';

function getContactInbox(): string | null {
  const configured = env.CONTACT_INBOX_EMAIL?.trim();
  if (configured) {
    return configured;
  }
  return getDefaultSenderEmail();
}

export async function sendContactFormEmail(
  input: ContactFormInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: 'email.errors.notConfigured' };
  }

  const inbox = getContactInbox();
  if (!inbox) {
    return { ok: false, error: 'email.errors.notConfigured' };
  }

  const copy = buildContactFormEmail({
    name: input.name,
    email: input.email,
    subject: input.subject ?? '',
    message: input.message,
    locale: input.locale,
  });

  return sendTransactionalEmail({
    to: inbox,
    subject: copy.subject,
    html: copy.html,
    text: copy.text,
    replyTo: {
      email: input.email,
      name: input.name,
    },
  });
}
