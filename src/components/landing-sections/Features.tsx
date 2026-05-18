import * as LucideIcons from 'lucide-react';
import type { SectionTheme, FeaturesProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export function Features({ props, theme }: { props: FeaturesProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(26px,3vw,38px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>}
            {props.intro && <p style={{ fontSize: 17, opacity: 0.75, marginTop: 12, maxWidth: 640, marginInline: 'auto' }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))` }}>
          {props.items.map((item, i) => {
            const Icon = (LucideIcons as any)[item.icon || 'Sparkles'] || LucideIcons.Sparkles;
            return (
              <div key={i} style={{ padding: 24, borderRadius: radiusPx(theme.radius), background: theme.accent + '08', border: `1px solid ${theme.accent}1a` }}>
                <div style={{ width: 44, height: 44, borderRadius: radiusPx(theme.radius), background: theme.accent + '22', color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={22} />
                </div>
                <h3 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 18, fontWeight: 700, margin: 0 }}>{item.title}</h3>
                {item.description && <p style={{ fontSize: 14.5, opacity: 0.75, marginTop: 8, lineHeight: 1.55 }}>{item.description}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
