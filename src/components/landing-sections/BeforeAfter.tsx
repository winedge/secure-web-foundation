import { useRef, useState } from 'react';
import type { SectionTheme } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export interface BeforeAfterProps {
  heading?: string;
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfter({ props, theme }: { props: BeforeAfterProps; theme: SectionTheme }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement | null>(null);
  const handleMove = (clientX: number) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: '0 0 32px' }}>{props.heading}</h2>}
        <div
          ref={ref}
          onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onClick={(e) => handleMove(e.clientX)}
          style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: radiusPx(theme.radius), overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}
        >
          {props.afterUrl && <img src={props.afterUrl} alt="After" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          {props.beforeUrl && (
            <div style={{ position: 'absolute', inset: 0, width: `${pos}%`, overflow: 'hidden' }}>
              <img src={props.beforeUrl} alt="Before" style={{ width: `${100 / (pos / 100)}%`, maxWidth: 'none', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {props.beforeLabel && <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 12, fontWeight: 600, borderRadius: 6 }}>{props.beforeLabel}</div>}
          {props.afterLabel && <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 12, fontWeight: 600, borderRadius: 6 }}>{props.afterLabel}</div>}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 3, background: '#fff', boxShadow: '0 0 12px rgba(0,0,0,.4)', transform: 'translateX(-50%)' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 40, height: 40, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.primary, fontWeight: 700 }}>⇆</div>
          </div>
        </div>
      </div>
    </section>
  );
}
