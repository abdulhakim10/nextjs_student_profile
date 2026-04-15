'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { driver, type DriveStep, type Config } from 'driver.js';

export interface TourStep {
  /** CSS selector for the element to highlight */
  element?: string;
  /** Title shown in the popover */
  title: string;
  /** Description shown in the popover */
  description: string;
  /** Which side to show the popover */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TourConfig {
  /** Page to navigate to before starting */
  navigateTo?: string;
  /** Delay in ms after navigation before starting tour */
  delay?: number;
  /** Steps for the tour */
  steps: TourStep[];
}

const BASE_CONFIG: Config = {
  animate: true,
  showProgress: true,
  showButtons: ['next', 'previous', 'close'],
  nextBtnText: 'Next',
  prevBtnText: 'Back',
  doneBtnText: 'Done',
  overlayColor: 'rgba(0, 0, 0, 0.6)',
  stagePadding: 8,
  stageRadius: 12,
  popoverClass: 'tour-popover',
};

export function useTour() {
  const router = useRouter();

  const startTour = useCallback((config: TourConfig) => {
    const driveSteps: DriveStep[] = config.steps.map((step) => ({
      element: step.element,
      popover: {
        title: step.title,
        description: step.description,
        side: step.side || 'bottom',
        align: 'center' as const,
      },
    }));

    const run = () => {
      const driverObj = driver({
        ...BASE_CONFIG,
        steps: driveSteps,
      });
      driverObj.drive();
    };

    if (config.navigateTo) {
      router.push(config.navigateTo);
      // Wait for page to render
      setTimeout(run, config.delay || 1000);
    } else {
      run();
    }
  }, [router]);

  return { startTour };
}
