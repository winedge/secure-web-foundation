import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import type { SectionTheme, AccordionProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Accordion({ props, theme }: { props: AccordionProps; theme: SectionTheme }) {
  const [open, setOpen] = useState<number[]>([0]);
  const toggle = (i: number) => {
    if (props.allowMultiple) setOpen(o => o.includes(i) ? o.filter(x => x !== i) : [...o, i]);
    else setOpen(o => o.includes(i) ? [] : [i]);
  };
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 700, margin: 0 }}>{props.heading}</h2>}
            {props.intro && <p style={{ fontSize: 16, opacity: 0.7, marginTop: 8 }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(props.items ?? []).map((it, i) => {
            const isOpen = open.includes(i);
            return (
              <div key={i} style={{ border: `1px solid ${theme.primary}1a`, borderRadius: radiusPx(theme.radius), overflow: 'hidden', background: theme.background }}>
                <button onClick={() => toggle(i)} style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, color: theme.primary, fontFamily: 'inherit' }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{it.title}</span>
                  {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', fontSize: 15, lineHeight: 1.6, opacity: 0.85, whiteSpace: 'pre-wrap' }}>{it.body}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
