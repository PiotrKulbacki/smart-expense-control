import { jsonError } from '@web/features/auth/services/auth.service';
import { isAiEnabledOnServer } from '@web/lib/ai-feature';

const AI_DISABLED_ERROR = 'api.errors.aiDisabled';

export function requireAiEnabled() {
  if (!isAiEnabledOnServer()) {
    return jsonError(AI_DISABLED_ERROR, 503);
  }

  return null;
}
