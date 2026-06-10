'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Rocket, Users, Sparkles,
  Lightbulb, Search, BookOpen, ArrowRight,
  Settings,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '@/i18n';
import { useAIChatStore } from '@/stores/ai-chat.store';

// ─── Types ───────────────────────────────────────────────────────────────────

type Level = 'basic' | 'advanced';

interface Step {
  titleKey: string;
  descKey: string;
  link?: string;
}

interface Section {
  id: string;
  level: Level;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  steps: Step[];
  tip?: { key: string };
  aiPrompt?: string;
}

// ─── Section Config ──────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  // ── BASIC ──────────────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    level: 'basic',
    titleKey: 'gettingStarted',
    descKey: 'gettingStartedDesc',
    icon: Rocket,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    steps: [
      { titleKey: 'gs1Title', descKey: 'gs1Desc' },
      { titleKey: 'gs2Title', descKey: 'gs2Desc', link: '/overview' },
      { titleKey: 'gs3Title', descKey: 'gs3Desc', link: '/settings' },
    ],
  },
  {
    id: 'user-management',
    level: 'basic',
    titleKey: 'userManagement',
    descKey: 'userManagementDesc',
    icon: Users,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    steps: [
      { titleKey: 'um1Title', descKey: 'um1Desc', link: '/users' },
      { titleKey: 'um2Title', descKey: 'um2Desc' },
      { titleKey: 'um3Title', descKey: 'um3Desc' },
    ],
  },

  // ── ADVANCED ───────────────────────────────────────────────────────────────
  {
    id: 'ai-assistant',
    level: 'advanced',
    titleKey: 'aiAssistant',
    descKey: 'aiAssistantDesc',
    icon: Sparkles,
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
    iconColor: 'text-pink-600 dark:text-pink-400',
    steps: [
      { titleKey: 'ai1Title', descKey: 'ai1Desc' },
      { titleKey: 'ai2Title', descKey: 'ai2Desc' },
      { titleKey: 'ai3Title', descKey: 'ai3Desc' },
    ],
    aiPrompt: 'What can you help me with?',
  },
  {
    id: 'tips',
    level: 'advanced',
    titleKey: 'tips',
    descKey: 'tipsDesc',
    icon: Lightbulb,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    steps: [
      { titleKey: 'tp1Title', descKey: 'tp1Desc' },
      { titleKey: 'tp2Title', descKey: 'tp2Desc' },
      { titleKey: 'tp3Title', descKey: 'tp3Desc', link: '/settings' },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const LEVEL_COLORS = {
  basic: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
  advanced: { badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800' },
};

export function TutorialContent() {
  const { t } = useTranslation('tutorial');
  const router = useRouter();
  const { setOpen: setAIChatOpen, setPendingPrompt } = useAIChatStore();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<Level | 'all'>('basic');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = SECTIONS.filter((s) => {
    if (level !== 'all' && s.level !== level) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t(s.titleKey).toLowerCase().includes(q) ||
      t(s.descKey).toLowerCase().includes(q) ||
      s.steps.some(
        (step) =>
          t(step.titleKey).toLowerCase().includes(q) ||
          t(step.descKey).toLowerCase().includes(q)
      )
    );
  });

  const basicCount = SECTIONS.filter((s) => s.level === 'basic').length;
  const advancedCount = SECTIONS.filter((s) => s.level === 'advanced').length;

  const handleTryAI = (prompt: string) => {
    setPendingPrompt(prompt);
    setAIChatOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 sm:p-8 text-white"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-6 w-6" />
            <span className="text-xs font-medium uppercase tracking-widest text-white/70">{t('subtitle')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-sm text-white/80 max-w-lg">
            {t('heroDesc')}
          </p>
          <div className="flex gap-3 mt-4">
            <div className="rounded-lg bg-white/15 backdrop-blur-sm px-3 py-1.5 text-xs font-medium">
              {basicCount} {t('basicTab')}
            </div>
            <div className="rounded-lg bg-white/15 backdrop-blur-sm px-3 py-1.5 text-xs font-medium">
              {advancedCount} {t('advancedTab')}
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 top-8 h-24 w-24 rounded-full bg-white/5" />
        <div className="absolute right-20 -bottom-6 h-32 w-32 rounded-full bg-white/5" />
      </motion.div>

      {/* Level tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={level} onValueChange={(v) => setLevel(v as Level | 'all')}>
          <TabsList className="h-9">
            <TabsTrigger value="basic" className="text-xs px-4 h-7 gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t('basicTab')}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs px-4 h-7 gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              {t('advancedTab')}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-4 h-7">{t('allTab')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Sections as cards grid */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('noResults')}</p>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((section, sIdx) => {
            const Icon = section.icon;
            const isOpen = expandedId === section.id;
            const levelColor = LEVEL_COLORS[section.level];

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sIdx * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                className={`group rounded-xl border bg-card shadow-sm transition-all duration-300 overflow-hidden ${
                  isOpen ? `ring-2 ${levelColor.ring}` : 'hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Card header — clickable */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : section.id)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${section.iconBg} transition-transform group-hover:scale-110`}>
                    <Icon className={`h-5 w-5 ${section.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate">{t(section.titleKey)}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${levelColor.badge}`}>
                        {section.level}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t(section.descKey)}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground/60">
                      <span>{section.steps.length} steps</span>
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="border-t"
                  >
                    <div className="p-4 space-y-3">
                      {section.steps.map((step, i) => (
                        <motion.div
                          key={step.titleKey}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-start gap-3"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{t(step.titleKey)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(step.descKey)}</p>
                            {step.link && (
                              <button
                                onClick={() => router.push(step.link!)}
                                className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary hover:underline"
                              >
                                {t('goToPage')} <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}

                      {section.tip && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: section.steps.length * 0.06 }}
                          className="flex items-start gap-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 px-3.5 py-3"
                        >
                          <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">{t('tip')}</p>
                            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{t(section.tip.key)}</p>
                          </div>
                        </motion.div>
                      )}

                      {/* Action buttons */}
                      {section.aiPrompt && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: section.steps.length * 0.06 + 0.1 }}
                          className="flex flex-wrap gap-2 pt-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary rounded-lg"
                            onClick={() => handleTryAI(section.aiPrompt!)}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {t('tryAI')}
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
