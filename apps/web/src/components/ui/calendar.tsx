'use client';

import * as React from 'react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { cn } from '@web/lib/utils';

export type CalendarProps = DayPickerProps;

const navButtonClass = cn(
  'absolute top-0 inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white p-0 opacity-80 transition hover:opacity-100',
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
        caption_label: 'text-sm font-medium',
        button_previous: cn(navButtonClass, 'left-0'),
        button_next: cn(navButtonClass, 'right-0'),
        month_grid: 'mt-4 w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-center text-[0.8rem] font-normal text-gray-500',
        week: 'mt-2 flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm',
        day_button: cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal transition hover:bg-gray-100 aria-selected:opacity-100'
        ),
        selected:
          'bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white',
        today: 'bg-gray-100 font-semibold text-gray-900',
        outside: 'text-gray-400 opacity-50',
        disabled: 'text-gray-400 opacity-50',
        range_start:
          'rounded-l-md bg-blue-100 [&>button]:rounded-l-md [&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-600 [&>button]:hover:text-white',
        range_end:
          'rounded-r-md bg-blue-100 [&>button]:rounded-r-md [&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-600 [&>button]:hover:text-white',
        range_middle:
          'rounded-none bg-blue-50 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:text-gray-900 [&>button]:hover:bg-blue-100',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
