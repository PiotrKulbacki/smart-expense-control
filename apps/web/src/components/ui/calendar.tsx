'use client';

import * as React from 'react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { cn } from '@web/lib/utils';

export type CalendarProps = DayPickerProps;

const navButtonClass = cn(
  'absolute top-0 inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-elevated/50 p-0 text-warm opacity-90 transition hover:border-warm/40 hover:opacity-100',
  'disabled:pointer-events-none disabled:opacity-30',
  'aria-disabled:pointer-events-none aria-disabled:opacity-30'
);

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout="around"
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'relative',
        month_caption: 'flex h-9 w-full items-center justify-center px-9',
        caption_label: 'text-sm font-medium text-[var(--text)]',
        button_previous: cn(navButtonClass, 'left-0'),
        button_next: cn(navButtonClass, 'right-0'),
        chevron: 'fill-warm',
        month_grid: 'mt-4 w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-center text-[0.8rem] font-normal text-muted',
        week: 'mt-2 flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm',
        day_button: cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal text-[var(--text)] transition hover:bg-elevated aria-selected:opacity-100'
        ),
        selected: 'bg-warm text-void hover:bg-warm hover:text-void focus:bg-warm focus:text-void',
        today: 'bg-elevated font-semibold text-warm',
        outside: 'text-muted opacity-50',
        disabled: 'text-muted opacity-50',
        range_start:
          'rounded-l-md bg-warm/20 [&>button]:rounded-l-md [&>button]:bg-warm [&>button]:text-void [&>button]:hover:bg-warm [&>button]:hover:text-void',
        range_end:
          'rounded-r-md bg-warm/20 [&>button]:rounded-r-md [&>button]:bg-warm [&>button]:text-void [&>button]:hover:bg-warm [&>button]:hover:text-void',
        range_middle:
          'rounded-none bg-warm/10 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:text-[var(--text)] [&>button]:hover:bg-warm/20',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
