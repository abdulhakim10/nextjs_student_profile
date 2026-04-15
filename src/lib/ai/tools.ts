import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// Tools that require user confirmation before execution
export const WRITE_TOOLS = new Set<string>([
  // Add write tool names here, e.g.:
  // 'create_item',
  // 'update_item',
  // 'sample_action',
]);

// Actions the user can skip (do later) instead of cancel — shown as "Skip for now"
export const SKIPPABLE_ACTIONS = new Set<string>([
  // Add skippable action names here
]);

/** Resolve the actual action name from a tool call */
export function resolveActionName(toolName: string, toolInput?: Record<string, unknown>): string {
  return toolName === 'ai_task' && toolInput?.action
    ? (toolInput.action as string)
    : toolName;
}

/**
 * Define your AI tools here.
 * Each tool maps to a backend API endpoint handled in route.ts.
 *
 * Example tools from the base structure (uncomment and customize as needed):
 *
 * {
 *   name: 'sample_query',
 *   description: 'Query data from the system. Use this for read-only questions about users, settings, or general information.',
 *   input_schema: {
 *     type: 'object' as const,
 *     properties: {
 *       category: {
 *         type: 'string',
 *         enum: ['user', 'setting', 'general'],
 *         description: 'Category of data to query',
 *       },
 *       query: { type: 'string', description: 'Natural language question' },
 *       filters: { type: 'object', description: 'Optional filters: search, status, page, limit' },
 *     },
 *     required: ['category', 'query'],
 *   },
 * },
 * {
 *   name: 'sample_action',
 *   description: 'Perform a write action that modifies data. Requires user confirmation.',
 *   input_schema: {
 *     type: 'object' as const,
 *     properties: {
 *       action: {
 *         type: 'string',
 *         enum: ['create', 'update', 'delete'],
 *         description: 'The type of action to perform',
 *       },
 *       resource: { type: 'string', description: 'The resource type to act on' },
 *       params: { type: 'object', description: 'Action-specific parameters' },
 *     },
 *     required: ['action', 'resource', 'params'],
 *   },
 * },
 * {
 *   name: 'get_users',
 *   description: 'Fetch user list with optional search and pagination.',
 *   input_schema: {
 *     type: 'object' as const,
 *     properties: {
 *       search: { type: 'string', description: 'Search by name or email' },
 *       page: { type: 'number' },
 *       page_size: { type: 'number' },
 *     },
 *     required: [],
 *   },
 * },
 */
export const AI_TOOLS: Tool[] = [];
