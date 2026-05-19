import type { SectionTheme, CaseStudyProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function CaseStudy({ props, theme }: { props: CaseStudyProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.primary, color: '#fff', fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', display: 'grid', gridTemplateColumns: props.imageUrl ? '1fr 1fr' : '1fr', gap: 40, alignItems: 'center' }}>
        <div>
          {props.heading && <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>{props.heading}</div>}
          {props.customerLogo && <img src={props.customerLogo} alt={props.customerName} style={{ height: 32, width: 'auto', marginBottom: 16, filter: 'brightness(0) invert(1)', opacity: 0.85 }} />}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(48px,6vw,72px)', fontWeight: 800, letterSpacing: '-0.03em', color: theme.accent, lineHeight: 1 }}>
              {props.resultValue}
            </span>
          </div>
          <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 24 }}>{props.resultLabel}</div>
          {props.quote && (
            <blockquote style={{ margin: 0, fontSize: 17, lineHeight: 1.55, fontStyle: 'italic', borderLeft: `3px solid ${theme.accent}`, paddingLeft: 16 }}>
              "{props.quote}"
              {props.quoteAuthor && <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7, fontStyle: 'normal' }}>| {props.quoteAuthor}</div>}
            </blockquote>
          )}
          {props.cta && (
            <a href={props.cta.href || '#lead-form'} style={{ ...buttonStyles(theme, 'primary'), marginTop: 24 }}>{props.cta.label}</a>
          )}
        </div>
        {props.imageUrl && (
          <img src={props.imageUrl} alt={props.customerName} style={{ width: '100%', borderRadius: radiusPx(theme.radius), boxShadow: '0 30px 60px rgba(0,0,0,.3)' }} />
        )}
      </div>
    </section>
  );
}
