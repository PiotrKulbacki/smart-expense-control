import { sendTransactionalEmail } from '@web/features/email/services/brevo.service';
import { buildResetPasswordEmail } from '@web/features/email/templates/reset-password';
import { buildVerifyEmail } from '@web/features/email/templates/verify-email';
import { captureServerException } from '@web/lib/sentry-server';

export async function sendPasswordResetEmail(params: {
  email: string;
  token: string;
  locale?: string | null;
  name?: string | null;
}): Promise<boolean> {
  try {
    const copy = buildResetPasswordEmail({
      token: params.token,
      locale: params.locale,
      name: params.name,
    });
    const result = await sendTransactionalEmail({
      to: params.email,
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
    });

    return result.ok;
  } catch (error) {
    captureServerException(error, { scope: 'auth.email.passwordReset', email: params.email });
    return false;
  }
}

export async function sendEmailVerificationEmail(params: {
  email: string;
  token: string;
  locale?: string | null;
  name?: string | null;
}): Promise<boolean> {
  try {
    const copy = buildVerifyEmail({
      token: params.token,
      locale: params.locale,
      name: params.name,
    });
    const result = await sendTransactionalEmail({
      to: params.email,
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
    });

    return result.ok;
  } catch (error) {
    captureServerException(error, {
      scope: 'auth.email.emailVerification',
      email: params.email,
    });
    return false;
  }
}
