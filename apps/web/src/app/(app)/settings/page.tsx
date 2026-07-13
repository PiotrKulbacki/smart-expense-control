import { Suspense } from 'react';
import { SettingsView } from '@web/features/settings/components/SettingsView';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-gray-200" />}>
      <SettingsView />
    </Suspense>
  );
}
