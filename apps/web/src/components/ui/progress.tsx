'use client';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@web/lib/utils';

export const Progress = forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-gray-100', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;
