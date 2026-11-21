/**
 * ============================================================================
 * Student profile → section update requests
 * ============================================================================
 *
 * The backend saves a profile section by section ("Student Profile" in
 * https://api02.awfatech.com/docs/user):
 *
 *   main             PUT /student/profile                  multipart: admin fields, flags (JSON), profileImage
 *   personal         PUT /student/profile/personal         { uid, personal }
 *   address          PUT /student/profile/address          { uid, address }
 *   father / mother  PUT /student/profile/father|mother    { uid, parent }
 *   emergencyContact PUT /student/profile/emergency-contact { uid, emergencyContact }
 *   siblings         PUT /student/profile/siblings         { uid, siblings }  — full replace
 *   customFields     PUT /student/profile/custom-fields    { uid, fields: [{ section, name, value }] }
 *
 * Only sections whose values differ from the loaded record are sent.
 *
 * Not saveable by any of these endpoints (so the form doesn't offer them):
 * personal.parentPhone, address district, emergency house telephone,
 * guardian academicStatus (lives in customFields instead), vaccine,
 * class / course.
 */
import { genderCode } from './student-helpers';
import {
  FLAG_KEYS,
  parseCustomFieldKey,
  type GuardianValues,
  type SiblingValues,
  type StudentFormValues,
} from './student-form-types';
import type { StudentAddress } from '@/types';

export type ProfileSection =
  | 'main'
  | 'personal'
  | 'address'
  | 'father'
  | 'mother'
  | 'emergencyContact'
  | 'siblings'
  | 'customFields';

/** Save order — main first (it may change branch / IC that others validate against). */
export const PROFILE_SECTIONS: ProfileSection[] = [
  'main',
  'personal',
  'address',
  'father',
  'mother',
  'emergencyContact',
  'siblings',
  'customFields',
];

/** Empty string → null, so cleared fields are saved as cleared. */
const v = (s: string | undefined | null) => {
  const t = (s ?? '').trim();
  return t === '' ? null : t;
};

const address = (a: StudentAddress) => ({
  line1: v(a.line1),
  line2: v(a.line2),
  line3: v(a.line3),
  city: v(a.city),
  postcode: v(a.postcode),
  state: v(a.state),
  country: v(a.country),
});

/**
 * The API wants gender "in the format the details API returned it". The form
 * edits "1"/"0"; send words back if the record used words, else digits.
 */
export function genderForApi(formValue: string, original: string | undefined | null): string | null {
  const code = genderCode(formValue);
  if (code === '-') return null;
  const usesWords = /^(male|female)$/i.test(String(original ?? '').trim());
  if (usesWords) return code === 'M' ? 'male' : 'female';
  return code === 'M' ? '1' : '0';
}

const isBlankSibling = (s: SiblingValues) => !s.name && !s.school && !s.birthYear && !s.ic && !s.relation;

/** Comparable snapshot of each section — used to detect what changed. */
function snapshot(values: StudentFormValues): Record<ProfileSection, unknown> {
  const { address: personalAddress, flags, ...personal } = values.personal;
  const strip = (a: StudentAddress) => ({ ...address(a) }); // ignores district (not saveable)
  const guardian = (g: GuardianValues) => {
    const { academicStatus: _a, ...rest } = g; // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...rest, address: strip(g.address) };
  };
  const { telephone: _t, ...emergency } = values.emergencyContact; // eslint-disable-line @typescript-eslint/no-unused-vars
  const { parentPhone: _p, ...personalSaveable } = personal; // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    main: {
      branch: values.branch, name: values.name, ic: values.ic, matric: values.matric,
      registerDate: values.registerDate, endDate: values.endDate, status: values.status,
      academicYear: values.academicYear, educationLevel: values.educationLevel,
      registerNo: values.registerNo, schoolAccount: values.schoolAccount, sponsored: values.sponsored,
      billTo: values.billTo, passportExpiry: values.passportExpiry, visaNo: values.visaNo,
      visaExpiry: values.visaExpiry, flags,
    },
    personal: personalSaveable,
    address: strip(personalAddress),
    father: guardian(values.father),
    mother: guardian(values.mother),
    emergencyContact: { ...emergency, address: strip(emergency.address) },
    siblings: values.siblings.filter((s) => !isBlankSibling(s)),
    customFields: values.customFields,
  };
}

/** Sections whose saveable values differ between the loaded record and the form. */
export function changedSections(
  baseline: StudentFormValues,
  current: StudentFormValues,
  hasNewImage: boolean
): ProfileSection[] {
  const a = snapshot(baseline);
  const b = snapshot(current);
  return PROFILE_SECTIONS.filter(
    (s) => (s === 'main' && hasNewImage) || JSON.stringify(a[s]) !== JSON.stringify(b[s])
  );
}

/**
 * PUT /student/profile — multipart. Sends only the fields that changed
 * (all are optional server-side): multipart can't express null, and
 * re-sending an unchanged IC / matric would re-run the backend's
 * "must be unique" checks for nothing.
 */
