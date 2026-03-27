'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';

interface AIChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function AIChatInput({ onSend, disabled }: AIChatInputProps) {
  const { t } = useTranslation('ai');
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Cleanup send animation timer on unmount
  useEffect(() => {
    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    };
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    setIsSending(true);
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => setIsSending(false), 400);

    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className="border-t px-3 py-2.5 bg-background/80 backdrop-blur-sm">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={t('placeholder')}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border bg-muted/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 focus-visible:bg-background disabled:opacity-50 transition-all duration-300"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !hasContent}
          className={`rounded-xl shrink-0 transition-all duration-300 ${
            hasContent
              ? 'bg-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:scale-105'
              : ''
          } ${isSending ? 'animate-send-press' : ''} active:scale-90`}
        >
          <SendHorizonal className={`size-4 transition-transform duration-200 ${isSending ? 'animate-send-fly' : hasContent ? 'translate-x-0.5' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
