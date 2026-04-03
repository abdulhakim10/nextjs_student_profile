/**
 * ============================================================================
 * AI Service — Client-side API calls to the AI chat route
 * ============================================================================
 *
 * This service communicates with /api/ai/chat (Next.js API route), NOT
 * the external backend proxy. It uses fetch() instead of the shared Axios
 * apiClient because the base URL is different (/api/ai vs /api/proxy).
 *
 * Auth headers are attached via getAuthHeaders() from lib/auth.ts, the same
 * source used by the Axios interceptor — no duplication.
 *
 * 401 Handling:
 *   The authFetch() wrapper checks every response for 401 and calls
 *   forceLogout() to redirect to /auth/appcode. This covers cases where
 *   the AI chat route propagates a backend 401 back to the client.
 *
 * Flow:
 *   1. sendMessage()    → user sends a chat message
 *   2. AI route runs agentic loop (read tools auto-execute)
 *   3. If a write tool is needed → response includes pendingActions[]
 *   4. confirmAction()  → user confirms the pending write tool
 *   5. AI route executes the tool + continues agentic loop
 */

import { getAuthHeaders, forceLogout } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PendingAction {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
  description: string;
}

export interface FileDownload {
  filename: string;
  base64: string;
  mimeType: string;
}

interface AIChatResponse {
  response: string;
  toolResults?: Array<{ toolName: string; result: unknown }>;
  pendingActions?: PendingAction[];
  fileDownload?: FileDownload;
  quickReplies?: string[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Fetch Wrapper — Handles 401 in one place for all AI service calls
// ---------------------------------------------------------------------------

/**
 * Wrapper around fetch() that automatically:
 *   1. Attaches auth headers from localStorage
 *   2. Detects 401 responses and triggers forceLogout()
 *   3. Parses error responses into thrown Error objects
 */
async function authFetch(body: Record<string, unknown>): Promise<AIChatResponse> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  // Session expired — force redirect to login
  if (res.status === 401) {
    forceLogout();
    throw new Error('Session expired');
  }

  // Other errors — parse and throw
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const aiService = {
  /** Send a user message to the AI assistant */
  sendMessage: (
    messages: ChatMessage[],
    sid: string,
    branchName?: string
  ): Promise<AIChatResponse> => {
    return authFetch({ messages, sid, branchName });
  },

  /** Confirm a pending write tool action (user clicked "Confirm" on action card) */
  confirmAction: (
    messages: ChatMessage[],
    sid: string,
    branchName: string | undefined,
    toolName: string,
    toolInput: Record<string, unknown>,
    toolUseId: string
  ): Promise<AIChatResponse> => {
    return authFetch({
      messages,
      sid,
      branchName,
      confirmedToolCall: { toolName, toolInput, toolUseId },
    });
  },
};
