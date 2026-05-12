'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Top-edge progress bar that fires on every route change.
 *
 * Sequenced animation: 0 → 25 → 70 → 100% then fade out, to give the user
 * a sense the page is loading even when the next route is cached / instant.
 * Independent of any data fetching — purely a navigation cue.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    // Skip the very first mount so we don't flash the bar on initial page load.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // Genuine external-state sync: pathname changes drive the bar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    setProgress(25);
    const t1 = setTimeout(() => setProgress(70), 120);
    const t2 = setTimeout(() => setProgress(100), 380);
    const t3 = setTimeout(() => setVisible(false), 600);
    const t4 = setTimeout(() => setProgress(0), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [pathname]);

  return (
    <div
      className="fixed top-0 inset-x-0 z-[9999] h-[2px] pointer-events-none"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-purple-500 to-blue-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          transition: visible
            ? 'width 300ms ease-out, opacity 150ms ease-out'
            : 'opacity 400ms ease-out',
        }}
      />
    </div>
  );
}
