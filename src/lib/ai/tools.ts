import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// Tools that require user confirmation before execution
export const WRITE_TOOLS = new Set([
  'ai_task',
  'create_group',
  'send_notification',
  'send_email',
]);

// ai_task actions that directly affect employees — require separate confirmation
// even when auto-executing after a prior confirmation
export const EMPLOYEE_ACTIONS = new Set([
  'assign_employees',
  'remove_employees',
  'update_employee_profile',
]);

// Actions the user can skip (do later) instead of cancel — shown as "Skip for now"
export const SKIPPABLE_ACTIONS = new Set([
  ...EMPLOYEE_ACTIONS,
  'send_notification',
  'send_email',
]);

/** Resolve the actual action name from a tool call (ai_task wraps actions) */
export function resolveActionName(toolName: string, toolInput?: Record<string, unknown>): string {
  return toolName === 'ai_task' && toolInput?.action
    ? (toolInput.action as string)
    : toolName;
}

export const AI_TOOLS: Tool[] = [
  // ─── Super APIs — consolidated query & task endpoints ─────────────────────
  {
    name: 'ai_question',
    description:
      'Universal query API — ask ANY question about attendance data. Supports categories: attendance (records, who\'s absent/late/present), employee (info, profiles, group membership), group (list, details, members), schedule (templates, details), summary (dashboard stats), report (daily/weekly/monthly breakdowns with per-employee detail), setting (mode, locations, devices, rulesets, policies, day types). Use "general" category to auto-detect intent from natural language. Filters support: date, start_date, end_date, uid, status, search, group_code, code, type, report_type, include_employee_summary.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sid: { type: 'string', description: 'Branch/server ID' },
        category: {
          type: 'string',
          enum: ['attendance', 'employee', 'group', 'schedule', 'summary', 'report', 'setting', 'general'],
          description: 'Query category. Use "general" to auto-detect from query text.',
        },
        query: {
          type: 'string',
          description: 'Natural language question or structured query',
        },
        filters: {
          type: 'object',
          description: 'Optional filters: date, start_date, end_date, uid, status, search, group_code, code, type, report_type, include_employee_summary',
        },
        page: { type: 'number', description: 'Page number (default 1)' },
        limit: { type: 'number', description: 'Items per page (default 50)' },
      },
      required: ['sid', 'category', 'query'],
    },
  },
  {
    name: 'ai_task',
    description:
      'Universal task API — perform ANY attendance management action. Actions: create_group, update_group, delete_group, create_schedule, update_schedule, delete_schedule, assign_employees, remove_employees, update_employee_profile, create_ruleset, update_ruleset, delete_ruleset, create_working_policy, update_working_policy, delete_working_policy, update_setting, upsert_location, delete_location, create_device, update_device, delete_device. Params vary by action — check action descriptions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sid: { type: 'string', description: 'Branch/server ID' },
        action: {
          type: 'string',
          enum: [
            'create_group', 'update_group', 'delete_group',
            'create_schedule', 'update_schedule', 'delete_schedule',
            'assign_employees', 'remove_employees', 'update_employee_profile',
            'create_ruleset', 'update_ruleset', 'delete_ruleset',
            'create_working_policy', 'update_working_policy', 'delete_working_policy',
            'update_setting', 'upsert_location', 'delete_location',
            'create_device', 'update_device', 'delete_device',
          ],
          description: 'The action to perform',
        },
        params: {
          type: 'object',
          description: 'Parameters for the action. Structure depends on action type.',
        },
      },
      required: ['sid', 'action', 'params'],
    },
  },

  // ─── Composite group creation (group + schedule + link in one step) ────────
  {
    name: 'create_group',
    description:
      'Create a new attendance group with an optional schedule. If `days` is provided, the system will automatically create the schedule template AND link it to the group in one step. Always provide `days` when the user specifies working days/hours. Use this instead of ai_task for group creation when a schedule is needed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sid: { type: 'string', description: 'Branch/server ID' },
        name: { type: 'string', description: 'Group name' },
        description: { type: 'string', description: 'Group description' },
        days: {
          type: 'object',
          description:
            'Optional weekly schedule. If provided, a schedule template is automatically created and linked. Keys MUST be numeric strings: "0"=Sunday, "1"=Monday, "2"=Tuesday, "3"=Wednesday, "4"=Thursday, "5"=Friday, "6"=Saturday. Each day object has: name (string), enabled (bool), clock_in (HH:mm or null), clock_out (HH:mm or null), break_start (HH:mm or null), break_end (HH:mm or null), is_override (bool, default false), overrides (object with ruleset_code: null, ot_policy_code: null). Include ALL 7 days.',
        },
        ot_policy_code: {
          type: 'string',
          description:
            'Optional OT/working policy code to link to this group. Create the policy first with ai_task(create_working_policy), then pass the returned code here.',
        },
      },
      required: ['sid', 'name', 'description'],
    },
  },

  // ─── Special tools (different API endpoints) ──────────────────────────────
  {
    name: 'export_attendance_excel',
    description:
      'Generate and download an Excel file of attendance data. Use when the user asks for an Excel report, spreadsheet, or file download. The file will be automatically downloaded in the browser.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sid: { type: 'string', description: 'Branch/server ID' },
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
        report_type: {
          type: 'string',
          enum: ['daily', 'summary'],
          description: 'Report type (default: daily)',
        },
      },
      required: ['sid', 'start_date', 'end_date'],
    },
  },
  {
    name: 'get_employees',
    description:
      'List employees for a branch with their names, positions, and UIDs. Use this when you need to show employee names to the user (e.g., for assigning to a group). Always use this instead of ai_question when you need to display employee names.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sid: {
          type: 'string',
          description: 'Branch/server ID to filter employees by branch',
        },
        search: {
          type: 'string',
          description: 'Search by employee name or ID (optional)',
        },
        page: {
          type: 'number',
          description: 'Page number (default 1)',
        },
        page_size: {
          type: 'number',
          description: 'Results per page (default 50)',
        },
      },
      required: ['sid'],
    },
  },
  {
    name: 'get_branches',
    description:
      'List all branches/servers the user has access to. Returns branch names and sids. Use this to discover available branches when the user hasn\'t specified one.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'geocode_address',
    description:
      'Convert a place name or address into GPS coordinates (latitude, longitude). Use this when the user provides a location name (e.g., "awfatech global", "KLCC", "Menara TM") instead of coordinates. Returns the best match with lat/lng and formatted address. Always use this before creating a GPS location when the user gives a place name instead of coordinates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        address: {
          type: 'string',
          description: 'Place name or address to geocode (e.g., "awfatech global", "Menara KLCC")',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'send_notification',
    description:
      'Send a push notification to specific employees. Use after config changes to inform affected staff.',
    input_schema: {
      type: 'object' as const,
      properties: {
        uid: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of employee user IDs to notify',
        },
        sid: { type: 'string', description: 'Branch/server ID' },
        title: { type: 'string', description: 'Notification title' },
        body: { type: 'string', description: 'Notification body text' },
      },
      required: ['uid', 'sid', 'title', 'body'],
    },
  },
  {
    name: 'send_email',
    description:
      'Send an email notification to specific employees using the attendance email template. Supports notification types: info (group/schedule changes), warning (late warnings), alert (absent notices, daily reports), success (report ready). The template renders a professional branded email with optional detail card, stats row, highlight metric, tables, and CTA button. Use this when the user wants to email staff about attendance matters.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of recipient email addresses',
        },
        subject: { type: 'string', description: 'Email subject line' },
        dynamic_template_data: {
          type: 'object',
          description:
            'Template data object. Required: logo (use default), title, subtitle, greeting (supports HTML). Optional sections (include only what is needed): notification_type ("info"|"warning"|"alert"|"success"), notification_label (badge text), highlight_value + highlight_label + highlight_sub (key metric card), show_stats + total_staff + total_present + total_late + total_absent (summary cards), detail_title + detail_rows (key-value table as HTML rows), daily_section_title + daily_rows (weekly table), late_section_title + late_rows, absent_section_title + absent_rows, custom_section_title + custom_section_dot + custom_table, cta_url + cta_text (button), text (footer note).',
          properties: {
            logo: { type: 'string', description: 'Logo URL (use default if not specified)' },
            title: { type: 'string', description: 'Email header title' },
            subtitle: { type: 'string', description: 'Email header subtitle' },
            greeting: { type: 'string', description: 'Greeting message (HTML supported)' },
            notification_type: {
              type: 'string',
              enum: ['info', 'warning', 'alert', 'success'],
              description: 'Badge type: info (violet), warning (amber), alert (red), success (green)',
            },
            notification_label: { type: 'string', description: 'Badge text (e.g., "Late Warning", "Group Change")' },
            detail_title: { type: 'string', description: 'Detail card header' },
            detail_rows: { type: 'string', description: 'HTML table rows for detail card. Each row: <tr><td style="padding:8px 0; border-bottom:1px solid #F3F0FA; font-size:13px; color:#9490A6; width:140px; font-weight:500;">Label</td><td style="padding:8px 0; border-bottom:1px solid #F3F0FA; font-size:13px; color:#1a1235; font-weight:600;">Value</td></tr>' },
            cta_url: { type: 'string', description: 'CTA button URL' },
            cta_text: { type: 'string', description: 'CTA button label' },
            text: { type: 'string', description: 'Additional footer note text' },
          },
        },
      },
      required: ['to', 'subject', 'dynamic_template_data'],
    },
  },
];
