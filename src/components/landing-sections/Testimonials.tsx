import { Star } from 'lucide-react';
import type { SectionTheme, TestimonialsProps, TestimonialItem } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

function Stars({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 12, color: '#fbbf24' }}>
      {Array.from({ length: 5 }).map((_, idx) => (
        <Star key={idx} size={16} fill={idx < rating ? 'currentColor' : 'none'} stroke="currentColor" />
      ))}
    </div>
  );
}

function Avatar({ t, theme, size = 40 }: { t: TestimonialItem; theme: SectionTheme; size?: number }) {
  if (t.avatar) return <img src={t.avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: theme.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{t.author.charAt(0)}</div>;
}

function Card({ t, theme }: { t: TestimonialItem; theme: SectionTheme }) {
  return (
    <figure style={{ margin: 0, padding: 28, background: theme.background, borderRadius: radiusPx(theme.radius), border: `1px solid ${theme.primary}10`, boxShadow: '0 4px 20px rgba(0,0,0,.04)' }}>
      <Stars rating={t.rating} />
      <blockquote style={{ margin: 0, fontSize: 16, lineHeight: 1.6, fontStyle: 'italic' }}>“{t.quote}”</blockquote>
      <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <Avatar t={t} theme={theme} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{t.author}</div>
          {t.role && <div style={{ fontSize: 13, opacity: 0.65 }}>{t.role}</div>}
        </div>
      </figcaption>
    </figure>
  );
}

export function Testimonials({ props, theme }: { props: TestimonialsProps; theme: SectionTheme }) {
  const layout = props.layout || 'grid';
  const items = props.items ?? [];
  const wrap: React.CSSProperties = { padding: sectionPadding(theme.spacing), background: theme.accent + '08', color: theme.primary, fontFamily: fontFamily(theme, 'body'), overflow: 'hidden' };
  const inner: React.CSSProperties = { maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' };

  if (layout === 'big-quote') {
    const t = items[0];
    if (!t) return null;
    return (
      <section style={wrap}>
        <div style={{ ...inner, textAlign: 'center', maxWidth: 820 }}>
          {props.heading && <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 24 }}>{props.heading}</p>}
          <Stars rating={t.rating || 5} />
          <blockquote style={{ margin: 0, fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,3.4vw,42px)', fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.015em' }}>
            “{t.quote}”
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
            <Avatar t={t} theme={theme} size={48} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t.author}</div>
              {t.role && <div style={{ fontSize: 13, opacity: 0.65 }}>{t.role}</div>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'marquee-row') {
    const loop = [...items, ...items];
    return (
      <section style={wrap}>
        <div style={inner}>
          {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: '0 0 36px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
        </div>
        <div style={{ display: 'flex', gap: 20, animation: 'lp-marquee 40s linear infinite', width: 'max-content' }}>
          {loop.map((t, i) => (
            <div key={i} style={{ flex: '0 0 360px' }}>
              <Card t={t} theme={theme} />
            </div>
          ))}
        </div>
        <style>{`@keyframes lp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>
    );
  }

  if (layout === 'masonry') {
    return (
      <section style={wrap}>
        <div style={inner}>
          {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: '0 0 48px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
          <div style={{ columnCount: 3, columnGap: 20 }}>
            {items.map((t, i) => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: 20 }}>
                <Card t={t} theme={theme} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'sidebar-photo') {
    const [first, ...rest] = items;
    if (!first) return null;
    return (
      <section style={wrap}>
        <div style={{ ...inner, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 48, alignItems: 'center' }}>
          <div style={{ aspectRatio: '4/5', borderRadius: radiusPx(theme.radius), background: first.avatar ? `url(${first.avatar}) center/cover` : `linear-gradient(160deg, ${theme.primary}, ${theme.accent})`, border: `1px solid ${theme.primary}14` }} />
          <div>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 700, margin: '0 0 24px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
            <Stars rating={first.rating || 5} />
            <blockquote style={{ margin: 0, fontSize: 'clamp(18px,1.6vw,22px)', lineHeight: 1.5, fontStyle: 'italic' }}>“{first.quote}”</blockquote>
            <div style={{ marginTop: 16, fontWeight: 700 }}>{first.author}{first.role && <span style={{ fontWeight: 400, opacity: 0.65 }}> | {first.role}</span>}</div>
            {rest.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
                {rest.slice(0, 3).map((t, i) => (
                  <div key={i} style={{ flex: '1 1 200px', padding: 16, background: theme.background, borderRadius: radiusPx(theme.radius), border: `1px solid ${theme.primary}10`, fontSize: 13.5, opacity: 0.85 }}>
                    “{t.quote.slice(0, 90)}{t.quote.length > 90 ? '…' : ''}” | <strong>{t.author}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // default grid
  return (
    <section style={wrap}>
      <div style={inner}>
        {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: '0 0 48px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: `repeat(${Math.min(items.length || 1, 3)}, minmax(0, 1fr))` }}>
          {items.map((t, i) => <Card key={i} t={t} theme={theme} />)}
        </div>
      </div>
    </section>
  );
}
