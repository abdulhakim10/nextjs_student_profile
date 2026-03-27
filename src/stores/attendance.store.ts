import { create } from 'zustand';
import type { AttendanceRecord, AttendanceFilters, AttendanceListPagination, AttendanceGridUser } from '@/types';

// ─── State Interface ─────────────────────────────────────────────────────────

interface AttendanceState {
  // List view
  records: AttendanceRecord[];
  filters: AttendanceFilters;
  pagination: AttendanceListPagination;
  currentPage: number;
  isLoading: boolean;
  error: string | null;

  // Grid view — month page navigation
  selectedDate: string;    // current month anchor (YYYY-MM-DD)
  pageIndex: number;       // active 7-day page within the month (0-based)
  gridUsers: AttendanceGridUser[];
  gridDates: string[];

  // Actions — list
  setRecords: (records: AttendanceRecord[]) => void;
  setFilters: (filters: Partial<AttendanceFilters>) => void;
  clearFilters: () => void;
  setPagination: (pagination: AttendanceListPagination) => void;
  setPage: (page: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions — grid
  setSelectedDate: (date: string) => void;
  setPageIndex: (index: number) => void;
  setGridUsers: (users: AttendanceGridUser[]) => void;
  setGridDates: (dates: string[]) => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0];

const DEFAULT_FILTERS: AttendanceFilters = {
  sid: '',
  search: '',
  status: '',
  start_date: today,
  end_date: today,
};

const DEFAULT_PAGINATION: AttendanceListPagination = {
  totalCount: 0,
  totalPages: 0,
  currentPage: 1,
  limit: 20,
  hasNext: false,
  hasPrev: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAttendanceStore = create<AttendanceState>((set) => ({
  // Initial state
  records: [],
  filters: { ...DEFAULT_FILTERS },
  pagination: { ...DEFAULT_PAGINATION },
  currentPage: 1,
  isLoading: false,
  error: null,
  selectedDate: today,
  pageIndex: 0,
  gridUsers: [],
  gridDates: [],

  // List actions
  setRecords: (records) => set({ records }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      currentPage: 1,
    })),
  clearFilters: () =>
    set({
      filters: { ...DEFAULT_FILTERS },
      currentPage: 1,
    }),
  setPagination: (pagination) => set({ pagination }),
  setPage: (page) => set({ currentPage: page }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),

  // Grid actions — changing month resets page to 0, changing page resets data pagination
  setSelectedDate: (date) => set({ selectedDate: date, pageIndex: 0, currentPage: 1 }),
  setPageIndex: (index) => set({ pageIndex: index, currentPage: 1 }),
  setGridUsers: (users) => set({ gridUsers: users }),
  setGridDates: (dates) => set({ gridDates: dates }),
}));
