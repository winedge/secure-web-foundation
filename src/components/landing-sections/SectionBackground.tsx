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
