export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  avatar: string;
  status: 'active' | 'inactive';
  join_date: string;
}

export interface UserFilters {
  search?: string;
  department?: string;
  status?: 'active' | 'inactive' | '';
}

export interface UserFormData {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: 'active' | 'inactive';
}

/** Request body for POST /api/v2/user/{app}/staff/fetch */
export interface UserFetchRequest {
  uid?: string;
  branch?: string;
  search?: string;
  status?: string;
  division?: string;
  position?: string;
  pageOrder?: string;
  pageSort?: 'asc' | 'desc';
  pageLimit?: number;
  pageStart?: number;
  fields?: string[];
}

/** Single item in user fetch dataset */
export interface UserListItem {
  uid: string;
  id: number;
  name: string;
  ic: string | null;
  phone: string;
  email: string;
  branch: number;
  status: number | null;
  profileImage: string;
  isDelete: number;
  position: string | null;
  division: string | null;
  jobStatus: string | null;
  systemLevel: string;
  systemAccess: string | null;
  userType: string;
  branchName: string;
  statusName: string;
}

export interface UserFetchData {
  totalData: number;
  totalRecord: number;
  dataset: UserListItem[];
}

export interface BranchListItem {
  sid: string;
  name: string;
}

/** Used by division, position, and status utility list APIs */
export interface UtilityListItem {
  prm: string | null;
  val: number;
}

