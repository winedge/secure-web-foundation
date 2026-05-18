import { Star } from 'lucide-react';
import type { SectionTheme, TestimonialsProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Testimonials({ props, theme }: { props: TestimonialsProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.accent + '08', color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: '0 0 48px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: `repeat(${Math.min(props.items.length || 1, 3)}, minmax(0, 1fr))` }}>
          {props.items.map((t, i) => (
            <figure key={i} style={{ margin: 0, padding: 28, background: theme.background, borderRadius: radiusPx(theme.radius), border: `1px solid ${theme.primary}10`, boxShadow: '0 4px 20px rgba(0,0,0,.04)' }}>
              {t.rating && (
                <div style={{ display: 'flex', gap: 2, marginBottom: 12, color: '#fbbf24' }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} size={16} fill={idx < (t.rating || 0) ? 'currentColor' : 'none'} stroke="currentColor" />
                  ))}
                </div>
              )}
              <blockquote style={{ margin: 0, fontSize: 16, lineHeight: 1.6, fontStyle: 'italic' }}>“{t.quote}”</blockquote>
              <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                {t.avatar ? (
                  <img src={t.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: theme.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{t.author.charAt(0)}</div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.author}</div>
                  {t.role && <div style={{ fontSize: 13, opacity: 0.65 }}>{t.role}</div>}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
