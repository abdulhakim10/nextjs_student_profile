'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PartyPopper, LayoutDashboard, Settings, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface StepCompleteProps {
  onAddAnotherGroup?: () => void;
}

const CONFETTI_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4'];
const CONFETTI_COUNT = 40;

// Pre-compute confetti positions to avoid Math.random() during render (SSR hydration safe)
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const CONFETTI_PIECES = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: seededRandom(i) * 100,
  delay: seededRandom(i + 100) * 0.5,
  duration: 1.5 + seededRandom(i + 200) * 1.5,
  rotation: seededRandom(i + 300) * 360,
  size: 6 + seededRandom(i + 400) * 6,
  shape: i % 3 as 0 | 1 | 2,
}));

function ConfettiPiece({ piece }: { piece: (typeof CONFETTI_PIECES)[number] }) {
  return (
    <div
      className="absolute top-0 animate-confetti pointer-events-none"
      style={{
        left: `${piece.left}%`,
        animationDelay: `${piece.delay}s`,
        animationDuration: `${piece.duration}s`,
      }}
    >
      <div
        style={{
          width: piece.shape === 2 ? piece.size * 1.5 : piece.size,
          height: piece.shape === 2 ? piece.size * 0.6 : piece.size,
          backgroundColor: piece.color,
          borderRadius: piece.shape === 1 ? '50%' : '2px',
          transform: `rotate(${piece.rotation}deg)`,
        }}
      />
    </div>
  );
}

export function StepComplete({ onAddAnotherGroup }: StepCompleteProps) {
  const { t } = useTranslation('admin');
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(true);
  const [step, setStep] = useState(0);

  // Stagger the entrance animations
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 200),  // icon
      setTimeout(() => setStep(2), 600),  // text
      setTimeout(() => setStep(3), 1000), // buttons
      setTimeout(() => setShowConfetti(false), 4000), // stop confetti
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative flex flex-col items-center text-center py-10 space-y-6 overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {CONFETTI_PIECES.map((piece, i) => (
            <ConfettiPiece key={i} piece={piece} />
          ))}
        </div>
      )}

      {/* Animated icon */}
      <div
        className={`transition-all duration-700 ease-out ${
          step >= 1
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-50 translate-y-4'
        }`}
      >
        <div className="relative">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-celebration-ring" />
          {/* Icon container */}
          <div className="relative rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-5 shadow-xl shadow-primary/30 animate-celebration-bounce">
            <PartyPopper className="h-10 w-10 text-white" />
          </div>
          {/* Floating sparkles */}
          <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-amber-400 animate-sparkle-orbit" />
          <Sparkles className="absolute -bottom-1 -left-3 h-4 w-4 text-pink-400 animate-sparkle-orbit-reverse" />
        </div>
      </div>

      {/* Text */}
      <div
        className={`space-y-2 transition-all duration-700 ease-out delay-100 ${
          step >= 2
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-6'
        }`}
      >
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
          {t('allSet')}
        </h2>
        <p className="text-muted-foreground max-w-md">
          {t('setupComplete')}
        </p>
      </div>

      {/* Buttons */}
      <div
        className={`flex flex-wrap gap-3 justify-center pt-2 transition-all duration-700 ease-out delay-200 ${
          step >= 3
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-6'
        }`}
      >
        <Button
          onClick={() => router.push('/dashboard')}
          className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          {t('goToDashboard')}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/groups')}
          className="transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Settings className="mr-2 h-4 w-4" />
          {t('attendanceSettingsBtn')}
        </Button>
        {onAddAnotherGroup && (
          <Button
            variant="outline"
            onClick={onAddAnotherGroup}
            className="transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('addAnotherGroup')}
          </Button>
        )}
      </div>
    </div>
  );
}
