'use client';

import { CalendarRange, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StudentSessions } from '@/types';

interface SessionPillProps {
  sessions: StudentSessions | null;
  /** '' = the branch's current session */
  value: string;
  onChange: (sessionYear: string) => void;
  loading?: boolean;
  /** e.g. "Session" */
  label: string;
  /** e.g. "current" */
  currentLabel: string;
}

/**
 * Session-year chip for the page header — same glass style as <BranchPill>.
 * Picking the current session stores '' so the page keeps following the
 * branch's current session (the API default).
 */
export function SessionPill({ sessions, value, onChange, loading, label, currentLabel }: SessionPillProps) {
  const current = sessions ? String(sessions.currentYear) : '';
  const years = sessions?.years ?? [];
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/80 px-3 py-1.5 shadow-sm backdrop-blur transition-all hover:border-primary/30 hover:shadow-md">
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
      ) : (
        <CalendarRange className="h-3.5 w-3.5 shrink-0 text-primary" />
      )}
      <Select
        value={value || current || undefined}
        onValueChange={(v) => onChange(v === current ? '' : v)}
        disabled={loading || !years.length}
      >
        <SelectTrigger
          aria-label={label}
          className="h-7 min-w-[120px] gap-1.5 border-0 bg-transparent px-1.5 text-xs font-medium shadow-none hover:bg-muted/60 focus:ring-0 data-[size=default]:h-7"
        >
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent align="end">
          {years.map((y) => (
            <SelectItem key={y.year} value={String(y.year)} className="text-xs">
              {label} {y.label}
              {y.isCurrent ? ` (${currentLabel})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
