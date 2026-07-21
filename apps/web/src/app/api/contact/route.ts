import { NextResponse } from 'next/server';
import { contactFormSchema } from '@shared/features/contact/schemas';
import { jsonError } from '@web/features/auth/services/auth.service';
import { sendContactFormEmail } from '@web/features/contact/services/contact.service';
import { checkContactRateLimit } from '@web/lib/rate-limit';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

export async function POST(request: Request) {
  try {
    const rateLimit = await checkContactRateLimit(request);
    if (!rateLimit.allowed) {
      return jsonError(RATE_LIMIT_ERROR, 429);
    }

    const body = (await request.json()) as unknown;
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'contact.errors.generic';
      return jsonError(firstError, 400);
    }

    // Honeypot: pretend success so bots do not learn the field is filtered.
    if (parsed.data.website?.trim()) {
      return NextResponse.json({ ok: true });
    }

    const result = await sendContactFormEmail(parsed.data);
    if (!result.ok) {
      return jsonError(result.error, 503);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError('contact.errors.generic', 500);
  }
}
