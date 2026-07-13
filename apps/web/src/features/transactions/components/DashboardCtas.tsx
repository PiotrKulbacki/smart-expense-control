'use client';

import { Plus, Camera } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@web/components/ui/button';
import { useT } from '@web/features/i18n/LocaleProvider';

type ScanQuota = {
  remaining: number;
};

type DashboardCtasProps = {
  onAddManual: () => void;
  scanQuota: ScanQuota | null;
};

export function DashboardCtas({ onAddManual, scanQuota }: DashboardCtasProps) {
  const t = useT();

  return (
    <section className="flex flex-wrap items-center gap-2">
      <Button type="button" size="default" onClick={onAddManual}>
        <Plus className="h-4 w-4" />
        {t('dashboard.cta.addManual')}
      </Button>

      <Button asChild variant="outline" size="default" className="relative">
        <Link href="/scanner">
          <Camera className="h-4 w-4" />
          {t('dashboard.cta.scanReceipt')}
          {scanQuota && (
            <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
              {scanQuota.remaining}
            </span>
          )}
        </Link>
      </Button>
    </section>
  );
}
