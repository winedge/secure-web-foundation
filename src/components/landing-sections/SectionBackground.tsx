import type { CSSProperties, ReactNode } from 'react';
import type { SectionBackground as BG } from '@/lib/landing-sections/types';

interface Props {
  bg?: BG;
  children: ReactNode;
}

/**
 * Wraps a section with a decorative background layer:
 * gradient, mesh (multi-blob), glassmorphism, or solid color.
 * Content stays in normal flow above the backdrop.
 */
export function SectionBackground({ bg, children }: Props) {
  if (!bg || bg.kind === 'none') return <>{children}</>;

  const layerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
  };

  let backdrop: ReactNode = null;
  let overlay: ReactNode = null;
  let wrapperStyle: CSSProperties = { position: 'relative', isolation: 'isolate' };

  if (bg.kind === 'solid' && bg.color) {
    wrapperStyle.background = bg.color;
  }

  if (bg.kind === 'gradient' && bg.gradient) {
    const stops = bg.gradient.stops
      .map((s) => `${s.color} ${s.pos}%`)
      .join(', ');
    let g = '';
    if (bg.gradient.type === 'linear') g = `linear-gradient(${bg.gradient.angle ?? 135}deg, ${stops})`;
    else if (bg.gradient.type === 'radial') g = `radial-gradient(circle at 50% 50%, ${stops})`;
    else g = `conic-gradient(from 0deg at 50% 50%, ${stops})`;
    wrapperStyle.background = g;
  }

  if (bg.kind === 'mesh' && bg.mesh) {
    wrapperStyle.background = bg.mesh.base || '#0b1020';
    backdrop = (
      <div style={layerStyle} aria-hidden>
        {bg.mesh.blobs.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}%`,
              aspectRatio: '1 / 1',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
              opacity: b.opacity ?? 0.75,
              filter: 'blur(40px)',
              mixBlendMode: 'screen',
            }}
          />
        ))}
        {bg.mesh.grain && (
          <div
            style={{
              ...layerStyle,
              opacity: 0.15,
              mixBlendMode: 'overlay',
              backgroundImage:
                'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")',
            }}
          />
        )}
      </div>
    );
  }

  if (bg.kind === 'glass' && bg.glass) {
    // Base image or gradient behind the frosted layer.
    backdrop = (
      <div
        style={{
          ...layerStyle,
          backgroundImage: bg.glass.imageUrl
            ? `url(${bg.glass.imageUrl})`
            : 'linear-gradient(135deg,#6366f1,#a855f7,#ec4899)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden
      />
    );
    overlay = (
      <div
        style={{
          ...layerStyle,
          backdropFilter: `blur(${bg.glass.blur}px) saturate(140%)`,
          WebkitBackdropFilter: `blur(${bg.glass.blur}px) saturate(140%)`,
          background: `${bg.color || 'rgba(255,255,255,0.6)'}`,
          opacity: bg.glass.opacity,
          borderTop: bg.glass.border ? '1px solid rgba(255,255,255,0.25)' : undefined,
          borderBottom: bg.glass.border ? '1px solid rgba(255,255,255,0.15)' : undefined,
        }}
        aria-hidden
      />
    );
  }

  if (bg.kind === 'preset' && bg.preset) {
    const preset = bg.preset;
    const grainSvg =
      'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")';

    if (preset === 'paper-texture' || preset === 'editorial-white') {
      wrapperStyle.background = '#fafaf7';
      backdrop = (
        <div style={{ ...layerStyle, opacity: preset === 'paper-texture' ? 0.18 : 0.08, mixBlendMode: 'multiply', backgroundImage: grainSvg }} aria-hidden />
      );
    } else if (preset === 'cream-paper') {
      wrapperStyle.background = '#f5efe4';
      backdrop = (
        <div style={{ ...layerStyle, opacity: 0.22, mixBlendMode: 'multiply', backgroundImage: grainSvg }} aria-hidden />
      );
    } else if (preset === 'aurora-mesh') {
      wrapperStyle.background = '#0a0b1e';
      backdrop = (
        <div style={layerStyle} aria-hidden>
          {[
            { color: '#7c3aed', x: 12, y: 18, size: 65 },
            { color: '#06b6d4', x: 82, y: 28, size: 58 },
            { color: '#ec4899', x: 60, y: 82, size: 72 },
            { color: '#22d3ee', x: 30, y: 70, size: 50, opacity: 0.6 },
          ].map((b, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${b.x}%`, top: `${b.y}%`,
              width: `${b.size}%`, aspectRatio: '1 / 1',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
              opacity: (b as any).opacity ?? 0.75, filter: 'blur(60px)', mixBlendMode: 'screen',
            }} />
          ))}
          <div style={{ ...layerStyle, opacity: 0.12, mixBlendMode: 'overlay', backgroundImage: grainSvg }} />
        </div>
      );
    } else if (preset === 'dark-grain') {
      wrapperStyle.background = '#0d0d10';
      backdrop = (
        <div style={{ ...layerStyle, opacity: 0.28, mixBlendMode: 'overlay', backgroundImage: grainSvg }} aria-hidden />
      );
    } else if (preset === 'gold-on-black') {
      wrapperStyle.background = 'radial-gradient(ellipse at 70% 20%, #3a2c0a 0%, #0a0a0a 55%)';
      backdrop = (
        <div style={{ ...layerStyle, opacity: 0.2, mixBlendMode: 'overlay', backgroundImage: grainSvg }} aria-hidden />
      );
    } else if (preset === 'noir') {
      wrapperStyle.background = '#0a0a0a';
      backdrop = (
        <div style={{ ...layerStyle, background: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.06), transparent 60%)' }} aria-hidden />
      );
    } else if (preset === 'full-bleed-photo') {
      wrapperStyle.background = bg.imageUrl ? `url(${bg.imageUrl}) center/cover no-repeat` : '#111';
      const scrim = bg.scrim ?? 0.55;
      overlay = (
        <div style={{ ...layerStyle, background: `linear-gradient(180deg, rgba(0,0,0,${scrim * 0.6}) 0%, rgba(0,0,0,${scrim}) 100%)` }} aria-hidden />
      );
    }
  }

  return (
    <div style={wrapperStyle}>
      {backdrop}
      {overlay}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

export const BACKGROUND_PRESETS: { label: string; value: BG }[] = [
  { label: 'None', value: { kind: 'none' } },
  {
    label: 'Sunset gradient',
    value: {
      kind: 'gradient',
      gradient: {
        type: 'linear', angle: 135,
        stops: [{ color: '#ff7e5f', pos: 0 }, { color: '#feb47b', pos: 100 }],
      },
    },
  },
  {
    label: 'Ocean gradient',
    value: {
      kind: 'gradient',
      gradient: {
        type: 'linear', angle: 160,
        stops: [{ color: '#0ea5e9', pos: 0 }, { color: '#6366f1', pos: 60 }, { color: '#0f172a', pos: 100 }],
      },
    },
  },
  {
    label: 'Aurora mesh',
    value: {
      kind: 'mesh',
      mesh: {
        base: '#0b1020',
        grain: true,
        blobs: [
          { color: '#7c3aed', x: 15, y: 20, size: 60 },
          { color: '#06b6d4', x: 80, y: 30, size: 55 },
          { color: '#ec4899', x: 60, y: 80, size: 70 },
        ],
      },
    },
  },
  {
    label: 'Sunrise mesh',
    value: {
      kind: 'mesh',
      mesh: {
        base: '#fff7ed',
        blobs: [
          { color: '#fb923c', x: 20, y: 30, size: 55 },
          { color: '#f43f5e', x: 75, y: 25, size: 50 },
          { color: '#fde047', x: 50, y: 85, size: 65, opacity: 0.6 },
        ],
      },
    },
  },
  {
    label: 'Frosted glass',
    value: {
      kind: 'glass',
      color: 'rgba(255,255,255,0.55)',
      glass: { blur: 24, opacity: 1, border: true },
    },
  },
  {
    label: 'Dark glass',
    value: {
      kind: 'glass',
      color: 'rgba(15,23,42,0.55)',
      glass: { blur: 28, opacity: 1, border: true },
    },
  },
];
