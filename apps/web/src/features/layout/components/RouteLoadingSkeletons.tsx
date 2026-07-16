export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-elevated h-10 w-48 animate-pulse rounded-lg" />
      <div className="bg-elevated h-10 w-72 animate-pulse rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-elevated h-48 animate-pulse rounded-2xl" />
        <div className="bg-elevated h-48 animate-pulse rounded-2xl" />
      </div>
      <div className="bg-elevated h-64 animate-pulse rounded-2xl" />
      <div className="bg-elevated h-72 animate-pulse rounded-2xl" />
    </div>
  );
}

export function HistoryLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-elevated h-10 w-48 animate-pulse rounded-lg" />
      <div className="bg-elevated h-72 animate-pulse rounded-2xl" />
    </div>
  );
}

export function SettingsLoadingSkeleton() {
  return <div className="bg-elevated h-64 animate-pulse rounded-2xl" />;
}

export function ChatLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-elevated h-5 w-28 animate-pulse rounded" />
      <div className="bg-elevated h-10 w-64 animate-pulse rounded-2xl" />
      <div className="bg-elevated h-10 w-56 animate-pulse rounded-2xl" />
    </div>
  );
}
