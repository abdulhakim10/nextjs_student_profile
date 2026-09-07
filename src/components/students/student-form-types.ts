import type {
  StudentDetail,
  StudentAddress,
  StudentGuardian,
  StudentFormPayload,
  StudentVaccineInfo,
  YesNo,
} from '@/types';
import { EMPTY_ADDRESS, isEmptyDate } from './student-helpers';

export const FLAG_KEYS = [
  'international',
  'exPrimaryStudent',
  'kariah',
  'hostel',
  'staffChild',
  'orphan',
  'fakir',
  'transit',
  'keluarga',
  'pelajarBerhenti',
  'infoKetiga',
  'test4',
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];

export interface GuardianValues {
  name: string;
  ic: string;
  tin: string;
  phone: string;
  email: string;
  nationality: string;
  birthPlace: string;
  academicStatus: string;
  job: { employer: string; occupation: string; phone: string; fax: string; salary: string };
  address: StudentAddress;
  bankInfo: { bankName: string; bankAccount: string };
}

export interface SiblingValues {
  name: string;
  school: string;
  birthYear: string;
  ic: string;
  relation: string;
}

export interface StudentFormValues {
  branch: string;
  name: string;
  ic: string;
  matric: string;
  course: string;
  className: string;
  classCode: string;
  academicYear: string;
  status: string;
  registerDate: string;
  endDate: string;
  registerNo: string;
  schoolAccount: string;
  sponsored: string;
  mentor: string;
  billTo: string;
  passportExpiry: string;
  visaNo: string;
  visaExpiry: string;
  personal: {
    gender: string;
    race: string;
    religion: string;
    birthCertNo: string;
    birthDate: string;
    birthPlace: string;
    phone: string;
    parentPhone: string;
    email: string;
    nationality: string;
    transportation: string;
    illnessAllergic: string;
    previousSchool: string;
    otherInfo: string;
    address: StudentAddress;
    flags: Record<FlagKey, boolean>;
  };
  father: GuardianValues;
  mother: GuardianValues;
  emergencyContact: {
    name: string;
    ic: string;
    relation: string;
    telephone: string;
    phone: string;
    email: string;
    officePhone: string;
    fax: string;
    address: StudentAddress;
  };
  siblings: SiblingValues[];
  vaccine: StudentVaccineInfo;
}

export type AddressPrefix =
  | 'personal.address'
  | 'father.address'
  | 'mother.address'
  | 'emergencyContact.address';

export type GuardianPrefix = 'father' | 'mother';

export const EMPTY_SIBLING: SiblingValues = { name: '', school: '', birthYear: '', ic: '', relation: '' };

export const EMPTY_VACCINE: StudentVaccineInfo = {
  mySejahtera: '',
  mySejahteraId: '',
  vaccinated: '',
  notVaccinatedReason: '',
  dose1: '',
  dose1Info: '',
  dose2: '',
  dose2Info: '',
  booster: '',
  boosterInfo: '',
};

const clean = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return s === 'None' ? '' : s;
};

/** Date inputs need yyyy-MM-dd; the legacy API uses 0000-00-00 for "none". */
const cleanDate = (v: string | null | undefined): string => (isEmptyDate(v) ? '' : clean(v));

const yesNo = (v: unknown): YesNo => (v === 'yes' || v === 'no' ? v : '');

function toAddress(a?: Partial<StudentAddress> | null): StudentAddress {
  return {
    line1: clean(a?.line1),
    line2: clean(a?.line2),
    line3: clean(a?.line3),
    city: clean(a?.city),
    postcode: clean(a?.postcode),
    state: clean(a?.state),
    country: clean(a?.country) || EMPTY_ADDRESS.country,
    district: clean(a?.district),
  };
}

function toGuardian(g?: Partial<StudentGuardian> | null): GuardianValues {
  return {
    name: clean(g?.name).trim(),
    ic: clean(g?.ic),
    tin: clean(g?.tin),
    phone: clean(g?.phone),
    email: clean(g?.email),
    nationality: clean(g?.nationality),
    birthPlace: clean(g?.birthPlace),
    academicStatus: clean(g?.academicStatus),
    job: {
      employer: clean(g?.job?.employer),
      occupation: clean(g?.job?.occupation),
      phone: clean(g?.job?.phone),
      fax: clean(g?.job?.fax),
      salary: clean(g?.job?.salary),
    },
    address: toAddress(g?.address),
    bankInfo: {
      bankName: clean(g?.bankInfo?.bankName),
      bankAccount: clean(g?.bankInfo?.bankAccount),
    },
  };
}

