import type { SectionTheme } from '@/lib/landing-sections/types';
import { Check, X } from 'lucide-react';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export interface ComparisonProps {
  heading?: string;
  intro?: string;
  usLabel: string;
  themLabel: string;
  rows: { feature: string; us: boolean; them: boolean }[];
}

export function Comparison({ props, theme }: { props: ComparisonProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: 0 }}>{props.heading}</h2>}
            {props.intro && <p style={{ marginTop: 12, opacity: 0.7 }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ borderRadius: radiusPx(theme.radius), border: `1px solid ${theme.primary}1a`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', background: `${theme.primary}08`, padding: '14px 20px', fontWeight: 700, fontSize: 14 }}>
            <div>Feature</div>
            <div style={{ textAlign: 'center', color: theme.accent }}>{props.usLabel}</div>
            <div style={{ textAlign: 'center', opacity: 0.6 }}>{props.themLabel}</div>
          </div>
          {(props.rows || []).map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '16px 20px', borderTop: `1px solid ${theme.primary}10`, alignItems: 'center' }}>
              <div>{r.feature}</div>
              <div style={{ textAlign: 'center' }}>{r.us ? <Check style={{ color: theme.accent, margin: '0 auto' }} /> : <X style={{ opacity: 0.4, margin: '0 auto' }} />}</div>
              <div style={{ textAlign: 'center' }}>{r.them ? <Check style={{ opacity: 0.6, margin: '0 auto' }} /> : <X style={{ opacity: 0.4, margin: '0 auto' }} />}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
