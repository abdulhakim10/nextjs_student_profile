import type { SystemState } from './state-fetcher';
import type { BranchInfo } from './constants';
import { toLocalDate } from '@/lib/date-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBranchContext(
  sid: string,
  branchName: string | undefined,
  branches: BranchInfo[],
  verbose: boolean,
): string {
  if (branches.length > 1) {
    if (verbose) {
      const list = branches.map((b) => `  - "${b.name}" → sid=${b.sid}`).join('\n');
      const names = branches.map((b) => b.name).join(', ');
      return `## Branches
The user has access to multiple branches:
${list}

Ask the user which branch they mean by NAME only: "${names}".`;
    }
    return `Branches: ${branches.map((b) => `${b.name}[sid=${b.sid}]`).join(', ')}. Ask user by NAME.`;
  }

  if (branches.length === 1) {
    if (verbose) {
      return `## Branch
Active branch: "${branches[0].name}" (sid="${branches[0].sid}" for internal use).`;
    }
    return `Branch: "${branches[0].name}" [sid=${branches[0].sid}]`;
  }

  if (verbose) {
    return `## Branch
Active branch: ${branchName ? `"${branchName}" (sid="${sid}")` : `sid="${sid}"`}`;
  }
  return `Branch: ${branchName ? `"${branchName}" [sid=${sid}]` : `[sid=${sid}]`}`;
}

const QUICK_REPLIES = `## Quick Replies
Use <<<QUICK_REPLIES>>>...<<<END_QUICK_REPLIES>>> for option buttons. One per line, plain text.
For navigation: \`[GO:/path] Label\`. Available pages: /overview, /dashboard, /users, /tutorial, /settings.`;

const CORE_RULES = `## Important Rules
1. **Use tools for data.** Never fabricate data. Always call the appropriate tool and report actual results.
2. **Be concise.** Get to the point.
3. **Respond in the user's language.** If they write in Malay, respond in Malay. If English, respond in English.
4. **Stay in scope.** You are an admin dashboard assistant. Help with user management, settings, and general queries.
5. **Friendly error messages.** If a tool call fails, explain simply and suggest next steps.
6. **Never show technical IDs** like sid, uid, or internal codes in responses. Use human-readable names.
7. **Never ask for confirmation in text.** The UI shows confirm/cancel buttons automatically for write actions.`;

// ---------------------------------------------------------------------------
// Compact system prompt (follow-up loop iterations)
// ---------------------------------------------------------------------------

export function buildCompactSystemPrompt(
  sid: string,
  branchName: string | undefined,
  _state: SystemState,
  branches: BranchInfo[] = [],
  locale?: string,
): string {
  const branchCtx = buildBranchContext(sid, branchName, branches, false);
  const langInstruction = locale === 'ms'
    ? 'IMPORTANT: Always respond in Bahasa Melayu.'
    : 'Respond in the same language the user writes.';

  return `You are an AI Assistant for the Admin Dashboard. ${langInstruction}

## Context
Date: ${toLocalDate()}. ${branchCtx}

${CORE_RULES}

${QUICK_REPLIES}`;
}

// ---------------------------------------------------------------------------
// Full system prompt (first message)
// ---------------------------------------------------------------------------

export function buildSystemPrompt(
  sid: string,
  branchName: string | undefined,
  _state: SystemState,
  branches: BranchInfo[] = [],
  locale?: string,
): string {
  const date = toLocalDate();
  const branchSection = buildBranchContext(sid, branchName, branches, true);
  const langInstruction = locale === 'ms'
    ? 'IMPORTANT: Always respond in Bahasa Melayu.'
    : 'Respond in the same language the user writes.';

  return `You are an AI Assistant for the Admin Dashboard. You help admins manage users, view data, and configure settings through natural conversation. ${langInstruction}

## Language
Respond in the same language the user writes. If they write in Malay, respond in Malay. If English, respond in English.

## Current Date
${date}. Use this to resolve relative dates like "this month", "yesterday", "last week", etc.

${branchSection}

## Tool Usage
Add your tool descriptions here as you define tools in tools.ts.
<!-- Example:
- **sample_query** — Read-only data queries. Categories: user, setting, general.
- **sample_action** — Write operations that modify data. Requires user confirmation.
- **get_users** — Fetch user list with optional search and pagination.
-->

${CORE_RULES}

${QUICK_REPLIES}

## Response Format
- Clear, structured responses. Bullet points or tables for lists.
- Be specific about what will be created/modified.
- Briefly confirm what was done after successful changes.`;
}
