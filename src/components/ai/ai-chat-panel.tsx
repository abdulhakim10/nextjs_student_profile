'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language.store';
import { RotateCcw, Bot, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AIChatMessages } from './ai-chat-messages';
import { AIChatInput } from './ai-chat-input';
import {
  useAIChatStore,
  generateMessageId,
  type ActionCard,
} from '@/stores/ai-chat.store';
import { aiService, type FileDownload } from '@/services/ai.service';
import { resolveActionName } from '@/lib/ai/tools';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';

function triggerFileDownload(file: FileDownload) {
  const byteCharacters = atob(file.base64);
  const bytes = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    bytes[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AIChatPanel() {
  const {
    isOpen,
    messages,
    isLoading,
    setOpen,
    addMessage,
    setLoading,
    clearMessages,
    updateActionStatus,
    pendingPrompt,
    setPendingPrompt,
    overrideSid,
  } = useAIChatStore();

  const { t } = useTranslation('ai');
  const { t: tCommon } = useTranslation('common');
  const locale = useLanguageStore((s) => s.locale);
  const router = useRouter();
  const [actionProcessing, setActionProcessing] = useState(false);

  const userData = useAuthStore((s) => s.userData);
  const activeSid = overrideSid || userData?.server_id || '0';

  const getApiMessages = useCallback(() => {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      addMessage({
        id: generateMessageId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      });
      setLoading(true);

      try {
        const apiMessages = [
          ...getApiMessages(),
          { role: 'user' as const, content: text },
        ];
        const res = await aiService.sendMessage(apiMessages, activeSid, undefined, locale);

        const actions: ActionCard[] | undefined = res.pendingActions?.map((pa) => ({
          toolName: pa.toolName,
          toolInput: pa.toolInput,
          toolUseId: pa.toolUseId,
          description: pa.description,
          status: 'pending' as const,
        }));

        if (res.fileDownload) triggerFileDownload(res.fileDownload);

        addMessage({
          id: generateMessageId(),
          role: 'assistant',
          content: res.response,
          timestamp: new Date(),
          actions: actions?.length ? actions : undefined,
          fileDownload: res.fileDownload ? { filename: res.fileDownload.filename } : undefined,
          quickReplies: res.quickReplies,
        });
      } catch (err) {
        addMessage({
          id: generateMessageId(),
          role: 'assistant',
          content: `${t('errorPrefix')} ${err instanceof Error ? err.message : tCommon('unknownError')}. ${t('errorRetry')}`,
          timestamp: new Date(),
        });
      } finally {
        setLoading(false);
      }
    },
    [activeSid, addMessage, setLoading, getApiMessages]
  );

  useEffect(() => {
    if (pendingPrompt && !isLoading) {
      const prompt = pendingPrompt;
      setPendingPrompt(null);
      handleSend(prompt);
    }
  }, [pendingPrompt, isLoading, setPendingPrompt, handleSend]);

  const handleConfirmAction = useCallback(
    async (messageId: string, toolUseId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      const action = msg?.actions?.find((a) => a.toolUseId === toolUseId);
      if (!msg || !action) return;

      updateActionStatus(messageId, toolUseId, 'confirmed');
      setActionProcessing(true);

      try {
        const res = await aiService.confirmAction(
          getApiMessages(), activeSid, undefined,
          action.toolName, action.toolInput, action.toolUseId, locale
        );
        updateActionStatus(messageId, toolUseId, 'executed');
        if (res.fileDownload) triggerFileDownload(res.fileDownload);

        const followUpActions: ActionCard[] | undefined = res.pendingActions?.map((pa) => ({
          toolName: pa.toolName,
          toolInput: pa.toolInput,
          toolUseId: pa.toolUseId,
          description: pa.description,
          status: 'pending' as const,
        }));

        addMessage({
          id: generateMessageId(),
          role: 'assistant',
          content: res.response,
          timestamp: new Date(),
          actions: followUpActions?.length ? followUpActions : undefined,
          fileDownload: res.fileDownload ? { filename: res.fileDownload.filename } : undefined,
          quickReplies: res.quickReplies,
        });
      } catch (err) {
        updateActionStatus(messageId, toolUseId, 'pending');
        addMessage({
          id: generateMessageId(),
          role: 'assistant',
          content: `${t('actionFailed')} ${err instanceof Error ? err.message : tCommon('unknownError')}`,
          timestamp: new Date(),
        });
      } finally {
        setActionProcessing(false);
      }
    },
    [messages, activeSid, addMessage, updateActionStatus, getApiMessages]
  );

  const handleRejectAction = useCallback(
    (messageId: string, toolUseId: string) => {
      updateActionStatus(messageId, toolUseId, 'rejected');
      addMessage({
        id: generateMessageId(),
        role: 'assistant',
        content: t('actionCancelled'),
        timestamp: new Date(),
      });
    },
    [updateActionStatus, addMessage]
  );

  const handleQuickReply = useCallback(
    (text: string) => {
      const navMatch = text.match(/^\[GO:(\/[^\]]+)\]\s*(.+)$/);
      if (navMatch) {
        const [, path] = navMatch;
        setOpen(false);
        router.push(path);
        return;
      }
      handleSend(text);
    },
    [handleSend, setOpen, router]
  );

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col p-0 gap-0 sm:max-w-lg md:max-w-xl lg:max-w-2xl h-[min(95vh,720px)] sm:h-[min(85vh,720px)] rounded-2xl overflow-hidden"
      >
        <DialogHeader className="border-b px-4 py-3 shrink-0 bg-gradient-to-r from-background via-background to-primary/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-purple-600 to-pink-500 text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-110 hover:rotate-3">
              <Bot className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                {t('assistant')}
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('description')}
              </DialogDescription>
            </div>

            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearMessages}
                className="h-7 gap-1.5 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 text-[11px] px-2.5"
              >
                <RotateCcw className="size-3" />
                {t('clearChat')}
              </Button>
            )}

            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <AIChatMessages
          messages={messages}
          isLoading={isLoading}
          onConfirmAction={handleConfirmAction}
          onRejectAction={handleRejectAction}
          actionProcessing={actionProcessing}
          onSuggestionClick={handleQuickReply}
        />

        <AIChatInput
          onSend={handleSend}
          disabled={isLoading || actionProcessing}
        />
      </DialogContent>
    </Dialog>
  );
}
