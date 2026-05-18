import type { SectionTheme } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export interface NewsletterProps {
  heading: string;
  subheading?: string;
  placeholder: string;
  ctaLabel: string;
}

export function Newsletter({ props, theme }: { props: NewsletterProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: '#fff', fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3.4vw,44px)', fontWeight: 800, margin: 0 }}>{props.heading}</h2>
        {props.subheading && <p style={{ opacity: 0.9, marginTop: 12, fontSize: 17 }}>{props.subheading}</p>}
        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: 10, maxWidth: 480, margin: '28px auto 0', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder={props.placeholder}
            style={{ flex: 1, minWidth: 220, padding: '14px 18px', borderRadius: radiusPx(theme.radius), border: 'none', fontSize: 15, background: 'rgba(255,255,255,.95)', color: theme.primary }}
          />
          <button type="submit" style={{ ...buttonStyles(theme, 'primary'), background: '#fff', color: theme.primary }}>{props.ctaLabel}</button>
        </form>
      </div>
    </section>
  );
}
