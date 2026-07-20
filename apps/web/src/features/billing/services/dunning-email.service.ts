import { createBillingPortalSession } from '@web/features/billing/services/stripe-checkout.service';
import { sendTransactionalEmail } from '@web/features/email/services/resend.service';
import { env } from '@web/env';
import { captureServerException } from '@web/lib/sentry-server';

type DunningEmailKind = 'first' | 'reminder';

function buildDunningCopy(kind: DunningEmailKind, portalUrl: string) {
  if (kind === 'first') {
    return {
      subject: 'Payment failed — update your card within 24 hours',
      text: [
        'We could not renew your Lyamo subscription.',
        'Please update your payment method within 24 hours to keep Pro/Premium access.',
        `Update billing: ${portalUrl}`,
        'If payment succeeds within this window, your plan stays unchanged.',
      ].join('\n\n'),
      html: `
        <p>We could not renew your <strong>Lyamo</strong> subscription.</p>
        <p>Please update your payment method within <strong>24 hours</strong> to keep Pro/Premium access.</p>
        <p><a href="${portalUrl}">Update billing details</a></p>
        <p>If payment succeeds within this window, your plan stays unchanged.</p>
      `,
    };
  }

  return {
    subject: 'Final reminder — subscription ends in a few hours',
    text: [
      'This is a final reminder: your Lyamo payment is still failing.',
      'Update your card in the next few hours or your account will be moved to the Free plan.',
      `Update billing: ${portalUrl}`,
    ].join('\n\n'),
    html: `
      <p>This is a <strong>final reminder</strong>: your Lyamo payment is still failing.</p>
      <p>Update your card in the next few hours or your account will be moved to the <strong>Free</strong> plan.</p>
      <p><a href="${portalUrl}">Update billing details</a></p>
    `,
  };
}

export async function sendPastDueDunningEmail(params: {
  email: string;
  stripeCustomerId: string;
  kind: DunningEmailKind;
}): Promise<boolean> {
  try {
    const portal = await createBillingPortalSession(params.stripeCustomerId);
    const portalUrl = 'url' in portal ? portal.url : `${env.NEXT_PUBLIC_APP_URL}/settings`;
    const copy = buildDunningCopy(params.kind, portalUrl);
    const result = await sendTransactionalEmail({
      to: params.email,
      subject: copy.subject,
      html: copy.html,
      text: copy.text,
    });

    return result.ok;
  } catch (error) {
    captureServerException(error, {
      scope: 'billing.dunning.email',
      kind: params.kind,
      email: params.email,
    });
    return false;
  }
}
