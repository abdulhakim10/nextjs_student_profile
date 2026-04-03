import { toast as sonnerToast } from 'sonner';
import { CircleCheck, OctagonX, Info, AlertTriangle, Sparkles, type LucideIcon } from 'lucide-react';

interface ToastOptions {
  description?: string;
  duration?: number;
}

interface ToastVariant {
  icon: LucideIcon;
  iconAnim: string;
  border: string;
  bg: string;
  iconBg: string;
  title: string;
  desc: string;
  duration: number;
  sparkle?: boolean;
}

const VARIANTS: Record<string, ToastVariant> = {
  success: {
    icon: CircleCheck,
    iconAnim: 'animate-toast-icon-pop',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
    bg: 'from-emerald-50 to-green-50/80 dark:from-emerald-950/40 dark:to-green-950/30',
    iconBg: 'bg-emerald-500 shadow-emerald-500/30',
    title: 'text-emerald-900 dark:text-emerald-100',
    desc: 'text-emerald-700/70 dark:text-emerald-300/60',
    duration: 3000,
    sparkle: true,
  },
  error: {
    icon: OctagonX,
    iconAnim: 'animate-toast-icon-shake',
    border: 'border-red-200/60 dark:border-red-800/40',
    bg: 'from-red-50 to-rose-50/80 dark:from-red-950/40 dark:to-rose-950/30',
    iconBg: 'bg-red-500 shadow-red-500/30',
    title: 'text-red-900 dark:text-red-100',
    desc: 'text-red-700/70 dark:text-red-300/60',
    duration: 4000,
  },
  info: {
    icon: Info,
    iconAnim: 'animate-toast-icon-pop',
    border: 'border-blue-200/60 dark:border-blue-800/40',
    bg: 'from-blue-50 to-sky-50/80 dark:from-blue-950/40 dark:to-sky-950/30',
    iconBg: 'bg-blue-500 shadow-blue-500/30',
    title: 'text-blue-900 dark:text-blue-100',
    desc: 'text-blue-700/70 dark:text-blue-300/60',
    duration: 3000,
  },
  warning: {
    icon: AlertTriangle,
    iconAnim: 'animate-toast-icon-pop',
    border: 'border-amber-200/60 dark:border-amber-800/40',
    bg: 'from-amber-50 to-yellow-50/80 dark:from-amber-950/40 dark:to-yellow-950/30',
    iconBg: 'bg-amber-500 shadow-amber-500/30',
    title: 'text-amber-900 dark:text-amber-100',
    desc: 'text-amber-700/70 dark:text-amber-300/60',
    duration: 3500,
  },
};

function show(variant: string, message: string, opts?: ToastOptions) {
  const v = VARIANTS[variant];
  const Icon = v.icon;

  sonnerToast.custom(
    (id) => (
      <div
        className={`toast-animated flex items-start gap-3 w-full rounded-xl border ${v.border} bg-gradient-to-r ${v.bg} px-4 py-3 shadow-lg cursor-pointer`}
        onClick={() => sonnerToast.dismiss(id)}
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-md ${v.iconBg} ${v.iconAnim}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`text-sm font-semibold ${v.title}`}>{message}</p>
          {opts?.description && (
            <p className={`text-xs mt-0.5 ${v.desc}`}>{opts.description}</p>
          )}
        </div>
        {v.sparkle && (
          <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-1 animate-toast-sparkle" />
        )}
      </div>
    ),
    { duration: opts?.duration ?? v.duration }
  );
}

export const toast = {
  success: (msg: string, opts?: ToastOptions) => show('success', msg, opts),
  error: (msg: string, opts?: ToastOptions) => show('error', msg, opts),
  info: (msg: string, opts?: ToastOptions) => show('info', msg, opts),
  warning: (msg: string, opts?: ToastOptions) => show('warning', msg, opts),
};
