'use client';

import { useEffect, useRef } from 'react';
import {
  Bot, User, Sparkles, CalendarCheck, Users, FileBarChart, BookOpen,
  FileSpreadsheet, Search, Clock, Settings, MapPin, UserPlus,
  LayoutGrid, FileDown, HelpCircle, Zap, ExternalLink, Timer,
} from 'lucide-react';
import { Quantum } from 'ldrs/react';
import 'ldrs/react/Quantum.css';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIActionCard } from './ai-action-card';
import { useTranslation } from '@/i18n';
import type { ChatMessage } from '@/stores/ai-chat.store';

interface AIChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onConfirmAction: (messageId: string, toolUseId: string) => void;
  onRejectAction: (messageId: string, toolUseId: string) => void;
  actionProcessing: boolean;
  onSuggestionClick?: (text: string) => void;
}

const QUESTION_ICONS = [] as const;
const QUESTION_KEYS = [] as const;
const ACTION_ICONS = [] as const;
const ACTION_KEYS = [] as const;

export function AIChatMessages({
  messages,
  isLoading,
  onConfirmAction,
  onRejectAction,
  actionProcessing,
  onSuggestionClick,
}: AIChatMessagesProps) {
  const { t } = useTranslation('ai');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="flex flex-col gap-3 p-4">
        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center py-8 px-2">
            <div className="animate-sparkle flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-purple-500/15 to-pink-500/10 mb-3 shadow-lg shadow-primary/5">
              <Sparkles className="size-5 text-primary" />
            </div>
            <p className="animate-fade-up text-sm font-semibold text-foreground">{t('greeting')}</p>
            <p className="animate-fade-up-delayed text-xs text-muted-foreground mt-1 text-center max-w-[240px] leading-relaxed">
              {t('helpText')}
            </p>

            {onSuggestionClick && (
              <div className="animate-fade-up-delayed-2 w-full mt-5 space-y-4">
                <SuggestionGroup
                  icon={Search}
                  title={t('questionsTitle')}
                  subtitle={t('questionsSubtitle')}
                  items={QUESTION_KEYS.map((key, i) => ({
                    icon: QUESTION_ICONS[i],
                    label: t(key),
                  }))}
                  color="blue"
                  onClick={onSuggestionClick}
                />
                <SuggestionGroup
                  icon={Zap}
                  title={t('actionsTitle')}
                  subtitle={t('actionsSubtitle')}
                  items={ACTION_KEYS.map((key, i) => ({
                    icon: ACTION_ICONS[i],
                    label: t(key),
                  }))}
                  color="amber"
                  onClick={onSuggestionClick}
                />
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isLast = index === messages.length - 1;

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'animate-msg-right flex-row-reverse' : 'animate-msg-pop'}`}
            >
              {/* Avatar */}
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5 transition-all duration-300 ${
                  isUser
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : `bg-muted border text-muted-foreground ${isLast && !isUser ? 'animate-avatar-glow' : ''}`
                }`}
              >
                {isUser ? (
                  <User className="size-3.5" />
                ) : (
                  <Bot className="size-3.5" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
                <div
                  className={`inline-block px-3 py-2 text-sm leading-relaxed transition-shadow duration-300 ${
                    isUser
                      ? 'max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-md shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/20'
                      : 'max-w-[95%] bg-muted/60 border rounded-2xl rounded-tl-md hover:bg-muted/80'
                  }`}
                >
                  <MessageContent content={msg.content} />
                </div>

                {/* Action cards */}
                {msg.actions?.map((action) => (
                  <AIActionCard
                    key={action.toolUseId}
                    action={action}
                    onConfirm={() => onConfirmAction(msg.id, action.toolUseId)}
                    onReject={() => onRejectAction(msg.id, action.toolUseId)}
                    disabled={actionProcessing}
                  />
                ))}

                {/* File download badge */}
                {msg.fileDownload && (
                  <div className="animate-msg-pop flex items-center gap-2 rounded-lg border border-green-200/60 dark:border-green-800/40 bg-green-50/80 dark:bg-green-950/30 px-2.5 py-1.5 mt-1.5 max-w-[85%] relative overflow-hidden group">
                    <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                    <FileSpreadsheet className="size-3.5 text-green-600 dark:text-green-400 shrink-0 transition-transform group-hover:scale-110" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300 truncate">
                      {msg.fileDownload.filename}
                    </span>
                    <span className="text-[10px] text-green-500 dark:text-green-500 shrink-0">
                      {t('downloaded')}
                    </span>
                  </div>
                )}

                {/* Quick reply buttons */}
                {msg.quickReplies &&
                  msg.quickReplies.length > 0 &&
                  !isLoading &&
                  msg.id === messages.filter((m) => m.role === 'assistant').at(-1)?.id && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.quickReplies.map((reply, i) => {
                      const navMatch = reply.match(/^\[GO:\/[^\]]+\]\s*(.+)$/);
                      const label = navMatch ? navMatch[1] : reply;
                      const isNav = !!navMatch;
                      return (
                        <button
                          key={reply}
                          type="button"
                          onClick={() => onSuggestionClick?.(reply)}
                          className={`animate-chip-in animate-reply-glow rounded-full border px-3 py-1 text-xs font-medium hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1.5 ${
                            isNav
                              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                              : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30'
                          }`}
                          style={{ animationDelay: `${i * 0.08}s` }}
                        >
                          {isNav && <ExternalLink className="size-3" />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2.5 animate-msg-pop">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 text-primary mt-0.5 animate-avatar-glow">
              <Bot className="size-3.5" />
            </div>
            <div>
              <div className="bg-gradient-to-r from-muted/80 via-muted/50 to-muted/80 border rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2.5">
                <Quantum size="20" speed="1.75" color="#8b5cf6" />
                <span className="text-xs animate-text-shimmer font-medium">{t('thinking')}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// Suggestion group component (empty state)
// ---------------------------------------------------------------------------

function SuggestionGroup({
  icon: GroupIcon,
  title,
  subtitle,
  items,
  color,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  items: Array<{ icon: React.ElementType; label: string }>;
  color: 'blue' | 'amber';
  onClick: (text: string) => void;
}) {
  const colorStyles = color === 'blue'
    ? {
        header: 'text-blue-600 dark:text-blue-400',
        headerIcon: 'text-blue-500',
        chip: 'border-blue-200/50 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-900/30 hover:shadow-md hover:shadow-blue-500/10',
      }
    : {
        header: 'text-amber-600 dark:text-amber-400',
        headerIcon: 'text-amber-500',
        chip: 'border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 hover:shadow-md hover:shadow-amber-500/10',
      };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <GroupIcon className={`size-3 ${colorStyles.headerIcon}`} />
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${colorStyles.header}`}>
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground">— {subtitle}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onClick(item.label)}
            className={`animate-chip-in inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 hover:scale-[1.03] active:scale-95 ${colorStyles.chip}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <item.icon className="size-3 shrink-0 opacity-60 transition-transform group-hover:rotate-12" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown-light content renderer
// ---------------------------------------------------------------------------

/** Check if a line is a markdown table separator (e.g. |---|---|) */
function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

/** Parse a table row into cells */
function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** Check if a line is a table row */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|');
}

/**
 * Groups consecutive lines into blocks: paragraphs, lists, tables.
 * Returns structured blocks for rendering.
 */
type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'blank' }
  | { type: 'bullet'; text: string }
  | { type: 'numbered'; text: string; number: string }
  | { type: 'heading'; text: string; level: number }
  | { type: 'table'; headers: string[]; rows: string[][] };

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      blocks.push({ type: 'blank' });
      i++;
      continue;
    }

    // Table: collect consecutive table rows
    if (isTableRow(trimmed)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        tableLines.push(lines[i]);
        i++;
      }

      // Need at least header + separator (2 lines)
      if (tableLines.length >= 2) {
        const headerLine = tableLines[0];
        // Find separator — could be line 1 or missing
        const sepIndex = tableLines.findIndex((l) => isTableSeparator(l));
        const headers = parseTableRow(headerLine);
        const dataLines = sepIndex >= 0
          ? tableLines.slice(sepIndex + 1)
          : tableLines.slice(1);
        const rows = dataLines
          .filter((l) => !isTableSeparator(l))
          .map(parseTableRow);
        blocks.push({ type: 'table', headers, rows });
      } else {
        // Single pipe line — treat as paragraph
        blocks.push({ type: 'paragraph', text: tableLines[0] });
      }
      continue;
    }

    // Heading (## or ###)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    // Bullet list
    if (trimmed.match(/^[-*]\s/)) {
      blocks.push({ type: 'bullet', text: trimmed.replace(/^[-*]\s/, '') });
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (numberedMatch) {
      blocks.push({ type: 'numbered', text: numberedMatch[2], number: numberedMatch[1] });
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({ type: 'paragraph', text: trimmed });
    i++;
  }

  return blocks;
}

function MessageContent({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-1.5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'blank':
            return <div key={i} className="h-1" />;

          case 'heading':
            return (
              <p key={i} className={`font-semibold ${block.level <= 2 ? 'text-sm' : 'text-xs'}`}>
                {formatInline(block.text)}
              </p>
            );

          case 'bullet':
            return (
              <div key={i} className="flex gap-1.5">
                <span className="shrink-0 mt-[7px] size-1 rounded-full bg-current opacity-50" />
                <span>{formatInline(block.text)}</span>
              </div>
            );

          case 'numbered':
            return (
              <div key={i} className="flex gap-1.5">
                <span className="shrink-0 text-[11px] font-medium opacity-60 min-w-[1rem] text-right">
                  {block.number}.
                </span>
                <span>{formatInline(block.text)}</span>
              </div>
            );

          case 'table':
            return (
              <div key={i} className="my-1.5 overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {block.headers.map((h, j) => (
                        <th
                          key={j}
                          className="px-2.5 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap"
                        >
                          {formatInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b last:border-0 transition-colors hover:bg-muted/30"
                      >
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2.5 py-1.5 whitespace-nowrap">
                            {formatInline(cell) || <span className="text-muted-foreground">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'paragraph':
          default:
            return <p key={i}>{formatInline(block.text)}</p>;
        }
      })}
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
