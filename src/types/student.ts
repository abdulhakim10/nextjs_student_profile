/** Request body for POST /api/v2/user/{app}/student/list */
export interface StudentListRequest {
  branch?: string;
  uid?: string;
  search?: string;
  ic?: string;
  registrationDate?: string;
  endDate?: string;
  sessionYear?: string;
  educationClass?: string;
  status?: string;
  academicYear?: string;
  educationLevel?: string;
  pageOrder?: string;
  pageSort?: 'asc' | 'desc';
  pageLimit?: number;
  pageStart?: number;
}

export interface StudentParentSummary {
  name: string;
  ic: string;
  phone: string;
  email: string;
}

/** Single item in the student list dataset */
export interface StudentListItem {
  uid: string;
  id: number;
  ic: string;
  name: string;
  fileProfile: string | null;
  birthDate: string;
  /** "0" = female, "1" = male */
  gender: string;
  branch: number;
  matric: string;
  academicYear: string;
  className: string | null;
  classCode: string;
  educationLevel: number;
  registerDate: string;
  endDate: string;
  status: number;
  father: StudentParentSummary;
  mother: StudentParentSummary;
}

/** Item of GET /api/v2/user/{app}/student/levels/{branch} */
export interface StudentLevelItem {
  educationLevel: string;
  educationLevelName: string;
}

/** The levels endpoint may return a flat list or a wrapped object */
export type StudentLevelResponse =
  | StudentLevelItem[]
  | { levelLabel?: string; dataset: StudentLevelItem[] };

/** Item of GET /api/v2/user/{app}/student/status/{branch} */
export interface StudentStatusItem {
  status: number;
  statusName: string;
}

/** Item of GET /api/v2/user/{app}/student/classes/{branch} */
export interface StudentClassItem {
  classCode: string;
  className: string;
}

export interface StudentListData {
  totalData: number;
  totalRecord: number;
  dataset: StudentListItem[];
}

export interface StudentAddress {
  line1: string;
  line2: string;
  line3: string;
  city: string;
  postcode: string;
  state: string;
  country: string;
  /** Not returned by the current API — captured by the edit form */
  district?: string;
}

export interface StudentPersonal {
  gender: string;
  race: string;
  religion: string;
  birthCertNo: string;
  birthDate: string;
  birthPlace: string;
  phone: string | null;
  parentPhone: string;
  email: string;
  address: StudentAddress;
  nationality: string;
  bloodType?: string;
  transportation: string;
  illnessAllergic: string;
  previousSchool: string;
  otherInfo: string | null;
  hostel: number;
  exPrimaryStudent: number;
  staffChild: number;
  kariah: number;
  orphan: number;
  international: number;
  fakir: number;
  transit: number;
  keluarga: number;
  pelajarBerhenti: number;
  infoKetiga: number;
  test4: number;
}

export interface StudentGuardianJob {
  employer: string;
  occupation: string;
  phone: string;
  fax: string;
  salary: string;
}

export interface StudentBankInfo {
  bankName: string;
  bankAccount: string;
}

export interface StudentGuardian {
  name: string;
  ic: string;
  tin: string;
  phone: string;
  email: string;
  nationality: string;
  birthPlace: string;
  job: StudentGuardianJob;
  address: StudentAddress;
  bankInfo: StudentBankInfo;
  /** Not returned by the current API — captured by the edit form */
  academicStatus?: string;
}

export interface StudentEmergencyContact {
  name: string;
  relation: string;
  /** Handphone (H/P) */
  phone: string;
  email: string;
  officePhone: string;
  fax: string;
  address: StudentAddress;
  /** Not returned by the current API — captured by the edit form */
  ic?: string;
  telephone?: string;
}

export interface StudentSibling {
  name: string;
  school: string;
  birthYear: string;
  ic?: string;
  relation?: string;
}

export type YesNo = 'yes' | 'no' | '';

