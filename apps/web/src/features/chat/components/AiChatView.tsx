'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import type { ChatMessage } from '@shared/features/ai/schemas';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';

type ChatQuota = {
  limit: number;
  used: number;
  remaining: number;
  canUse: boolean;
  isBlocked: boolean;
};

type UiMessage = ChatMessage & { id: string };

export function AiChatView() {
  const t = useT();
  const { locale } = useLocale();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsSending(true);

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
          { id: crypto.randomUUID(), role: 'assistant', content: data.reply! },
        ]);
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
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && <p className="text-sm text-gray-500">{t('chat.page.empty')}</p>}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === 'user'
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          ))}
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
