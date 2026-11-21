'use client';

import { Building2 } from 'lucide-react';
import { BranchSelector } from '@/components/dashboard/branch-selector';
import type { BranchListItem } from '@/types';

interface BranchPillProps {
  branches: BranchListItem[];
  selectedSid: string;
  onBranchChange: (sid: string) => void;
  loading?: boolean;
  isHQ?: boolean;
  branchName?: string;
  onDistrictFilter?: (district?: string) => void;
  allowAll?: boolean;
  isAll?: boolean;
}

/** Glass branch pill — matches the rest of the module's header chrome.
 *  Drop inside a `<PageHeader>` as a child. */
export function BranchPill(props: BranchPillProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/80 backdrop-blur px-3 py-1.5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
      <BranchSelector {...props} />
    </div>
  );
}
