import type { SectionTheme, LogoCloudProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, sectionPadding } from './_shared';

export function LogoCloud({ props, theme }: { props: LogoCloudProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', textAlign: 'center' }}>
        {props.heading && <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 32 }}>{props.heading}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}>
          {props.logos.map((logo, i) => (
            <img key={i} src={logo.src} alt={logo.alt || ''} style={{ height: 32, width: 'auto', objectFit: 'contain', filter: 'grayscale(1)' }} />
          ))}
        </div>
      </div>
    </section>
  );
}
