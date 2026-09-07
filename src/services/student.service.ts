import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/endpoints';
import type {
  ApiResponse,
  StudentListRequest,
  StudentListData,
  StudentDetail,
  StudentFormPayload,
  StudentStatusItem,
  StudentClassItem,
} from '@/types';

export const studentService = {
  /**
   * Fetch student list — POST /api/v2/user/{app}/student/list
   * Headers (set by api-client from login): x-encrypted-key, x-encrypted-user
   */
  fetchStudents: async (params: Partial<StudentListRequest> = {}) => {
    const body: StudentListRequest = {
      branch: '',
      uid: '',
      search: '',
      ic: '',
      registrationDate: '',
      endDate: '',
      educationClass: '',
      status: '',
      academicYear: '',
      educationLevel: '',
      pageOrder: 'id',
      pageSort: 'desc',
      pageLimit: 10,
      pageStart: 1,
      ...params,
    };
    const response = await apiClient.post<ApiResponse<StudentListData>>(
      API_ENDPOINTS.STUDENT.LIST(),
      body
    );
    return response.data;
  },

  /** Student detail — GET /api/v2/user/{app}/student/{uid} */
  getDetail: async (uid: string) => {
    const response = await apiClient.get<ApiResponse<StudentDetail>>(
      API_ENDPOINTS.STUDENT.DETAIL(uid)
    );
    return response.data;
  },

  /** Status list — GET /api/v2/user/{app}/student/status/{branch} */
  getStatusList: async (branch: string) => {
    const response = await apiClient.get<ApiResponse<StudentStatusItem[]>>(
      API_ENDPOINTS.STUDENT.STATUS_LIST(branch)
    );
    return response.data;
  },

  /** Class list — GET /api/v2/user/{app}/student/classes/{branch} */
  getClassList: async (branch: string) => {
    const response = await apiClient.get<ApiResponse<StudentClassItem[]>>(
      API_ENDPOINTS.STUDENT.CLASS_LIST(branch)
    );
    return response.data;
  },

  /** Create student — POST /api/v2/user/{app}/student (endpoint to be confirmed) */
  create: async (data: StudentFormPayload) => {
    const response = await apiClient.post<ApiResponse<StudentDetail>>(
      API_ENDPOINTS.STUDENT.CREATE(),
      data
    );
    return response.data;
  },

  /** Update student — PUT /api/v2/user/{app}/student/{uid} (endpoint to be confirmed) */
  update: async (uid: string, data: StudentFormPayload) => {
    const response = await apiClient.put<ApiResponse<StudentDetail>>(
      API_ENDPOINTS.STUDENT.UPDATE(uid),
      data
    );
    return response.data;
  },

  /** Delete student — DELETE /api/v2/user/{app}/student/{uid} (endpoint to be confirmed) */
  delete: async (uid: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(
      API_ENDPOINTS.STUDENT.DELETE(uid)
    );
    return response.data;
  },
};
