'use client';

import { GoogleIcon } from '@web/features/auth/components/GoogleIcon';

type OAuthGoogleButtonProps = {
  label: string;
  disabled?: boolean;
};

export function OAuthGoogleButton({ label, disabled }: OAuthGoogleButtonProps) {
  return (
    <a
      href="/api/auth/google"
      aria-disabled={disabled}
      className={`btn-ghost relative z-10 w-full py-2.5 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <GoogleIcon />
      {label}
    </a>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative z-10 flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-[var(--border)]" />
      <span className="text-muted font-mono text-xs uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}
