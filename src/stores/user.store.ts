import { create } from 'zustand';
import type { User, UserFilters, UserListItem } from '@/types';

interface UserFetchFilters {
  branch?: string;
  search?: string;
  status?: string;
  division?: string;
  position?: string;
}

interface UserState {
  userList: User[];
  /** Dataset from fetchStaff API */
  userDataset: UserListItem[];
  selectedUser: User | null;
  filters: UserFilters;
  /** Filters for fetchStaff (branch, search, division, position, status) */
  fetchFilters: UserFetchFilters;
  pagination: {
    current_page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
  isLoading: boolean;
  error: string | null;

  setUserList: (list: User[]) => void;
  setUserDataset: (list: UserListItem[]) => void;
  setSelectedUser: (user: User | null) => void;
  setFilters: (filters: Partial<UserFilters>) => void;
  setFetchFilters: (filters: Partial<UserFetchFilters>) => void;
  clearFilters: () => void;
  setPagination: (pagination: { current_page: number; page_size: number; total_items: number; total_pages: number }) => void;
  setPage: (page: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userList: [],
  userDataset: [],
  selectedUser: null,
  filters: {},
  fetchFilters: {},
  pagination: { current_page: 1, page_size: 10, total_items: 0, total_pages: 0 },
  isLoading: false,
  error: null,

  setUserList: (userList) => set({ userList }),
  setUserDataset: (userDataset) => set({ userDataset }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
    pagination: { ...state.pagination, current_page: 1 },
  })),
  setFetchFilters: (fetchFilters) => set((state) => ({
    fetchFilters: { ...state.fetchFilters, ...fetchFilters },
    pagination: { ...state.pagination, current_page: 1 },
  })),
  clearFilters: () => set({
    filters: {},
    fetchFilters: {},
    pagination: { current_page: 1, page_size: 10, total_items: 0, total_pages: 0 },
  }),
  setPagination: (pagination) => set({ pagination }),
  setPage: (page) => set((state) => ({ pagination: { ...state.pagination, current_page: page } })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
}));
