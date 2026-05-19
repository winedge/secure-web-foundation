import { useState } from 'react';
import type { SectionTheme, TabsProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, sectionPadding } from './_shared';

export function Tabs({ props, theme }: { props: TabsProps; theme: SectionTheme }) {
  const tabs = props.tabs ?? [];
  const [active, setActive] = useState(0);
  const cur = tabs[active];
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>}
            {props.intro && <p style={{ fontSize: 16, opacity: 0.7, marginTop: 8 }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: `1px solid ${theme.primary}1a`, marginBottom: 28 }}>
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: i === active ? theme.accent : theme.primary,
                opacity: i === active ? 1 : 0.65,
                borderBottom: `2px solid ${i === active ? theme.accent : 'transparent'}`,
                marginBottom: -1,
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {cur && (
          <div style={{ display: 'grid', gridTemplateColumns: cur.imageUrl ? '1fr 1fr' : '1fr', gap: 36, alignItems: 'center' }}>
            <div>
              {cur.heading && <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 24, fontWeight: 700, margin: 0 }}>{cur.heading}</h3>}
              <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.6, opacity: 0.85, whiteSpace: 'pre-wrap' }}>{cur.body}</p>
            </div>
            {cur.imageUrl && <img src={cur.imageUrl} alt="" style={{ width: '100%', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,.1)' }} />}
          </div>
        )}
      </div>
    </section>
  );
}