/** Vaccine tab — not returned by the current API */
export interface StudentVaccineInfo {
  mySejahtera: YesNo;
  mySejahteraId: string;
  vaccinated: YesNo;
  notVaccinatedReason: string;
  dose1: YesNo;
  dose1Info: string;
  dose2: YesNo;
  dose2Info: string;
  booster: YesNo;
  boosterInfo: string;
}

/**
 * Vaccine as the API returns it: each value is packed "answer|info",
 * e.g. { dose1: "yes|Pfizer 2021-08-01", mysj: "|" }.
 */
export interface StudentVaccineRaw {
  mysj?: string;
  vaccine?: string;
  dose1?: string;
  dose2?: string;
  booster?: string;
}

/** School-configurable extra field. `section` says which part of the profile it belongs to. */
export interface StudentCustomField {
  section:
    | 'student_profile'
    | 'guardian_father'
    | 'guardian_mother'
    | 'emergency_contact'
    | 'others'
    | 'custom_fields'
    | (string & {});
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | (string & {});
  options: string[];
  required: boolean;
  value: string | number | null;
}

export interface StudentRegistrationStatusEntry {
  status: string;
  changedBy?: string;
  changedByType?: string;
  changedAt?: string;
  remarks?: string;
}

/** Online registration record the student was created from (subset we display). */
export interface StudentRegistration {
  applicationNumber?: string;
  status?: string;
  registrationType?: string;
  educationLevel?: string;
  academicYear?: string;
  submittedAt?: string;
  syncedAt?: string;
  config?: { id?: string; name?: string } | null;
  branch?: { id?: string; code?: string; name?: string } | null;
  medicalInfo?: {
    conditions?: string;
    allergies?: string;
    medications?: string;
    specialNeeds?: string;
  } | null;
  academicInfo?: {
    previousSchool?: string;
    previousLevel?: string;
    achievements?: string;
  } | null;
  statusHistory?: StudentRegistrationStatusEntry[];
  [key: string]: unknown;
}

/** GET /student/sessions/{branch} */
export interface StudentSessions {
  branch: string;
  isSemester: boolean;
  startSemester: string | null;
  currentYear: number;
  currentLabel: string;
  years: Array<{ year: number; label: string; isCurrent: boolean }>;
}

/** Response of GET /api/v2/user/{app}/student/profile/{uid} */
export interface StudentDetail {
  uid: string;
  id: number;
  name: string;
  fileProfile: string;
  branch: number;
  systemNo: string;
  matric: string;
  ic: string;
  /** School name — renamed from `course` in the details API */
  school?: string;
  /** @deprecated older responses; read via schoolName() */
  course?: string;
  className: string;
  classCode: string;
  schLogo: string;
  idServer: string;
  registerDate: string;
  endDate: string;
  status: number;
  registerNo: string;
  schoolAccount: string;
  sponsored: string;
  mentor: string;
  mentorUid?: string;
  billTo: string;
  /** stu.etc — top level on /profile/{uid}; also under personal */
  otherInfo?: string;
  /** Status label from the backend — preferred over the status lookup */
  statusName?: string;
  flagLabels?: Record<string, string>;
  customFields?: StudentCustomField[];
  registrationSource?: string;
  registration?: StudentRegistration | null;
  personal: StudentPersonal;
  father: StudentGuardian;
  mother: StudentGuardian;
  emergencyContact: StudentEmergencyContact;
  /** Intake year — present on list rows; optional on detail */
  academicYear?: string;
  /** stu.clslevel — present on list rows; optional on detail */
  educationLevel?: string | number;
  /** Not returned by the current API — kept for the edit form */
  passportExpiry?: string;
  visaNo?: string;
  visaExpiry?: string;
  siblings?: StudentSibling[];
  /** Raw packed format from the API, or the form shape when sent back */
  vaccine?: StudentVaccineRaw | StudentVaccineInfo;
}

/** Payload sent when creating / updating a student */
export type StudentFormPayload = Omit<
  StudentDetail,
  'uid' | 'id' | 'branch' | 'schLogo' | 'idServer' | 'fileProfile' | 'systemNo'
> & { uid?: string; branch?: number };
