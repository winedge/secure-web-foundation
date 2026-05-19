import type { SectionTheme, LogoCloudProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, sectionPadding } from './_shared';

export function LogoCloud({ props, theme }: { props: LogoCloudProps; theme: SectionTheme }) {
  const layout = props.layout || 'static-grid';
  const logos = props.logos ?? [];

  if (layout === 'marquee') {
    const loop = [...logos, ...logos];
    return (
      <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body'), overflow: 'hidden' }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', textAlign: 'center' }}>
          {props.heading && <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 28 }}>{props.heading}</p>}
        </div>
        <div style={{ display: 'flex', gap: 56, animation: 'lp-logos 35s linear infinite', width: 'max-content', alignItems: 'center', opacity: 0.7 }}>
          {loop.map((logo, i) => (
            <img key={i} src={logo.src} alt={logo.alt || ''} style={{ height: 32, width: 'auto', objectFit: 'contain', filter: 'grayscale(1)' }} />
          ))}
        </div>
        <style>{`@keyframes lp-logos { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>
    );
  }

  if (layout === 'with-quote') {
    return (
      <section style={{ padding: sectionPadding(theme.spacing), background: theme.accent + '06', color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 48, alignItems: 'center' }}>
          <div>
            <blockquote style={{ margin: 0, fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(20px,2vw,26px)', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
              “{props.quote || 'Trusted by teams that need to move fast and look sharp.'}”
            </blockquote>
            {props.quoteAuthor && <div style={{ fontSize: 13, opacity: 0.7, marginTop: 12 }}>{props.quoteAuthor}</div>}
          </div>
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'center', opacity: 0.75 }}>
            {logos.slice(0, 6).map((logo, i) => (
              <img key={i} src={logo.src} alt={logo.alt || ''} style={{ height: 28, width: '100%', objectFit: 'contain', filter: 'grayscale(1)' }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'dual-row') {
    const half = Math.ceil(logos.length / 2);
    const rows = [logos.slice(0, half), logos.slice(half)];
    return (
      <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', textAlign: 'center' }}>
          {props.heading && <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 32 }}>{props.heading}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, opacity: 0.75 }}>
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'center', alignItems: 'center' }}>
                {row.map((logo, i) => (
                  <img key={i} src={logo.src} alt={logo.alt || ''} style={{ height: 28, width: 'auto', objectFit: 'contain', filter: 'grayscale(1)' }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // default 'static-grid'
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', textAlign: 'center' }}>
        {props.heading && <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 32 }}>{props.heading}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}>
          {logos.map((logo, i) => (
            <img key={i} src={logo.src} alt={logo.alt || ''} style={{ height: 32, width: 'auto', objectFit: 'contain', filter: 'grayscale(1)' }} />
          ))}
        </div>
      </div>
    </section>
  );
}
