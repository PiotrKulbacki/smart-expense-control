'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { ChatMessage } from '@shared/features/ai/schemas';
import { useAppUser } from '@web/features/auth/components/AppUserProvider';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { LoadingSpinner } from '@web/components/ui/loading-spinner';
import {
  fetchChatHistory,
  fetchChatQuota,
  type ChatHistoryPayload,
  type ChatQuotaPayload,
  type HistoryMessage,
} from '@web/features/query/fetchers';
import { queryKeys } from '@web/features/query/query-keys';

const HISTORY_PAGE_SIZE = 30;

type ChatQuota = {
  limit: number;
  used: number;
  remaining: number;
  canUse: boolean;
  isBlocked: boolean;
};

type ScrollAnchor = {
  scrollHeight: number;
  scrollTop: number;
};

function toDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function isSameDayKey(a: string, b: string): boolean {
  return a === b;
}

function getDayHeaderLabel(options: {
  dayKey: string;
  locale: string;
  t: ReturnType<typeof useT>;
}): string {
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (options.dayKey === todayKey) {
    return options.t('chat.history.today');
  }

  if (options.dayKey === yesterdayKey) {
    return options.t('chat.history.yesterday');
  }

  const date = new Date(`${options.dayKey}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(options.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function compareMessagesChronologically(a: HistoryMessage, b: HistoryMessage): number {
  const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }

  if (a.role !== b.role) {
    return a.role === 'user' ? -1 : 1;
  }

  return a.id.localeCompare(b.id);
}

function sortMessagesChronologically(messages: HistoryMessage[]): HistoryMessage[] {
  return [...messages].sort(compareMessagesChronologically);
}

function mergeOlderMessages(current: HistoryMessage[], older: HistoryMessage[]): HistoryMessage[] {
  if (older.length === 0) {
    return sortMessagesChronologically(current);
  }

  const existingIds = new Set(current.map((message) => message.id));
  const uniqueOlder = older.filter((message) => !existingIds.has(message.id));

  return sortMessagesChronologically([...uniqueOlder, ...current]);
}

type AiChatViewProps = {
  initialHistoryPage: ChatHistoryPayload;
};

export function AiChatView({ initialHistoryPage }: AiChatViewProps) {
  const t = useT();
  const { locale } = useLocale();
  const user = useAppUser();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<HistoryMessage[]>(
    sortMessagesChronologically(initialHistoryPage.messages)
  );
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(initialHistoryPage.page);
  const [hasMoreHistory, setHasMoreHistory] = useState(initialHistoryPage.hasMore);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<ScrollAnchor | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const isInitialMountRef = useRef(true);

  const quotaQuery = useQuery({
    queryKey: queryKeys.chatQuota(user.id),
    queryFn: fetchChatQuota,
  });

  useEffect(() => {
    if (!quotaQuery.isError) {
      return;
    }

    toast.error(
      translateError(
        quotaQuery.error instanceof Error ? quotaQuery.error.message : 'auth.errors.generic',
        locale
      )
    );
  }, [locale, quotaQuery.error, quotaQuery.isError]);

  const quota = quotaQuery.data?.quota ?? null;
  const userPlan = quotaQuery.data?.plan ?? null;

  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMore || !hasMoreHistory || isLoadingHistory) {
      return;
    }

    const container = scrollContainerRef.current;
    if (container) {
      scrollAnchorRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
    }

    setIsLoadingMore(true);

    try {
      const nextPage = historyPage + 1;
      const data = await fetchChatHistory(HISTORY_PAGE_SIZE, nextPage);

      setMessages((current) => mergeOlderMessages(current, data.messages));
      setHistoryPage(nextPage);
      setHasMoreHistory(data.hasMore);
    } catch {
      toast.error(t('auth.errors.networkError'));
      scrollAnchorRef.current = null;
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreHistory, historyPage, isLoadingHistory, isLoadingMore, locale, t]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = scrollContainerRef.current;

    if (!sentinel || !container || !hasMoreHistory || isLoadingMore || isLoadingHistory) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreHistory();
        }
      },
      { root: container, rootMargin: '64px', threshold: 0 }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMoreHistory, isLoadingHistory, isLoadingMore, loadMoreHistory, messages.length]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const anchor = scrollAnchorRef.current;
    if (anchor) {
      container.scrollTop = anchor.scrollTop + (container.scrollHeight - anchor.scrollHeight);
      scrollAnchorRef.current = null;
      return;
    }

    if (shouldScrollToBottomRef.current || isInitialMountRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldScrollToBottomRef.current = false;
      isInitialMountRef.current = false;
    }
  }, [messages, isSending]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    if (quota?.isBlocked) {
      toast.error(t('chat.errors.quotaExceeded'));
      return;
    }

    const userMessage: HistoryMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => sortMessagesChronologically([...current, userMessage]));
    setInput('');
    setIsSending(true);
    shouldScrollToBottomRef.current = true;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          locale,
          history,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'chat.errors.aiFailed', locale));
        setMessages((current) => current.filter((message) => message.id !== userMessage.id));
        return;
      }

      if (data.reply) {
        setIsSending(false);

        const assistantMessage: HistoryMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply,
          createdAt: new Date().toISOString(),
        };

        setMessages((current) => sortMessagesChronologically([...current, assistantMessage]));
        shouldScrollToBottomRef.current = true;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.chatQuota(user.id) });
    } catch {
      toast.error(t('auth.errors.networkError'));
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  }

  const sortedMessages = useMemo(() => sortMessagesChronologically(messages), [messages]);

  const isBlocked = quota?.isBlocked ?? false;
  const hasFiniteQuota = quota != null && quota.limit < Number.MAX_SAFE_INTEGER;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">
          {t('chat.page.title')}
        </h1>
        <p className="text-muted mt-1 text-sm">{t('chat.page.subtitle')}</p>
        {hasFiniteQuota && !isBlocked && (
          <p className="text-muted mt-2 text-xs">
            {t('chat.status.messagesQuota', { used: quota.used, limit: quota.limit })}
            {' · '}
            {t('chat.status.messagesRemaining', { count: quota.remaining })}
          </p>
        )}
        <p className="text-muted mt-2 text-xs">{t('chat.page.disclaimer')}</p>
      </div>

      <div className="panel relative z-10 flex flex-1 flex-col overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="relative z-10 flex-1 space-y-4 overflow-y-auto p-4"
        >
          <div ref={topSentinelRef} className="h-px w-full shrink-0" aria-hidden />

          {isLoadingMore && (
            <p className="text-muted py-1 text-center text-xs">{t('chat.history.loadingOlder')}</p>
          )}

          {isLoadingHistory && messages.length === 0 && (
            <div className="space-y-3">
              <div className="bg-elevated h-5 w-28 animate-pulse rounded" />
              <div className="bg-elevated h-10 w-64 animate-pulse rounded-2xl" />
              <div className="bg-elevated h-10 w-56 animate-pulse rounded-2xl" />
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
            <p className="text-muted text-sm">{t('chat.page.empty')}</p>
          )}

          {sortedMessages.map((message, index) => {
            const currentDayKey = toDayKey(message.createdAt);
            const previousDayKey =
              index > 0 ? toDayKey(sortedMessages[index - 1]!.createdAt) : null;
            const shouldRenderHeader =
              !previousDayKey || !isSameDayKey(previousDayKey, currentDayKey);
            const headerLabel = shouldRenderHeader
              ? getDayHeaderLabel({ dayKey: currentDayKey, locale, t })
              : null;
            const isUser = message.role === 'user';

            return (
              <div key={message.id} className="space-y-2">
                {headerLabel && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-[var(--border)]" />
                    <p className="text-muted text-xs font-medium">{headerLabel}</p>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                )}

                <div
                  className={`flex items-end gap-2.5 ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      isUser
                        ? 'border-warm/30 bg-warm/10 text-warm'
                        : 'border-cool/30 bg-cool/10 text-cool'
                    }`}
                    aria-hidden
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div
                    className={`max-w-[calc(85%-2.5rem)] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      isUser ? 'btn-primary' : 'bg-elevated text-[var(--text)]'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="mr-auto flex items-end gap-2.5">
              <div
                className="border-cool/30 bg-cool/10 text-cool flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                aria-hidden
              >
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-elevated text-muted max-w-[calc(85%-2.5rem)] rounded-2xl px-4 py-3 text-sm">
                {t('chat.status.thinking')}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => void handleSend(event)}
          className="relative z-10 border-t border-[var(--border)] p-4"
        >
          {isBlocked && (
            <div
              className="border-glow/30 bg-glow/10 mb-3 rounded-lg border px-3 py-2.5"
              role="status"
            >
              <p className="text-glow text-sm font-medium">
                {userPlan === 'PRO'
                  ? t('chat.errors.monthlyLimitReached')
                  : t('chat.errors.quotaExceeded')}
              </p>
              {userPlan !== 'PRO' && (
                <Link
                  href="/settings"
                  className="text-glow hover:text-glow/80 mt-2 inline-block text-sm font-semibold underline underline-offset-2"
                >
                  {t('chat.labels.upgradeToPro')}
                </Link>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              disabled={isSending || isBlocked}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('chat.page.placeholder')}
              className="auth-input flex-1"
            />
            <button
              type="submit"
              disabled={isSending || isBlocked || !input.trim()}
              className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSending ? <LoadingSpinner /> : <Send className="h-4 w-4" aria-hidden />}
              {t('chat.labels.sendMessage')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
