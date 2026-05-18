/**
 * Lightweight, frontend-only performance analysis for the landing builder.
 *
 *  - `useFpsMonitor`  : live FPS sampler driven by requestAnimationFrame.
 *  - `analyzeSections`: static cost model for a Section[] (motion + asset weight).
 *
 * Everything runs in the browser; no backend calls. The numbers are rough
 * but consistent enough to surface "this page will likely jank" before
 * the user publishes it.
 */

import type { Section, SectionBackground, SectionAnimation } from '@/lib/landing-sections/types';

// ---------------- FPS sampler ---------------------------------------------

export interface FpsSample {
  fps: number;            // rolling FPS (last ~1s)
  minFps: number;         // worst FPS observed in this session
  droppedFrames: number;  // frames where delta > ~33ms (below 30fps)
  longTasks: number;      // PerformanceObserver longtask count
}

export const FPS_TARGET = 55; // green threshold; below this we warn

// ---------------- Static section cost model -------------------------------

/** Per-section motion + render cost score (0-100, higher = heavier). */
export function scoreSection(s: Section): number {
  let score = 0;

  // Animation cost
  const a = s.animation as SectionAnimation | undefined;
  if (a && a.entrance !== 'none') {
    score += 6;
    if (a.entrance === 'blur-in' || a.entrance === 'mask-reveal') score += 10;
    if (a.easing === 'spring' || a.easing === 'bounce') score += 3;
    if (a.repeat) score += 8;
    if ((a.parallax ?? 0) > 0) score += 12; // parallax forces compositor work each frame
    if ((a.stagger ?? 0) > 0) score += 3;
  }

  // Background cost
  const bg = s.background as SectionBackground | undefined;
  if (bg && bg.kind !== 'none') {
    if (bg.kind === 'mesh') score += 10 + (bg.mesh?.blobs?.length ?? 0) * 4 + (bg.mesh?.grain ? 6 : 0);
    if (bg.kind === 'glass') score += 14 + Math.round((bg.glass?.blur ?? 0) / 6); // backdrop-filter is expensive
    if (bg.kind === 'gradient') score += bg.gradient?.type === 'conic' ? 8 : 4;
  }

  // Section-type baseline
  switch (s.type) {
    case 'video_hero': score += 30; break;
    case 'marquee': score += 10; break;
    case 'before_after': score += 8; break;
    case 'gallery':
    case 'bento': score += 6; break;
    case 'countdown': score += 4; break; // timer interval
    default: score += 2;
  }

  return Math.min(100, score);
}

export interface PerfIssue {
  level: 'info' | 'warning' | 'critical';
  message: string;
  sectionId?: string;
}

export interface PageAnalysis {
  totalScore: number;            // 0-100ish weighted
  motionLoad: number;            // animations active simultaneously
  heavyBackgrounds: number;      // mesh + glass count
  parallaxCount: number;
  videoCount: number;
  estimatedBytes: number;        // rough page payload from props (images/text)
  sectionScores: { id: string; type: string; score: number }[];
  issues: PerfIssue[];
}

export function analyzeSections(sections: Section[]): PageAnalysis {
  const sectionScores = sections
    .filter((s) => s.visible !== false)
    .map((s) => ({ id: s.id, type: s.type, score: scoreSection(s) }));

  const totalScore = Math.min(
    100,
    Math.round(sectionScores.reduce((sum, s) => sum + s.score, 0) / Math.max(1, sectionScores.length / 1.4)),
  );

  let motionLoad = 0, heavyBackgrounds = 0, parallaxCount = 0, videoCount = 0;
  for (const s of sections) {
    if (s.visible === false) continue;
    if (s.animation && s.animation.entrance !== 'none') motionLoad++;
    if (s.animation?.parallax && s.animation.parallax > 0) parallaxCount++;
    if (s.animation?.repeat) motionLoad++;
    if (s.background?.kind === 'mesh' || s.background?.kind === 'glass') heavyBackgrounds++;
    if (s.type === 'video_hero') videoCount++;
  }

  // Crude payload estimate from props JSON (strings, image URLs etc.)
  const estimatedBytes = sections.reduce((acc, s) => {
    try { return acc + new Blob([JSON.stringify(s.props ?? {})]).size; }
    catch { return acc; }
  }, 0);

  const issues: PerfIssue[] = [];
  if (parallaxCount > 2) {
    issues.push({ level: 'warning', message: `${parallaxCount} sections use parallax. Keep to ≤2 to stay above 55 FPS on mid-range mobile.` });
  }
  if (heavyBackgrounds > 3) {
    issues.push({ level: 'warning', message: `${heavyBackgrounds} sections use mesh/glass backgrounds. backdrop-filter is expensive — consider replacing some with solid or gradient.` });
  }
  if (videoCount > 1) {
    issues.push({ level: 'critical', message: 'More than one video hero detected. Each auto-playing video costs ~30% of frame budget on mobile.' });
  }
  if (motionLoad > 8) {
    issues.push({ level: 'warning', message: `${motionLoad} animated sections. Stagger or set entrance to "none" on a few to reduce thrash.` });
  }
  if (estimatedBytes > 250_000) {
    issues.push({ level: 'warning', message: `Page content payload is ~${Math.round(estimatedBytes / 1024)} KB. Consider trimming long copy or lazy-loading media.` });
  }
  // Per-section call-outs
  for (const s of sectionScores) {
    if (s.score >= 60) {
      issues.push({ level: 'critical', message: `Section "${s.type}" has a heavy cost score (${s.score}/100).`, sectionId: s.id });
    } else if (s.score >= 40) {
      issues.push({ level: 'info', message: `Section "${s.type}" is moderately heavy (${s.score}/100).`, sectionId: s.id });
    }
  }
  if (issues.length === 0) {
    issues.push({ level: 'info', message: 'All sections within recommended performance budget.' });
  }
  return { totalScore, motionLoad, heavyBackgrounds, parallaxCount, videoCount, estimatedBytes, sectionScores, issues };
}

// Per-page budgets (UI uses these for progress bars)
export const PERF_BUDGETS = {
  motionLoad: 8,
  heavyBackgrounds: 3,
  parallaxCount: 2,
  videoCount: 1,
  bytes: 250_000,
};
