import { useEffect, useState } from 'react';
import type { SectionTheme } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export interface CountdownProps {
  heading: string;
  subheading?: string;
  targetIso: string; // ISO date string
  cta?: { label: string; href?: string };
}

function diff(t: number) {
  const s = Math.max(0, Math.floor(t / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ props, theme }: { props: CountdownProps; theme: SectionTheme }) {
  const target = new Date(props.targetIso).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const { d, h, m, s } = diff(target - now);
  const cell = (label: string, val: number) => (
    <div style={{ minWidth: 88, padding: '18px 16px', borderRadius: radiusPx(theme.radius), background: `${theme.primary}08`, textAlign: 'center' }}>
      <div style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, lineHeight: 1, color: theme.accent, fontVariantNumeric: 'tabular-nums' }}>{String(val).padStart(2, '0')}</div>
      <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 6 }}>{label}</div>
    </div>
  );
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: '0 0 12px' }}>{props.heading}</h2>
        {props.subheading && <p style={{ opacity: 0.7, marginBottom: 32 }}>{props.subheading}</p>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          {cell('Days', d)}{cell('Hours', h)}{cell('Mins', m)}{cell('Secs', s)}
        </div>
        {props.cta && <a href={props.cta.href || '#lead-form'} style={buttonStyles(theme, 'primary')}>{props.cta.label}</a>}
      </div>
    </section>
  );
}
