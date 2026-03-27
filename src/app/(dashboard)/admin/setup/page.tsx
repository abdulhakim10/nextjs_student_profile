'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { BranchSelector } from '@/components/dashboard/branch-selector';
import { SetupStepper } from '@/components/setup-wizard/setup-stepper';
import { StepAttendanceMode } from '@/components/setup-wizard/step-attendance-mode';
import { StepLocationDevice } from '@/components/setup-wizard/step-location-device';
import { StepCreateGroup } from '@/components/setup-wizard/step-create-group';
import { StepSchedule } from '@/components/setup-wizard/step-schedule';
import { StepAssignEmployees } from '@/components/setup-wizard/step-assign-employees';
import { StepComplete } from '@/components/setup-wizard/step-complete';
import { AISetupDialog } from '@/components/setup-wizard/ai-setup-dialog';
import { checkSetupStatus, type SetupStatus } from '@/lib/setup-status';
import { Building2, ChevronLeft, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';

const STEP_LABEL_KEYS = [
  'setupMode',
  'setupLocation',
  'setupGroup',
  'setupSchedule',
  'setupEmployees',
] as const;

export default function SetupWizardPage() {
  const { t } = useTranslation('dashboard');
  const { branches, selectedSid, setSelectedSid, loadingBranches } =
    useBranchSelector();

  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showComplete, setShowComplete] = useState(false);

  // Wizard-local state that steps update
  const [mode, setMode] = useState<'LOCATION' | 'DEVICE' | null>(null);
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [scheduleCode, setScheduleCode] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // The actual sid to use (pick first branch if "all" selected)
  const effectiveSid =
    selectedSid === 'all' && branches.length > 0
      ? branches[0].sid
      : selectedSid;

  const loadStatus = useCallback(async () => {
    if (!effectiveSid || effectiveSid === 'all') return;
    setLoadingStatus(true);

    // Reset all wizard state before loading new branch
    setShowComplete(false);
    setMode(null);
    setGroupCode(null);
    setScheduleCode(null);
    setCurrentStep(0);

    try {
      const s = await checkSetupStatus(effectiveSid);
      setStatus(s);
      setMode(s.mode);
      setGroupCode(s.groupCode);
      setScheduleCode(s.scheduleCode);

      if (s.completed) {
        setShowComplete(true);
      } else {
        const firstIncomplete = s.steps.findIndex((step) => !step.completed);
        setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
      }
    } catch {
      // Defaults
    } finally {
      setLoadingStatus(false);
    }
  }, [effectiveSid]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Re-check status when page regains focus (e.g. after AI chat setup)
  useEffect(() => {
    const handleFocus = () => loadStatus();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadStatus]);

  // Auto-select first branch if "all"
  useEffect(() => {
    if (selectedSid === 'all' && branches.length > 0) {
      setSelectedSid(branches[0].sid);
    }
  }, [selectedSid, branches, setSelectedSid]);

  // Step completion handlers
  const handleModeComplete = (m: 'LOCATION' | 'DEVICE') => {
    setMode(m);
    if (status) {
      status.steps[0].completed = true;
    }
    setCurrentStep(1);
  };

  const handleLocationComplete = () => {
    if (status) {
      status.steps[1].completed = true;
    }
    setCurrentStep(2);
  };

  const handleGroupComplete = (gCode: string, sCode: string) => {
    setGroupCode(gCode);
    setScheduleCode(sCode);
    if (status) {
      status.steps[2].completed = true;
    }
    setCurrentStep(3);
  };

  const handleScheduleComplete = () => {
    if (status) {
      status.steps[3].completed = true;
    }
    setCurrentStep(4);
  };

  const handleEmployeesComplete = () => {
    if (status) {
      status.steps[4].completed = true;
    }
    setShowComplete(true);
  };

  const handleAddAnotherGroup = () => {
    setShowComplete(false);
    setGroupCode(null);
    setScheduleCode(null);
    setCurrentStep(2);
  };

  const stepperSteps = STEP_LABEL_KEYS.map((key, idx) => ({
    label: t(key),
    completed: status?.steps[idx]?.completed ?? false,
  }));

  /** Helper to interpolate {step} placeholder */
  const interpolate = (key: string, step: number) =>
    t(key).replace('{step}', String(step));

  /** Fallback when a prerequisite step is incomplete */
  const stepFallback = (requiredStep: number, goToStep: number) => (
    <div className="text-center py-8">
      <p className="text-muted-foreground">
        {interpolate('completeStepFirst', requiredStep)}
      </p>
      <Button
        variant="link"
        onClick={() => setCurrentStep(goToStep)}
        className="mt-2"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {interpolate('goToStep', requiredStep)}
      </Button>
    </div>
  );

  // Loading state
  if (loadingBranches || loadingStatus) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // No branch available
  if (!effectiveSid || effectiveSid === 'all') {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t('noBranchAvailable')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('setupGuideTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('setupGuideSubtitle')}
        </p>
      </div>

      {/* Branch selector — left-aligned, same style as other pages */}
      <div className="inline-flex items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2 shadow-sm">
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">{t('branch')}</span>
        <BranchSelector
          branches={branches}
          selectedSid={effectiveSid}
          onBranchChange={setSelectedSid}
          loading={loadingBranches}
        />
      </div>

      {/* AI Setup CTA — highlighted */}
      <button
        onClick={() => setAiDialogOpen(true)}
        className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-purple-600 to-pink-500 p-[2px] shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]"
      >
        {/* Animated shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_3s_ease-in-out_infinite] pointer-events-none" style={{ backgroundSize: '200% 100%' }} />

        <div className="relative flex items-center gap-4 rounded-[14px] bg-gradient-to-r from-primary via-purple-600 to-pink-500 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
            <Sparkles className="h-5 w-5 text-white animate-sparkle" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-base font-bold text-white flex items-center gap-2">
              {t('aiCreateForMe')}
              <span className="animate-badge-sparkle text-[10px] font-semibold uppercase tracking-wider text-primary bg-white px-2 py-0.5 rounded-full">
                AI
              </span>
            </p>
            <p className="text-sm text-white/80 mt-0.5">
              {t('aiCreateDescription')}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-all duration-300 group-hover:bg-white/30 group-hover:translate-x-0.5">
            <ChevronLeft className="h-4 w-4 rotate-180 text-white" />
          </div>
        </div>
      </button>

      <AISetupDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        sid={effectiveSid}
      />

      {/* Stepper */}
      {!showComplete && (
        <SetupStepper
          steps={stepperSteps}
          currentStep={currentStep}
          onStepClick={(idx) => {
            // Allow going back or to completed steps
            if (idx <= currentStep || stepperSteps[idx]?.completed) {
              setCurrentStep(idx);
            }
          }}
        />
      )}

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {showComplete ? (
            <StepComplete onAddAnotherGroup={handleAddAnotherGroup} />
          ) : currentStep === 0 ? (
            <StepAttendanceMode
              sid={effectiveSid}
              currentMode={mode}
              onComplete={handleModeComplete}
            />
          ) : currentStep === 1 ? (
            mode ? (
              <StepLocationDevice
                sid={effectiveSid}
                mode={mode}
                onComplete={handleLocationComplete}
              />
            ) : (
              stepFallback(1, 0)
            )
          ) : currentStep === 2 ? (
            <StepCreateGroup
              sid={effectiveSid}
              onComplete={handleGroupComplete}
            />
          ) : currentStep === 3 ? (
            scheduleCode ? (
              <StepSchedule
                scheduleCode={scheduleCode}
                onComplete={handleScheduleComplete}
              />
            ) : (
              stepFallback(3, 2)
            )
          ) : currentStep === 4 ? (
            groupCode ? (
              <StepAssignEmployees
                sid={effectiveSid}
                groupCode={groupCode}
                onComplete={handleEmployeesComplete}
              />
            ) : (
              stepFallback(3, 2)
            )
          ) : null}
        </CardContent>
      </Card>

      {/* Back button (when not on first step or complete) */}
      {!showComplete && currentStep > 0 && (
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep((s) => s - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Button>
        </div>
      )}
    </div>
  );
}
