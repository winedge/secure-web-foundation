import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SectionTheme, FaqProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Faq({ props, theme }: { props: FaqProps; theme: SectionTheme }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: '0 0 36px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {props.items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ border: `1px solid ${theme.primary}18`, borderRadius: radiusPx(theme.radius), overflow: 'hidden', background: theme.background }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', textAlign: 'left' }}
                >
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{item.question}</span>
                  <ChevronDown size={20} style={{ transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', color: theme.accent }} />
                </button>
                {isOpen && <div style={{ padding: '0 20px 18px', fontSize: 15, lineHeight: 1.6, opacity: 0.78 }}>{item.answer}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
