import type { SectionTheme } from '@/lib/landing-sections/types';
import * as Icons from 'lucide-react';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export interface BentoItem {
  title: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  size: 'sm' | 'md' | 'lg' | 'tall' | 'wide';
  accent?: boolean;
}
export interface BentoProps {
  heading?: string;
  intro?: string;
  items: BentoItem[];
}

const SIZES: Record<BentoItem['size'], React.CSSProperties> = {
  sm:   { gridColumn: 'span 3', gridRow: 'span 1' },
  md:   { gridColumn: 'span 4', gridRow: 'span 1' },
  lg:   { gridColumn: 'span 6', gridRow: 'span 2' },
  tall: { gridColumn: 'span 3', gridRow: 'span 2' },
  wide: { gridColumn: 'span 8', gridRow: 'span 1' },
};

export function Bento({ props, theme }: { props: BentoProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{props.heading}</h2>}
            {props.intro && <p style={{ marginTop: 12, opacity: 0.7, fontSize: 17 }}>{props.intro}</p>}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridAutoRows: 180,
            gap: 16,
          }}
        >
          {(props.items || []).map((it, i) => {
            const Icon = it.icon ? (Icons as any)[it.icon] : null;
            return (
              <div
                key={i}
                style={{
                  ...SIZES[it.size],
                  padding: 24,
                  borderRadius: radiusPx(theme.radius),
                  background: it.accent
                    ? `linear-gradient(135deg, ${theme.accent}, ${theme.primary})`
                    : `linear-gradient(180deg, ${theme.primary}06, ${theme.primary}0d)`,
                  border: `1px solid ${theme.primary}14`,
                  color: it.accent ? '#fff' : theme.primary,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: it.imageUrl ? 'flex-end' : 'space-between',
                  transition: 'transform .25s ease, box-shadow .25s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 50px ${theme.primary}1f`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                {it.imageUrl && (
                  <img src={it.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {Icon && <Icon style={{ width: 28, height: 28, marginBottom: 12, opacity: 0.95 }} />}
                  <div style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{it.title}</div>
                  {it.description && <div style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.5 }}>{it.description}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
