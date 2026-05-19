import type { SectionTheme, CtaProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Cta({ props, theme }: { props: CtaProps; theme: SectionTheme }) {
  const layout = props.layout || 'centered';
  const fg = '#fff';

  const primaryBtn = (color = theme.primary) => (
    props.primaryCta ? (
      <a href={props.primaryCta.href || '#lead-form'} style={{ ...buttonStyles(theme, 'primary'), background: '#fff', color }}>
        {props.primaryCta.label}
      </a>
    ) : null
  );
  const secondaryBtn = (
    props.secondaryCta ? (
      <a href={props.secondaryCta.href || '#'} style={{ ...buttonStyles(theme, 'secondary'), color: fg, borderColor: fg + '60' }}>
        {props.secondaryCta.label}
      </a>
    ) : null
  );

  const bgSolid =
    props.style === 'gradient' ? `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`
    : props.style === 'soft' ? theme.accent + '10'
    : theme.primary;
  const heroFg = props.style === 'soft' ? theme.primary : '#fff';

  if (layout === 'split-image') {
    return (
      <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', borderRadius: radiusPx(theme.radius), overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: bgSolid, color: heroFg }}>
          <div style={{ padding: 'clamp(32px,5vw,56px)' }}>
            <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,40px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>
            {props.subheading && <p style={{ fontSize: 17, opacity: 0.88, marginTop: 14 }}>{props.subheading}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>{primaryBtn(theme.primary)}{secondaryBtn}</div>
          </div>
          <div style={{ background: props.imageUrl ? `url(${props.imageUrl}) center/cover` : `radial-gradient(circle at 70% 30%, ${theme.accent}55, transparent 60%), linear-gradient(160deg, ${theme.accent}, ${theme.primary})`, minHeight: 280 }} />
        </div>
      </section>
    );
  }

  if (layout === 'banner-strip') {
    return (
      <section style={{ padding: 0, background: bgSolid, color: heroFg, fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', padding: '28px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 auto', minWidth: 240 }}>
            <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(20px,2.2vw,28px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>
            {props.subheading && <p style={{ fontSize: 14.5, opacity: 0.85, marginTop: 4 }}>{props.subheading}</p>}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{primaryBtn()}{secondaryBtn}</div>
        </div>
      </section>
    );
  }

  if (layout === 'card-floating') {
    return (
      <section style={{ padding: sectionPadding(theme.spacing), background: theme.accent + '10', fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '-40px -10px -10px -10px', background: `radial-gradient(circle at 50% 0%, ${theme.accent}40, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', background: bgSolid, color: heroFg, padding: 'clamp(40px,5vw,64px)', borderRadius: radiusPx(theme.radius === 'sm' ? 'lg' : '2xl'), textAlign: 'center', boxShadow: `0 30px 80px -20px ${theme.primary}55, 0 0 0 1px ${theme.accent}30` }}>
            <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3.2vw,42px)', fontWeight: 700, margin: 0, letterSpacing: '-0.015em' }}>{props.heading}</h2>
            {props.subheading && <p style={{ fontSize: 17, opacity: 0.9, marginTop: 14, maxWidth: 560, marginInline: 'auto' }}>{props.subheading}</p>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>{primaryBtn()}{secondaryBtn}</div>
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'full-bleed-photo') {
    return (
      <section style={{ position: 'relative', padding: 'clamp(80px,12vw,160px) 16px', fontFamily: fontFamily(theme, 'body'), color: '#fff', background: props.imageUrl ? `url(${props.imageUrl}) center/cover` : `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${theme.primary}cc, ${theme.primary}66)` }} />
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(30px,4vw,52px)', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{props.heading}</h2>
          {props.subheading && <p style={{ fontSize: 18, opacity: 0.92, marginTop: 16 }}>{props.subheading}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>{primaryBtn()}{secondaryBtn}</div>
        </div>
      </section>
    );
  }

  // default 'centered'
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        <div style={{ background: bgSolid, color: heroFg, borderRadius: radiusPx(theme.radius === 'sm' ? 'md' : theme.radius), padding: 'clamp(32px, 5vw, 64px)', textAlign: 'center' }}>
          <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,40px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>
          {props.subheading && <p style={{ fontSize: 17, opacity: 0.88, marginTop: 12, maxWidth: 600, marginInline: 'auto' }}>{props.subheading}</p>}
          {(props.primaryCta || props.secondaryCta) && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
              {primaryBtn()}{secondaryBtn}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
