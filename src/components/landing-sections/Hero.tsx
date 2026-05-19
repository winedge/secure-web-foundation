import type { ReactNode } from 'react';
import { Star } from 'lucide-react';
import type { SectionTheme, HeroProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Hero({ props, theme, formSlot }: { props: HeroProps; theme: SectionTheme; formSlot?: ReactNode }) {
  // Dispatch high-fidelity variants before the generic renderer.
  if (props.layout === 'editorial-centered') return <EditorialCenteredHero props={props} theme={theme} />;
  if (props.layout === 'noir-photo') return <NoirPhotoHero props={props} theme={theme} />;
  if (props.layout === 'magazine-split') return <MagazineSplitHero props={props} theme={theme} />;

  const isFormSplit = props.layout === 'split-form-right' || props.layout === 'split-form-left';
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
    gap: 48,
    gridTemplateColumns:
      props.layout === 'split-left' || props.layout === 'split-right' || isFormSplit ? '1fr 1fr' : '1fr',
    alignItems: 'center',
    textAlign: isFormSplit ? 'left' : align,
  };

  const ratingBlock = props.rating && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, justifyContent: align === 'center' && !isFormSplit ? 'center' : 'flex-start' }}>
      <div style={{ display: 'flex', gap: 1 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill={i < (props.rating?.stars ?? 5) ? theme.accent : 'transparent'} color={theme.accent} />
        ))}
      </div>
      <span style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>
        {props.rating.stars.toFixed(1)}
        {props.rating.count != null && ` · ${props.rating.count.toLocaleString()} reviews`}
        {props.rating.label && ` · ${props.rating.label}`}
      </span>
    </div>
  );

  const badgesBlock = props.badges && props.badges.length > 0 && (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18, justifyContent: align === 'center' && !isFormSplit ? 'center' : 'flex-start' }}>
      {props.badges.map((b, i) => (
        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: theme.primary + '0d', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>
          {b.label}
        </div>
      ))}
    </div>
  );

  const textBlock = (
    <div style={{ order: props.layout === 'split-right' || props.layout === 'split-form-right' ? 1 : (props.layout === 'split-left' || props.layout === 'split-form-left' ? 1 : 1) }}>
      {props.eyebrow && (
        <div style={{
          display: 'inline-block', padding: '6px 12px',
          background: props.layout === 'image-bg' ? 'rgba(255,255,255,.12)' : theme.accent + '22',
          color: props.layout === 'image-bg' ? '#fff' : theme.accent,
          borderRadius: 9999, fontSize: 13, fontWeight: 600, marginBottom: 16,
        }}>
          {props.eyebrow}
        </div>
      )}
      <h1 style={{
        fontFamily: fontFamily(theme, 'heading'),
        fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800,
        lineHeight: 1.05, margin: 0, letterSpacing: '-0.02em',
      }}>
        {props.headline}
      </h1>
      {props.subheadline && (
        <p style={{
          fontSize: 'clamp(16px, 1.4vw, 19px)', lineHeight: 1.55, marginTop: 18,
          opacity: 0.85, maxWidth: align === 'center' && !isFormSplit ? 640 : undefined,
          marginInline: align === 'center' && !isFormSplit ? 'auto' : undefined,
        }}>
          {props.subheadline}
        </p>
      )}
      {(props.primaryCta || props.secondaryCta) && (
        <div style={{
          display: 'flex', gap: 12, marginTop: 28,
          justifyContent: align === 'center' && !isFormSplit ? 'center' : 'flex-start',
          flexWrap: 'wrap',
        }}>
          {props.primaryCta && (
            <a href={props.primaryCta.href || '#lead-form'} style={buttonStyles(theme, 'primary')}>
              {props.primaryCta.label}
            </a>
          )}
          {props.secondaryCta && (
            <a href={props.secondaryCta.href || '#'} style={{
              ...buttonStyles(theme, 'secondary'),
              color: props.layout === 'image-bg' ? '#fff' : theme.primary,
              borderColor: props.layout === 'image-bg' ? 'rgba(255,255,255,.4)' : theme.primary + '40',
            }}>
              {props.secondaryCta.label}
            </a>
          )}
        </div>
      )}
      {ratingBlock}
      {badgesBlock}
    </div>
  );

  // === Form card (when split-form-*) ===
  const formCardStyle: React.CSSProperties =
    props.formCardStyle === 'glass'
      ? { background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,.4)' }
      : props.formCardStyle === 'minimal'
      ? { background: 'transparent', border: `1px solid ${theme.primary}1a` }
      : { background: theme.background, boxShadow: '0 24px 60px rgba(15,23,42,.18)' };

  const formCard = (
    <div style={{
      order: props.layout === 'split-form-left' ? 1 : 2,
      padding: 28,
      borderRadius: radiusPx(theme.radius),
      color: theme.primary,
      ...formCardStyle,
    }}>
      {(props.formCardTitle || props.formCardSubtitle) && (
        <div style={{ marginBottom: 16 }}>
          {props.formCardTitle && <div style={{ fontFamily: fontFamily(theme, 'heading'), fontWeight: 700, fontSize: 20 }}>{props.formCardTitle}</div>}
          {props.formCardSubtitle && <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>{props.formCardSubtitle}</div>}
        </div>
      )}
      {formSlot ?? <p style={{ textAlign: 'center', opacity: 0.55, fontSize: 13, padding: '24px 0' }}>The lead form will appear here when published.</p>}
    </div>
  );

  // === Image block ===
  const imageBlock = (props.layout === 'split-left' || props.layout === 'split-right') ? (
    <div style={{ order: props.layout === 'split-right' ? 1 : 2 }}>
      {props.imageUrl ? (
        renderMedia(props.imageUrl, props.mediaShape, theme)
      ) : (
        <div style={{ width: '100%', aspectRatio: '4/3', background: `linear-gradient(135deg, ${theme.accent}33, ${theme.primary}22)`, borderRadius: 16 }} />
      )}
    </div>
  ) : null;

  // Reorder for form layouts
  const textOrder: React.CSSProperties = { order: props.layout === 'split-form-left' ? 2 : 1 };

  return (
    <section style={wrap}>
      <div style={container}>
        {isFormSplit ? (
          <>
            <div style={textOrder}>{textBlock}</div>
            {formCard}
          </>
        ) : (
          <>
            {textBlock}
            {imageBlock}
          </>
        )}
      </div>
    </section>
  );
}

