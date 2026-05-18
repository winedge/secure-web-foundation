import type { SectionTheme } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export interface EmbedProps {
  heading?: string;
  url: string;
  aspect: '16:9' | '4:3' | '1:1' | '21:9';
}

function toEmbed(url: string): string {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const loom = url.match(/loom\.com\/share\/([\w-]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export function Embed({ props, theme }: { props: EmbedProps; theme: SectionTheme }) {
  const src = toEmbed(props.url);
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: '0 0 28px' }}>{props.heading}</h2>}
        <div style={{ position: 'relative', width: '100%', aspectRatio: props.aspect.replace(':', '/'), borderRadius: radiusPx(theme.radius), overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
          {src ? (
            <iframe src={src} title="Embedded content" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `${theme.primary}0d`, color: theme.primary, fontSize: 14 }}>Paste a YouTube, Vimeo, Loom or iframe URL</div>
          )}
        </div>
      </div>
    </section>
  );
}
