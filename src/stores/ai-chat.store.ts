import { create } from 'zustand';

export interface ActionCard {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
  description: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'executed';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ActionCard[];
  fileDownload?: { filename: string };
  quickReplies?: string[];
}

interface AIChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  pendingPrompt: string | null;
  overrideSid: string | null;

  togglePanel: () => void;
  setOpen: (open: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setLoading: (v: boolean) => void;
  clearMessages: () => void;
  setPendingPrompt: (prompt: string | null) => void;
  setOverrideSid: (sid: string | null) => void;
  updateActionStatus: (
    messageId: string,
    toolUseId: string,
    status: ActionCard['status']
  ) => void;
}

let messageCounter = 0;
export function generateMessageId(): string {
  messageCounter++;
  return `msg_${Date.now()}_${messageCounter}`;
}

export const useAIChatStore = create<AIChatState>((set) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  pendingPrompt: null,
  overrideSid: null,

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  setLoading: (v) => set({ isLoading: v }),

  clearMessages: () => set({ messages: [], overrideSid: null }),

  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),

  setOverrideSid: (sid) => set({ overrideSid: sid }),

  updateActionStatus: (messageId, toolUseId, status) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId || !m.actions) return m;
        return {
          ...m,
          actions: m.actions.map((a) =>
            a.toolUseId === toolUseId ? { ...a, status } : a
          ),
        };
      }),
    })),
}));
