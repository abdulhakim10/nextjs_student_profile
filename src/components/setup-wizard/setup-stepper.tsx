'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepInfo {
  label: string;
  completed: boolean;
}

interface SetupStepperProps {
  steps: StepInfo[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export function SetupStepper({ steps, currentStep, onStepClick }: SetupStepperProps) {
  return (
    <nav aria-label="Setup progress" className="w-full">
      {/* Desktop: horizontal */}
      <ol className="hidden sm:flex items-center w-full">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = step.completed;
          const isPast = idx < currentStep;

          return (
            <li key={idx} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                className="flex items-center gap-2 group"
                onClick={() => onStepClick?.(idx)}
              >
                {/* Circle */}
                <span
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold border-2 transition-all shrink-0',
                    isDone
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isActive
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap hidden lg:inline',
                    isDone
                      ? 'text-primary'
                      : isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors',
                    isPast || isDone ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact display */}
      <div className="sm:hidden flex items-center justify-between">
        <span className="text-sm font-medium">
          {currentStep + 1} / {steps.length}
        </span>
        <span className="text-sm text-muted-foreground">
          {steps[currentStep]?.label}
        </span>
      </div>

      {/* Mobile: progress bar */}
      <div className="sm:hidden mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
    </nav>
  );
}
