import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SectionTheme, ImageSliderProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function ImageSlider({ props, theme }: { props: ImageSliderProps; theme: SectionTheme }) {
  const images = props.images ?? [];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!props.autoplay || images.length < 2) return;
    const t = setInterval(() => setI(x => (x + 1) % images.length), props.intervalMs || 4500);
    return () => clearInterval(t);
  }, [props.autoplay, props.intervalMs, images.length]);
  if (!images.length) return <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Add images in the inspector.</div>;
  const cur = images[i];
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>{props.heading}</h2>}
        <div style={{ position: 'relative', borderRadius: radiusPx(theme.radius), overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
          <img src={cur.url} alt={cur.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {(cur.caption || cur.cta) && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 24, background: 'linear-gradient(0deg, rgba(0,0,0,.7), transparent)', color: '#fff' }}>
              {cur.caption && <div style={{ fontSize: 18, fontWeight: 600 }}>{cur.caption}</div>}
              {cur.cta && <a href={cur.cta.href || '#'} style={{ ...buttonStyles(theme, 'primary'), marginTop: 12 }}>{cur.cta.label}</a>}
            </div>
          )}
          {props.showArrows && images.length > 1 && (
            <>
              <button onClick={() => setI(x => (x - 1 + images.length) % images.length)} aria-label="Previous"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setI(x => (x + 1) % images.length)} aria-label="Next"
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
        {props.showDots && images.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            {images.map((_, j) => (
              <button key={j} onClick={() => setI(j)} aria-label={`Slide ${j + 1}`}
                style={{ width: j === i ? 24 : 8, height: 8, borderRadius: 4, background: j === i ? theme.accent : theme.primary + '30', border: 'none', cursor: 'pointer', transition: 'width .2s' }} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
