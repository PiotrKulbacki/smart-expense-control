import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAT_ERROR_CODES } from '@shared/features/ai/schemas';

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@web/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

vi.mock('@smart-expense-control/database', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

import {
  checkAiChatQuota,
  getUserAiChatQuota,
  sendChatMessage,
} from '@web/features/ai/services/chat.service';

describe('chat.service quota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows FREE user below monthly chat limit', async () => {
    mockFindUnique.mockResolvedValue({
      currentPlan: 'FREE',
      monthlyAiChatCount: 5,
    });

    await expect(checkAiChatQuota('user-1')).resolves.toEqual({ ok: true, plan: 'FREE' });
  });

  it('blocks FREE user at 10 messages with quotaExceeded', async () => {
    mockFindUnique.mockResolvedValue({
      currentPlan: 'FREE',
      monthlyAiChatCount: 10,
    });

    await expect(checkAiChatQuota('user-1')).resolves.toEqual({
      ok: false,
      error: CHAT_ERROR_CODES.QUOTA_EXCEEDED,
    });
  });

  it('returns AI_FAILED when user is missing', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(checkAiChatQuota('missing-user')).resolves.toEqual({
      ok: false,
      error: CHAT_ERROR_CODES.AI_FAILED,
    });
  });

  it('returns chat quota status for PRO user', async () => {
    mockFindUnique.mockResolvedValue({
      currentPlan: 'PRO',
      monthlyAiChatCount: 42,
    });

    await expect(getUserAiChatQuota('user-1')).resolves.toEqual({
      limit: 50,
      used: 42,
      remaining: 8,
      canUse: true,
      isBlocked: false,
    });
  });

  it('short-circuits sendChatMessage when quota is exceeded', async () => {
    mockFindUnique.mockResolvedValue({
      currentPlan: 'FREE',
      monthlyAiChatCount: 10,
    });

    const result = await sendChatMessage('user-1', {
      message: 'Ile wydałem na jedzenie?',
      locale: 'pl',
      history: [],
    });

    expect(result).toEqual({ error: CHAT_ERROR_CODES.QUOTA_EXCEEDED });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
