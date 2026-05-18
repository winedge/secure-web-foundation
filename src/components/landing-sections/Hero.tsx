import type { SectionTheme, HeroProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, sectionPadding } from './_shared';

export function Hero({ props, theme }: { props: HeroProps; theme: SectionTheme }) {
  const align = props.align ?? (props.layout === 'centered' ? 'center' : 'left');
  const wrap: React.CSSProperties = {
    padding: sectionPadding(theme.spacing),
    background:
      props.layout === 'image-bg' && props.imageUrl
        ? `linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.65)), url(${props.imageUrl}) center/cover`
        : theme.background,
    color: props.layout === 'image-bg' ? '#fff' : theme.primary,
    fontFamily: fontFamily(theme, 'body'),
  };
  const container: React.CSSProperties = {
    maxWidth: maxWidthPx(theme.maxWidth),
    margin: '0 auto',
    display: 'grid',
    gap: 40,
    gridTemplateColumns:
      props.layout === 'split-left' || props.layout === 'split-right' ? '1fr 1fr' : '1fr',
    alignItems: 'center',
    textAlign: align,
  };
  const textBlock = (
    <div style={{ order: props.layout === 'split-right' ? 2 : 1 }}>
      {props.eyebrow && (
        <div
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: props.layout === 'image-bg' ? 'rgba(255,255,255,.12)' : theme.accent + '22',
            color: props.layout === 'image-bg' ? '#fff' : theme.accent,
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {props.eyebrow}
        </div>
      )}
      <h1
        style={{
          fontFamily: fontFamily(theme, 'heading'),
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 800,
          lineHeight: 1.05,
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        {props.headline}
      </h1>
      {props.subheadline && (
        <p
          style={{
            fontSize: 'clamp(16px, 1.4vw, 19px)',
            lineHeight: 1.55,
            marginTop: 18,
            opacity: 0.85,
            maxWidth: align === 'center' ? 640 : undefined,
            marginInline: align === 'center' ? 'auto' : undefined,
          }}
        >
          {props.subheadline}
        </p>
      )}
      {(props.primaryCta || props.secondaryCta) && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 28,
            justifyContent: align === 'center' ? 'center' : 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          {props.primaryCta && (
            <a href={props.primaryCta.href || '#lead-form'} style={buttonStyles(theme, 'primary')}>
              {props.primaryCta.label}
            </a>
          )}
          {props.secondaryCta && (
            <a
              href={props.secondaryCta.href || '#'}
              style={{
                ...buttonStyles(theme, 'secondary'),
                color: props.layout === 'image-bg' ? '#fff' : theme.primary,
                borderColor: props.layout === 'image-bg' ? 'rgba(255,255,255,.4)' : theme.primary + '40',
              }}
            >
              {props.secondaryCta.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
  const imageBlock =
    props.layout === 'split-left' || props.layout === 'split-right' ? (
      <div style={{ order: props.layout === 'split-right' ? 1 : 2 }}>
        {props.imageUrl ? (
          <img
            src={props.imageUrl}
            alt=""
            style={{
              width: '100%',
              borderRadius: 16,
              boxShadow: '0 24px 60px rgba(0,0,0,.18)',
              aspectRatio: '4/3',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '4/3',
              background: `linear-gradient(135deg, ${theme.accent}33, ${theme.primary}22)`,
              borderRadius: 16,
            }}
          />
        )}
      </div>
    ) : null;

  return (
    <section style={wrap}>
      <div style={container}>
        {textBlock}
        {imageBlock}
      </div>
    </section>
  );
}
