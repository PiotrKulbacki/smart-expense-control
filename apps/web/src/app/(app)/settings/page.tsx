import { Suspense } from 'react';
import { SettingsView } from '@web/features/settings/components/SettingsView';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="bg-elevated h-64 animate-pulse rounded-2xl" />}>
      <SettingsView />
    </Suspense>
  );
}