export function buildMainForm(
  uid: string,
  values: StudentFormValues,
  image: File | null,
  baseline: StudentFormValues
): FormData {
  const fd = new FormData();
  fd.append('uid', uid);
  const fields: Array<[string, string]> = [
    ['branch', values.branch],
    ['name', values.name.trim()],
    ['ic', values.ic],
    ['matric', values.matric],
    ['registerDate', values.registerDate],
    ['endDate', values.endDate],
    ['status', values.status],
    ['academicYear', values.academicYear],
    ['educationLevel', values.educationLevel],
    ['registerNo', values.registerNo],
    ['schoolAccount', values.schoolAccount],
    ['sponsored', values.sponsored],
    ['billTo', values.billTo],
    ['passportExpiry', values.passportExpiry],
    ['visaNo', values.visaNo],
    ['visaExpiry', values.visaExpiry],
  ];
  for (const [k, val] of fields) {
    const before = String(baseline[k as keyof StudentFormValues] ?? '').trim();
    const after = (val ?? '').trim();
    if (after !== before) fd.append(k, after); // '' clears a field the user emptied
  }
  if (JSON.stringify(values.personal.flags) !== JSON.stringify(baseline.personal.flags)) {
    fd.append(
      'flags',
      JSON.stringify(Object.fromEntries(FLAG_KEYS.map((k) => [k, values.personal.flags[k] ? 1 : 0])))
    );
  }
  if (image) fd.append('profileImage', image, image.name);
  return fd;
}

/** JSON body for every non-main section. */
export function buildSectionBody(
  section: Exclude<ProfileSection, 'main'>,
  uid: string,
  values: StudentFormValues,
  ctx: { originalGender?: string | null; baselineCustomFields?: Record<string, string> }
): object {
  const p = values.personal;
  switch (section) {
    case 'personal':
      return {
        uid,
        personal: {
          gender: genderForApi(p.gender, ctx.originalGender),
          race: v(p.race),
          religion: v(p.religion),
          birthDate: v(p.birthDate),
          birthPlace: v(p.birthPlace),
          birthCertNo: v(p.birthCertNo),
          phone: v(p.phone),
          email: v(p.email),
          nationality: v(p.nationality),
          bloodType: v(p.bloodType),
          transportation: v(p.transportation),
          illnessAllergic: v(p.illnessAllergic),
          previousSchool: v(p.previousSchool),
          otherInfo: v(p.otherInfo),
        },
      };
    case 'address':
      return { uid, address: address(p.address) };
    case 'father':
    case 'mother': {
      const g = values[section];
      return {
        uid,
        parent: {
          name: v(g.name),
          ic: v(g.ic),
          tin: v(g.tin),
          phone: v(g.phone),
          email: v(g.email),
          nationality: v(g.nationality),
          birthPlace: v(g.birthPlace),
          job: {
            employer: v(g.job.employer),
            occupation: v(g.job.occupation),
            officePhone: v(g.job.phone), // form field `job.phone` = office phone
            fax: v(g.job.fax),
            salary: v(g.job.salary),
          },
          address: address(g.address),
          bankInfo: { bankName: v(g.bankInfo.bankName), bankAccount: v(g.bankInfo.bankAccount) },
        },
      };
    }
    case 'emergencyContact': {
      const e = values.emergencyContact;
      return {
        uid,
        emergencyContact: {
          name: v(e.name),
          relation: v(e.relation),
          phone: v(e.phone),
          officePhone: v(e.officePhone),
          email: v(e.email),
          fax: v(e.fax),
          ic: v(e.ic),
          address: address(e.address),
        },
      };
    }
    case 'siblings':
      return {
        uid,
        // full replacement; [] removes all
        siblings: values.siblings
          .filter((s) => !isBlankSibling(s))
          .map((s) => ({
            name: s.name.trim(),
            school: v(s.school),
            birthYear: v(s.birthYear),
            ic: v(s.ic),
            relationship: v(s.relation),
          })),
      };
    case 'customFields': {
      const before = ctx.baselineCustomFields ?? {};
      return {
        uid,
        // only the fields that changed
        fields: Object.entries(values.customFields)
          .filter(([key, val]) => (before[key] ?? '') !== (val ?? ''))
          .map(([key, val]) => ({ ...parseCustomFieldKey(key), value: v(val) })),
      };
    }
  }
}

const MAIN_KEYS = [
  'branch', 'name', 'ic', 'matric', 'registerDate', 'endDate', 'status', 'academicYear',
  'educationLevel', 'registerNo', 'schoolAccount', 'sponsored', 'billTo', 'passportExpiry',
  'visaNo', 'visaExpiry',
] as const;

/**
 * Copies one saved section from `current` into `baseline`, so after a partial
 * failure the next Save only re-sends the sections that didn't go through.
 */
export function acceptSection(
  baseline: StudentFormValues,
  current: StudentFormValues,
  section: ProfileSection
): StudentFormValues {
  const next = structuredClone(baseline);
  const cur = structuredClone(current);
  switch (section) {
    case 'main':
      for (const k of MAIN_KEYS) next[k] = cur[k];
      next.personal.flags = cur.personal.flags;
      break;
    case 'personal': {
      const { address: _a, flags: _f, ...rest } = cur.personal; // eslint-disable-line @typescript-eslint/no-unused-vars
      next.personal = { ...next.personal, ...rest };
      break;
    }
    case 'address':
      next.personal.address = cur.personal.address;
      break;
    case 'father':
    case 'mother':
    case 'emergencyContact':
    case 'siblings':
    case 'customFields':
      (next as unknown as Record<string, unknown>)[section] = cur[section];
      break;
  }
  return next;
}
