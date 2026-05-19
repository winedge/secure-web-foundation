import { useState } from 'react';
import { Twitter, Linkedin, Facebook, Instagram, Youtube } from 'lucide-react';
import type { SectionTheme, FooterProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx } from './_shared';

const ICONS = { twitter: Twitter, linkedin: Linkedin, facebook: Facebook, instagram: Instagram, youtube: Youtube };

export function Footer({ props, theme }: { props: FooterProps; theme: SectionTheme }) {
  const layout = props.layout ?? 'simple';
  const cols = props.columns ?? [];
  const links = props.links ?? [];
  const social = props.social ?? [];
  const bottomLinks = props.bottomLinks ?? [];

  const SocialRow = social.length > 0 && (
    <div style={{ display: 'flex', gap: 10 }}>
      {social.map((s, i) => {
        const Icon = (ICONS as any)[s.type];
        if (!Icon) return null;
        return (
          <a key={i} href={s.href} aria-label={s.type} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Icon size={16} />
          </a>
        );
      })}
    </div>
  );

  const Brand = (
    <div>
      {props.logoUrl ? (
        <img src={props.logoUrl} alt={props.firmName || ''} style={{ height: 36, marginBottom: 12, filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
      ) : props.firmName ? (
        <div style={{ fontFamily: fontFamily(theme, 'heading'), fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{props.firmName}</div>
      ) : null}
      {props.tagline && <div style={{ fontSize: 14, opacity: 0.65, maxWidth: 320, lineHeight: 1.5 }}>{props.tagline}</div>}
      {SocialRow && <div style={{ marginTop: 16 }}>{SocialRow}</div>}
    </div>
  );

  return (
    <footer style={{ padding: '56px 16px 24px', background: theme.primary, color: '#fff', fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {layout === 'columns' && (
          <div style={{ display: 'grid', gridTemplateColumns: `1.5fr repeat(${Math.max(1, cols.length)}, 1fr)`, gap: 40 }}>
            {Brand}
            {cols.map((c, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, opacity: 0.9 }}>{c.heading}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(c.links ?? []).map((l, j) => (
                    <a key={j} href={l.href} style={{ color: '#fff', opacity: 0.7, textDecoration: 'none', fontSize: 14 }}>{l.label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {layout === 'newsletter-inline' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            {Brand}
            <NewsletterCard props={props} theme={theme} />
          </div>
        )}

        {layout === 'centered' && (
          <div style={{ textAlign: 'center' }}>
            {props.firmName && <div style={{ fontFamily: fontFamily(theme, 'heading'), fontWeight: 700, fontSize: 22 }}>{props.firmName}</div>}
            {props.tagline && <div style={{ fontSize: 14, opacity: 0.7, marginTop: 8, maxWidth: 560, marginInline: 'auto' }}>{props.tagline}</div>}
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
              {links.map((l, i) => <a key={i} href={l.href} style={{ color: '#fff', opacity: 0.8, textDecoration: 'none', fontSize: 14 }}>{l.label}</a>)}
            </div>
            {SocialRow && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>{SocialRow}</div>}
          </div>
        )}

        {layout === 'simple' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {Brand}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {links.map((l, i) => <a key={i} href={l.href} style={{ color: '#fff', opacity: 0.8, textDecoration: 'none', fontSize: 14 }}>{l.label}</a>)}
            </div>
            {SocialRow}
          </div>
        )}

        {(props.legal || bottomLinks.length > 0) && (
          <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 12, opacity: 0.6, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            {props.legal && <div>{props.legal}</div>}
            {bottomLinks.length > 0 && (
              <div style={{ display: 'flex', gap: 16 }}>
                {bottomLinks.map((l, i) => <a key={i} href={l.href} style={{ color: '#fff', opacity: 0.6, textDecoration: 'none' }}>{l.label}</a>)}
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}

function NewsletterCard({ props, theme }: { props: FooterProps; theme: SectionTheme }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const n = props.newsletter ?? {};
  return (
    <div style={{ padding: 24, borderRadius: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
      <div style={{ fontFamily: fontFamily(theme, 'heading'), fontWeight: 700, fontSize: 18 }}>{n.heading || 'Stay in the loop'}</div>
      {done ? (
        <div style={{ marginTop: 12, fontSize: 14, opacity: 0.85 }}>Thanks! Check your inbox.</div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (email) setDone(true); }} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={n.placeholder || 'you@example.com'}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 9999, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.08)', color: '#fff', fontSize: 14, outline: 'none' }} />
          <button type="submit" style={{ padding: '10px 18px', borderRadius: 9999, background: theme.accent, color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            {n.ctaLabel || 'Subscribe'}
          </button>
        </form>
      )}
    </div>
  );
}
