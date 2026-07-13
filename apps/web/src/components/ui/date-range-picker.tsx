'use client';

import { useEffect, useState, type RefObject } from 'react';
import { endOfDay, format, startOfDay } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@web/components/ui/button';
import { Calendar } from '@web/components/ui/calendar';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@web/components/ui/popover';
import { useT } from '@web/features/i18n/LocaleProvider';
import { cn } from '@web/lib/utils';

type DatePickerWithRangeProps = {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  focusGuardRef?: RefObject<HTMLElement | null>;
};

const today = startOfDay(new Date());

export function DatePickerWithRange({
  dateRange,
  onDateRangeChange,
  className,
  placeholder = 'Pick a date range',
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  focusGuardRef,
}: DatePickerWithRangeProps) {
  const t = useT();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(dateRange);
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  useEffect(() => {
    if (open) {
      setDraftRange(dateRange);
    }
  }, [open, dateRange]);

  function handleApply() {
    if (!draftRange?.from || !draftRange?.to) {
      return;
    }

    onDateRangeChange({
      from: startOfDay(draftRange.from),
      to: endOfDay(draftRange.to),
    });
    setOpen(false);
  }

  const canApply = Boolean(draftRange?.from && draftRange?.to);

  return (
    <div className={cn(hideTrigger ? 'contents' : 'grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        {hideTrigger ? (
          <PopoverAnchor className="pointer-events-none absolute inset-0" />
        ) : (
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-8 w-full justify-start text-left text-xs font-normal',
                !dateRange && 'text-gray-500'
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} – {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>{placeholder}</span>
              )}
            </Button>
          </PopoverTrigger>
        )}
        <PopoverContent
          className="w-auto p-0"
          align="end"
          sideOffset={8}
          collisionPadding={20}
          onFocusOutside={(event) => {
            if (focusGuardRef?.current?.contains(event.target as Node)) {
              event.preventDefault();
            }
          }}
        >
          <Calendar
            mode="range"
            defaultMonth={draftRange?.from ?? dateRange?.from ?? today}
            selected={draftRange}
            onSelect={setDraftRange}
            numberOfMonths={1}
            disabled={{ after: today }}
            endMonth={today}
          />
          <div className="border-t border-gray-100 p-3">
            <Button
              type="button"
              size="default"
              className="h-8 w-full text-xs"
              disabled={!canApply}
              onClick={handleApply}
            >
              {t('dashboard.chartFilter.apply')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
