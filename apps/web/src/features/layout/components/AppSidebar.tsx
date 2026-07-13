'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { translateError } from '@shared/features/i18n';
import { useLocale, useT } from '@web/features/i18n/LocaleProvider';
import { LocaleSwitcher } from '@web/features/layout/components/LocaleSwitcher';

const NAV_ITEMS = [
  { href: '/dashboard', key: 'layout.nav.dashboard' },
  { href: '/scanner', key: 'layout.nav.scanner' },
  { href: '/chat', key: 'layout.nav.chat' },
  { href: '/settings', key: 'layout.nav.settings' },
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

  return (
    <aside className="flex w-full flex-col border-r border-gray-200 bg-white md:min-h-screen md:w-64">
      <div className="border-b border-gray-200 px-4 py-5">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight text-gray-900">
          {t('layout.brand')}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{userName ?? userEmail}</p>
            <p className="truncate text-xs text-gray-500">{userPlan}</p>
          </div>
        </div>

        <div className="mb-3">
          <LocaleSwitcher className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm" />
        </div>

        {userPlan === 'PRO' && (
          <button
            type="button"
            onClick={handleManageSubscription}
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {t('billing.labels.manageSubscription')}
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          {t('auth.labels.logout')}
        </button>
      </div>
    </aside>
  );
}