export function toFormValues(s?: StudentDetail | null): StudentFormValues {
  const flags = FLAG_KEYS.reduce(
    (acc, key) => {
      acc[key] = Boolean(s?.personal?.[key]);
      return acc;
    },
    {} as Record<FlagKey, boolean>
  );

  const siblings: SiblingValues[] = (s?.siblings ?? []).map((sib) => ({
    name: clean(sib.name),
    school: clean(sib.school),
    birthYear: clean(sib.birthYear),
    ic: clean(sib.ic),
    relation: clean(sib.relation),
  }));

  return {
    branch: s?.branch !== undefined && s?.branch !== null ? String(s.branch) : '',
    name: clean(s?.name),
    ic: clean(s?.ic),
    matric: clean(s?.matric),
    course: clean(s?.course),
    className: clean(s?.className),
    classCode: clean(s?.classCode),
    academicYear: clean(s?.academicYear),
    status: s?.status !== undefined && s?.status !== null ? String(s.status) : '6',
    registerDate: cleanDate(s?.registerDate),
    endDate: cleanDate(s?.endDate),
    registerNo: clean(s?.registerNo),
    schoolAccount: clean(s?.schoolAccount),
    sponsored: clean(s?.sponsored),
    mentor: clean(s?.mentor),
    billTo: clean(s?.billTo),
    passportExpiry: cleanDate(s?.passportExpiry),
    visaNo: clean(s?.visaNo),
    visaExpiry: cleanDate(s?.visaExpiry),
    personal: {
      gender: clean(s?.personal?.gender),
      race: clean(s?.personal?.race),
      religion: clean(s?.personal?.religion),
      birthCertNo: clean(s?.personal?.birthCertNo),
      birthDate: cleanDate(s?.personal?.birthDate),
      birthPlace: clean(s?.personal?.birthPlace),
      phone: clean(s?.personal?.phone),
      parentPhone: clean(s?.personal?.parentPhone),
      email: clean(s?.personal?.email),
      nationality: clean(s?.personal?.nationality),
      transportation: clean(s?.personal?.transportation),
      illnessAllergic: clean(s?.personal?.illnessAllergic),
      previousSchool: clean(s?.personal?.previousSchool),
      otherInfo: clean(s?.personal?.otherInfo),
      address: toAddress(s?.personal?.address),
      flags,
    },
    father: toGuardian(s?.father),
    mother: toGuardian(s?.mother),
    emergencyContact: {
      name: clean(s?.emergencyContact?.name),
      ic: clean(s?.emergencyContact?.ic),
      relation: clean(s?.emergencyContact?.relation),
      telephone: clean(s?.emergencyContact?.telephone),
      phone: clean(s?.emergencyContact?.phone),
      email: clean(s?.emergencyContact?.email),
      officePhone: clean(s?.emergencyContact?.officePhone),
      fax: clean(s?.emergencyContact?.fax),
      address: toAddress(s?.emergencyContact?.address),
    },
    siblings: siblings.length ? siblings : [{ ...EMPTY_SIBLING }],
    vaccine: {
      ...EMPTY_VACCINE,
      ...(s?.vaccine ?? {}),
      mySejahtera: yesNo(s?.vaccine?.mySejahtera),
      vaccinated: yesNo(s?.vaccine?.vaccinated),
      dose1: yesNo(s?.vaccine?.dose1),
      dose2: yesNo(s?.vaccine?.dose2),
      booster: yesNo(s?.vaccine?.booster),
    },
  };
}

const isBlankSibling = (s: SiblingValues) =>
  !s.name && !s.school && !s.birthYear && !s.ic && !s.relation;

export function toPayload(v: StudentFormValues, uid?: string): StudentFormPayload {
  const { flags, ...personalRest } = v.personal;
  const flagNumbers = FLAG_KEYS.reduce(
    (acc, key) => {
      acc[key] = flags[key] ? 1 : 0;
      return acc;
    },
    {} as Record<FlagKey, number>
  );

  return {
    uid,
    branch: v.branch ? Number(v.branch) : undefined,
    name: v.name.trim(),
    ic: v.ic,
    matric: v.matric,
    course: v.course,
    className: v.className,
    classCode: v.classCode,
    academicYear: v.academicYear,
    status: Number(v.status) || 0,
    registerDate: v.registerDate,
    endDate: v.endDate,
    registerNo: v.registerNo,
    schoolAccount: v.schoolAccount,
    sponsored: v.sponsored,
    mentor: v.mentor,
    billTo: v.billTo,
    passportExpiry: v.passportExpiry,
    visaNo: v.visaNo,
    visaExpiry: v.visaExpiry,
    personal: { ...personalRest, ...flagNumbers },
    father: v.father,
    mother: v.mother,
    emergencyContact: v.emergencyContact,
    siblings: v.siblings.filter((s) => !isBlankSibling(s)),
    vaccine: v.vaccine,
  };
}
