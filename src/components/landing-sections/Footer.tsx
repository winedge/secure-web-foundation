import { Twitter, Linkedin, Facebook, Instagram, Youtube } from 'lucide-react';
import type { SectionTheme, FooterProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx } from './_shared';

const ICONS = { twitter: Twitter, linkedin: Linkedin, facebook: Facebook, instagram: Instagram, youtube: Youtube };

export function Footer({ props, theme }: { props: FooterProps; theme: SectionTheme }) {
  return (
    <footer style={{ padding: '40px 16px 24px', background: theme.primary, color: '#fff', fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {props.firmName && <div style={{ fontFamily: fontFamily(theme, 'heading'), fontWeight: 700, fontSize: 18 }}>{props.firmName}</div>}
          {props.tagline && <div style={{ fontSize: 14, opacity: 0.7, marginTop: 6, maxWidth: 360 }}>{props.tagline}</div>}
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {(props.links ?? []).map((l, i) => (
            <a key={i} href={l.href} style={{ color: '#fff', opacity: 0.8, textDecoration: 'none', fontSize: 14 }}>{l.label}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {(props.social ?? []).map((s, i) => {
            const Icon = ICONS[s.type];
            if (!Icon) return null;
            return (
              <a key={i} href={s.href} aria-label={s.type} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Icon size={16} />
              </a>
            );
          })}
        </div>
      </div>
      {props.legal && <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '24px auto 0', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 12, opacity: 0.6, textAlign: 'center' }}>{props.legal}</div>}
    </footer>
  );
}
