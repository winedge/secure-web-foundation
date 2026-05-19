import { Shield, Award, Lock, BadgeCheck, Star } from 'lucide-react';
import type { SectionTheme, TrustBadgesProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, sectionPadding } from './_shared';

const ICONS: Record<string, any> = { Shield, Award, Lock, BadgeCheck, Star };

export function TrustBadges({ props, theme }: { props: TrustBadgesProps; theme: SectionTheme }) {
  const items = props.items ?? [];
  const layout = props.layout || 'row';

  if (layout === 'pill-cloud') {
    return (
      <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', textAlign: 'center' }}>
          {props.heading && <div style={{ marginBottom: 20, fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.6 }}>{props.heading}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {items.map((it, i) => {
              const Icon = it.icon ? ICONS[it.icon] || BadgeCheck : BadgeCheck;
              return (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: `1px solid ${theme.accent}40`, background: theme.accent + '10', fontSize: 13.5, fontWeight: 600 }}>
                  <Icon size={14} style={{ color: theme.accent }} /> {it.label}
                </span>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'stat-strip') {
    return (
      <section style={{ padding: '32px 16px', background: theme.primary, color: '#fff', fontFamily: fontFamily(theme, 'body') }}>
        <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', display: 'grid', gap: 0, gridTemplateColumns: `repeat(${items.length || 1}, minmax(0, 1fr))` }}>
          {items.map((it, i) => {
            const Icon = it.icon ? ICONS[it.icon] || BadgeCheck : BadgeCheck;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 12px', borderLeft: i ? `1px solid ${theme.accent}40` : 'none' }}>
                <Icon size={18} style={{ color: theme.accent }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, opacity: 0.95 }}>{it.label}</span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.accent + '06', color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {props.heading && (
          <div style={{ textAlign: 'center', marginBottom: 24, fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.6 }}>{props.heading}</div>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: layout === 'grid' ? `repeat(auto-fit, minmax(180px, 1fr))` : `repeat(auto-fit, minmax(120px, 1fr))`,
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
