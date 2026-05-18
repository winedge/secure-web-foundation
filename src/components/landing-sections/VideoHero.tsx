import type { SectionTheme } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, sectionPadding } from './_shared';

export interface VideoHeroProps {
  videoUrl: string;
  posterUrl?: string;
  overlayOpacity: number; // 0-1
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  primaryCta?: { label: string; href?: string };
  secondaryCta?: { label: string; href?: string };
}

export function VideoHero({ props, theme }: { props: VideoHeroProps; theme: SectionTheme }) {
  return (
    <section style={{ position: 'relative', minHeight: '70vh', overflow: 'hidden', color: '#fff', fontFamily: fontFamily(theme, 'body') }}>
      {props.videoUrl ? (
        <video
          src={props.videoUrl}
          poster={props.posterUrl}
          autoPlay
          muted
          loop
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${props.overlayOpacity ?? 0.55})` }} />
      <div style={{ position: 'relative', maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', padding: sectionPadding(theme.spacing), minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        {props.eyebrow && (
          <div style={{ display: 'inline-block', alignSelf: 'center', padding: '6px 14px', background: 'rgba(255,255,255,.12)', borderRadius: 9999, fontSize: 13, fontWeight: 600, marginBottom: 18, backdropFilter: 'blur(6px)' }}>{props.eyebrow}</div>
        )}
        <h1 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(36px,6vw,72px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05 }}>{props.headline}</h1>
        {props.subheadline && <p style={{ fontSize: 'clamp(16px,1.5vw,20px)', maxWidth: 680, margin: '20px auto 0', opacity: 0.9 }}>{props.subheadline}</p>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
          {props.primaryCta && <a href={props.primaryCta.href || '#lead-form'} style={buttonStyles(theme, 'primary')}>{props.primaryCta.label}</a>}
          {props.secondaryCta && <a href={props.secondaryCta.href || '#'} style={{ ...buttonStyles(theme, 'secondary'), color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>{props.secondaryCta.label}</a>}
        </div>
      </div>
    </section>
  );
}
