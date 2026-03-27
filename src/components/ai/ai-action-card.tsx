'use client';

import { Check, X, SkipForward, Loader2, Plus, Pencil, Trash2, Bell, Zap, Sparkles, Bot } from 'lucide-react';
import { Quantum } from 'ldrs/react';
import 'ldrs/react/Quantum.css';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { SKIPPABLE_ACTIONS, resolveActionName } from '@/lib/ai/tools';
import type { ActionCard } from '@/stores/ai-chat.store';

interface AIActionCardProps {
  action: ActionCard;
  onConfirm: () => void;
  onReject: () => void;
  disabled?: boolean;
}

function getActionIcon(toolName: string, toolInput?: Record<string, unknown>) {
  const action = resolveActionName(toolName, toolInput);
  if (action.startsWith('create_') || action === 'assign_employees' || action === 'upsert_location') return Plus;
  if (action.startsWith('update_')) return Pencil;
  if (action.startsWith('delete_') || action === 'remove_employees') return Trash2;
  if (action === 'send_notification') return Bell;
  return Zap;
}

/** Animated robot building blocks scene */
function RobotBuilder() {
  return (
    <div className="robot-builder">
      {/* Spinning gear */}
      <div className="gear relative" style={{ marginBottom: '2px' }}>
        <svg width="10" height="10" viewBox="0 0 16 16" className="text-violet-400">
          <path fill="currentColor" d="M7 1v2.07A4.01 4.01 0 0 0 4.07 6H2v4h2.07A4.01 4.01 0 0 0 7 12.93V15h2v-2.07A4.01 4.01 0 0 0 11.93 10H14V6h-2.07A4.01 4.01 0 0 0 9 3.07V1H7zm1 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
        </svg>
      </div>
      {/* Building blocks */}
      <div className="blocks relative">
        <div className="block bg-violet-400/80" />
        <div className="block bg-purple-400/80" />
        <div className="block bg-indigo-400/80" />
        <div className="block bg-violet-500/70" />
        {/* Weld spark */}
        <div className="spark -top-1 -right-1">
          <Sparkles className="size-2.5 text-purple-300" />
        </div>
      </div>
      {/* Robot */}
      <div className="robot" style={{ marginBottom: '1px' }}>
        <div className="arm">
          <svg width="6" height="8" viewBox="0 0 6 8" className="text-violet-500 -mb-0.5">
            <rect x="2" y="0" width="2" height="8" rx="1" fill="currentColor" />
          </svg>
        </div>
        <Bot className="size-4 text-violet-600 dark:text-violet-400" />
      </div>
    </div>
  );
}

export function AIActionCard({ action, onConfirm, onReject, disabled }: AIActionCardProps) {
  const { t } = useTranslation('ai');
  const { t: tCommon } = useTranslation('common');
  const Icon = getActionIcon(action.toolName, action.toolInput);
  const resolvedAction = resolveActionName(action.toolName, action.toolInput);
  const isSkippable = SKIPPABLE_ACTIONS.has(resolvedAction);
  const isPending = action.status === 'pending';
  const isExecuting = action.status === 'confirmed';
  const isCompleted = action.status === 'executed';
  const isRejected = action.status === 'rejected';

  const cardClasses = [
    'rounded-xl border-2 p-3 my-2 relative overflow-hidden transition-all duration-500',
    isPending && 'animate-msg-pop border-amber-300 dark:border-amber-600 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950 animate-wiggle shadow-sm shadow-amber-200/50 dark:shadow-amber-900/30',
    isExecuting && 'border-violet-400 dark:border-violet-500 bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100 dark:from-violet-950 dark:via-purple-950 dark:to-indigo-950 animate-exec-glow shadow-md shadow-violet-300/40 dark:shadow-violet-800/40',
    isCompleted && 'animate-complete-burst border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-100 via-green-50 to-teal-50 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950 shadow-md shadow-emerald-300/40 dark:shadow-emerald-800/30',
    isRejected && 'border-muted bg-muted/30 opacity-60',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      {/* Animated progress bar during execution */}
      {isExecuting && (
        <div className="absolute top-0 left-0 right-0 h-1 animate-border-trail rounded-full" />
      )}

      {/* Success ring burst on completion */}
      {isCompleted && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-3 left-3 size-8 rounded-lg animate-success-ring" />
        </div>
      )}

      <div className="flex items-start gap-2.5">
        {/* Icon with state transitions */}
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ${
          isCompleted ? 'bg-emerald-500 dark:bg-emerald-600 scale-110 shadow-md shadow-emerald-500/30' :
          isExecuting ? 'bg-violet-500 dark:bg-violet-600 shadow-md shadow-violet-500/30' :
          'bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 shadow-md shadow-amber-500/30'
        }`}>
          {isCompleted ? (
            <Check className="size-4 text-white" style={{ animation: 'complete-burst 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
          ) : isExecuting ? (
            <Quantum size="18" speed="1.75" color="white" />
          ) : (
            <Icon className="size-4 text-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Status label */}
          <p className={`text-sm font-semibold transition-colors duration-300 flex items-center gap-1.5 ${
            isCompleted ? 'text-emerald-700 dark:text-emerald-300' :
            isExecuting ? 'text-violet-700 dark:text-violet-300' :
            'text-amber-700 dark:text-amber-300'
          }`}>
            {isCompleted && <Sparkles className="size-3.5 text-emerald-500 dark:text-emerald-400" style={{ animation: 'mini-sparkle 0.6s ease-out 0.2s both' }} />}
            {isCompleted ? t('completed') : isExecuting ? t('executing') : t('actionRequired')}
          </p>
          {/* Description */}
          <p className={`text-sm mt-0.5 transition-colors duration-300 ${
            isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
            isExecuting ? 'text-violet-600 dark:text-violet-400' :
            'text-amber-600 dark:text-amber-400'
          }`}>
            {action.description}
          </p>
        </div>
      </div>

      {/* Pending: confirm/reject buttons */}
      {isPending && (
        <div className="flex gap-2 mt-3 ml-10">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={disabled}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
          >
            {disabled ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Check className="size-3" />
            )}
            {tCommon('confirm')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={disabled}
            className="rounded-lg hover:scale-[1.02] active:scale-95 transition-all duration-200"
          >
            {isSkippable ? <SkipForward className="size-3" /> : <X className="size-3" />}
            {isSkippable ? t('skip') : tCommon('cancel')}
          </Button>
        </div>
      )}

      {/* Executing: robot building animation */}
      {isExecuting && (
        <div className="mt-2.5 ml-10 flex items-center gap-3">
          <RobotBuilder />
          <p className="text-xs animate-text-shimmer font-medium">{t('executingAction')}</p>
        </div>
      )}

      {/* Rejected/skipped */}
      {isRejected && (
        <p className="text-xs text-muted-foreground mt-2 ml-10 flex items-center gap-1">
          {isSkippable ? <SkipForward className="size-3" /> : <X className="size-3" />}
          {isSkippable ? t('skipped') : t('cancelled')}
        </p>
      )}
    </div>
  );
}
