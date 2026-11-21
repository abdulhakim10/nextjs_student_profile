/**
 * AI Chat Route — Agentic tool-calling loop with Claude
 *
 * Two flows:
 *   Regular message  → Claude picks tools → reads auto-execute, writes become
 *                      pendingActions returned to client for confirmation
 *   Confirmed action → Execute confirmed tool → resume loop, auto-execute ALL
 *                      follow-up tools (user already approved the intent)
 *
 * Add your module-specific tool execution cases in the executeTool() switch.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AI_TOOLS, WRITE_TOOLS } from '@/lib/ai/tools';
import { buildSystemPrompt, buildCompactSystemPrompt } from '@/lib/ai/system-prompt';
import {
  fetchSystemState,
  fetchBranches,
  invalidateStateCache,
  UnauthorizedError,
  type SystemState,
} from '@/lib/ai/state-fetcher';
import { type BranchInfo } from '@/lib/ai/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthHeaders = Record<string, string>;

interface ToolInput {
  sid?: string;
  [key: string]: unknown;
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
const MAX_HISTORY_MESSAGES = 20;

/** Fallback state when fetch fails. */
const EMPTY_STATE: SystemState = {};

/** Prune conversation history to keep token usage manageable. */
function pruneHistory(messages: { role: string; content: string }[]): { role: string; content: string }[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  const pruned = messages.slice(-MAX_HISTORY_MESSAGES);
  const firstUserIdx = pruned.findIndex((m) => m.role === 'user');
  return firstUserIdx > 0 ? pruned.slice(firstUserIdx) : pruned;
}

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
// Tool execution — Add your module-specific cases here
// ---------------------------------------------------------------------------

async function executeTool(
  toolName: string,
  _input: ToolInput,
  _authHeaders: AuthHeaders,
): Promise<ToolResult> {
  try {
    switch (toolName) {
      // Add your tool execution cases here:
      // case 'get_items':
      //   return fetchBackend(apiUrl(API_BASE_URL, '/items'), 'GET', buildHeaders(authHeaders));
      //
      // Example from v2 (sample tools):
      // case 'sample_query':
      //   return { success: true, data: { message: `Query for "${input.category}": ${input.query}`, results: [] } };
      // case 'sample_action':
      //   return { success: true, data: { message: `Action "${input.action}" on "${input.resource}" completed.` } };
      // case 'get_users':
      //   return fetchBackend(`${API_BASE_URL}/api/${API_VERSION}/user/${DEFAULT_APP}/staff/fetch`, 'POST', headers, { ... });

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

    // Nested data array
    if (data.data && Array.isArray(data.data)) {
      const arr = data.data as unknown[];
      if (arr.length > MAX_ARRAY_ITEMS) {
        output.data = {
          ...data,
          data: arr.slice(0, MAX_ARRAY_ITEMS),
          _truncated: `Showing ${MAX_ARRAY_ITEMS} of ${arr.length} items`,
        };
        return JSON.stringify(output);
      }
    }
  }

  output.data = result.data;
  return JSON.stringify(output);
}

// ---------------------------------------------------------------------------
// Tool action descriptions (for confirmation cards)
// ---------------------------------------------------------------------------

function describeToolAction(toolName: string, _input: ToolInput): string {
  // Add descriptions for your write tools here:
  // if (toolName === 'create_item') return `Create item "${input.name}"`;
  return `Execute ${toolName}`;
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
  const [result, branches] = await Promise.all([
    executeTool(confirmedToolCall.toolName, confirmedToolCall.toolInput, authHeaders),
    fetchBranches(buildHeaders(authHeaders)),
  ]);

  invalidateStateCache(sid);
  const state = await fetchSystemState(sid, buildHeaders(authHeaders)).catch(() => null);
  const safeState = state ?? EMPTY_STATE;
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(sid, branchName, safeState, branches);
  const compactPrompt = buildCompactSystemPrompt(sid, branchName, safeState, branches);

  const currentMessages: Anthropic.MessageParam[] = [
    ...pruneHistory(messages).map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
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
      ],
    },
  ];

  const allToolResults: ToolResultEntry[] = [
    { toolName: confirmedToolCall.toolName, result },
  ];
  let fileDownload: FileDownload | undefined = result.fileDownload;

  if (!result.success) {
    return buildResponse(
      `The action failed: ${result.error || 'Unknown error'}. Please try again or check the details.`,
      { toolResults: allToolResults, fileDownload },
    );
  }

  // Agentic loop — auto-execute all follow-up tools
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
    fetchBranches(buildHeaders(authHeaders)),
    fetchSystemState(sid, buildHeaders(authHeaders)),
  ]);

  const systemPrompt = buildSystemPrompt(sid, branchName, state, branches);
  const compactPrompt = buildCompactSystemPrompt(sid, branchName, state, branches);
  const client = getAnthropicClient();

  const currentMessages: Anthropic.MessageParam[] = pruneHistory(messages).map((m) => ({
    role: m.role as 'user' | 'assistant',
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
