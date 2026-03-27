import { attendanceSettingsService } from '@/services/attendance-settings.service';
import { adminSettingsService } from '@/services/admin-settings.service';

export interface StepStatus {
  key: string;
  labelKey: string;
  completed: boolean;
}

export interface SetupStatus {
  completed: boolean;
  completedSteps: number;
  totalSteps: number;
  steps: StepStatus[];
  /** Detected attendance mode, if set */
  mode: 'LOCATION' | 'DEVICE' | null;
  /** First group code found (used for schedule/employee steps) */
  groupCode: string | null;
  /** Schedule template code from first group */
  scheduleCode: string | null;
}

/**
 * Check setup completeness for a given branch (sid).
 * Calls existing APIs and returns which of the 5 wizard steps are done.
 */
export async function checkSetupStatus(sid: string): Promise<SetupStatus> {
  const steps: StepStatus[] = [
    { key: 'mode', labelKey: 'setupMode', completed: false },
    { key: 'location', labelKey: 'setupLocation', completed: false },
    { key: 'group', labelKey: 'setupGroup', completed: false },
    { key: 'schedule', labelKey: 'setupSchedule', completed: false },
    { key: 'employees', labelKey: 'setupEmployees', completed: false },
  ];

  let mode: 'LOCATION' | 'DEVICE' | null = null;
  let groupCode: string | null = null;
  let scheduleCode: string | null = null;

  // Fetch all data in parallel — each call is independent
  const [settingRes, locationRes, deviceRes, groupRes, profileRes] =
    await Promise.allSettled([
      attendanceSettingsService.getAttendanceSetting(sid),
      attendanceSettingsService.getLocationList(sid),
      attendanceSettingsService.getDeviceList(sid),
      adminSettingsService.getGroupList(sid),
      adminSettingsService.getEmployeeProfileList(sid),
    ]);

  // Step 1: Attendance mode
  if (settingRes.status === 'fulfilled' && settingRes.value.success && settingRes.value.data) {
    steps[0].completed = true;
    mode = settingRes.value.data.mode;
  }

  // Step 2: Location or device exists
  const hasLocations =
    locationRes.status === 'fulfilled' &&
    locationRes.value.success &&
    Array.isArray(locationRes.value.data) &&
    locationRes.value.data.length > 0;
  const hasDevices =
    deviceRes.status === 'fulfilled' &&
    deviceRes.value.success &&
    Array.isArray(deviceRes.value.data) &&
    deviceRes.value.data.length > 0;
  if (hasLocations || hasDevices) {
    steps[1].completed = true;
  }

  // Step 3: At least 1 attendance group
  if (
    groupRes.status === 'fulfilled' &&
    groupRes.value.success &&
    Array.isArray(groupRes.value.data) &&
    groupRes.value.data.length > 0
  ) {
    steps[2].completed = true;
    groupCode = groupRes.value.data[0].code;
    scheduleCode = groupRes.value.data[0].scheduleTemplateCode;
  }

  // Step 4: Schedule customized (check if schedule has any enabled day with times)
  // Backend returns the schedule under "days" key, not "schedule"
  if (scheduleCode) {
    try {
      const schedRes = await adminSettingsService.getSchedule(scheduleCode);
      if (schedRes.success && schedRes.data) {
        const schedData = schedRes.data as unknown as Record<string, unknown>;
        const schedule =
          (schedData.schedule as Record<string, { enabled: boolean; clockIn: string | null; clockOut: string | null }>) ??
          (schedData.days as Record<string, { enabled: boolean; clockIn: string | null; clockOut: string | null }>);
        if (schedule) {
          const hasCustomizedDay = Object.values(schedule).some(
            (day) => day.enabled && day.clockIn && day.clockOut
          );
          if (hasCustomizedDay) {
            steps[3].completed = true;
          }
        }
      }
    } catch {
      // Leave as not completed
    }
  }

  // Step 5: At least 1 employee assigned
  if (
    profileRes.status === 'fulfilled' &&
    profileRes.value.success &&
    Array.isArray(profileRes.value.data) &&
    profileRes.value.data.length > 0
  ) {
    steps[4].completed = true;
  }

  const completedSteps = steps.filter((s) => s.completed).length;

  return {
    completed: completedSteps === steps.length,
    completedSteps,
    totalSteps: steps.length,
    steps,
    mode,
    groupCode,
    scheduleCode,
  };
}
