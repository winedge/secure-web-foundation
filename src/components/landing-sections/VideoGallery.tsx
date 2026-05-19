import { useState } from 'react';
import { Play, X } from 'lucide-react';
import type { SectionTheme, VideoGalleryProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

function toEmbed(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return url;
}

export function VideoGallery({ props, theme }: { props: VideoGalleryProps; theme: SectionTheme }) {
  const [open, setOpen] = useState<string | null>(null);
  const videos = props.videos ?? [];
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 700, margin: 0 }}>{props.heading}</h2>}
            {props.intro && <p style={{ fontSize: 16, opacity: 0.7, marginTop: 8 }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`, gap: 16 }}>
          {videos.map((v, i) => (
            <button
              key={i}
              onClick={() => setOpen(v.url)}
              style={{ position: 'relative', padding: 0, border: 'none', cursor: 'pointer', borderRadius: radiusPx(theme.radius), overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}
            >
              {v.thumbnailUrl ? (
                <img src={v.thumbnailUrl} alt={v.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              ) : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,.3)' }}>
                  <Play size={22} fill="#000" color="#000" />
                </div>
              </div>
              {(v.title || v.duration) && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, background: 'linear-gradient(0deg, rgba(0,0,0,.8), transparent)', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                  {v.title && <span style={{ fontSize: 14, fontWeight: 600 }}>{v.title}</span>}
                  {v.duration && <span style={{ fontSize: 12, opacity: 0.8 }}>{v.duration}</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <button onClick={() => setOpen(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: 10, borderRadius: '50%' }} aria-label="Close">
            <X size={22} />
          </button>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 960, aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
            <iframe src={toEmbed(open)} title="Video" width="100%" height="100%" frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ border: 'none' }} />
          </div>
        </div>
      )}
    </section>
  );
}