function renderMedia(url: string, shape: HeroProps['mediaShape'], theme: SectionTheme) {
  const baseImg: React.CSSProperties = { width: '100%', display: 'block', objectFit: 'cover', aspectRatio: '4/3' };
  if (shape === 'browser-frame') {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.18)', border: `1px solid ${theme.primary}1a` }}>
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: '#f4f4f5' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
        </div>
        <img src={url} alt="" style={baseImg} />
      </div>
    );
  }
  if (shape === 'phone-frame') {
    return (
      <div style={{ maxWidth: 320, margin: '0 auto', padding: 12, borderRadius: 36, background: '#0f172a', boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>
        <img src={url} alt="" style={{ ...baseImg, borderRadius: 24, aspectRatio: '9/16' }} />
      </div>
    );
  }
  if (shape === 'tilted') {
    return <img src={url} alt="" style={{ ...baseImg, borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,.2)', transform: 'rotate(-2deg) perspective(1000px) rotateY(-6deg)' }} />;
  }
  return <img src={url} alt="" style={{ ...baseImg, borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,.18)' }} />;
}

// ============================================================================
// High-fidelity hero variants
// ============================================================================

/** Editorial centered: huge serif headline, thin rule lines, asymmetric meta. */
function EditorialCenteredHero({ props, theme }: { props: HeroProps; theme: SectionTheme }) {
  return (
    <section
      style={{
        padding: 'var(--section-pad-y, 120px) var(--section-pad-x, 16px)',
        background: theme.background,
        color: theme.primary,
        fontFamily: fontFamily(theme, 'body'),
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        {props.eyebrow && (
          <div
            style={{
              fontFamily: fontFamily(theme, 'body'),
              fontSize: 11,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              opacity: 0.6,
              marginBottom: 36,
            }}
          >
            <span style={{ display: 'inline-block', borderTop: `1px solid ${theme.primary}33`, paddingTop: 18, minWidth: 220 }}>
              — {props.eyebrow} —
            </span>
          </div>
        )}
        <h1
          style={{
            fontFamily: fontFamily(theme, 'heading'),
            fontSize: 'var(--headline-scale, clamp(44px, 8vw, 104px))',
            fontWeight: 500,
            lineHeight: 0.98,
            letterSpacing: '-0.035em',
            margin: 0,
          }}
        >
          {props.headline}
        </h1>
        {props.subheadline && (
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.55,
              opacity: 0.78,
              maxWidth: 620,
              margin: '36px auto 0',
            }}
          >
            {props.subheadline}
          </p>
        )}
        {(props.primaryCta || props.secondaryCta) && (
          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 44, flexWrap: 'wrap' }}>
            {props.primaryCta && (
              <a href={props.primaryCta.href || '#lead-form'} style={buttonStyles(theme, 'primary')}>
                {props.primaryCta.label}
              </a>
            )}
            {props.secondaryCta && (
              <a href={props.secondaryCta.href || '#'} style={buttonStyles(theme, 'secondary')}>
                {props.secondaryCta.label} →
              </a>
            )}
          </div>
        )}
      </div>
      {props.imageUrl && (
        <div style={{ maxWidth: 1280, margin: '72px auto 0', padding: '0 16px' }}>
          <img
            src={props.imageUrl}
            alt=""
            style={{ width: '100%', borderRadius: 4, display: 'block', boxShadow: '0 40px 100px rgba(0,0,0,0.18)' }}
          />
        </div>
      )}
    </section>
  );
}

/** Noir photo: full-bleed image, dark scrim, gold/cream type, side-aligned. */
function NoirPhotoHero({ props, theme }: { props: HeroProps; theme: SectionTheme }) {
  const bg = props.imageUrl
    ? `linear-gradient(105deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.2) 100%), url(${props.imageUrl}) center/cover`
    : `linear-gradient(135deg, #0a0a0a, ${theme.primary})`;
  return (
    <section
      style={{
        minHeight: 'min(720px, 92vh)',
        background: bg,
        color: '#f5efe0',
        fontFamily: fontFamily(theme, 'body'),
        display: 'flex',
        alignItems: 'flex-end',
        padding: 'var(--section-pad-y, 80px) var(--section-pad-x, 6vw)',
      }}
    >
      <div style={{ maxWidth: 760 }}>
        {props.eyebrow && (
          <div
            style={{
              display: 'inline-flex',
              gap: 12,
              alignItems: 'center',
              padding: '8px 14px',
              border: `1px solid ${theme.accent}80`,
              color: theme.accent,
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              borderRadius: 999,
              marginBottom: 28,
            }}
          >
            ★ {props.eyebrow}
          </div>
        )}
        <h1
          style={{
            fontFamily: fontFamily(theme, 'heading'),
            fontSize: 'var(--headline-scale, clamp(40px, 6.5vw, 80px))',
            fontWeight: 400,
            lineHeight: 1.02,
            letterSpacing: '-0.02em',
            margin: 0,
            color: '#fff',
          }}
        >
          {props.headline}
        </h1>
        {props.subheadline && (
          <p style={{ fontSize: 18, lineHeight: 1.6, marginTop: 24, maxWidth: 560, opacity: 0.85 }}>
            {props.subheadline}
          </p>
        )}
        <div style={{ display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap' }}>
          {props.primaryCta && (
            <a
              href={props.primaryCta.href || '#lead-form'}
              style={{
                ...buttonStyles(theme, 'primary'),
                background: theme.accent,
                color: '#0a0a0a',
                padding: '14px 28px',
              }}
            >
              {props.primaryCta.label}
            </a>
          )}
          {props.secondaryCta && (
            <a
              href={props.secondaryCta.href || '#'}
              style={{
                ...buttonStyles(theme, 'secondary'),
                color: '#f5efe0',
                borderColor: 'rgba(255,255,255,0.35)',
                background: 'transparent',
              }}
            >
              {props.secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Magazine split: 60/40 columns with oversized issue numeral + meta column. */
function MagazineSplitHero({ props, theme }: { props: HeroProps; theme: SectionTheme }) {
  return (
    <section
      style={{
        padding: 'var(--section-pad-y, 88px) var(--section-pad-x, 6vw)',
        background: theme.background,
        color: theme.primary,
        fontFamily: fontFamily(theme, 'body'),
        borderTop: `1px solid ${theme.primary}1a`,
        borderBottom: `1px solid ${theme.primary}1a`,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 64,
          alignItems: 'end',
        }}
      >
        <div>
          {props.eyebrow && (
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                opacity: 0.65,
                marginBottom: 24,
                fontWeight: 600,
              }}
            >
              {props.eyebrow}
            </div>
          )}
          <h1
            style={{
              fontFamily: fontFamily(theme, 'heading'),
              fontSize: 'var(--headline-scale, clamp(40px, 6vw, 88px))',
              fontWeight: 500,
              lineHeight: 1.0,
              letterSpacing: '-0.025em',
              margin: 0,
            }}
          >
            {props.headline}
          </h1>
          {props.subheadline && (
            <p style={{ fontSize: 18, lineHeight: 1.6, opacity: 0.78, marginTop: 28, maxWidth: 560 }}>
              {props.subheadline}
            </p>
          )}
          <div style={{ display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap' }}>
            {props.primaryCta && (
              <a href={props.primaryCta.href || '#lead-form'} style={buttonStyles(theme, 'primary')}>
                {props.primaryCta.label}
              </a>
            )}
            {props.secondaryCta && (
              <a href={props.secondaryCta.href || '#'} style={buttonStyles(theme, 'secondary')}>
                {props.secondaryCta.label}
              </a>
            )}
          </div>
        </div>
        <aside style={{ borderLeft: `1px solid ${theme.primary}22`, paddingLeft: 32 }}>
          <div
            style={{
              fontFamily: fontFamily(theme, 'heading'),
              fontSize: 'clamp(96px, 12vw, 180px)',
              fontWeight: 500,
              lineHeight: 0.85,
              letterSpacing: '-0.05em',
              color: theme.accent,
            }}
          >
            №01
          </div>
          {props.badges && props.badges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
              {props.badges.slice(0, 4).map((b, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '6px 12px',
                    border: `1px solid ${theme.primary}30`,
                    borderRadius: 999,
                    letterSpacing: '0.04em',
                  }}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
          {props.rating && (
            <div style={{ marginTop: 28, fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
              <div style={{ color: theme.accent, fontWeight: 700, fontSize: 16 }}>
                ★★★★★ {props.rating.stars.toFixed(1)}
              </div>
              {props.rating.count != null && <div>{props.rating.count.toLocaleString()} verified clients</div>}
              {props.rating.label && <div>{props.rating.label}</div>}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
