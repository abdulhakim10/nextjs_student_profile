'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AttendanceFilters as FilterType } from '@/types';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface AttendanceFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: Partial<FilterType>) => void;
  onClear: () => void;
}

export function AttendanceFilters({
  filters,
  onFiltersChange,
  onClear,
}: AttendanceFiltersProps) {
  const { t } = useTranslation('attendance');
  const { t: tStatus } = useTranslation('status');
  const { t: tCommon } = useTranslation('common');
  const [searchValue, setSearchValue] = useState(filters.search || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFiltersChange({ search: searchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search, onFiltersChange]);

  const hasActiveFilters =
    filters.search || filters.status || filters.start_date || filters.end_date;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('searchByNameUid')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status || 'all'}
        onValueChange={(v) => onFiltersChange({ status: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t('status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allStatus')}</SelectItem>
          <SelectItem value="present">{tStatus('present')}</SelectItem>
          <SelectItem value="late">{tStatus('late')}</SelectItem>
          <SelectItem value="leave">{tStatus('leave')}</SelectItem>
          <SelectItem value="absent">{tStatus('absent')}</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={filters.start_date || ''}
        onChange={(e) => onFiltersChange({ start_date: e.target.value })}
        className="w-[160px]"
      />

      <Input
        type="date"
        value={filters.end_date || ''}
        onChange={(e) => onFiltersChange({ end_date: e.target.value })}
        className="w-[160px]"
      />

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchValue('');
            onClear();
          }}
        >
          <X className="mr-1 h-4 w-4" />
          {tCommon('clear')}
        </Button>
      )}
    </div>
  );
}
