'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import {
  Building2,
  Search,
  UserCheck,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Users,
  ShieldCheck,
  UserCog,
  Filter,
  Zap,
  CalendarClock,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataPagination } from '@/components/shared/data-pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { EmployeeProfileFormDialog } from '@/components/admin/employee-profile-form-dialog';
import { OverrideScheduleDialog } from '@/components/admin/override-schedule-dialog';
import { BulkAssignDialog } from '@/components/admin/bulk-assign-dialog';
import { useTranslation } from '@/i18n';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { adminSettingsService } from '@/services/admin-settings.service';
import { userService } from '@/services/user.service';
import type {
  EmployeeProfileListItem,
  EmployeeProfilePayload,
} from '@/types/admin-settings';
import type { UserListItem, UtilityListItem } from '@/types';

export default function EmployeeProfilesPage() {
  const { t: tAdmin } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const { branches, selectedSid, setSelectedSid, loadingBranches } =
    useBranchSelector();

  // Staff list state
  const [staffList, setStaffList] = useState<UserListItem[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Sub-filter options (cascading from branch)
  const [divisions, setDivisions] = useState<UtilityListItem[]>([]);
  const [positions, setPositions] = useState<UtilityListItem[]>([]);
  const [statuses, setStatuses] = useState<UtilityListItem[]>([]);
  const [subFiltersLoading, setSubFiltersLoading] = useState(false);

  // Selected sub-filters
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Existing employee profiles (to show assigned status)
  const [profiles, setProfiles] = useState<EmployeeProfileListItem[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<UserListItem | null>(null);
  const [editingProfile, setEditingProfile] = useState<EmployeeProfileListItem | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ uid: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection state
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [allPagesSelected, setAllPagesSelected] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  // Override schedule dialog state
  const [overrideTarget, setOverrideTarget] = useState<{ uid: string; name: string } | null>(null);

  // Build a lookup map of uid → profile for quick access
  const profileMap = new Map(profiles.map((p) => [p.uid, p]));

  // Valid branch = a real SID, not 'all' or empty
  const hasValidBranch = !!selectedSid && selectedSid !== 'all';

  // Load sub-filter options when branch changes
  const fetchSubFilters = useCallback(async (sid: string) => {
    setSubFiltersLoading(true);
    try {
      const [divRes, posRes, statusRes] = await Promise.all([
        userService.getDivisionList(sid),
        userService.getPositionList(sid),
        userService.getStatusList(sid),
      ]);
      setDivisions(divRes.success && divRes.data ? divRes.data : []);
      setPositions(posRes.success && posRes.data ? posRes.data : []);
      setStatuses(statusRes.success && statusRes.data ? statusRes.data : []);
    } catch {
      setDivisions([]);
      setPositions([]);
      setStatuses([]);
    } finally {
      setSubFiltersLoading(false);
    }
  }, []);

  // Reload sub-filters when branch changes, clear dependent selections
  useEffect(() => {
    if (hasValidBranch) {
      fetchSubFilters(selectedSid);
    } else {
      setDivisions([]);
      setPositions([]);
      setStatuses([]);
    }
    setSelectedDivision('');
    setSelectedPosition('');
    setSelectedStatus('');
  }, [hasValidBranch, selectedSid, fetchSubFilters]);

  // Fetch staff list (only when a real branch is selected)
  const fetchStaff = useCallback(async () => {
    if (!hasValidBranch) return;
    setStaffLoading(true);
    try {
      const res = await userService.fetchUsers({
        branch: selectedSid,
        search: searchQuery,
        division: selectedDivision,
        position: selectedPosition,
        status: selectedStatus || '0',
        pageOrder: 'name',
        pageSort: 'asc',
        pageLimit: pageSize,
        pageStart: currentPage,
      });
      if (res.success && res.data) {
        setStaffList(res.data.dataset ?? []);
        const total = res.data.totalRecord ?? res.data.totalData ?? res.data.dataset?.length ?? 0;
        setTotalItems(total);
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
      } else {
        setStaffList([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch {
      toast.error(tAdmin('failedLoadStaff'));
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  }, [hasValidBranch, selectedSid, searchQuery, selectedDivision, selectedPosition, selectedStatus, currentPage, pageSize]);

  // Fetch existing profiles (only when a real branch is selected)
  const fetchProfiles = useCallback(async () => {
    if (!hasValidBranch) return;
    setProfilesLoading(true);
    try {
      const res = await adminSettingsService.getEmployeeProfileList(selectedSid);
      if (res.success) {
        setProfiles(res.data ?? []);
      }
    } catch {
      // Silently fail — profiles are supplementary data
    } finally {
      setProfilesLoading(false);
    }
  }, [hasValidBranch, selectedSid]);

  // Reset page and selection when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedUids(new Set());
    setAllPagesSelected(false);
  }, [selectedSid, searchQuery, selectedDivision, selectedPosition, selectedStatus]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleStaffClick = (staff: UserListItem) => {
    const existingProfile = profileMap.get(staff.uid);
    setSelectedStaff(staff);
    setEditingProfile(existingProfile ?? null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload: EmployeeProfilePayload) => {
    await adminSettingsService.updateEmployeeProfile(payload);
    toast.success(editingProfile ? tAdmin('profileUpdated') : tAdmin('profileAssigned'));
    fetchProfiles();
  };

  const handleDelete = async () => {
    if (!deleteTarget || !selectedSid) return;
    setDeleting(true);
    try {
      await adminSettingsService.deleteEmployeeProfile(
        deleteTarget.uid,
        selectedSid
      );
      toast.success(tAdmin('profileRemoved'));
      setDeleteTarget(null);
      fetchProfiles();
    } catch {
      toast.error(tAdmin('failedRemoveProfile'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, staff: UserListItem) => {
    e.stopPropagation();
    setDeleteTarget({ uid: staff.uid, name: staff.name });
  };

  const allOnPageSelected = staffList.length > 0 && staffList.every((s) => selectedUids.has(s.uid));
  const someSelected = selectedUids.size > 0 && !allOnPageSelected;
  const hasMultiplePages = totalItems > staffList.length;
  const headerChecked = allOnPageSelected ? true : someSelected ? 'indeterminate' : false;

  const toggleSelect = (uid: string) => {
    setAllPagesSelected(false);
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const selectAllStaff = async () => {
    if (hasMultiplePages) {
      setSelectingAll(true);
      try {
        const res = await userService.fetchUsers({
          branch: selectedSid,
          search: searchQuery,
          division: selectedDivision,
          position: selectedPosition,
          status: selectedStatus || '0',
          pageOrder: 'id',
          pageSort: 'desc',
          pageLimit: totalItems,
          pageStart: 1,
        });
        if (res.success && res.data?.dataset) {
          setSelectedUids(new Set(res.data.dataset.map((s) => s.uid)));
          setAllPagesSelected(true);
        }
      } catch {
        toast.error(tAdmin('failedSelectAll'));
      } finally {
        setSelectingAll(false);
      }
    } else {
      setSelectedUids(new Set(staffList.map((s) => s.uid)));
      setAllPagesSelected(true);
    }
  };

  const toggleSelectAll = async () => {
    if (allOnPageSelected) {
      // Already all selected → clear
      setSelectedUids(new Set());
      setAllPagesSelected(false);
    } else {
      // Not all selected (none or partial) → select all
      await selectAllStaff();
    }
  };

  const handleSelectThisPageOnly = () => {
    setSelectedUids(new Set(staffList.map((s) => s.uid)));
    setAllPagesSelected(false);
  };

  const handleClearSelection = () => {
    setSelectedUids(new Set());
    setAllPagesSelected(false);
  };

  const handleBulkAssign = async (attendanceGroupCode: string) => {
    const uids = [...selectedUids];
    await adminSettingsService.updateEmployeeProfile({
      uid: uids,
      sid: selectedSid,
      attendance_group_code: attendanceGroupCode,
    });
    toast.success(tAdmin('profileAssigned'));
    setSelectedUids(new Set());
    setAllPagesSelected(false);
    fetchProfiles();
  };

  const isLoading = staffLoading || profilesLoading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
          <UserCog className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{tAdmin('attendanceProfile')}</h1>
          <p className="text-xs text-muted-foreground">
            {tAdmin('attendanceProfileDesc')}
          </p>
        </div>
      </div>

      {/* ── Controls Bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedSid}
            onValueChange={setSelectedSid}
            disabled={loadingBranches}
          >
            <SelectTrigger className="w-[200px] h-9 rounded-lg">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.sid} value={b.sid}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasValidBranch && (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tAdmin('searchStaff')}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9 w-[200px] h-9 rounded-lg"
              />
              {searchValue && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchValue('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select
                value={selectedDivision === '' ? 'all' : selectedDivision}
                onValueChange={(v) => setSelectedDivision(v === 'all' ? '' : v)}
                disabled={subFiltersLoading}
              >
                <SelectTrigger className="w-[140px] h-9 rounded-lg">
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tAdmin('allDivisions')}</SelectItem>
                  {divisions.filter((d): d is typeof d & { prm: string } => !!d.prm).map((d) => (
                    <SelectItem key={d.prm} value={d.prm}>
                      {d.prm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedPosition === '' ? 'all' : selectedPosition}
                onValueChange={(v) => setSelectedPosition(v === 'all' ? '' : v)}
                disabled={subFiltersLoading}
              >
                <SelectTrigger className="w-[140px] h-9 rounded-lg">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tAdmin('allPositions')}</SelectItem>
                  {positions.filter((p): p is typeof p & { prm: string } => !!p.prm).map((p) => (
                    <SelectItem key={p.prm} value={p.prm}>
                      {p.prm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedStatus === '' ? 'all' : selectedStatus}
                onValueChange={(v) => setSelectedStatus(v === 'all' ? '' : v)}
                disabled={subFiltersLoading}
              >
                <SelectTrigger className="w-[140px] h-9 rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tAdmin('allStatuses')}</SelectItem>
                  {statuses.filter((s): s is typeof s & { prm: string } => !!s.prm).map((s) => (
                    <SelectItem key={s.prm} value={s.prm}>
                      {s.prm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(searchValue || selectedDivision || selectedPosition || selectedStatus) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => {
                  setSearchValue('');
                  setSelectedDivision('');
                  setSelectedPosition('');
                  setSelectedStatus('');
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                {tCommon('clear')}
              </Button>
            )}
          </>
        )}
      </div>

      {/* ── Section Header + Legend ── */}
      {hasValidBranch && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {tAdmin('staffList')}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-slate-500" />
              {totalItems} {tCommon('total')}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              {profiles.length} assigned
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5 text-amber-500" />
              {Math.max(0, totalItems - profiles.length)} unassigned
            </span>
          </div>
        </div>
      )}

      {hasValidBranch && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardDescription>
              {tAdmin('staffFound').replace('{count}', String(totalItems))}
              {selectedUids.size > 0 && ` — ${selectedUids.size} selected`}
            </CardDescription>
            {selectedUids.size > 0 && (
              <Button size="sm" className="h-9 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700" onClick={() => setBulkAssignOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                {tAdmin('assignGroup').replace('{count}', String(selectedUids.size))}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]" />
                      <TableHead>{tCommon('name')}</TableHead>
                      <TableHead>{tAdmin('email')}</TableHead>
                      <TableHead>{tAdmin('position')}</TableHead>
                      <TableHead>{tAdmin('deviceStatus')}</TableHead>
                      <TableHead>{tAdmin('profile')}</TableHead>
                      <TableHead>OT Policy</TableHead>
                      <TableHead className="w-[100px]">{tCommon('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : staffList.length === 0 ? (
              <EmptyState
                title={tAdmin('noStaffFound')}
                description={
                  searchQuery
                    ? tAdmin('noStaffMatch')
                    : tAdmin('noStaffBranch')
                }
              />
            ) : (
              <>
              {selectedUids.size > 0 && hasMultiplePages && (
                <div className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/30 px-4 py-2 text-sm">
                  {allPagesSelected ? (
                    <>
                      <span>{tAdmin('allStaffSelected').replace('{count}', String(selectedUids.size))}</span>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={handleSelectThisPageOnly}>
                        {tAdmin('selectPageOnly')}
                      </Button>
                      <span className="text-muted-foreground">|</span>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={handleClearSelection}>
                        {tAdmin('clearSelection')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <span>{tAdmin('staffSelectedPage').replace('{count}', String(selectedUids.size))}</span>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={handleClearSelection}>
                        {tAdmin('clearSelection')}
                      </Button>
                    </>
                  )}
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={headerChecked}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>{tCommon('name')}</TableHead>
                      <TableHead>{tAdmin('email')}</TableHead>
                      <TableHead>{tAdmin('position')}</TableHead>
                      <TableHead>{tAdmin('deviceStatus')}</TableHead>
                      <TableHead>{tAdmin('profile')}</TableHead>
                      <TableHead>OT Policy</TableHead>
                      <TableHead className="w-[100px]">{tCommon('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffList.map((staff) => {
                      const profile = profileMap.get(staff.uid);
                      const isAssigned = !!profile;

                      return (
                        <TableRow
                          key={staff.uid}
                          className="cursor-pointer hover:bg-muted/30 [&>td]:py-3"
                          onClick={() => handleStaffClick(staff)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedUids.has(staff.uid)}
                              onCheckedChange={() => toggleSelect(staff.uid)}
                              aria-label={`Select ${staff.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <UserAvatar name={staff.name} size="sm" />
                              <div>
                                <p className="font-medium text-sm">{staff.name}</p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {staff.uid}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {staff.email}
                          </TableCell>
                          <TableCell>{staff.position || '-'}</TableCell>
                          <TableCell>
                            {staff.statusName ? (
                              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                {staff.statusName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAssigned ? (
                              <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" variant="outline">
                                <UserCheck className="h-3 w-3" />
                                {profile.attendanceGroupName}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                                <UserPlus className="h-3 w-3" />
                                {tAdmin('unassigned')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAssigned && profile.otPolicyName ? (
                              <Badge variant="outline" className="gap-1 border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                <Zap className="h-3 w-3" />
                                {profile.otPolicyName}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isAssigned ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStaffClick(staff);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  {profile?.overrideScheduleEnabled && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-violet-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOverrideTarget({ uid: staff.uid, name: staff.name });
                                      }}
                                    >
                                      <CalendarClock className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                    onClick={(e) => handleDeleteClick(e, staff)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStaffClick(staff);
                                  }}
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              </>
            )}

            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <EmployeeProfileFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sid={selectedSid}
        staff={selectedStaff}
        profile={editingProfile}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={tAdmin('removeProfile')}
        description={tAdmin('removeProfileDesc').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={tAdmin('remove')}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Bulk Assign Dialog */}
      <BulkAssignDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        sid={selectedSid}
        selectedCount={selectedUids.size}
        onSubmit={handleBulkAssign}
      />

      {overrideTarget && (
        <OverrideScheduleDialog
          open={!!overrideTarget}
          onOpenChange={(open) => { if (!open) setOverrideTarget(null); }}
          uid={overrideTarget.uid}
          sid={selectedSid}
          staffName={overrideTarget.name}
        />
      )}
    </motion.div>
  );
}
