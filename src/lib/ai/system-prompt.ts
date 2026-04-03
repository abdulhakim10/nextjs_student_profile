import type { SystemState } from './state-fetcher';
import type { BranchInfo } from './constants';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function buildBranchContext(
  sid: string,
  branchName: string | undefined,
  branches: BranchInfo[],
): string {
  if (branches.length > 1) {
    const names = branches.map((b) => b.name).join(', ');
    return `Branches: ${names}. Ask user by NAME, never show sid.`;
  }
  if (branches.length === 1) {
    return `Branch: "${branches[0].name}" [sid=${branches[0].sid} for tools only, never show to user]`;
  }
  return `Branch: ${branchName ? `"${branchName}" [sid=${sid} for tools only]` : `[sid=${sid} for tools only]`}`;
}

// ---------------------------------------------------------------------------
// Compact system prompt (follow-up loop iterations)
// ---------------------------------------------------------------------------

export function buildCompactSystemPrompt(
  sid: string,
  branchName: string | undefined,
  _state: SystemState,
  branches: BranchInfo[] = [],
): string {
  const branchCtx = buildBranchContext(sid, branchName, branches);

  return `You are an AI Assistant for the Admin Dashboard. Respond in the same language the user writes.

## Context
Date: ${today()}. ${branchCtx}

## Quick Replies
Use <<<QUICK_REPLIES>>>...<<<END_QUICK_REPLIES>>> for option buttons. One per line, plain text.
For navigation: \`[GO:/path] Label\`. Available pages: /dashboard.`;
}

// ---------------------------------------------------------------------------
// Full system prompt (first message)
// ---------------------------------------------------------------------------

export function buildSystemPrompt(
  sid: string,
  branchName: string | undefined,
  _state: SystemState,
  branches: BranchInfo[] = [],
): string {
  const date = today();
  const branchCtx = buildBranchContext(sid, branchName, branches);

  return `You are an AI Assistant for the Admin Dashboard. You help admins through natural conversation.

## Language
Respond in the same language the user writes. If they write in Malay, respond in Malay. If English, respond in English.

## Current Date
${date}. Use this to resolve relative dates like "this month", "yesterday", "last week", etc.

## Branch
${branchCtx}

## Important Rules
1. Be concise. Admins are busy.
2. Never show technical IDs (sid, codes) to the user. Use names only.
3. Always refer to branches by name, not sid.

## Quick Replies
Use <<<QUICK_REPLIES>>>...<<<END_QUICK_REPLIES>>> for option buttons. One per line, plain text.
For navigation: \`[GO:/path] Label\`. Available pages: /dashboard.

## Response Format
- Clear, structured responses. Bullet points or tables for lists.
- Be specific about what will be created/modified.
- Briefly confirm what was done after successful changes.`;
}
