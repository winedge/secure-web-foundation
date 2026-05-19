import { Star } from 'lucide-react';
import type { SectionTheme, ReviewsWallProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

const SOURCE_LABELS: Record<string, string> = { google: 'Google', trustpilot: 'Trustpilot', facebook: 'Facebook', manual: 'Verified' };

export function ReviewsWall({ props, theme }: { props: ReviewsWallProps; theme: SectionTheme }) {
  const items = (props.items ?? []).filter(r => r.rating >= (props.minRating ?? 0));
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{props.heading}</h2>}
            {props.intro && <p style={{ fontSize: 17, opacity: 0.7, marginTop: 10 }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`, gap: 16 }}>
          {items.map((r, i) => (
            <div key={i} style={{
              padding: 20, borderRadius: radiusPx(theme.radius),
              border: `1px solid ${theme.primary}1a`, background: theme.background,
              breakInside: 'avoid',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={14} fill={j < r.rating ? theme.accent : 'transparent'} color={j < r.rating ? theme.accent : theme.primary + '40'} />
                  ))}
                </div>
                {props.showSourceBadges && (
                  <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 4, background: theme.accent + '14', color: theme.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {SOURCE_LABELS[r.source] || r.source}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>"{r.quote}"</p>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.7 }}>
                <span style={{ fontWeight: 600 }}>{r.author}</span>
                {r.date && <span>{r.date}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
