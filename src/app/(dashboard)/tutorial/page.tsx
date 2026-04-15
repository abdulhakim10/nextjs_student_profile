'use client';

import { TutorialContent } from '@/components/tutorial/tutorial-content';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';

export default function TutorialPage() {
  return (
    <MotionStagger className="space-y-6">
      <MotionCard>
        <TutorialContent />
      </MotionCard>
    </MotionStagger>
  );
}
