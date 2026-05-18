import { useEffect, useRef, useState } from 'react';
import type { FpsSample } from '@/lib/landing-builder/performance';

/**
 * Samples real rendering FPS via requestAnimationFrame. Useful to detect
 * jank caused by heavy backgrounds / parallax / video sections.
 */
export function useFpsMonitor(enabled: boolean): FpsSample {
  const [sample, setSample] = useState<FpsSample>({ fps: 60, minFps: 60, droppedFrames: 0, longTasks: 0 });
  const stateRef = useRef({ frames: 0, dropped: 0, lastTick: 0, lastFlush: 0, min: 60, longTasks: 0 });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    let raf = 0;
    const s = stateRef.current;
    s.lastTick = performance.now();
    s.lastFlush = s.lastTick;

    const loop = (now: number) => {
      const delta = now - s.lastTick;
      s.lastTick = now;
      s.frames++;
      if (delta > 33) s.dropped++; // < 30 fps frame
      if (now - s.lastFlush >= 1000) {
        const fps = Math.round((s.frames * 1000) / (now - s.lastFlush));
        s.min = Math.min(s.min, fps);
        setSample({ fps, minFps: s.min, droppedFrames: s.dropped, longTasks: s.longTasks });
        s.frames = 0;
        s.lastFlush = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Long task observer (Chromium)
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        s.longTasks += list.getEntries().length;
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch { /* not supported (Firefox/Safari) */ }

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [enabled]);

  return sample;
}
