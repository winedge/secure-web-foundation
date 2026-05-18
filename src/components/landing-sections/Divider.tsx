import type { SectionTheme } from '@/lib/landing-sections/types';

export interface DividerProps {
  shape: 'wave' | 'slant' | 'arc' | 'zigzag';
  color?: string;
  flip?: boolean;
}

const PATHS: Record<DividerProps['shape'], string> = {
  wave: 'M0,40 C320,120 720,0 1440,80 L1440,120 L0,120 Z',
  slant: 'M0,120 L1440,0 L1440,120 L0,120 Z',
  arc: 'M0,80 Q720,200 1440,80 L1440,120 L0,120 Z',
  zigzag: 'M0,80 L240,40 L480,80 L720,40 L960,80 L1200,40 L1440,80 L1440,120 L0,120 Z',
};

export function Divider({ props, theme }: { props: DividerProps; theme: SectionTheme }) {
  const fill = props.color || theme.accent;
  return (
    <div style={{ background: theme.background, lineHeight: 0, transform: props.flip ? 'scaleY(-1)' : undefined }}>
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ width: '100%', height: 100, display: 'block' }}>
        <path d={PATHS[props.shape]} fill={fill} />
      </svg>
    </div>
  );
}
