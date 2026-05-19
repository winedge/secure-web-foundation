import type { SectionTheme, StatsProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Stats({ props, theme }: { props: StatsProps; theme: SectionTheme }) {
  const layout = props.layout || 'row';
  const items = props.items ?? [];

  if (layout === 'inline-strip') {
    return (
      <section style={{ padding: '24px 16px', background: theme.accent + '14', color: theme.primary, fontFamily: fontFamily(theme, 'body'), borderTop: `1px solid ${theme.accent}30`, borderBottom: `1px solid ${theme.accent}30` }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: 24 }}>
          {items.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 28, fontWeight: 800, color: theme.accent }}>{s.value}{s.suffix}</span>
              <span style={{ fontSize: 14, opacity: 0.75 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (layout === 'cards-large') {
    return (
      <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
          {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.5vw,32px)', fontWeight: 700, margin: '0 0 36px' }}>{props.heading}</h2>}
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: `repeat(${Math.min(items.length || 1, 4)}, minmax(0, 1fr))` }}>
            {items.map((s, i) => (
              <div key={i} style={{ padding: 28, borderRadius: radiusPx(theme.radius), background: `linear-gradient(160deg, ${theme.accent}18, ${theme.accent}05)`, border: `1px solid ${theme.accent}25` }}>
                <div style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(36px,4.5vw,56px)', fontWeight: 800, color: theme.accent, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {s.value}{s.suffix && <span style={{ fontSize: '0.55em' }}>{s.suffix}</span>}
                </div>
                <div style={{ fontSize: 14, opacity: 0.75, marginTop: 12, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // default 'row' (dark band)
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.primary, color: '#fff', fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.5vw,32px)', fontWeight: 700, margin: '0 0 36px' }}>{props.heading}</h2>}
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: `repeat(${Math.min(items.length || 1, 4)}, minmax(0, 1fr))` }}>
          {items.map((s, i) => (
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
