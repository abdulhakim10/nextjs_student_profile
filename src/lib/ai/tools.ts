import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// Tools that require user confirmation before execution
export const WRITE_TOOLS = new Set<string>([
  // Add write tool names here, e.g.:
  // 'create_item',
  // 'update_item',
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
 * Example:
 * {
 *   name: 'get_items',
 *   description: 'Fetch items from the system',
 *   input_schema: {
 *     type: 'object' as const,
 *     properties: {
 *       query: { type: 'string', description: 'Search query' },
 *     },
 *     required: ['query'],
 *   },
 * },
 */
export const AI_TOOLS: Tool[] = [];
