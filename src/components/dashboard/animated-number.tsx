'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, motion, useTransform } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
}

export function AnimatedNumber({ value, suffix = '' }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  });
  const display = useTransform(spring, (v) =>
    suffix === '%' ? `${Math.round(v)}%` : Math.round(v).toLocaleString()
  );
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      motionValue.set(0);
      hasInitialized.current = true;
    }
    motionValue.set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <motion.span>{display}</motion.span>;
}
