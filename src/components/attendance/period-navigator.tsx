'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  format,
  addMonths,
  addDays,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  getDate,
  parseISO,
  isToday,
} from 'date-fns';

// ─── Constants ───────────────────────────────────────────────────────────────

const DATE_FORMAT = 'yyyy-MM-dd';
const DAYS_PER_PAGE = 7;

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single page of sequential calendar days within a month. */
export interface MonthPage {
  dates: string[];    // up to DAYS_PER_PAGE date strings (YYYY-MM-DD)
  label: string;      // e.g. "1 - 7", "8 - 14", "29 - 31"
  pageIndex: number;
}

/** Complete month metadata used by the attendance page for data fetching and pagination. */
export interface MonthDateInfo {
  allDates: string[];       // every day of the month (for export)
  pages: MonthPage[];       // sequential chunks of DAYS_PER_PAGE days
  apiStart: string;         // first day of month (API range start)
  apiEnd: string;           // last day of month (API range end)
  todayPageIndex: number;   // page containing today, defaults to 0 if not current month
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Splits a month into sequential pages of DAYS_PER_PAGE days each.
 *
 * Flow:
 * 1. Generate all dates for the given month
 * 2. Chunk them into pages of 7 (last page may be shorter)
 * 3. Detect which page contains today for auto-selection
 *
 * Used by attendance page to:
 * - Fetch full month data in one API call (apiStart → apiEnd)
 * - Display 7 days at a time via page tabs (instant slide, no re-fetch)
 * - Export all days of the month regardless of current page
 */
export function getMonthPages(dateStr: string): MonthDateInfo {
  const date = parseISO(dateStr);
  const monthStart = startOfMonth(date);
  const totalDays = getDaysInMonth(date);

  // Step 1: Build array of all dates in the month
  const allDates: string[] = [];
  for (let d = 0; d < totalDays; d++) {
    allDates.push(format(addDays(monthStart, d), DATE_FORMAT));
  }

  // Step 2: Chunk into pages and detect today's page
  const pages: MonthPage[] = [];
  let todayPageIndex = 0;

  for (let i = 0; i < allDates.length; i += DAYS_PER_PAGE) {
    const chunk = allDates.slice(i, i + DAYS_PER_PAGE);
    const firstDay = getDate(parseISO(chunk[0]));
    const lastDay = getDate(parseISO(chunk[chunk.length - 1]));
    const idx = pages.length;

    if (chunk.some((d) => isToday(parseISO(d)))) {
      todayPageIndex = idx;
    }

    pages.push({
      dates: chunk,
      label: firstDay === lastDay ? `${firstDay}` : `${firstDay} - ${lastDay}`,
      pageIndex: idx,
    });
  }

  return {
    allDates,
    pages,
    apiStart: format(monthStart, DATE_FORMAT),
    apiEnd: format(endOfMonth(date), DATE_FORMAT),
    todayPageIndex,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface PeriodNavigatorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

/**
 * Month-level navigation control with prev/next arrows and a calendar picker.
 * Does NOT handle page-level (7-day) navigation — that is in the attendance page.
 */
export function PeriodNavigator({ selectedDate, onDateChange }: PeriodNavigatorProps) {
  const label = useMemo(() => format(parseISO(selectedDate), 'MMMM yyyy'), [selectedDate]);

  const navigate = (direction: -1 | 1) => {
    const newDate = addMonths(parseISO(selectedDate), direction);
    onDateChange(format(newDate, DATE_FORMAT));
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
        onClick={() => navigate(-1)}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <AnimatePresence mode="wait">
        <motion.span
          key={label}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="min-w-[180px] text-center text-base font-bold tracking-tight select-none"
        >
          {label}
        </motion.span>
      </AnimatePresence>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
        onClick={() => navigate(1)}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full ml-1"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parseISO(selectedDate)}
            onSelect={(date) => {
              if (date) onDateChange(format(date, DATE_FORMAT));
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
