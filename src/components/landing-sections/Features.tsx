import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import type { SectionTheme, FeaturesProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

function Heading({ props, theme, align = 'center' }: { props: FeaturesProps; theme: SectionTheme; align?: 'left' | 'center' }) {
  if (!props.heading && !props.intro) return null;
  return (
    <div style={{ textAlign: align, marginBottom: 48, maxWidth: align === 'left' ? 720 : undefined }}>
      {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>}
      {props.intro && <p style={{ fontSize: 17, opacity: 0.75, marginTop: 12, maxWidth: 640, marginInline: align === 'center' ? 'auto' : undefined }}>{props.intro}</p>}
    </div>
  );
}

function Icn({ name, theme, size = 22 }: { name?: string; theme: SectionTheme; size?: number }) {
  const Icon = (LucideIcons as any)[name || 'Sparkles'] || LucideIcons.Sparkles;
  return <Icon size={size} color={theme.accent} />;
}

export function Features({ props, theme }: { props: FeaturesProps; theme: SectionTheme }) {
  const layout = props.layout ?? 'grid';
  const items = props.items ?? [];
  const wrap: React.CSSProperties = { padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') };
  const inner: React.CSSProperties = { maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' };

  if (layout === 'zigzag') {
    return (
      <section style={wrap}>
        <div style={inner}>
          <Heading props={props} theme={theme} align="left" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
            {items.map((item, i) => {
              const reverse = i % 2 === 1;
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 48, alignItems: 'center', direction: reverse ? 'rtl' : 'ltr' }}>
                  <div style={{ direction: 'ltr' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: theme.accent + '14', color: theme.accent, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                      <Icn name={item.icon} theme={theme} size={14} /> Feature {String(i + 1).padStart(2, '0')}
                    </div>
                    <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(22px,2.4vw,30px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{item.title}</h3>
                    {item.description && <p style={{ fontSize: 16, opacity: 0.78, lineHeight: 1.65, marginTop: 12 }}>{item.description}</p>}
                  </div>
                  <div style={{ direction: 'ltr', aspectRatio: '4/3', borderRadius: radiusPx(theme.radius), background: `linear-gradient(135deg, ${theme.accent}22, ${theme.primary}18)`, border: `1px solid ${theme.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.imageUrl ? <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icn name={item.icon} theme={theme} size={64} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'accordion-list') {
    return <AccordionFeatures props={props} theme={theme} />;
  }

  if (layout === 'icon-row') {
    return (
      <section style={wrap}>
        <div style={inner}>
          <Heading props={props} theme={theme} />
          <div style={{ display: 'grid', gap: 32, gridTemplateColumns: `repeat(${Math.min(items.length || 1, 4)}, minmax(0, 1fr))` }}>
            {items.map((item, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: theme.accent + '14', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icn name={item.icon} theme={theme} size={26} />
                </div>
                <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 17, fontWeight: 700, margin: 0 }}>{item.title}</h3>
                {item.description && <p style={{ fontSize: 14, opacity: 0.7, marginTop: 8, lineHeight: 1.55 }}>{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'two-col-large') {
    const [primary, ...rest] = items;
    return (
      <section style={wrap}>
        <div style={inner}>
          <Heading props={props} theme={theme} align="left" />
          <div style={{ display: 'grid', gap: 32, gridTemplateColumns: '1.2fr 1fr' }}>
            {primary && (
              <div style={{ padding: 36, borderRadius: radiusPx(theme.radius), background: theme.accent + '10', border: `1px solid ${theme.accent}22`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 360, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 80% 20%, ${theme.accent}30, transparent 60%)` }} />
                <div style={{ position: 'relative' }}>
                  <Icn name={primary.icon} theme={theme} size={32} />
                  <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(22px,2.5vw,30px)', fontWeight: 700, margin: '18px 0 10px' }}>{primary.title}</h3>
                  {primary.description && <p style={{ fontSize: 16, opacity: 0.85, lineHeight: 1.6 }}>{primary.description}</p>}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gap: 16 }}>
              {rest.slice(0, 4).map((item, i) => (
                <div key={i} style={{ padding: 20, borderRadius: radiusPx(theme.radius), background: theme.background, border: `1px solid ${theme.primary}14`, display: 'flex', gap: 14 }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: radiusPx(theme.radius), background: theme.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icn name={item.icon} theme={theme} size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 16, fontWeight: 700, margin: 0 }}>{item.title}</h3>
                    {item.description && <p style={{ fontSize: 13.5, opacity: 0.7, marginTop: 4, lineHeight: 1.5 }}>{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // default 'grid'
  return (
    <section style={wrap}>
      <div style={inner}>
        <Heading props={props} theme={theme} />
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))` }}>
          {items.map((item, i) => (
            <div key={i} style={{ padding: 24, borderRadius: radiusPx(theme.radius), background: theme.accent + '08', border: `1px solid ${theme.accent}1a` }}>
              <div style={{ width: 44, height: 44, borderRadius: radiusPx(theme.radius), background: theme.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icn name={item.icon} theme={theme} />
              </div>
              <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 18, fontWeight: 700, margin: 0 }}>{item.title}</h3>
              {item.description && <p style={{ fontSize: 14.5, opacity: 0.75, marginTop: 8, lineHeight: 1.55 }}>{item.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AccordionFeatures({ props, theme }: { props: FeaturesProps; theme: SectionTheme }) {
  const [open, setOpen] = useState(0);
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
        <div>
          <Heading props={props} theme={theme} align="left" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(props.items ?? []).map((item, i) => {
              const isOpen = open === i;
              return (
                <button key={i} onClick={() => setOpen(i)} style={{ textAlign: 'left', cursor: 'pointer', background: isOpen ? theme.accent + '12' : 'transparent', border: `1px solid ${isOpen ? theme.accent + '40' : theme.primary + '12'}`, borderRadius: radiusPx(theme.radius), padding: '18px 20px', color: 'inherit', fontFamily: 'inherit' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Icn name={item.icon} theme={theme} size={18} />
                      <span style={{ fontWeight: 700, fontSize: 16 }}>{item.title}</span>
                    </div>
                    <ChevronDown size={18} style={{ transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', color: theme.accent }} />
                  </div>
                  {isOpen && item.description && <p style={{ fontSize: 14.5, opacity: 0.78, lineHeight: 1.6, marginTop: 10 }}>{item.description}</p>}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ aspectRatio: '4/5', borderRadius: radiusPx(theme.radius), background: `linear-gradient(160deg, ${theme.primary}, ${theme.accent})`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,.18), transparent 50%)' }} />
        </div>
      </div>
    </section>
  );
}
