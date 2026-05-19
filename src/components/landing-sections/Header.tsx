import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { SectionTheme, HeaderProps } from '@/lib/landing-sections/types';
import { buttonStyles, fontFamily, maxWidthPx } from './_shared';

export function Header({ props, theme }: { props: HeaderProps; theme: SectionTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!props.sticky && !props.shrinkOnScroll) return;
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [props.sticky, props.shrinkOnScroll]);

  const isTransparent = props.style === 'transparent';
  const isGlass = props.style === 'glass';
  const isFloating = props.style === 'floating-pill';
  const isBordered = props.style === 'bordered-bottom';

  const padY = props.shrinkOnScroll && scrolled ? 8 : 14;

  const wrapStyle: React.CSSProperties = {
    position: props.sticky ? 'sticky' : 'relative',
    top: 0,
    zIndex: 50,
    background: isTransparent
      ? 'transparent'
      : isGlass
      ? 'rgba(255,255,255,.7)'
      : isFloating
      ? 'transparent'
      : theme.background,
    backdropFilter: isGlass ? 'saturate(180%) blur(16px)' : undefined,
    WebkitBackdropFilter: isGlass ? 'saturate(180%) blur(16px)' : undefined,
    borderBottom: isBordered ? `1px solid ${theme.primary}1a` : 'none',
    color: theme.primary,
    fontFamily: fontFamily(theme, 'body'),
    transition: 'padding .25s ease, background .25s ease',
    padding: isFloating ? '16px' : `${padY}px 16px`,
  };

  const inner: React.CSSProperties = {
    maxWidth: maxWidthPx(theme.maxWidth),
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    background: isFloating ? (isGlass ? 'rgba(255,255,255,.7)' : theme.background) : undefined,
    backdropFilter: isFloating ? 'saturate(180%) blur(16px)' : undefined,
    boxShadow: isFloating ? '0 10px 30px rgba(15,23,42,.08)' : undefined,
    borderRadius: isFloating ? 9999 : undefined,
    padding: isFloating ? '10px 18px' : undefined,
    border: isFloating ? `1px solid ${theme.primary}10` : undefined,
  };

  const Logo = (
    <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
      {props.logoUrl ? (
        <img src={props.logoUrl} alt={props.logoText || 'Logo'} style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
      ) : (
        <span style={{ fontFamily: fontFamily(theme, 'heading'), fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
          {props.logoText || 'Brand'}
        </span>
      )}
    </a>
  );

  const NavLinks = (
    <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {(props.links ?? []).map((l, i) => (
        <a key={i} href={l.href} style={{ color: 'inherit', textDecoration: 'none', fontSize: 14, opacity: 0.85, fontWeight: 500 }}>
          {l.label}
        </a>
      ))}
    </nav>
  );

  const Ctas = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {props.secondaryCta && (
        <a href={props.secondaryCta.href || '#'} style={{ ...buttonStyles(theme, 'secondary'), padding: '8px 14px', fontSize: 13 }}>
          {props.secondaryCta.label}
        </a>
      )}
      {props.primaryCta && (
        <a href={props.primaryCta.href || '#lead-form'} style={{ ...buttonStyles(theme, 'primary'), padding: '8px 16px', fontSize: 13 }}>
          {props.primaryCta.label}
        </a>
      )}
    </div>
  );

  const isCentered = props.layout === 'centered-logo';
  const isMinimal = props.layout === 'minimal';

  return (
    <>
      <header style={wrapStyle}>
        <div style={inner}>
          {isCentered ? (
            <>
              <div className="lp-desktop" style={{ flex: 1 }}>{NavLinks}</div>
              <div style={{ flex: '0 0 auto' }}>{Logo}</div>
              <div className="lp-desktop" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>{Ctas}</div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                {Logo}
                {!isMinimal && <div className="lp-desktop">{NavLinks}</div>}
              </div>
              <div className="lp-desktop">{Ctas}</div>
            </>
          )}
          <button
            className="lp-mobile-only"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 8 }}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: theme.background, color: theme.primary,
            padding: 24, display: 'flex', flexDirection: 'column', gap: 18,
            fontFamily: fontFamily(theme, 'body'),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {Logo}
            <button onClick={() => setMobileOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 8 }} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
            {(props.links ?? []).map((l, i) => (
              <a key={i} href={l.href} onClick={() => setMobileOpen(false)} style={{ color: 'inherit', textDecoration: 'none', fontSize: 20, fontWeight: 600 }}>
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>{Ctas}</div>
        </div>
      )}

      <style>{`
        .lp-mobile-only { display: none; }
        @media (max-width: 768px) {
          .lp-desktop { display: none !important; }
          .lp-mobile-only { display: inline-flex !important; }
        }
      `}</style>
    </>
  );
}
