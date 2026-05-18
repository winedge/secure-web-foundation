import type { SectionTheme } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, sectionPadding } from './_shared';

export interface TimelineItem {
  date: string;
  title: string;
  description?: string;
}
export interface TimelineProps {
  heading?: string;
  intro?: string;
  items: TimelineItem[];
}

export function Timeline({ props, theme }: { props: TimelineProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{props.heading}</h2>}
            {props.intro && <p style={{ marginTop: 12, opacity: 0.7 }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', paddingLeft: 40 }}>
          <div style={{ position: 'absolute', left: 14, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg, ${theme.accent}, ${theme.primary}33)` }} />
          {(props.items || []).map((it, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: 32 }}>
              <div style={{ position: 'absolute', left: -33, top: 6, width: 16, height: 16, borderRadius: '50%', background: theme.accent, boxShadow: `0 0 0 4px ${theme.background}, 0 0 0 5px ${theme.accent}` }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 4 }}>{it.date}</div>
              <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>{it.title}</h3>
              {it.description && <p style={{ margin: 0, opacity: 0.75, lineHeight: 1.6 }}>{it.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
