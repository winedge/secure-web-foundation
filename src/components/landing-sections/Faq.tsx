import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { SectionTheme, FaqProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Faq({ props, theme }: { props: FaqProps; theme: SectionTheme }) {
  const layout = props.layout || 'accordion-single';
  const items = props.items ?? [];

  if (layout === 'card-grid') {
    return (
      <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
          {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: '0 0 36px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {items.map((item, i) => (
              <div key={i} style={{ padding: 24, borderRadius: radiusPx(theme.radius), background: theme.accent + '08', border: `1px solid ${theme.accent}1a` }}>
                <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>{item.question}</h3>
                <p style={{ fontSize: 14.5, opacity: 0.78, lineHeight: 1.6, margin: 0 }}>{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'two-col') {
    return (
      <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 24 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
            <p style={{ fontSize: 15, opacity: 0.7, lineHeight: 1.55 }}>Common questions answered. Can't find what you're looking for? Use the form below and a real human will get back to you.</p>
          </div>
          <SingleAccordion items={items} theme={theme} />
        </div>
      </section>
    );
  }

  return <SingleAccordion items={items} theme={theme} heading={props.heading} searchable={layout === 'two-col' as never} />;
}

function SingleAccordion({ items, theme, heading, searchable }: { items: { question: string; answer: string }[]; theme: SectionTheme; heading?: string; searchable?: boolean }) {
  const [open, setOpen] = useState<number | null>(0);
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => items.filter((i) => !q || i.question.toLowerCase().includes(q.toLowerCase()) || i.answer.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );
  return (
    <section style={{ padding: heading !== undefined && !searchable ? sectionPadding(theme.spacing) : 0, background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: '0 0 36px', letterSpacing: '-0.01em' }}>{heading}</h2>}
        {searchable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', border: `1px solid ${theme.primary}18`, borderRadius: radiusPx(theme.radius) }}>
            <Search size={16} style={{ opacity: 0.6 }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 14.5 }} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ border: `1px solid ${theme.primary}18`, borderRadius: radiusPx(theme.radius), overflow: 'hidden', background: theme.background }}>
                <button onClick={() => setOpen(isOpen ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', textAlign: 'left' }}>
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
