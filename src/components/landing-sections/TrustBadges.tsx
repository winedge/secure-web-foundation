import { Shield, Award, Lock, BadgeCheck, Star } from 'lucide-react';
import type { SectionTheme, TrustBadgesProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, sectionPadding } from './_shared';

const ICONS: Record<string, any> = { Shield, Award, Lock, BadgeCheck, Star };

export function TrustBadges({ props, theme }: { props: TrustBadgesProps; theme: SectionTheme }) {
  const items = props.items ?? [];
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.accent + '06', color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {props.heading && (
          <div style={{ textAlign: 'center', marginBottom: 24, fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.6 }}>{props.heading}</div>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: props.layout === 'grid' ? `repeat(auto-fit, minmax(180px, 1fr))` : `repeat(auto-fit, minmax(120px, 1fr))`,
          gap: 24, alignItems: 'center', justifyItems: 'center',
        }}>
          {items.map((it, i) => {
            const Icon = it.icon ? ICONS[it.icon] : null;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.85 }}>
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.label} style={{ height: 44, width: 'auto', objectFit: 'contain', filter: 'grayscale(.2)' }} />
                ) : Icon ? (
                  <Icon size={32} style={{ color: theme.accent }} />
                ) : (
                  <BadgeCheck size={32} style={{ color: theme.accent }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'center' }}>{it.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
