import { NextResponse } from 'next/server';
import { isLocale, type Locale } from '@shared/features/i18n';
import { INSIGHT_ERROR_CODES } from '@shared/features/ai/schemas';
import { getAuthenticatedUser } from '@web/features/auth/lib/request-auth';
import { jsonError } from '@web/features/auth/services/auth.service';
import { getDashboardInsight } from '@web/features/dashboard/services/ai-insights.service';
import { checkAiRateLimit } from '@web/lib/rate-limit';
import { requireAiEnabled } from '@web/lib/require-ai-enabled';

const RATE_LIMIT_ERROR = 'api.errors.rateLimitExceeded';

export async function GET(request: Request) {
  try {
    const aiDisabled = requireAiEnabled();
    if (aiDisabled) {
      return aiDisabled;
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return jsonError('auth.errors.unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh =
      searchParams.get('force') === 'true' || searchParams.get('refresh') === 'true';
    const localeParam = searchParams.get('locale');
    const locale: Locale = localeParam && isLocale(localeParam) ? localeParam : 'en';

    if (forceRefresh) {
      const rateLimit = await checkAiRateLimit(request, 'chat', user.id);
      if (!rateLimit.allowed) {
        return jsonError(RATE_LIMIT_ERROR, 429);
      }
    }

    const result = await getDashboardInsight(user.id, { locale, forceRefresh });

    if ('error' in result) {
      return jsonError(result.error, 422);
    }

    return NextResponse.json(result);
  } catch {
    return jsonError(INSIGHT_ERROR_CODES.AI_FAILED, 500);
  }
}
