'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronsUpDown, Building2, Loader2, MapPin, ChevronDown, X, Network } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { userService } from '@/services/user.service';
import { useFetchGuard } from '@/hooks/use-fetch-guard';
import type { BranchListItem, UtilityListItem } from '@/types';

interface BranchSelectorProps {
  branches: BranchListItem[];
  selectedSid: string;
  onBranchChange: (sid: string) => void;
  loading?: boolean;
  isHQ?: boolean;
  branchName?: string;
  size?: 'compact' | 'default';
  /** Called when district filter changes — parent should re-fetch branches */
  onDistrictFilter?: (district?: string) => void;
  /** Offer an "All branches" entry (selects sid ''). */
  allowAll?: boolean;
  /** True while "All branches" is the selection. */
  isAll?: boolean;
}

const triggerStyles = {
  compact: 'h-7 min-w-[140px] max-w-[200px] text-xs font-medium border-0 bg-transparent px-1.5 shadow-none focus:ring-0 hover:bg-muted/60',
  default: 'h-9 w-full sm:w-[240px] rounded-lg',
} as const;

const labelStyles = {
  compact: 'h-7 inline-flex items-center text-xs font-medium text-muted-foreground px-1.5',
  default: 'h-9 inline-flex items-center text-sm font-medium text-muted-foreground px-3',
} as const;

// ── Area Filter (inside popover) ────────────────────────────────────────────

type AreaMode = 'district' | 'city';

