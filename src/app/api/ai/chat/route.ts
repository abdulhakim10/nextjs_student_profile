/**
 * AI Chat Route — Agentic tool-calling loop with Claude
 *
 * Two flows:
 *   Regular message  → Claude picks tools → reads auto-execute, writes become
 *                      pendingActions returned to client for confirmation
 *   Confirmed action → Execute confirmed tool → resume loop, auto-execute ALL
 *                      follow-up tools (user already approved the intent)
 *
 * Setup order is enforced via system prompt rules + buildSetupReminder().
 * The AI is instructed to follow this exact sequence:
 *   A. update_setting (set mode)
 *   B. upsert_location / create_device (auto-registers in settings)
 *   C. create_group (with schedule)
 *   D. assign_employees
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AI_TOOLS, WRITE_TOOLS, EMPLOYEE_ACTIONS } from '@/lib/ai/tools';
import { buildSystemPrompt, buildCompactSystemPrompt } from '@/lib/ai/system-prompt';
import {
  fetchSystemState,
  invalidateStateCache,
  UnauthorizedError,
  type SystemState,
} from '@/lib/ai/state-fetcher';
import {
  attendanceUrl,
  API_BASE_URL,
  UTILITIES_BASE_URL,
  NOTIFICATION_BASE_URL,
  EMAIL_BASE_URL,
  API_VERSION,
  DEFAULT_APP,
  DEFAULT_USER,
  type BranchInfo,
} from '@/lib/ai/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthHeaders = Record<string, string>;

interface ToolInput {
  sid?: string;
  name?: string;
  description?: string;
  days?: Record<string, unknown>;
  report_type?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  page_size?: number;
  uid?: string | string[];
  title?: string;
  body?: string;
  category?: string;
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  action?: string;
  params?: Record<string, unknown>;
  address?: string;
  ot_policy_code?: string;
  to?: string | string[];
  subject?: string;
  dynamic_template_data?: Record<string, unknown>;
}

interface FileDownload {
  filename: string;
  base64: string;
  mimeType: string;
}

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  fileDownload?: FileDownload;
}

interface PendingAction {
  toolName: string;
  toolInput: ToolInput;
  toolUseId: string;
  description: string;
}

interface ToolResultEntry {
  toolName: string;
  result: unknown;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  sid: string;
  branchName?: string;
  confirmedToolCall?: {
    toolName: string;
    toolInput: ToolInput;
    toolUseId: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CONFIRMED_LOOP_ITERATIONS = 8;
const MAX_REGULAR_LOOP_ITERATIONS = 10;
const MAX_ARRAY_ITEMS = 20;

/** Fallback state when fetch fails. */
const EMPTY_STATE: SystemState = {
  groups: 0,
  groupEntities: [],
  schedules: 0,
  scheduleEntities: [],
  rulesets: 0,
  rulesetEntities: [],
  workingPolicies: 0,
  workingPolicyEntities: [],
  dayTypes: 0,
  locations: 0,
  locationNames: [],
  devices: 0,
  deviceNames: [],
  mode: null,
  employeeProfiles: 0,
};

// ---------------------------------------------------------------------------
// Singleton Anthropic client
// ---------------------------------------------------------------------------

let _anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropicClient;
}

// ---------------------------------------------------------------------------
// Branch cache (5-minute TTL)
// ---------------------------------------------------------------------------

let _branchesCache: { branches: BranchInfo[]; timestamp: number } | null = null;
const BRANCHES_CACHE_TTL_MS = 5 * 60_000;

