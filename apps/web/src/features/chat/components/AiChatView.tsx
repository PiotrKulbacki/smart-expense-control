'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { ChatMessage } from '@shared/features/ai/schemas';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

const HISTORY_PAGE_SIZE = 30;

type ChatQuota = {
  limit: number;
  used: number;
  remaining: number;
  canUse: boolean;
  isBlocked: boolean;
};

type HistoryMessage = ChatMessage & { id: string; createdAt: string };

type HistoryResponse = {
  messages?: HistoryMessage[];
  hasMore?: boolean;
  error?: string;
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

function mergeOlderMessages(current: HistoryMessage[], older: HistoryMessage[]): HistoryMessage[] {
  if (older.length === 0) {
    return current;
  }

  const existingIds = new Set(current.map((message) => message.id));
  const uniqueOlder = older.filter((message) => !existingIds.has(message.id));

  return [...uniqueOlder, ...current];
}

export function AiChatView() {
  const t = useT();
  const { locale } = useLocale();
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [input, setInput] = useState('');
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<ScrollAnchor | null>(null);
  const shouldScrollToBottomRef = useRef(false);

  useEffect(() => {
    async function loadQuota() {
      try {
        const response = await fetch('/api/ai/chat-quota');
        const data = (await response.json()) as { quota?: ChatQuota; error?: string };

        if (!response.ok) {
          toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
          return;
        }

        setQuota(data.quota ?? null);
      } catch {
        toast.error(t('auth.errors.networkError'));
      }
    }

    void loadQuota();
  }, [locale, t]);

  useEffect(() => {
    async function loadHistory() {
      setIsLoadingHistory(true);
      setHistoryPage(0);
      setHasMoreHistory(false);
      scrollAnchorRef.current = null;

      try {
        const response = await fetch(`/api/ai/history?limit=${HISTORY_PAGE_SIZE}&page=0`);
        const data = (await response.json()) as HistoryResponse;

        if (!response.ok) {
          toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
          return;
        }

        setMessages(data.messages ?? []);
        setHasMoreHistory(data.hasMore ?? false);
        shouldScrollToBottomRef.current = true;
      } catch {
        toast.error(t('auth.errors.networkError'));
      } finally {
        setIsLoadingHistory(false);
      }
    }

    void loadHistory();
  }, [locale, t]);

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
      const response = await fetch(`/api/ai/history?limit=${HISTORY_PAGE_SIZE}&page=${nextPage}`);
      const data = (await response.json()) as HistoryResponse;

      if (!response.ok) {
        toast.error(translateError(data.error ?? 'auth.errors.generic', locale));
        scrollAnchorRef.current = null;
        return;
      }

      setMessages((current) => mergeOlderMessages(current, data.messages ?? []));
      setHistoryPage(nextPage);
      setHasMoreHistory(data.hasMore ?? false);
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

    if (shouldScrollToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      shouldScrollToBottomRef.current = false;
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
    setMessages((current) => [...current, userMessage]);
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
        return;
      }

      if (data.reply) {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.reply!,
            createdAt: new Date().toISOString(),
          },
        ]);
        shouldScrollToBottomRef.current = true;
      }

      const quotaResponse = await fetch('/api/ai/chat-quota');
      const quotaData = (await quotaResponse.json()) as { quota?: ChatQuota };
      setQuota(quotaData.quota ?? null);
    } catch {
      toast.error(t('auth.errors.networkError'));
    } finally {
      setIsSending(false);
    }
  }

  const isBlocked = quota?.isBlocked ?? false;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('chat.page.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('chat.page.subtitle')}</p>
        {quota && !isBlocked && quota.remaining < Number.MAX_SAFE_INTEGER && (
          <p className="mt-2 text-xs text-gray-500">
            {t('chat.status.messagesRemaining', { count: quota.remaining })}
          </p>
        )}
        {isBlocked && (
          <p className="mt-2 text-xs font-medium text-amber-700">
            {t('chat.errors.quotaExceeded')}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400">{t('chat.page.disclaimer')}</p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div ref={scrollContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          <div ref={topSentinelRef} className="h-px w-full shrink-0" aria-hidden />

          {isLoadingMore && (
            <p className="py-1 text-center text-xs text-gray-500">
              {t('chat.history.loadingOlder')}
            </p>
          )}

          {isLoadingHistory && messages.length === 0 && (
            <div className="space-y-3">
              <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-64 animate-pulse rounded-2xl bg-gray-200" />
              <div className="h-10 w-56 animate-pulse rounded-2xl bg-gray-200" />
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
            <p className="text-sm text-gray-500">{t('chat.page.empty')}</p>
          )}

          {messages.map((message, index) => {
            const currentDayKey = toDayKey(message.createdAt);
            const previousDayKey = index > 0 ? toDayKey(messages[index - 1]!.createdAt) : null;
            const shouldRenderHeader =
              !previousDayKey || !isSameDayKey(previousDayKey, currentDayKey);
            const headerLabel = shouldRenderHeader
              ? getDayHeaderLabel({ dayKey: currentDayKey, locale, t })
              : null;

            return (
              <div key={message.id} className="space-y-2">
                {headerLabel && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <p className="text-xs font-medium text-gray-500">{headerLabel}</p>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'ml-auto bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="max-w-[85%] rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
              {t('chat.status.thinking')}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={(event) => void handleSend(event)} className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              disabled={isSending || isBlocked}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('chat.page.placeholder')}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || isBlocked || !input.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('chat.labels.sendMessage')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
