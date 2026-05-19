import { useState } from 'react';
import { Check } from 'lucide-react';
import type { SectionTheme, PricingToggleProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function PricingToggle({ props, theme }: { props: PricingToggleProps; theme: SectionTheme }) {
  const [yearly, setYearly] = useState(false);
  const plans = props.plans ?? [];
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{props.heading}</h2>}
          {props.intro && <p style={{ fontSize: 17, opacity: 0.7, marginTop: 10 }}>{props.intro}</p>}
          <div style={{ display: 'inline-flex', marginTop: 24, padding: 4, borderRadius: 9999, background: theme.primary + '0d', gap: 4 }}>
            {[false, true].map((y) => (
              <button
                key={String(y)}
                onClick={() => setYearly(y)}
                style={{
                  padding: '8px 18px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                  background: yearly === y ? theme.accent : 'transparent',
                  color: yearly === y ? '#fff' : theme.primary,
                  fontWeight: 600, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all .15s',
                }}
              >
                {y ? props.yearlyLabel : props.monthlyLabel}
                {y && props.yearlyDiscountLabel && (
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,.2)' }}>{props.yearlyDiscountLabel}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`, gap: 20 }}>
          {plans.map((p, i) => (
            <div key={i} style={{
              padding: 28, borderRadius: radiusPx(theme.radius),
              border: p.highlighted ? `2px solid ${theme.accent}` : `1px solid ${theme.primary}1a`,
              background: p.highlighted ? `linear-gradient(180deg, ${theme.accent}08, transparent)` : theme.background,
              position: 'relative',
            }}>
              {p.highlighted && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: theme.accent, color: '#fff', padding: '4px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>Most popular</div>
              )}
              <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                <span style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {yearly ? p.yearlyPrice : p.monthlyPrice}
                </span>
                <span style={{ fontSize: 14, opacity: 0.6 }}>/{yearly ? 'yr' : 'mo'}</span>
              </div>
              {p.description && <p style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>{p.description}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                {(Array.isArray(p.features) ? p.features : []).map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                    <Check size={16} style={{ color: theme.accent, flexShrink: 0, marginTop: 2 }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              {p.cta && (
                <a href={p.cta.href || '#lead-form'} style={{ ...buttonStyles(theme, p.highlighted ? 'primary' : 'secondary'), width: '100%', marginTop: 24 }}>
                  {p.cta.label}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
