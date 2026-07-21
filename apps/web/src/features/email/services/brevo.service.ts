import { env } from '@web/env';
import { captureServerException } from '@web/lib/sentry-server';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

type ParsedSender = {
  name: string;
  email: string;
};

function parseFromAddress(from: string): ParsedSender | null {
  const trimmed = from.trim();
  const angled = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
  if (angled) {
    const email = angled[2]?.trim();
    if (!email) {
      return null;
    }
    return {
      name: angled[1]?.trim() || 'Lyamo',
      email,
    };
  }

  if (trimmed.includes('@')) {
    return { name: 'Lyamo', email: trimmed };
  }

  return null;
}

function getApiKey(): string | null {
  return env.BREVO_API_KEY?.trim() || null;
}

function getSender(): ParsedSender | null {
  const from = env.BREVO_FROM_EMAIL?.trim();
  if (!from) {
    return null;
  }
  return parseFromAddress(from);
}

export function isEmailConfigured(): boolean {
  return Boolean(getApiKey() && getSender());
}

export function getDefaultSenderEmail(): string | null {
  return getSender()?.email ?? null;
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: { email: string; name?: string };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = getApiKey();
  const sender = getSender();

  if (!apiKey || !sender) {
    return { ok: false, error: 'email.errors.notConfigured' };
  }

  try {
    const response = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: sender.name,
          email: sender.email,
        },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
        textContent: params.text,
        ...(params.replyTo
          ? {
              replyTo: {
                email: params.replyTo.email,
                ...(params.replyTo.name ? { name: params.replyTo.name } : {}),
              },
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      captureServerException(new Error(`Brevo send failed: ${response.status}`), {
        scope: 'email.brevo.send',
        to: params.to,
        status: response.status,
        body: body.slice(0, 500),
      });
      return { ok: false, error: 'email.errors.sendFailed' };
    }

    return { ok: true };
  } catch (error) {
    captureServerException(error, { scope: 'email.brevo.send', to: params.to });
    return { ok: false, error: 'email.errors.sendFailed' };
  }
}
