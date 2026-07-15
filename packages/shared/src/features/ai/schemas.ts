import { z } from 'zod';

export const CHAT_ERROR_CODES = {
  INVALID_MESSAGE: 'chat.errors.invalidMessage',
  QUOTA_EXCEEDED: 'chat.errors.quotaExceeded',
  MONTHLY_LIMIT_REACHED: 'chat.errors.monthlyLimitReached',
  AI_FAILED: 'chat.errors.aiFailed',
} as const;

const localeEnum = z.enum(['en', 'de', 'pl', 'es']);

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, CHAT_ERROR_CODES.INVALID_MESSAGE)
    .max(2000, CHAT_ERROR_CODES.INVALID_MESSAGE),
  locale: localeEnum.optional().default('en'),
  history: z.array(chatMessageSchema).max(20).optional().default([]),
});

export const chatResponseSchema = z.object({
  reply: z.string().min(1),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const INSIGHT_ERROR_CODES = {
  AI_FAILED: 'dashboard.insights.errors.aiFailed',
  GENERATION_FAILED: 'dashboard.insights.errors.generationFailed',
} as const;

export const insightSchema = z.object({
  type: z.enum(['success', 'warning', 'anomaly', 'tip']),
  metric: z.string().min(1).max(120),
  message: z.string().min(1).max(400),
  actionableStep: z.string().max(240).optional(),
});

export type AiInsightContent = z.infer<typeof insightSchema>;