function AreaFilter({ onDistrictChange }: { onDistrictChange: (district?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [countries, setCountries] = useState<UtilityListItem[]>([]);
  const [states, setStates] = useState<UtilityListItem[]>([]);
  const [areaItems, setAreaItems] = useState<UtilityListItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [areaMode, setAreaMode] = useState<AreaMode>('district');
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingArea, setLoadingArea] = useState(false);

  const countriesGuard = useFetchGuard();
  const statesGuard = useFetchGuard();
  const areaGuard = useFetchGuard();

  const hasFilter = !!selectedArea;

  // Fetch countries on expand
  useEffect(() => {
    if (!expanded || countries.length > 0) return;
    const id = countriesGuard.begin();
    setLoadingCountries(true);
    userService.getCountryList().then((res) => {
      if (countriesGuard.isStale(id)) return;
      if (res.success && res.data) setCountries(res.data);
    }).catch(() => {}).finally(() => {
      if (!countriesGuard.isStale(id)) setLoadingCountries(false);
    });
  }, [expanded, countries.length, countriesGuard]);

  // Fetch states when country changes
  useEffect(() => {
    if (!selectedCountry) { setStates([]); return; }
    const id = statesGuard.begin();
    setLoadingStates(true);
    userService.getStateList(selectedCountry).then((res) => {
      if (statesGuard.isStale(id)) return;
      setStates(res.success && res.data ? res.data : []);
    }).catch(() => {
      if (statesGuard.isStale(id)) return;
      setStates([]);
    }).finally(() => {
      if (!statesGuard.isStale(id)) setLoadingStates(false);
    });
  }, [selectedCountry, statesGuard]);

  // Fetch district or city list when state or mode changes
  useEffect(() => {
    if (!selectedState) { setAreaItems([]); return; }
    const id = areaGuard.begin();
    setLoadingArea(true);
    const promise = areaMode === 'city'
      ? userService.getCityList(selectedState, selectedCountry)
      : userService.getDistrictList(selectedState);
    promise.then((res) => {
      if (areaGuard.isStale(id)) return;
      setAreaItems(res.success && res.data ? res.data : []);
    }).catch(() => {
      if (areaGuard.isStale(id)) return;
      setAreaItems([]);
    }).finally(() => {
      if (!areaGuard.isStale(id)) setLoadingArea(false);
    });
  }, [selectedState, selectedCountry, areaMode, areaGuard]);

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setSelectedState('');
    setSelectedArea('');
    setAreaItems([]);
    onDistrictChange(undefined);
  };

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedArea('');
    onDistrictChange(undefined);
  };

  const handleAreaModeChange = (mode: AreaMode) => {
    setAreaMode(mode);
    setSelectedArea('');
    setAreaItems([]);
    onDistrictChange(undefined);
  };

  const handleAreaChange = (value: string) => {
    setSelectedArea(value);
    onDistrictChange(value);
  };

  const clearAll = () => {
    setSelectedCountry('');
    setSelectedState('');
    setSelectedArea('');
    setAreaMode('district');
    setStates([]);
    setAreaItems([]);
    onDistrictChange(undefined);
  };

  return (
    <div className="border-b border-border/40">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <MapPin className="h-3 w-3" />
        <span className="font-medium">Filter by area</span>
        <AnimatePresence>
          {hasFilter && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
            >
              Active
            </motion.span>
          )}
        </AnimatePresence>
        <ChevronDown className={cn('h-3 w-3 ml-auto transition-transform duration-200', expanded && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Country */}
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Select
                  value={selectedCountry || undefined}
                  onValueChange={handleCountryChange}
                  disabled={loadingCountries}
                >
                  <SelectTrigger className="h-7 text-xs rounded-md">
                    <SelectValue placeholder={loadingCountries ? 'Loading...' : 'Country'} />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.filter((c) => c.prm).map((c) => (
                      <SelectItem key={c.prm!} value={c.prm!} className="text-xs">{c.prm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              {/* State */}
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: selectedCountry ? 1 : 0.4, y: 0 }} transition={{ delay: 0.1 }}>
                <Select
                  value={selectedState || undefined}
                  onValueChange={handleStateChange}
                  disabled={!selectedCountry || loadingStates}
                >
                  <SelectTrigger className="h-7 text-xs rounded-md">
                    <SelectValue placeholder={loadingStates ? 'Loading...' : 'State'} />
                  </SelectTrigger>
                  <SelectContent>
                    {states.filter((s) => s.prm).map((s) => (
                      <SelectItem key={s.prm!} value={s.prm!} className="text-xs">{s.prm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              {/* District / City toggle + select */}
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: selectedState ? 1 : 0.4, y: 0 }} transition={{ delay: 0.15 }} className="space-y-1.5">
                <div className="flex rounded-md border bg-muted/50 p-0.5">
                  {(['district', 'city'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={!selectedState}
                      onClick={() => handleAreaModeChange(mode)}
                      className={cn(
                        'flex-1 rounded-sm px-2 py-0.5 text-[10px] font-medium transition-all',
                        areaMode === mode
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {mode === 'district' ? 'District' : 'City'}
                    </button>
                  ))}
                </div>
                <Select
                  value={selectedArea || undefined}
                  onValueChange={handleAreaChange}
                  disabled={!selectedState || loadingArea}
                >
                  <SelectTrigger className="h-7 text-xs rounded-md">
                    <SelectValue placeholder={loadingArea ? 'Loading...' : (areaMode === 'district' ? 'District' : 'City')} />
                  </SelectTrigger>
                  <SelectContent>
                    {areaItems.filter((d) => d.prm).map((d) => (
                      <SelectItem key={d.prm!} value={d.prm!} className="text-xs">{d.prm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Clear */}
              <AnimatePresence>
                {hasFilter && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    onClick={clearAll}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                    Clear filter
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Branch Selector ─────────────────────────────────────────────────────────

export function BranchSelector({
  branches,
  selectedSid,
  onBranchChange,
  loading,
  isHQ = true,
  branchName,
  size = 'compact',
  onDistrictFilter,
  allowAll = false,
  isAll = false,
}: BranchSelectorProps) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (allowAll && isAll) return t('allBranches');
    if (branchName) return branchName;
    return branches.find((b) => b.sid === selectedSid)?.name || '';
  }, [branches, selectedSid, branchName, allowAll, isAll, t]);

  const handleDistrictChange = useCallback((district?: string) => {
    onDistrictFilter?.(district);
  }, [onDistrictFilter]);

  if (!isHQ) {
    return (
      <span className={labelStyles[size]}>
        {branchName || selectedSid}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          disabled={loading}
          className={cn(
            'inline-flex items-center justify-between gap-1.5 rounded-md transition-colors',
            'text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
            triggerStyles[size],
          )}
        >
          {loading ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="truncate">{t('loadingBranches')}</span>
            </span>
          ) : (
            <span className="truncate">{selectedLabel || t('selectBranch')}</span>
          )}
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start" sideOffset={8}>
        {/* Area filter (HQ only) */}
        {onDistrictFilter && <AreaFilter onDistrictChange={handleDistrictChange} />}

        <Command>
          <CommandInput placeholder={`Search ${branches.length} branches...`} />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-6 text-center space-y-1">
              <p className="text-xs text-muted-foreground">No branch found</p>
              {onDistrictFilter && branches.length === 0 && (
                <p className="text-[10px] text-muted-foreground/60">Try clearing the area filter</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  // cmdk filters on `value`; keep it searchable as "all"
                  value={`__all__ ${t('allBranches')}`}
                  onSelect={() => {
                    onBranchChange('');
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Network className={cn('h-3.5 w-3.5 shrink-0', isAll ? 'text-primary' : 'text-muted-foreground/50')} />
                  <span className={cn('flex-1 text-sm', isAll && 'font-semibold')}>{t('allBranches')}</span>
                  {isAll && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </CommandItem>
              )}
              {branches.map((b) => {
                const isActive = !isAll && selectedSid === b.sid;
                return (
                  <CommandItem
                    key={b.sid}
                    value={b.name}
                    onSelect={() => {
                      onBranchChange(b.sid);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Building2 className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground/30',
                    )} />
                    <span className={cn(
                      'flex-1 text-sm',
                      isActive && 'font-semibold',
                    )}>
                      {b.name}
                    </span>
                    {isActive && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
