'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { LocaleSwitcher } from '@web/features/layout/components/LocaleSwitcher';
import { isAiEnabledOnClient } from '@web/lib/ai-feature';

const NAV_ITEMS = [
  { href: '/dashboard', key: 'layout.nav.dashboard', requiresAi: false },
  { href: '/history', key: 'layout.nav.history', requiresAi: false },
  { href: '/scanner', key: 'layout.nav.scanner', requiresAi: true },
  { href: '/chat', key: 'layout.nav.chat', requiresAi: true },
  { href: '/settings', key: 'layout.nav.settings', requiresAi: false },
] as const;

type AppSidebarProps = {
  userName: string | null;
  userEmail: string;
  userPlan: 'FREE' | 'PRO';
};

export function AppSidebar({ userName, userEmail, userPlan }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();

  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        toast.error(translateError('auth.errors.generic', locale));
        return;
      }

      toast.success(t('auth.success.logout'));
      router.push('/login');
      router.refresh();
    } catch {
      toast.error(t('auth.errors.networkError'));
    }
  }

  async function handleManageSubscription() {
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        toast.error(translateError(data.error ?? 'billing.errors.portalUnavailable', locale));
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error(t('auth.errors.networkError'));
    }
  }

  const initials = (userName ?? userEmail).slice(0, 2).toUpperCase();
  const aiEnabled = isAiEnabledOnClient();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.requiresAi || aiEnabled);

  return (
    <aside className="bg-surface/80 sticky top-0 flex h-screen w-full shrink-0 flex-col border-r border-[var(--border)] backdrop-blur-md md:w-64">
      <div className="border-b border-[var(--border)] px-4 py-5">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            <div className="from-warm/20 to-cool/20 absolute inset-0 rounded-lg bg-gradient-to-br" />
            <div className="text-warm relative font-mono text-sm font-bold">◈</div>
          </div>
          <div className="font-display min-w-0 leading-none">
            <span className="block text-base font-semibold tracking-tight text-[var(--text)]">
              {t('layout.brandLine1')}
            </span>
            <span
              className="mt-0.5 block w-full text-base font-semibold tracking-tight text-[var(--text)]"
              style={{ textAlign: 'justify', textAlignLast: 'justify' }}
            >
              {t('layout.brandLine2')}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 font-mono text-sm transition ${
                isActive
                  ? 'bg-warm/10 text-warm'
                  : 'text-muted hover:bg-elevated/50 hover:text-[var(--text)]'
              }`}
            >
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="from-warm/20 to-cool/20 text-warm flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br font-mono text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text)]">
              {userName ?? userEmail}
            </p>
            <p className="text-muted truncate font-mono text-xs">{userPlan}</p>
          </div>
        </div>

        <div className="mb-3">
          <LocaleSwitcher className="auth-input w-full py-2 text-sm" />
        </div>

        {userPlan === 'PRO' && (
          <button
            type="button"
            onClick={handleManageSubscription}
            className="btn-ghost mb-2 w-full"
          >
            {t('billing.labels.manageSubscription')}
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="text-glow hover:bg-glow/10 w-full rounded-lg px-3 py-2 font-mono text-sm transition"
        >
          {t('auth.labels.logout')}
        </button>
      </div>
    </aside>
  );
}
