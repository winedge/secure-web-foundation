import type { SectionTheme, GalleryProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Gallery({ props, theme }: { props: GalleryProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {props.heading && <h2 style={{ textAlign: 'center', fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: '0 0 36px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
        <div style={props.layout === 'masonry' ? { columnCount: 3, columnGap: 16 } : { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {(props.images ?? []).map((img, i) => (
            <figure key={i} style={{ margin: props.layout === 'masonry' ? '0 0 16px' : 0, breakInside: 'avoid' }}>
              <img src={img.url} alt={img.caption || ''} style={{ width: '100%', display: 'block', borderRadius: radiusPx(theme.radius), objectFit: 'cover' }} />
              {img.caption && <figcaption style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
