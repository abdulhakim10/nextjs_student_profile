'use client';

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-sky-500',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function getColorClass(name: string): string {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
} as const;

export function UserAvatar({ name, size = 'md', className = '' }: UserAvatarProps) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${getColorClass(name)} flex items-center justify-center text-white font-bold shrink-0 shadow-sm ring-2 ring-background ${SIZE_CLASSES[size]} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
