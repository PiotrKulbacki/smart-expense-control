import { sendTransactionalEmail } from '@web/features/email/services/brevo.service';
import { env } from '@web/env';
import { captureServerException } from '@web/lib/sentry-server';

export async function sendPasswordResetEmail(params: {
  email: string;
  token: string;
}): Promise<boolean> {
  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${encodeURIComponent(params.token)}`;

  try {
    const result = await sendTransactionalEmail({
      to: params.email,
      subject: 'Reset your Lyamo password',
      text: [
        'You requested a password reset for your Lyamo account.',
        `Open this link to set a new password (valid for 1 hour): ${resetUrl}`,
        'If you did not request this, you can ignore this email.',
      ].join('\n\n'),
      html: `
        <p>You requested a password reset for your <strong>Lyamo</strong> account.</p>
        <p><a href="${resetUrl}">Set a new password</a> (link valid for 1 hour).</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
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
}): Promise<boolean> {
  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${encodeURIComponent(params.token)}`;

  try {
    const result = await sendTransactionalEmail({
      to: params.email,
      subject: 'Verify your Lyamo email',
      text: [
        'Welcome to Lyamo. Please verify your email to activate your account.',
        `Open this link (valid for 24 hours): ${verifyUrl}`,
        'If you did not create an account, you can ignore this email.',
      ].join('\n\n'),
      html: `
        <p>Welcome to <strong>Lyamo</strong>. Please verify your email to activate your account.</p>
        <p><a href="${verifyUrl}">Verify email</a> (link valid for 24 hours).</p>
        <p>If you did not create an account, you can ignore this email.</p>
      `,
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
