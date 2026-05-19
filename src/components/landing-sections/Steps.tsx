import type { SectionTheme, StepsProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, sectionPadding } from './_shared';

export function Steps({ props, theme }: { props: StepsProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>}
            {props.intro && <p style={{ fontSize: 17, opacity: 0.75, marginTop: 12 }}>{props.intro}</p>}
          </div>
        )}
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 24, gridTemplateColumns: `repeat(${Math.min((props.items?.length) || 1, 4)}, minmax(0, 1fr))` }}>
          {(props.items ?? []).map((item, i) => (
            <li key={i} style={{ position: 'relative' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: theme.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: 14, fontSize: 16 }}>
                {i + 1}
              </div>
              <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 17, fontWeight: 700, margin: 0 }}>{item.title}</h3>
              {item.description && <p style={{ fontSize: 14.5, opacity: 0.75, marginTop: 6, lineHeight: 1.55 }}>{item.description}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
