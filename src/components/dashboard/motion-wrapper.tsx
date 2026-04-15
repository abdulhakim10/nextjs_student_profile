'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { Transition } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Shared spring transitions — single source of truth for dashboard animations
// ---------------------------------------------------------------------------

/** Default spring for card/section entrance */
export const SPRING_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
};

/** Spring for staggered list items (alerts, insights, performers) */
export const SPRING_LIST_ITEM: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 22,
};

/** Builds a delayed entrance transition for dashboard sections */
function sectionTransition(delay: number): Transition {
  return { ...SPRING_TRANSITION, delay };
}

/** Builds a staggered list item transition */
export function listItemTransition(index: number, baseDelay = 0): Transition {
  return { ...SPRING_LIST_ITEM, delay: index * 0.1 + baseDelay };
}

// ---------------------------------------------------------------------------
// Stagger container + card wrappers
// ---------------------------------------------------------------------------

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING_TRANSITION,
  },
};

export function MotionStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUpItem} className={className}>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Reusable section card — wraps every dashboard section with consistent
// motion entrance, card shell, header icon badge, and title.
// ---------------------------------------------------------------------------

interface DashboardSectionProps {
  children: React.ReactNode;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  /** Rendered on the right side of the header (tabs, badges, etc.) */
  action?: React.ReactNode;
  delay?: number;
}

export function DashboardSection({
  children,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  action,
  delay = 0,
}: DashboardSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sectionTransition(delay)}
      className="h-full"
    >
      <Card className="dashboard-card overflow-hidden h-full border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-1.5 ${iconBg}`}>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {action}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Chart state wrapper — eliminates repeated AnimatePresence boilerplate
// Handles: no-branch → loading → empty → data transitions.
// ---------------------------------------------------------------------------

const FADE_SCALE = { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } };
const FADE_ONLY = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const SLIDE_UP = { type: 'spring' as const, stiffness: 300, damping: 25 };

interface ChartStateWrapperProps {
  selectedSid: string;
  loading: boolean;
  hasData: boolean;
  /** Icon + text shown when no branch is selected */
  noBranchIcon: React.ElementType;
  noBranchTitle: string;
  /** Icon + text shown when data is empty */
  emptyIcon: React.ElementType;
  emptyTitle: string;
  emptyDescription?: string;
  emptyIconClassName?: string;
  /** The chart content to render when data is available */
  children: React.ReactNode;
  /** Unique key for AnimatePresence (optional, defaults to 'chart') */
  chartKey?: string;
}

export function ChartStateWrapper({
  selectedSid,
  loading,
  hasData,
  noBranchIcon,
  noBranchTitle,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyIconClassName,
  children,
  chartKey = 'chart',
}: ChartStateWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      {!selectedSid ? (
        <motion.div key="no-branch" {...FADE_SCALE}>
          <DashboardEmptyState icon={noBranchIcon} title={noBranchTitle} iconClassName="bg-muted" />
        </motion.div>
      ) : loading ? (
        <motion.div key="loading" {...FADE_ONLY}>
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </motion.div>
      ) : !hasData ? (
        <motion.div key="empty" {...FADE_SCALE}>
          <DashboardEmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            iconClassName={emptyIconClassName}
          />
        </motion.div>
      ) : (
        <motion.div
          key={chartKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={SLIDE_UP}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Reusable empty state for dashboard cards
// ---------------------------------------------------------------------------

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  iconClassName,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-center">
      <div className={`animate-empty-bounce rounded-full p-3 mb-3 ${iconClassName ?? 'bg-muted'}`}>
        <Icon className="h-6 w-6 text-inherit" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">{description}</p>
      )}
    </div>
  );
}
