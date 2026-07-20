'use client';

import { useId } from 'react';
import { useT } from '@web/features/i18n/LocaleProvider';

type LyamoLogoProps = {
  className?: string;
  /** Height of the mark in Tailwind classes, default h-9 */
  markClassName?: string;
  /** Show "Lyamo" wordmark next to the mark (default true) */
  showWordmark?: boolean;
  /** Show tagline under the wordmark */
  showTagline?: boolean;
};

function LyamoMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const coolId = `lyamo-cool-${uid}`;
  const warmId = `lyamo-warm-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={coolId} x1="16" y1="6" x2="36" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5eeadb" />
          <stop offset="1" stopColor="#3dd6c3" />
        </linearGradient>
        <linearGradient id={warmId} x1="10" y1="40" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0c060" />
          <stop offset="1" stopColor="#e8a849" />
        </linearGradient>
      </defs>
      <rect x="12" y="6" width="18" height="52" rx="9" fill={`url(#${warmId})`} opacity="0.92" />
      <rect x="12" y="40" width="40" height="18" rx="9" fill={`url(#${coolId})`} opacity="0.78" />
    </svg>
  );
}

export function LyamoLogo({
  className = '',
  markClassName = 'h-9 w-9',
  showWordmark = true,
  showTagline = false,
}: LyamoLogoProps) {
  const t = useT();

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LyamoMark className={`shrink-0 ${markClassName}`} />
      {showWordmark ? (
        <span className="font-display min-w-0 leading-none">
          <span className="block text-lg font-semibold tracking-tight text-[var(--text)]">
            {t('layout.brand')}
          </span>
          {showTagline ? (
            <span className="text-muted mt-1 block font-mono text-[10px] font-medium uppercase tracking-[0.14em]">
              {t('layout.tagline')}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
