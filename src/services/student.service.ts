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
  StudentLevelResponse,
  StudentSessions,
} from '@/types';
import type { ProfileSection } from '@/components/students/student-profile-sections';

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
      sessionYear: '',
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

  /** Student detail — GET /api/v2/user/{app}/student/profile/{uid} */
  getDetail: async (uid: string) => {
    const response = await apiClient.get<ApiResponse<StudentDetail>>(
      API_ENDPOINTS.STUDENT.DETAIL(uid)
    );
    return response.data;
  },

  /** Session years — GET /api/v2/user/{app}/student/sessions/{branch} */
  getSessions: async (branch: string) => {
    const response = await apiClient.get<ApiResponse<StudentSessions>>(API_ENDPOINTS.STUDENT.SESSIONS(branch));
    return response.data;
  },

  /** Level list — GET /api/v2/user/{app}/student/levels/{branch} */
  getLevelList: async (branch: string) => {
    const response = await apiClient.get<ApiResponse<StudentLevelResponse>>(
      API_ENDPOINTS.STUDENT.LEVEL_LIST(branch)
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

  /**
   * Section updates — PUT /api/v2/user/{app}/student/profile[/section].
   * Build bodies with student-profile-sections.ts; each includes `uid`.
   */
  updateProfileMain: async (form: FormData) => {
    const response = await apiClient.put<ApiResponse<unknown>>(API_ENDPOINTS.STUDENT.PROFILE.MAIN(), form, {
      // let the browser set the multipart boundary
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateProfileSection: async (section: Exclude<ProfileSection, 'main'>, body: object) => {
    const url = {
      personal: API_ENDPOINTS.STUDENT.PROFILE.PERSONAL(),
      address: API_ENDPOINTS.STUDENT.PROFILE.ADDRESS(),
      father: API_ENDPOINTS.STUDENT.PROFILE.FATHER(),
      mother: API_ENDPOINTS.STUDENT.PROFILE.MOTHER(),
      emergencyContact: API_ENDPOINTS.STUDENT.PROFILE.EMERGENCY_CONTACT(),
      siblings: API_ENDPOINTS.STUDENT.PROFILE.SIBLINGS(),
      customFields: API_ENDPOINTS.STUDENT.PROFILE.CUSTOM_FIELDS(),
    }[section];
    const response = await apiClient.put<ApiResponse<unknown>>(url, body);
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
