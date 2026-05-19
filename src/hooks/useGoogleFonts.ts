import { useEffect } from 'react';

/**
 * Inject Google Font <link> tags for the supplied family names.
 * Idempotent — reuses a single tag and rewrites href whenever fonts change.
 *
 * Used everywhere the snapshot may render (builder + branded preview) so
 * AI-generated typography always loads, not only when the Brand tab is open.
 */
export function useGoogleFonts(...families: (string | undefined | null)[]) {
  useEffect(() => {
    const list = Array.from(
      new Set(families.filter((f): f is string => typeof f === 'string' && f.trim().length > 0))
    );
    if (!list.length) return;
    const href = `https://fonts.googleapis.com/css2?${list
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800;900`)
      .join('&')}&display=swap`;
    const id = 'lp-google-fonts';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [families.join('|')]);
}
