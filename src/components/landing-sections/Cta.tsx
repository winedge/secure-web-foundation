import type { SectionTheme, CtaProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Cta({ props, theme }: { props: CtaProps; theme: SectionTheme }) {
  const bg =
    props.style === 'gradient'
      ? `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`
      : props.style === 'bold'
      ? theme.primary
      : theme.accent + '10';
  const fg = props.style === 'soft' ? theme.primary : '#fff';
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        <div style={{ background: bg, color: fg, borderRadius: radiusPx(theme.radius === 'sm' ? 'md' : theme.radius), padding: 'clamp(32px, 5vw, 64px)', textAlign: 'center' }}>
          <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,40px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>
          {props.subheading && <p style={{ fontSize: 17, opacity: 0.88, marginTop: 12, maxWidth: 600, marginInline: 'auto' }}>{props.subheading}</p>}
          {(props.primaryCta || props.secondaryCta) && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
              {props.primaryCta && (
                <a href={props.primaryCta.href || '#lead-form'} style={props.style === 'soft' ? buttonStyles(theme, 'primary') : { ...buttonStyles(theme, 'primary'), background: '#fff', color: theme.primary }}>
                  {props.primaryCta.label}
                </a>
              )}
              {props.secondaryCta && (
                <a href={props.secondaryCta.href || '#'} style={{ ...buttonStyles(theme, 'secondary'), color: fg, borderColor: fg + '60' }}>
                  {props.secondaryCta.label}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
