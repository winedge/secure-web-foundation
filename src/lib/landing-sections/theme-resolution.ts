import type { SectionTheme, SectionBackground } from './types';

/**
 * Returns relative luminance (0..1) of a CSS color string. Handles #hex, rgb(),
 * rgba(), and a few common named keywords. Anything we can't parse falls back
 * to 1 (treated as light).
 */
export function colorLuminance(input?: string | null): number {
  if (!input) return 1;
  const c = input.trim().toLowerCase();

  // Named keywords used most often by our presets
  const NAMED: Record<string, [number, number, number]> = {
    black: [0, 0, 0], white: [255, 255, 255],
    transparent: [255, 255, 255],
  };
  if (NAMED[c]) {
    const [r, g, b] = NAMED[c];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  // #rgb / #rrggbb
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  // rgb / rgba
  const rgb = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) {
    const r = +rgb[1], g = +rgb[2], b = +rgb[3];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  return 1;
}

export function isColorDark(input?: string | null, threshold = 0.45): boolean {
  return colorLuminance(input) < threshold;
}

/**
 * Best-effort dark detection for a section background. Uses the explicit
 * `solid` color, the first gradient stop, or the mesh base; glass surfaces
 * are inspected via their tint color.
 */
export function isSectionBackgroundDark(bg?: SectionBackground): boolean {
  if (!bg || bg.kind === 'none') return false;
  if (bg.kind === 'solid') return isColorDark(bg.color);
  if (bg.kind === 'gradient' && bg.gradient?.stops?.length) {
    // Average luminance across stops gives a stable read for multi-color gradients.
    const avg =
      bg.gradient.stops.reduce((sum, s) => sum + colorLuminance(s.color), 0) /
      bg.gradient.stops.length;
    return avg < 0.45;
  }
  if (bg.kind === 'mesh') return isColorDark(bg.mesh?.base);
  if (bg.kind === 'glass') return isColorDark(bg.color);
  return false;
}

/**
 * Returns the section-effective theme: when the section's background is
 * detected as dark and a `dark` brand variant exists, primary/background/accent
 * (and the logo) swap to their dark-mode counterparts so type stays legible
 * and the brand mark adapts automatically.
 */
export function resolveSectionTheme(
  theme: SectionTheme,
  bg?: SectionBackground,
): SectionTheme {
  if (!theme.dark) return theme;
  if (!isSectionBackgroundDark(bg)) return theme;
  return {
    ...theme,
    primary: theme.dark.primary ?? theme.primary,
    background: theme.dark.background ?? theme.background,
    accent: theme.dark.accent ?? theme.accent,
    logoUrl: theme.logoUrlDark ?? theme.logoUrl,
  };
}
