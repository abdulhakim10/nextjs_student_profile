import { create } from 'zustand';
import type { StudentListItem } from '@/types';

export interface StudentFilters {
  branch: string;
  /** Session year for class/level filters and class names; '' = branch's current session */
  sessionYear: string;
  search: string;
  status: string;
  academicYear: string;
  educationClass: string;
  educationLevel: string;
}

export type StudentSortField = 'id' | 'name';

export interface StudentSort {
  field: StudentSortField;
  order: 'asc' | 'desc';
}

interface StudentPagination {
  current_page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

/** Active student ("Pelajar") — the list shows these by default. */
export const DEFAULT_STUDENT_STATUS = '6';

export const EMPTY_STUDENT_FILTERS: StudentFilters = {
  branch: '',
  sessionYear: '',
  search: '',
  status: DEFAULT_STUDENT_STATUS,
  academicYear: '',
  educationClass: '',
  educationLevel: '',
};

const DEFAULT_PAGINATION: StudentPagination = {
  current_page: 1,
  page_size: 10,
  total_items: 0,
  total_pages: 0,
};

interface StudentState {
  dataset: StudentListItem[];
  filters: StudentFilters;
  sort: StudentSort;
  pagination: StudentPagination;
  isLoading: boolean;
  selectedUids: string[];

  setDataset: (list: StudentListItem[]) => void;
  setFilters: (filters: Partial<StudentFilters>) => void;
  clearFilters: () => void;
  setSort: (sort: StudentSort) => void;
  setPagination: (pagination: StudentPagination) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  toggleSelected: (uid: string) => void;
  setSelected: (uids: string[]) => void;
}

export const useStudentStore = create<StudentState>((set) => ({
  dataset: [],
  filters: EMPTY_STUDENT_FILTERS,
  sort: { field: 'id', order: 'desc' },
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  selectedUids: [],

  setDataset: (dataset) => set({ dataset, selectedUids: [] }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, current_page: 1 },
    })),
  clearFilters: () =>
    set((state) => ({
      // keep the branch — it's driven by the branch pill, not the filter panel
      filters: { ...EMPTY_STUDENT_FILTERS, branch: state.filters.branch },
      pagination: { ...state.pagination, current_page: 1 },
    })),
  setSort: (sort) =>
    set((state) => ({ sort, pagination: { ...state.pagination, current_page: 1 } })),
  setPagination: (pagination) => set({ pagination }),
  setPage: (page) =>
    set((state) => ({ pagination: { ...state.pagination, current_page: page } })),
  setPageSize: (size) =>
    set((state) => ({ pagination: { ...state.pagination, page_size: size, current_page: 1 } })),
  setLoading: (isLoading) => set({ isLoading }),
  toggleSelected: (uid) =>
    set((state) => ({
      selectedUids: state.selectedUids.includes(uid)
        ? state.selectedUids.filter((u) => u !== uid)
        : [...state.selectedUids, uid],
    })),
  setSelected: (selectedUids) => set({ selectedUids }),
}));
