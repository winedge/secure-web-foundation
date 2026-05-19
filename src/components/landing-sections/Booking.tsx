import type { SectionTheme, BookingProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Booking({ props, theme }: { props: BookingProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{props.heading}</h2>}
            {props.intro && <p style={{ fontSize: 17, opacity: 0.7, marginTop: 10 }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ borderRadius: radiusPx(theme.radius), overflow: 'hidden', border: `1px solid ${theme.primary}1a`, background: theme.background, boxShadow: '0 12px 32px rgba(0,0,0,.06)' }}>
          {props.url ? (
            <iframe
              src={props.url}
              title="Booking"
              width="100%"
              height={props.height || 700}
              frameBorder="0"
              style={{ display: 'block', border: 'none' }}
              loading="lazy"
            />
          ) : (
            <div style={{ padding: 60, textAlign: 'center', opacity: 0.5 }}>Enter your Calendly / Cal.com link in the inspector.</div>
          )}
        </div>
      </div>
    </section>
  );
}
