import type { SectionTheme, StatsProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, sectionPadding } from './_shared';

export function Stats({ props, theme }: { props: StatsProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.primary, color: '#fff', fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.5vw,32px)', fontWeight: 700, margin: '0 0 36px' }}>{props.heading}</h2>}
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: `repeat(${Math.min(props.items.length, 4)}, minmax(0, 1fr))` }}>
          {props.items.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(36px,4vw,52px)', fontWeight: 800, color: theme.accent, letterSpacing: '-0.02em' }}>
                {s.value}{s.suffix && <span style={{ fontSize: '0.6em' }}>{s.suffix}</span>}
              </div>
              <div style={{ fontSize: 15, opacity: 0.75, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
