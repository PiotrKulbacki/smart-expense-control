import { isSameDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export function formatDateRangeLabel(range: DateRange | undefined, locale: string): string | null {
  if (!range?.from) {
    return null;
  }

  const from = range.from;
  const to = range.to ?? range.from;
  const includeYear = from.getFullYear() !== to.getFullYear();
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  };
  const formatter = new Intl.DateTimeFormat(locale, formatOptions);

  if (isSameDay(from, to)) {
    return formatter.format(from);
  }

  return `${formatter.format(from)} – ${formatter.format(to)}`;
}
