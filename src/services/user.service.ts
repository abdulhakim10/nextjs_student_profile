import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/endpoints';
import { API_CONFIG } from '@/config/api';
import type {
  ApiResponse,
  User,
  UserFilters,
  UserFormData,
  UserFetchRequest,
  UserFetchData,
  UserListItem,
  BranchListItem,
  UtilityListItem,
} from '@/types';

const defaultApp = API_CONFIG.DEFAULT_APP;

export const userService = {
  /**
   * Fetch user list — POST /api/v2/user/{app}/staff/fetch
   * Headers (set by api-client from login): Authorization: Bearer {token}, x-encrypted-key, x-encrypted-user
   */
  fetchUsers: async (params: Partial<UserFetchRequest> = {}, app: string = defaultApp) => {
    const body: UserFetchRequest = {
      uid: '',
      branch: '',
      search: '',
      status: '0',
      division: '',
      position: '',
      pageOrder: 'name',
      pageSort: 'asc',
      pageLimit: 10,
      pageStart: 1,
      fields: [],
      ...params,
    };
    const response = await apiClient.post<ApiResponse<UserFetchData>>(
      API_ENDPOINTS.USER.STAFF_FETCH(app),
      body
    );
    return response.data;
  },

  /**
   * Get branch list — GET /api/v2/utilities/{app}/list/branch/all
   * Headers: x-encrypted-key. Optional district param to filter by area.
   */
  getBranchList: async (app: string = defaultApp, district?: string) => {
    const response = await apiClient.get<ApiResponse<BranchListItem[]>>(
      API_ENDPOINTS.UTILITIES.BRANCH_LIST(app),
      district ? { params: { district } } : undefined
    );
    return response.data;
  },

  /**
   * Get country list — GET /api/v2/utilities/{app}/list/country
   */
  getCountryList: async (app: string = defaultApp) => {
    const response = await apiClient.get<ApiResponse<UtilityListItem[]>>(
      API_ENDPOINTS.UTILITIES.COUNTRY_LIST(app)
    );
    return response.data;
  },

  /**
   * Get state list — GET /api/v2/utilities/{app}/list/state?country={name}
   */
  getStateList: async (country: string, app: string = defaultApp) => {
    const response = await apiClient.get<ApiResponse<UtilityListItem[]>>(
      API_ENDPOINTS.UTILITIES.STATE_LIST(app),
      { params: { country } }
    );
    return response.data;
  },

  /**
   * Get district list — GET /api/v2/utilities/{app}/list/district?state={name}
   */
  getDistrictList: async (state: string, app: string = defaultApp) => {
    const response = await apiClient.get<ApiResponse<UtilityListItem[]>>(
      API_ENDPOINTS.UTILITIES.DISTRICT_LIST(app),
      { params: { state } }
    );
    return response.data;
  },

  /**
   * Get city list — GET /api/v2/utilities/{app}/list/city?state={name}&country={name}
   */
  getCityList: async (state: string, country: string, app: string = defaultApp) => {
    const response = await apiClient.get<ApiResponse<UtilityListItem[]>>(
      API_ENDPOINTS.UTILITIES.CITY_LIST(app),
      { params: { state, country } }
    );
    return response.data;
  },

  /**
   * Get division list — GET /api/v2/utilities/{app}/list/user/division?sid={sid}
   * Headers: x-encrypted-key
   */
  getDivisionList: async (sid: string, app: string = defaultApp) => {
    const response = await apiClient.get<ApiResponse<UtilityListItem[]>>(
      API_ENDPOINTS.UTILITIES.DIVISION_LIST(app),
      { params: { sid } }
    );
    return response.data;
  },

  /**
   * Get position list — GET /api/v2/utilities/{app}/list/user/position?sid={sid}
   * Headers: x-encrypted-key
   */
  getPositionList: async (sid: string, app: string = defaultApp) => {
    const response = await apiClient.get<ApiResponse<UtilityListItem[]>>(
      API_ENDPOINTS.UTILITIES.POSITION_LIST(app),
      { params: { sid } }
    );
    return response.data;
  },

  /**
   * Get status list — GET /api/v2/utilities/{app}/list/user/status?sid={sid}
   * Headers: x-encrypted-key
   */
  getStatusList: async (sid: string, app: string = defaultApp) => {
    const response = await apiClient.get<ApiResponse<UtilityListItem[]>>(
      API_ENDPOINTS.UTILITIES.STATUS_LIST(app),
      { params: { sid } }
    );
    return response.data;
  },

  getList: async (filters: UserFilters = {}, page: number = 1, pageSize: number = 20) => {
    const response = await apiClient.get<ApiResponse<{ items: UserListItem[] }>>(
      API_ENDPOINTS.STAFF.LIST,
      {
        params: { page, page_size: pageSize, ...filters },
      }
    );
    return response.data;
  },

  getDetail: async (id: string) => {
    const response = await apiClient.get<ApiResponse<User>>(
      API_ENDPOINTS.STAFF.DETAIL(id)
    );
    return response.data;
  },

  create: async (data: UserFormData) => {
    const response = await apiClient.post<ApiResponse<User>>(
      API_ENDPOINTS.STAFF.CREATE,
      data
    );
    return response.data;
  },

  update: async (id: string, data: Partial<UserFormData>) => {
    const response = await apiClient.put<ApiResponse<User>>(
      API_ENDPOINTS.STAFF.UPDATE(id),
      data
    );
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(
      API_ENDPOINTS.STAFF.DELETE(id)
    );
    return response.data;
  },
};
