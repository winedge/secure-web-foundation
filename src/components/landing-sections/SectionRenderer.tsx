import type { ReactNode } from 'react';
import type { Section, SectionTheme } from '@/lib/landing-sections/types';
import { SECTION_REGISTRY } from '@/lib/landing-sections/registry';
import { isSectionVisible, type VisibilityContext } from '@/lib/landing-sections/visibility';
import { AnimatedSection } from './AnimatedSection';
import { SectionBackground } from './SectionBackground';


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
          const inner = s.type === 'form'
            ? <Comp props={s.props} theme={theme} formSlot={formSlot} />
            : <Comp props={s.props} theme={theme} />;
          const node = <AnimatedSection animation={s.animation}>{inner}</AnimatedSection>;

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