async function fetchBranches(authHeaders: AuthHeaders): Promise<BranchInfo[]> {
  if (_branchesCache && Date.now() - _branchesCache.timestamp < BRANCHES_CACHE_TTL_MS) {
    return _branchesCache.branches;
  }
  try {
    const url = `${UTILITIES_BASE_URL}/api/${API_VERSION}/utilities/${DEFAULT_APP}/list/branch`;
    const res = await fetch(url, {
      headers: buildHeaders(authHeaders),
      cache: 'no-store',
    });
    if (!res.ok) return _branchesCache?.branches ?? [];
    const json = await res.json();
    const data = json.data ?? json;
    if (!Array.isArray(data)) return _branchesCache?.branches ?? [];
    const branches = data.map((b: BranchInfo) => ({ sid: b.sid, name: b.name }));
    _branchesCache = { branches, timestamp: Date.now() };
    return branches;
  } catch {
    return _branchesCache?.branches ?? [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthHeaders(request: NextRequest): AuthHeaders {
  const headers: AuthHeaders = {};
  const auth = request.headers.get('authorization');
  const encryptedKey = request.headers.get('x-encrypted-key');
  const encryptedUser = request.headers.get('x-encrypted-user');
  if (auth) headers['Authorization'] = auth;
  if (encryptedKey) headers['x-encrypted-key'] = encryptedKey;
  if (encryptedUser) headers['x-encrypted-user'] = encryptedUser;
  return headers;
}

function buildHeaders(authHeaders: AuthHeaders): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeaders };
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

async function executeTool(
  toolName: string,
  input: ToolInput,
  authHeaders: AuthHeaders,
): Promise<ToolResult> {
  const headers = buildHeaders(authHeaders);

  try {
    switch (toolName) {
      case 'ai_question':
        return fetchBackend(attendanceUrl('/ai/question'), 'POST', headers, {
          sid: input.sid,
          category: input.category || 'general',
          query: input.query || '',
          filters: input.filters || null,
          page: input.page || 1,
          limit: input.limit || 50,
        });

      case 'ai_task':
        return fetchBackend(attendanceUrl('/ai/task'), 'POST', headers, {
          sid: input.sid,
          action: input.action,
          params: input.params || {},
        });

      case 'get_branches':
        return fetchBackend(
          `${UTILITIES_BASE_URL}/api/${API_VERSION}/utilities/${DEFAULT_APP}/list/branch`,
          'GET',
          headers,
        );

      case 'get_employees':
        return fetchBackend(
          `${API_BASE_URL}/api/${API_VERSION}/user/${DEFAULT_APP}/staff/fetch`,
          'POST',
          headers,
          {
            uid: '',
            branch: input.sid || '',
            search: input.search || '',
            status: '0',
            division: '',
            position: '',
            pageOrder: 'name',
            pageSort: 'asc',
            pageLimit: input.page_size || 50,
            pageStart: input.page || 1,
            fields: [],
          },
        );

      case 'export_attendance_excel':
        return executeExportExcel(input, headers);

      case 'create_group':
        return executeCreateGroup(input, headers);

      case 'send_notification':
        return fetchBackend(
          `${NOTIFICATION_BASE_URL}/api/${API_VERSION}/notification/${DEFAULT_APP}/${DEFAULT_USER}/targeted`,
          'POST',
          headers,
          {
            uid: input.uid,
            sid: input.sid,
            content: { title: input.title, body: input.body },
          },
        );

      case 'send_email':
        return fetchBackend(
          `${EMAIL_BASE_URL}/api/${API_VERSION}/email/general/send`,
          'POST',
          headers,
          {
            to: input.to,
            subject: input.subject,
            template_type: 'awfatech-attendance',
            dynamic_template_data: input.dynamic_template_data,
          },
        );

      case 'geocode_address':
        return executeGeocode(input);

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Tool execution failed',
    };
  }
}

async function fetchBackend(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<ToolResult> {
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.message || `API returned ${res.status}`, data };
  }
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// Composite tool: create_group + schedule + link
// ---------------------------------------------------------------------------

async function executeCreateGroup(
  input: ToolInput,
  headers: Record<string, string>,
): Promise<ToolResult> {
  // Step 1: Create the group
  const groupResult = await fetchBackend(attendanceUrl('/admin/group'), 'POST', headers, {
    sid: input.sid,
    name: input.name,
    description: input.description,
  });
  if (!groupResult.success) return groupResult;

  const groupData = ((groupResult.data as Record<string, unknown>)?.data ??
    groupResult.data) as Record<string, unknown>;
  const groupCode = groupData.groupCode ?? groupData.code;
  const rulesetCode = groupData.rulesetCode;

  // No schedule requested — link OT policy if provided, then return
  if (!input.days) {
    if (input.ot_policy_code) {
      await fetchBackend(attendanceUrl('/admin/group'), 'PUT', headers, {
        code: groupCode,
        sid: input.sid,
        name: input.name,
        description: input.description,
        rulesetCode,
        otPolicyCode: input.ot_policy_code,
        isActive: true,
      });
      return {
        success: true,
        data: {
          message: `Group "${input.name}" created with OT policy linked`,
          group: { code: groupCode, name: input.name },
          otPolicy: { code: input.ot_policy_code },
        },
      };
    }
    return groupResult;
  }

  // Step 2: Create schedule
  const scheduleName = `${input.name} Schedule`;
  const scheResult = await fetchBackend(attendanceUrl('/admin/schedule'), 'POST', headers, {
    sid: input.sid,
    name: scheduleName,
    description: `Schedule for ${input.name}`,
    isActive: true,
    schedule: transformSchedulePayload(input.days),
  });
  if (!scheResult.success) {
    return {
      success: false,
      error: (scheResult.error || 'Schedule creation failed') + ' (group was created)',
      data: { group: groupResult.data, scheduleError: scheResult.data },
    };
  }

  const scheData = ((scheResult.data as Record<string, unknown>)?.data ??
    scheResult.data) as Record<string, unknown>;
  const scheduleCode = scheData.code;

  // Step 3: Link schedule (and OT policy if provided) to group
  const updatePayload: Record<string, unknown> = {
    code: groupCode,
    sid: input.sid,
    name: input.name,
    description: input.description,
    scheduleTemplateCode: scheduleCode,
    rulesetCode,
    isActive: true,
  };
  if (input.ot_policy_code) {
    updatePayload.otPolicyCode = input.ot_policy_code;
  }

  await fetchBackend(attendanceUrl('/admin/group'), 'PUT', headers, updatePayload);

  const resultData: Record<string, unknown> = {
    message: `Group "${input.name}" created with schedule linked`,
    group: { code: groupCode, name: input.name },
    schedule: { code: scheduleCode, name: scheduleName },
    ruleset: { code: rulesetCode },
  };
  if (input.ot_policy_code) {
    resultData.otPolicy = { code: input.ot_policy_code };
  }

  return { success: true, data: resultData };
}

// ---------------------------------------------------------------------------
// Excel export
// ---------------------------------------------------------------------------

async function executeExportExcel(
  input: ToolInput,
  headers: Record<string, string>,
): Promise<ToolResult> {
  const [reportResult, records] = await Promise.all([
    fetchBackend(attendanceUrl('/admin/attendance-report'), 'POST', headers, {
      sid: input.sid,
      report_type: input.report_type || 'daily',
      start_date: input.start_date,
      end_date: input.end_date,
    }),
    fetchAllAttendanceRecords(input.sid!, input.start_date!, input.end_date!, headers),
  ]);

  const report = reportResult.success
    ? (reportResult.data as Record<string, unknown>)
    : null;

  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Sheet 1: Individual records
  if (records.length > 0) {
    const rows = records.map((r) => ({
      Date: r.date ?? '',
      Name: r.name ?? '',
      UID: r.uid ?? '',
      'Clock In': r.clockInTime ?? r.clock_in_time ?? r.clockIn ?? '-',
      'Clock Out': r.clockOutTime ?? r.clock_out_time ?? r.clockOut ?? '-',
      'Work Hours': r.workHours ?? r.work_hours ?? '-',
      Status: r.status ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records');
  }

  // Sheet 2+: Summary, daily breakdown, department breakdown
  if (report) {
    buildSummarySheets(XLSX, wb, report, input);
  }

  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['No data found for the selected period']]),
      'Report',
    );
  }

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `attendance-report-${input.start_date}-to-${input.end_date}.xlsx`;

  return {
    success: true,
    data: {
      message: `Excel report generated: ${filename}`,
      sheets: wb.SheetNames,
      recordCount: records.length,
    },
    fileDownload: {
      filename,
      base64,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSummarySheets(XLSX: any, wb: any, report: Record<string, unknown>, input: ToolInput): void {
  const breakdown = report.dailyBreakdown as
    | Array<{ present: number; absent: number; late: number; date: string }>
    | undefined;

  if (breakdown) {
    const totalPresent = breakdown.reduce((s, d) => s + d.present, 0);
    const totalAbsent = breakdown.reduce((s, d) => s + d.absent, 0);
    const totalLate = breakdown.reduce((s, d) => s + d.late, 0);
    const total = totalPresent + totalAbsent + totalLate;
    const avgRate = total > 0 ? ((totalPresent / total) * 100).toFixed(1) : '0.0';

    const ws = XLSX.utils.json_to_sheet([
      { Metric: 'Avg. Attendance Rate', Value: `${avgRate}%` },
      { Metric: 'Total Present', Value: String(totalPresent) },
      { Metric: 'Total Absent', Value: String(totalAbsent) },
      { Metric: 'Total Late', Value: String(totalLate) },
      { Metric: 'Report Type', Value: (report.reportType as string) || input.report_type || 'daily' },
      { Metric: 'Date Range', Value: `${input.start_date} to ${input.end_date}` },
    ]);
    ws['!cols'] = [{ wch: 22 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');

    const dailyWs = XLSX.utils.json_to_sheet(
      breakdown.map((d) => ({
        Date: d.date,
        Present: d.present,
        Late: d.late,
        Absent: d.absent,
      })),
    );
    dailyWs['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, dailyWs, 'Daily Breakdown');
  }

  const depts = report.departmentBreakdown as
    | Array<{ department: string; attendanceRate: number; present: number; absent: number }>
    | undefined;

  if (depts?.length) {
    const deptWs = XLSX.utils.json_to_sheet(
      depts.map((d) => ({
        Department: d.department,
        'Attendance Rate (%)': d.attendanceRate,
        Present: d.present,
        Absent: d.absent,
      })),
    );
    deptWs['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, deptWs, 'Department Breakdown');
  }
}

async function fetchAllAttendanceRecords(
  sid: string,
  startDate: string,
  endDate: string,
  headers: Record<string, string>,
): Promise<Array<Record<string, unknown>>> {
  const PAGE_LIMIT = 100;
  const MAX_PAGES = 20;
  const records: Array<Record<string, unknown>> = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(attendanceUrl('/admin/attendance-list'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sid,
        start_date: startDate,
        end_date: endDate,
        search: '',
        status: '',
        page,
        limit: PAGE_LIMIT,
      }),
    });
    if (!res.ok) break;

    const json = await res.json();
    const raw = json.data ?? null;
    const pageRecords = Array.isArray(raw)
      ? raw
      : raw?.list && Array.isArray(raw.list)
        ? raw.list
        : [];

    records.push(...pageRecords);
    if (raw?.pagination?.hasNext !== true) break;
  }

  return records;
}

// ---------------------------------------------------------------------------
// Geocode tool
// ---------------------------------------------------------------------------

async function executeGeocode(input: ToolInput): Promise<ToolResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Google Maps API key not configured' };
  }
  if (!input.address) {
    return { success: false, error: 'Address is required' };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input.address)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return {
        success: false,
        error: `No results found for "${input.address}". Status: ${data.status}`,
      };
    }

    const result = data.results[0];
    return {
      success: true,
      data: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Geocoding failed',
    };
  }
}

// ---------------------------------------------------------------------------
// Schedule payload transformer (snake_case → camelCase for backend)
// ---------------------------------------------------------------------------

function transformSchedulePayload(
  days: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(days)) {
    if (!value || typeof value !== 'object') {
      result[key] = value;
      continue;
    }
    const day = value as Record<string, unknown>;
    const overrides = day.overrides as Record<string, unknown> | undefined;
    result[key] = {
      enabled: day.enabled,
      clockIn: day.clock_in ?? day.clockIn ?? null,
      clockOut: day.clock_out ?? day.clockOut ?? null,
      breakStart: day.break_start ?? day.breakStart ?? null,
      breakEnd: day.break_end ?? day.breakEnd ?? null,
      isOverride: day.is_override ?? day.isOverride ?? false,
      overrides: overrides
        ? {
            rulesetCode: overrides.ruleset_code ?? overrides.rulesetCode ?? null,
            otPolicyCode: overrides.ot_policy_code ?? overrides.otPolicyCode ?? null,
          }
        : null,
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function parseQuickReplies(text: string): { cleanText: string; quickReplies?: string[] } {
  const match = text.match(/<<<QUICK_REPLIES>>>([\s\S]*?)<<<END_QUICK_REPLIES>>>/);
  if (!match) return { cleanText: text };
  const cleanText = text.replace(/<<<QUICK_REPLIES>>>[\s\S]*?<<<END_QUICK_REPLIES>>>/, '').trim();
  const quickReplies = match[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return { cleanText, quickReplies: quickReplies.length > 0 ? quickReplies : undefined };
}

function buildResponse(
  responseText: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  const { cleanText, quickReplies } = parseQuickReplies(responseText);
  return NextResponse.json({
    response: cleanText,
    ...extra,
    ...(quickReplies ? { quickReplies } : {}),
  });
}

function extractText(blocks: Anthropic.TextBlock[]): string {
  return blocks.map((t) => t.text).join('\n');
}

// ---------------------------------------------------------------------------
// Compact tool results — cap large arrays to reduce token usage
// ---------------------------------------------------------------------------

function compactToolResult(result: ToolResult): string {
  const output: { success: boolean; data?: unknown; error?: string } = {
    success: result.success,
  };
  if (result.error) output.error = result.error;

  if (result.data && typeof result.data === 'object') {
    const data = result.data as Record<string, unknown>;

    // Paginated list: { list, pagination }
    if (data.list && Array.isArray(data.list)) {
      const list = data.list as unknown[];
      const truncated = list.length > MAX_ARRAY_ITEMS;
      output.data = {
        ...data,
        list: truncated ? list.slice(0, MAX_ARRAY_ITEMS) : list,
        ...(truncated && { _truncated: `Showing ${MAX_ARRAY_ITEMS} of ${list.length} records` }),
      };
      return JSON.stringify(output);
    }

    // Raw array at top level
    if (Array.isArray(result.data)) {
      const arr = result.data as unknown[];
      if (arr.length > MAX_ARRAY_ITEMS) {
        output.data = {
          items: arr.slice(0, MAX_ARRAY_ITEMS),
          totalCount: arr.length,
          _truncated: `Showing ${MAX_ARRAY_ITEMS} of ${arr.length} items`,
        };
        return JSON.stringify(output);
      }
    }

    // Nested data array (e.g., employee fetch: { data: [...] })
    if (data.data && Array.isArray(data.data)) {
      const arr = data.data as unknown[];
      if (arr.length > MAX_ARRAY_ITEMS) {
        output.data = {
          ...data,
          data: arr.slice(0, MAX_ARRAY_ITEMS),
          _truncated: `Showing ${MAX_ARRAY_ITEMS} of ${arr.length} employees`,
        };
        return JSON.stringify(output);
      }
    }
  }

  output.data = result.data;
  return JSON.stringify(output);
}

// ---------------------------------------------------------------------------
// Setup reminder — injected after confirmed actions to guide next step
// ---------------------------------------------------------------------------

/**
 * After confirming a write tool, remind the AI of the next setup step.
 * Follows the exact API flow:
 *   A. update_setting (set mode)
 *   B. upsert_location / create_device (auto-registers in settings)
 *   C. create_group with days
 *   D. assign_employees
 */
const SETUP_ACTIONS = new Set([
  'update_setting', 'upsert_location', 'delete_location',
  'create_device', 'update_device', 'delete_device',
  'assign_employees',
]);

function buildSetupReminder(
  state: SystemState,
  completedTool: string,
  completedAction?: string,
): string | null {
  const isSetupTool =
    completedTool === 'create_group' ||
    (completedTool === 'ai_task' && !!completedAction && SETUP_ACTIONS.has(completedAction));
  if (!isSetupTool) return null;

  // After setting mode → next is create location/device
  if (completedAction === 'update_setting') {
    if (state.mode === 'LOCATION' && state.locations === 0) {
      return '[SYSTEM: Mode set. Next → if user gave a place name, call geocode_address first. Then call ai_task(upsert_location) with { name, address, coordinates: { type: "Point", coordinates: [lng, lat] }, radius_meter, is_active: true }. Pass the correct sid.]';
    }
    if (state.mode === 'DEVICE' && state.devices === 0) {
      return '[SYSTEM: Mode set. Next → call ai_task(create_device). Pass the correct sid.]';
    }
  }

  // After creating location/device → next is create group
  if (completedAction === 'upsert_location' || completedAction === 'create_device') {
    return '[SYSTEM: Location/device created. Next → call create_group with days param to create group + schedule.]';
  }

  // assign_employees is the final setup step — no next action
  if (completedAction === 'assign_employees') return null;

  // General decision tree based on current state
  if (!state.mode) {
    return '[SYSTEM: Next → call ai_task(update_setting) to set attendance mode (LOCATION or DEVICE).]';
  }
  if (state.mode === 'LOCATION' && state.locations === 0) {
    return '[SYSTEM: Next → call ai_task(upsert_location) to create a GPS location. Pass the correct sid.]';
  }
  if (state.mode === 'DEVICE' && state.devices === 0) {
    return '[SYSTEM: Next → call ai_task(create_device). Pass the correct sid.]';
  }
  if (state.groups === 0) {
    return '[SYSTEM: Next → call create_group with days param to create group + schedule.]';
  }
  if (state.employeeProfiles === 0) {
    return '[SYSTEM: Next → call ai_task(assign_employees) to assign staff to the group.]';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tool action descriptions (for confirmation cards)
// ---------------------------------------------------------------------------

function isEmployeeAction(toolName: string, input: ToolInput): boolean {
  return toolName === 'ai_task' && !!input.action && EMPLOYEE_ACTIONS.has(input.action);
}

function describeToolAction(toolName: string, input: ToolInput): string {
  if (toolName === 'ai_task') {
    const action = input.action || 'unknown';
    const params = input.params as Record<string, unknown> | undefined;
    const name = params?.name as string | undefined;
    const code = params?.code as string | undefined;
    return describeAiTaskAction(action, name, code, params) || `Execute ${action}`;
  }
  if (toolName === 'create_group') {
    return input.days
      ? `Create attendance group "${input.name}" with schedule`
      : `Create attendance group "${input.name}"`;
  }
  if (toolName === 'send_notification') {
    return `Send notification "${input.title}" to ${Array.isArray(input.uid) ? input.uid.length : 1} employee(s)`;
  }
  if (toolName === 'send_email') {
    return `Send email "${input.subject}" to ${Array.isArray(input.to) ? input.to.length : 1} recipient(s)`;
  }
  return `Execute ${toolName}`;
}

/** Map ai_task action names to human-readable descriptions for confirmation cards. */
function describeAiTaskAction(
  action: string,
  name?: string,
  code?: string,
  params?: Record<string, unknown>,
): string | null {
  switch (action) {
    case 'create_group':          return `Create attendance group "${name || ''}"`;
    case 'update_group':          return `Update attendance group "${name || code || ''}"`;
    case 'delete_group':          return `Delete attendance group (${code || ''})`;
    case 'create_schedule':       return `Create schedule template "${name || ''}"`;
    case 'update_schedule':       return `Update schedule template (${code || ''})`;
    case 'delete_schedule':       return `Delete schedule template (${code || ''})`;
    case 'assign_employees':      return `Assign employees to group ${params?.group_code || params?.attendance_group_code || ''}`;
    case 'remove_employees':      return `Remove employees from group`;
    case 'update_employee_profile': return `Update employee profile`;
    case 'create_ruleset':        return `Create ruleset "${name || ''}"`;
    case 'update_ruleset':        return `Update ruleset "${name || code || ''}"`;
    case 'delete_ruleset':        return `Delete ruleset (${code || ''})`;
    case 'create_working_policy': return `Create working/OT policy "${name || ''}"`;
    case 'update_working_policy': return `Update working/OT policy "${name || code || ''}"`;
    case 'delete_working_policy': return `Delete working/OT policy (${code || ''})`;
    case 'update_setting':        return `Update attendance setting`;
    case 'upsert_location':       return `Add/update location "${name || ''}"`;
    case 'delete_location':       return `Delete location (${code || ''})`;
    case 'create_device':         return `Add device "${name || ''}"`;
    case 'update_device':         return `Update device "${name || code || ''}"`;
    case 'delete_device':         return `Delete device (${code || ''})`;
    default:                      return null;
  }
}

// ---------------------------------------------------------------------------
// Shared: execute tool batch and collect results
// ---------------------------------------------------------------------------

async function executeBatch(
  tools: Anthropic.ToolUseBlock[],
  authHeaders: AuthHeaders,
  allToolResults: ToolResultEntry[],
): Promise<{ results: ToolResult[]; toolResultParams: Anthropic.ToolResultBlockParam[]; fileDownload?: FileDownload }> {
  const executed = await Promise.all(
    tools.map((tu) => executeTool(tu.name, tu.input as ToolInput, authHeaders)),
  );

  let fileDownload: FileDownload | undefined;
  const toolResultParams: Anthropic.ToolResultBlockParam[] = [];

  for (let i = 0; i < tools.length; i++) {
    const tu = tools[i];
    const tr = executed[i];
    if (tr.fileDownload) fileDownload = tr.fileDownload;
    allToolResults.push({ toolName: tu.name, result: tr });
    toolResultParams.push({
      type: 'tool_result',
      tool_use_id: tu.id,
      content: compactToolResult(tr),
    });
  }

  return { results: executed, toolResultParams, fileDownload };
}

// ---------------------------------------------------------------------------
// Main POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body: RequestBody = await request.json();
    const { messages, sid, branchName, confirmedToolCall } = body;
    const authHeaders = getAuthHeaders(request);

    if (confirmedToolCall) {
      return handleConfirmedAction(confirmedToolCall, messages, sid, branchName, authHeaders);
    }
    return handleRegularMessage(messages, sid, branchName, authHeaders);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized - session expired' }, { status: 401 });
    }
    console.error('[AI Chat] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Confirmed action flow
// ---------------------------------------------------------------------------

async function handleConfirmedAction(
  confirmedToolCall: NonNullable<RequestBody['confirmedToolCall']>,
  messages: ChatMessage[],
  sid: string,
  branchName: string | undefined,
  authHeaders: AuthHeaders,
): Promise<NextResponse> {
  // Execute confirmed tool first, then fetch fresh state (state must reflect the just-completed action)
  const [result, branches] = await Promise.all([
    executeTool(confirmedToolCall.toolName, confirmedToolCall.toolInput, authHeaders),
    fetchBranches(authHeaders),
  ]);

  invalidateStateCache(sid);
  const state = await fetchSystemState(sid, buildHeaders(authHeaders)).catch(() => null);
  const safeState = state ?? EMPTY_STATE;
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(sid, branchName, safeState, branches);
  const compactPrompt = buildCompactSystemPrompt(sid, branchName, safeState, branches);
  // Resolve the completed action name (ai_task wraps actions like update_setting, upsert_location, etc.)
  const completedAction = confirmedToolCall.toolName === 'ai_task'
    ? (confirmedToolCall.toolInput as ToolInput).action
    : undefined;
  const setupReminder = buildSetupReminder(safeState, confirmedToolCall.toolName, completedAction);

  // Build message history with confirmed tool result
  const currentMessages: Anthropic.MessageParam[] = [
    ...messages.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    {
      role: 'assistant' as const,
      content: [
        {
          type: 'tool_use' as const,
          id: confirmedToolCall.toolUseId,
          name: confirmedToolCall.toolName,
          input: confirmedToolCall.toolInput,
        },
      ],
    },
    {
      role: 'user' as const,
      content: [
        {
          type: 'tool_result' as const,
          tool_use_id: confirmedToolCall.toolUseId,
          content: JSON.stringify(result),
        },
        ...(setupReminder
          ? [{ type: 'text' as const, text: setupReminder }]
          : []),
      ],
    },
  ];

  const allToolResults: ToolResultEntry[] = [
    { toolName: confirmedToolCall.toolName, result },
  ];
  let fileDownload: FileDownload | undefined = result.fileDownload;

  console.log(`[ConfirmedFlow] Tool: ${confirmedToolCall.toolName}, Action: ${completedAction}, Result success: ${result.success}, Error: ${result.error || 'none'}`);

  // If the confirmed action itself failed, return the error immediately — don't loop
  if (!result.success) {
    return buildResponse(
      `The action failed: ${result.error || 'Unknown error'}. Please try again or check the details.`,
      { toolResults: allToolResults, fileDownload },
    );
  }

  // Agentic loop — auto-execute all tools EXCEPT employee actions.
  // Read tools + write tools (setting, location, group) execute automatically after
  // the user confirmed the first action. Only employee-affecting actions pause for
  // a separate confirmation. The AI describes each completed step in its response.
  for (let i = 0; i < MAX_CONFIRMED_LOOP_ITERATIONS; i++) {
    const isFirst = i === 0;
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isFirst ? 2048 : 1024,
      system: isFirst ? systemPrompt : compactPrompt,
      tools: AI_TOOLS,
      messages: currentMessages,
    });

    const toolUses = response.content.filter(
      (c) => c.type === 'tool_use',
    ) as Anthropic.ToolUseBlock[];
    const textBlocks = response.content.filter(
      (c) => c.type === 'text',
    ) as Anthropic.TextBlock[];

    if (toolUses.length === 0 || response.stop_reason === 'end_turn') {
      return buildResponse(extractText(textBlocks) || 'Action completed.', {
        toolResults: allToolResults,
        fileDownload,
      });
    }

    // Partition: auto-execute until we hit an employee-affecting action
    const autoExecute: Anthropic.ToolUseBlock[] = [];
    let employeeAction: PendingAction | null = null;

    for (const tu of toolUses) {
      const tuInput = tu.input as ToolInput;
      if (!employeeAction && isEmployeeAction(tu.name, tuInput)) {
        employeeAction = {
          toolName: tu.name,
          toolInput: tuInput,
          toolUseId: tu.id,
          description: describeToolAction(tu.name, tuInput),
        };
      } else if (!employeeAction) {
        autoExecute.push(tu);
      }
      // Tools after employee action are deferred
    }

    if (employeeAction) {
      // Execute all tools before the employee action
      const batch = await executeBatch(autoExecute, authHeaders, allToolResults);
      if (batch.fileDownload) fileDownload = batch.fileDownload;

      const toolResults: Anthropic.ToolResultBlockParam[] = [...batch.toolResultParams];

      // Mark employee action as pending
      toolResults.push({
        type: 'tool_result',
        tool_use_id: employeeAction.toolUseId,
        content: 'ACTION_PENDING_CONFIRMATION: This action requires user confirmation before execution.',
      });

      // Defer any remaining tools after the employee action
      for (const tu of toolUses) {
        const isAutoExecuted = autoExecute.includes(tu);
        const isEmployeePending = tu.id === employeeAction.toolUseId;
        if (!isAutoExecuted && !isEmployeePending) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: 'DEFERRED: A previous action requires user confirmation first.',
          });
        }
      }

      return buildResponse(
        extractText(textBlocks) || 'Please confirm the employee assignment.',
        {
          toolResults: allToolResults,
          pendingActions: [employeeAction],
          fileDownload,
        },
      );
    }

    // No employee action — auto-execute all tools
    console.log(`[ConfirmedLoop] i=${i}, auto-executing ${toolUses.length} tools: ${toolUses.map(t => `${t.name}(${(t.input as ToolInput).action || ''})`).join(', ')}`);
    const batch = await executeBatch(toolUses, authHeaders, allToolResults);
    if (batch.fileDownload) fileDownload = batch.fileDownload;

    currentMessages.push({ role: 'assistant', content: response.content });
    currentMessages.push({ role: 'user', content: batch.toolResultParams });
  }

  return buildResponse('Action completed.', { toolResults: allToolResults, fileDownload });
}

// ---------------------------------------------------------------------------
// Regular message flow
// ---------------------------------------------------------------------------

async function handleRegularMessage(
  messages: ChatMessage[],
  sid: string,
  branchName: string | undefined,
  authHeaders: AuthHeaders,
): Promise<NextResponse> {
  const [branches, state] = await Promise.all([
    fetchBranches(authHeaders),
    fetchSystemState(sid, buildHeaders(authHeaders)),
  ]);

  const systemPrompt = buildSystemPrompt(sid, branchName, state, branches);
  const compactPrompt = buildCompactSystemPrompt(sid, branchName, state, branches);
  const client = getAnthropicClient();

  const currentMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const allToolResults: ToolResultEntry[] = [];
  let fileDownload: FileDownload | undefined;
  const pendingActions: PendingAction[] = [];

  for (let i = 0; i < MAX_REGULAR_LOOP_ITERATIONS; i++) {
    const isFirst = i === 0;
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isFirst ? 2048 : 1024,
      system: isFirst ? systemPrompt : compactPrompt,
      tools: AI_TOOLS,
      messages: currentMessages,
    });

    const toolUses = response.content.filter(
      (c) => c.type === 'tool_use',
    ) as Anthropic.ToolUseBlock[];
    const textBlocks = response.content.filter(
      (c) => c.type === 'text',
    ) as Anthropic.TextBlock[];

    console.log(`[RegularLoop] i=${i}, tools: ${toolUses.map(t => `${t.name}(${(t.input as ToolInput).action || ''})`).join(', ')}`);

    // No tools — return text response
    if (toolUses.length === 0) {
      return buildResponse(extractText(textBlocks), {
        toolResults: allToolResults,
        pendingActions: pendingActions.length > 0 ? pendingActions : undefined,
        fileDownload,
      });
    }

    // Partition: read tools before first write, everything after is deferred
    const readTools: Anthropic.ToolUseBlock[] = [];
    const writeTools: Anthropic.ToolUseBlock[] = [];
    let firstWriteFound = false;

    for (const tu of toolUses) {
      if (WRITE_TOOLS.has(tu.name)) {
        writeTools.push(tu);
        firstWriteFound = true;
      } else if (!firstWriteFound) {
        readTools.push(tu);
      } else {
        writeTools.push(tu); // read tool after a write — defer it
      }
    }

    // Execute read tools
    const readResults = await Promise.all(
      readTools.map((tu) => executeTool(tu.name, tu.input as ToolInput, authHeaders)),
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let hasPendingWrite = false;

    for (let j = 0; j < readTools.length; j++) {
      const tu = readTools[j];
      const result = readResults[j];
      if (result.fileDownload) fileDownload = result.fileDownload;
      allToolResults.push({ toolName: tu.name, result });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: isFirst
          ? JSON.stringify({ success: result.success, data: result.data, error: result.error })
          : compactToolResult(result),
      });
    }

    // Process write tools — capture first for confirmation, defer rest
    for (const tu of writeTools) {
      if (hasPendingWrite) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: 'DEFERRED: A previous action requires user confirmation first.',
        });
        continue;
      }

      if (WRITE_TOOLS.has(tu.name)) {
        pendingActions.push({
          toolName: tu.name,
          toolInput: tu.input as ToolInput,
          toolUseId: tu.id,
          description: describeToolAction(tu.name, tu.input as ToolInput),
        });
        hasPendingWrite = true;
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: 'ACTION_PENDING_CONFIRMATION: This action requires user confirmation before execution.',
        });
      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: 'DEFERRED: A previous action requires user confirmation first.',
        });
      }
    }

    // Pending write — return immediately for user confirmation
    if (hasPendingWrite) {
      return buildResponse(
        extractText(textBlocks) || 'I would like to proceed with the following action.',
        { toolResults: allToolResults, pendingActions, fileDownload },
      );
    }

    // All read-only — continue loop
    currentMessages.push({ role: 'assistant', content: response.content });
    currentMessages.push({ role: 'user', content: toolResults });

    if (response.stop_reason === 'end_turn') {
      return buildResponse(extractText(textBlocks), {
        toolResults: allToolResults,
        fileDownload,
      });
    }
  }

  return buildResponse(
    'I processed multiple steps but ran into my iteration limit. Please try again with a more specific question.',
    { toolResults: allToolResults, fileDownload },
  );
}
