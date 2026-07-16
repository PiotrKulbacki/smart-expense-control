'use client';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react';
import { cn } from '@web/lib/utils';

type ProgressProps = ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
  indicatorStyle?: CSSProperties;
};

export const Progress = forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, indicatorClassName, indicatorStyle, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('bg-elevated relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full rounded-full transition-all duration-500 ease-out',
          indicatorClassName ?? 'from-warm to-cool bg-gradient-to-r'
        )}
        style={{
          transform: `translateX(-${100 - (value ?? 0)}%)`,
          ...indicatorStyle,
        }}
      />
    </ProgressPrimitive.Root>
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;
