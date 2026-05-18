import type { SectionTheme } from '@/lib/landing-sections/types';
import { fontFamily, sectionPadding } from './_shared';

export interface MarqueeProps {
  heading?: string;
  speed: 'slow' | 'normal' | 'fast';
  direction: 'left' | 'right';
  items: { text?: string; imageUrl?: string }[];
}

export function Marquee({ props, theme }: { props: MarqueeProps; theme: SectionTheme }) {
  const dur = { slow: 60, normal: 35, fast: 18 }[props.speed] ?? 35;
  const dir = props.direction === 'right' ? 'reverse' : 'normal';
  const items = [...(props.items || []), ...(props.items || [])];
  return (
    <section
      style={{
        padding: sectionPadding(theme.spacing),
        background: theme.background,
        color: theme.primary,
        fontFamily: fontFamily(theme, 'body'),
        overflow: 'hidden',
      }}
    >
      {props.heading && (
        <h2
          style={{
            textAlign: 'center',
            fontFamily: fontFamily(theme, 'heading'),
            fontSize: 'clamp(20px,2vw,28px)',
            margin: '0 0 24px',
            opacity: 0.7,
          }}
        >
          {props.heading}
        </h2>
      )}
      <div style={{ position: 'relative', maskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)' }}>
        <div
          style={{
            display: 'flex',
            gap: 48,
            width: 'max-content',
            animation: `marqueeScroll ${dur}s linear infinite ${dir}`,
          }}
        >
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.85 }}>
              {it.imageUrl ? <img src={it.imageUrl} alt="" style={{ height: 40, width: 'auto', objectFit: 'contain' }} /> : null}
              {it.text ? <span>{it.text}</span> : null}
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes marqueeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}
