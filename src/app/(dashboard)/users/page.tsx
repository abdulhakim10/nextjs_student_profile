'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/stores/user.store';
import { userService } from '@/services/user.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataPagination } from '@/components/shared/data-pagination';
import { EmptyState } from '@/components/shared/empty-state';
import type { UserListItem, BranchListItem, UtilityListItem } from '@/types';
import { Search, Eye, X } from 'lucide-react';

export default function UsersPage() {
  const {
    userDataset,
    fetchFilters,
    pagination,
    isLoading,
    setUserDataset,
    setFetchFilters,
    clearFilters,
    setPagination,
    setPage,
    setLoading,
  } = useUserStore();

  const [searchValue, setSearchValue] = useState(fetchFilters.search ?? '');

  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [divisions, setDivisions] = useState<UtilityListItem[]>([]);
  const [positions, setPositions] = useState<UtilityListItem[]>([]);
  const [statuses, setStatuses] = useState<UtilityListItem[]>([]);

  const [branchesLoading, setBranchesLoading] = useState(true);
  const [subFiltersLoading, setSubFiltersLoading] = useState(false);

  const selectedBranch = fetchFilters.branch ?? '';
  const hasBranch = selectedBranch !== '';

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const res = await userService.getBranchList();
      if (res.success && res.data) setBranches(res.data);
    } catch {
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userService.fetchUsers({
        uid: '',
        branch: fetchFilters.branch ?? '',
        search: fetchFilters.search ?? '',
        status: fetchFilters.status || '0',
        division: fetchFilters.division ?? '',
        position: fetchFilters.position ?? '',
        pageOrder: 'name',
        pageSort: 'asc',
        pageLimit: pagination.page_size,
        pageStart: pagination.current_page,
        fields: [],
      });
      if (response.success && response.data) {
        setUserDataset(response.data.dataset);
        const total = response.data.totalRecord;
        setPagination({
          current_page: pagination.current_page,
          page_size: pagination.page_size,
          total_items: total,
          total_pages: Math.max(1, Math.ceil(total / pagination.page_size)),
        });
      } else {
        setUserDataset([]);
      }
    } catch {
      setUserDataset([]);
      setPagination({ ...pagination, total_items: 0, total_pages: 0 });
    } finally {
      setLoading(false);
    }
  }, [fetchFilters, pagination.current_page, pagination.page_size, setUserDataset, setPagination, setLoading]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  useEffect(() => {
    if (hasBranch) {
      fetchSubFilters(selectedBranch);
    } else {
      setDivisions([]);
      setPositions([]);
      setStatuses([]);
    }
  }, [selectedBranch, hasBranch, fetchSubFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (fetchFilters.search ?? '')) {
        setFetchFilters({ search: searchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, fetchFilters.search, setFetchFilters]);

  const handleBranchChange = (value: string) => {
    const branch = value === 'all' ? '' : value;
    setFetchFilters({ branch, division: '', position: '', status: '' });
  };

  const hasActiveFilters =
    hasBranch ||
    (fetchFilters.search ?? '') !== '' ||
    (fetchFilters.division ?? '') !== '' ||
    (fetchFilters.position ?? '') !== '' ||
    (fetchFilters.status ?? '') !== '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">View and filter users in your organization.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={selectedBranch === '' ? 'all' : selectedBranch}
          onValueChange={handleBranchChange}
          disabled={branchesLoading}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.sid} value={b.sid}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={(fetchFilters.division ?? '') === '' ? 'all' : fetchFilters.division!}
          onValueChange={(v) => setFetchFilters({ division: v === 'all' ? '' : v })}
          disabled={!hasBranch || subFiltersLoading}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={hasBranch ? 'Division' : 'Select branch first'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All divisions</SelectItem>
            {divisions.filter((d): d is typeof d & { prm: string } => !!d.prm).map((d) => (
              <SelectItem key={d.prm} value={d.prm}>
                {d.prm}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={(fetchFilters.position ?? '') === '' ? 'all' : fetchFilters.position!}
          onValueChange={(v) => setFetchFilters({ position: v === 'all' ? '' : v })}
          disabled={!hasBranch || subFiltersLoading}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={hasBranch ? 'Position' : 'Select branch first'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All positions</SelectItem>
            {positions.filter((p): p is typeof p & { prm: string } => !!p.prm).map((p) => (
              <SelectItem key={p.prm} value={p.prm}>
                {p.prm}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={(fetchFilters.status ?? '') === '' ? 'all' : fetchFilters.status!}
          onValueChange={(v) => setFetchFilters({ status: v === 'all' ? '' : v })}
          disabled={!hasBranch || subFiltersLoading}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={hasBranch ? 'Status' : 'Select branch first'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.filter((s): s is typeof s & { prm: string } => !!s.prm).map((s) => (
              <SelectItem key={s.prm} value={s.prm}>
                {s.prm}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearFilters();
              setSearchValue('');
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : userDataset.length === 0 ? (
        <EmptyState
          title="No users found"
          description="No users match the current filters."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userDataset.map((user: UserListItem) => (
                <TableRow key={user.uid}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-xl">
                        <AvatarImage src={user.profileImage} alt={user.name} />
                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/80 to-primary/40 text-white text-xs font-medium">
                          {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.branchName || '-'}</TableCell>
                  <TableCell>{user.division || '-'}</TableCell>
                  <TableCell>{user.position || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.statusName ? 'default' : 'secondary'}>
                      {user.statusName || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/users/${user.uid}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DataPagination
        currentPage={pagination.current_page}
        totalPages={pagination.total_pages}
        totalItems={pagination.total_items}
        pageSize={pagination.page_size}
        onPageChange={setPage}
      />
    </div>
  );
}
