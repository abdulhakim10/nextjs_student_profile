'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import type { BranchListItem } from '@/types';

interface BranchSelectorProps {
  branches: BranchListItem[];
  selectedSid: string;
  onBranchChange: (sid: string) => void;
  loading?: boolean;
}

export function BranchSelector({
  branches,
  selectedSid,
  onBranchChange,
  loading,
}: BranchSelectorProps) {
  const { t } = useTranslation('dashboard');

  return (
    <Select
      value={selectedSid}
      onValueChange={onBranchChange}
      disabled={loading}
    >
      <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs font-medium border-0 bg-transparent px-1.5 shadow-none focus:ring-0">
        <SelectValue placeholder={loading ? t('loadingBranches') : t('selectBranch')} />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.sid} value={b.sid}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
