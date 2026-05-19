import type { CSSProperties, ReactNode } from 'react';
import type { Section, SectionTheme, SectionDensity, HeadlineScale } from '@/lib/landing-sections/types';
import { SECTION_REGISTRY } from '@/lib/landing-sections/registry';
import { isSectionVisible, type VisibilityContext } from '@/lib/landing-sections/visibility';
import { resolveSectionTheme } from '@/lib/landing-sections/theme-resolution';
import { AnimatedSection } from './AnimatedSection';
import { SectionBackground } from './SectionBackground';

/** Convert per-section density to CSS variables consumed by section components. */
function densityToVars(d?: SectionDensity): CSSProperties {
  const map: Record<SectionDensity, { padY: string; padX: string; maxW: string; gap: string }> = {
    tight:     { padY: '2.5rem',  padX: '1.25rem', maxW: '1080px', gap: '1rem' },
    default:   { padY: '4rem',    padX: '1.5rem',  maxW: '1200px', gap: '1.5rem' },
    roomy:     { padY: '6rem',    padX: '2rem',    maxW: '1280px', gap: '2rem' },
    editorial: { padY: '9rem',    padX: '2.5rem',  maxW: '960px',  gap: '2.5rem' },
  };
  const v = map[d ?? 'default'];
  return {
    ['--section-pad-y' as any]: v.padY,
    ['--section-pad-x' as any]: v.padX,
    ['--section-max-w' as any]: v.maxW,
    ['--section-gap' as any]: v.gap,
  };
}

/** Convert per-section headline scale to a CSS clamp value usable by display headlines. */
function headlineScaleToVar(h?: HeadlineScale): CSSProperties {
  const map: Record<HeadlineScale, string> = {
    sm:        'clamp(1.5rem, 2.2vw, 2rem)',
    md:        'clamp(2rem, 3vw, 2.75rem)',
    lg:        'clamp(2.5rem, 4vw, 3.75rem)',
    hero:      'clamp(3rem, 6vw, 5.5rem)',
    oversized: 'clamp(4rem, 10vw, 8.5rem)',
  };
  return { ['--headline-scale' as any]: map[h ?? 'lg'] };
}



interface Props {
  sections: Section[];
  theme: SectionTheme;
  formSlot?: ReactNode;
  /** When true (in builder preview), clicking selects a section. */
  selectable?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Visibility context used to evaluate conditional rules on the public page. */
  visibilityContext?: VisibilityContext;
}

export function SectionRenderer({
  sections,
  theme,
  formSlot,
  selectable,
  selectedId,
  onSelect,
  visibilityContext,
}: Props) {
  return (
    <div style={{ background: theme.background, color: theme.primary }}>
      {sections
        .filter((s) => {
          if (selectable) return s.visible; // builder shows all enabled sections
          if (!visibilityContext) return s.visible;
          return isSectionVisible(s, visibilityContext);
        })
        .map((s) => {
          const def = SECTION_REGISTRY[s.type];
          if (!def) return null;
          const Comp = def.Component;
          const isSelected = selectable && selectedId === s.id;
          const hasRules = !!(s.visibility?.rules?.length);
          // Per-section theme swap: dark sections auto-pick the brand's dark tokens.
          const effectiveTheme = resolveSectionTheme(theme, s.background);
          // Per-section typography override (falls back to global theme).
          const themeWithTypo: SectionTheme = {
            ...effectiveTheme,
            headingFont: s.typography?.heading ?? effectiveTheme.headingFont,
            bodyFont: s.typography?.body ?? effectiveTheme.bodyFont,
          };
          const inner = (s.type === 'form' || s.type === 'hero')
            ? <Comp props={s.props} theme={themeWithTypo} formSlot={formSlot} />
            : <Comp props={s.props} theme={themeWithTypo} />;
          // Density + headline-scale tokens exposed as CSS vars so any section can opt in.
          const densityVars = densityToVars(s.density);
          const headlineVar = headlineScaleToVar(s.headlineScale);
          const node = (
            <SectionBackground bg={s.background}>
              <div style={{ ...densityVars, ...headlineVar } as React.CSSProperties}>
                <AnimatedSection animation={s.animation}>{inner}</AnimatedSection>
              </div>
            </SectionBackground>
          );


          if (!selectable) return <div key={s.id}>{node}</div>;
          return (
            <div
              key={s.id}
              onClick={(e) => { e.stopPropagation(); onSelect?.(s.id); }}
              style={{
                position: 'relative',
                cursor: 'pointer',
                outline: isSelected ? `3px solid ${theme.accent}` : '3px solid transparent',
                outlineOffset: -3,
                transition: 'outline-color .15s',
              }}
            >
              <div style={{
                position: 'absolute', top: 8, left: 8, zIndex: 10,
                padding: '4px 8px', fontSize: 11, fontWeight: 600,
                background: isSelected ? theme.accent : 'rgba(0,0,0,.6)',
                color: '#fff', borderRadius: 6, pointerEvents: 'none',
                textTransform: 'uppercase', letterSpacing: '.04em',
              }}>{def.label}</div>
              {hasRules && (
                <div style={{
                  position: 'absolute', top: 8, right: 8, zIndex: 10,
                  padding: '4px 8px', fontSize: 11, fontWeight: 600,
                  background: '#7c3aed', color: '#fff', borderRadius: 6,
                  pointerEvents: 'none', letterSpacing: '.02em',
                }}>
                  Conditional · {s.visibility!.rules.length} rule{s.visibility!.rules.length === 1 ? '' : 's'}
                </div>
              )}
              {node}
            </div>
          );
        })}
    </div>
  );
}
