import { Check } from 'lucide-react';
import type { SectionTheme, PricingProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Pricing({ props, theme }: { props: PricingProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>}
            {props.intro && <p style={{ fontSize: 17, opacity: 0.75, marginTop: 12 }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: `repeat(${Math.min(props.plans.length || 1, 3)}, minmax(0, 1fr))` }}>
          {props.plans.map((p, i) => {
            const isHi = p.highlighted;
            return (
              <div key={i} style={{ padding: 32, borderRadius: radiusPx(theme.radius), background: isHi ? theme.primary : theme.background, color: isHi ? '#fff' : theme.primary, border: `1px solid ${isHi ? theme.primary : theme.primary + '18'}`, boxShadow: isHi ? '0 20px 40px rgba(0,0,0,.18)' : '0 2px 8px rgba(0,0,0,.04)', transform: isHi ? 'scale(1.02)' : undefined }}>
                {isHi && <div style={{ display: 'inline-block', padding: '4px 10px', fontSize: 12, fontWeight: 600, background: theme.accent, color: '#fff', borderRadius: 9999, marginBottom: 12 }}>Most popular</div>}
                <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 20, fontWeight: 700, margin: 0 }}>{p.name}</h3>
                <div style={{ marginTop: 16, marginBottom: 8 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em' }}>{p.price}</span>
                  {p.period && <span style={{ opacity: 0.7, marginLeft: 6 }}>/{p.period}</span>}
                </div>
                {p.description && <p style={{ fontSize: 14, opacity: 0.75, marginTop: 4 }}>{p.description}</p>}
                <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {p.features.map((f, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'start', gap: 10, fontSize: 14.5 }}>
                      <Check size={18} style={{ color: theme.accent, flexShrink: 0, marginTop: 2 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {p.cta && (
                  <a href={p.cta.href || '#lead-form'} style={{ ...buttonStyles(theme, isHi ? 'primary' : 'secondary'), width: '100%', justifyContent: 'center', color: isHi ? '#fff' : theme.primary, borderColor: isHi ? 'transparent' : theme.primary + '40' }}>
                    {p.cta.label}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
