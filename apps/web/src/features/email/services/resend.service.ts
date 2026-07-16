import { Resend } from 'resend';
import { env } from '@web/env';
import { captureServerException } from '@web/lib/sentry-server';

let resendClient: Resend | null | undefined;

function getResendClient(): Resend | null {
  if (resendClient !== undefined) {
    return resendClient;
  }

  if (!env.RESEND_API_KEY) {
    resendClient = null;
    return null;
  }

  resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

function getFromEmail(): string | null {
  const from = env.RESEND_FROM_EMAIL?.trim();
  return from || null;
}

export function isResendConfigured(): boolean {
  return Boolean(getResendClient() && getFromEmail());
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResendClient();
  const from = getFromEmail();

  if (!resend || !from) {
    return { ok: false, error: 'email.errors.notConfigured' };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      captureServerException(error, { scope: 'email.resend.send', to: params.to });
      return { ok: false, error: 'email.errors.sendFailed' };
    }

    return { ok: true };
  } catch (error) {
    captureServerException(error, { scope: 'email.resend.send', to: params.to });
    return { ok: false, error: 'email.errors.sendFailed' };
  }
}
