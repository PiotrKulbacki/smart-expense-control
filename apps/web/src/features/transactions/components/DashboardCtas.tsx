'use client';

import { Plus, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@web/components/ui/button';
import { useT } from '@web/features/i18n/LocaleProvider';

type ScanQuota = {
  used: number;
  limit: number;
  remaining: number;
};

type DashboardCtasProps = {
  onAddManual: () => void;
  scanQuota: ScanQuota | null;
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  isRefreshing?: boolean;
};

export function DashboardCtas({
  onAddManual,
  scanQuota,
  plan,
  isRefreshing = false,
}: DashboardCtasProps) {
  const t = useT();
  const router = useRouter();
  const [isNavigatingToScanner, setIsNavigatingToScanner] = useState(false);

  function handleScanClick() {
    setIsNavigatingToScanner(true);
    router.push('/scanner');
  }

  const isBusy = isRefreshing || isNavigatingToScanner;

  return (
    <section className="flex flex-wrap items-center gap-2">
      <Button type="button" size="default" disabled={isBusy} onClick={onAddManual}>
        <Plus className="h-4 w-4" />
        {t('dashboard.cta.addManual')}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="default"
        loading={isNavigatingToScanner}
        disabled={isBusy}
        onClick={handleScanClick}
      >
        <Camera className="h-4 w-4" />
        {plan === 'FREE' && scanQuota
          ? t('dashboard.cta.scanWithQuota', {
              used: scanQuota.used,
              limit: scanQuota.limit,
            })
          : t('dashboard.cta.scan')}
      </Button>
    </section>
  );
}
