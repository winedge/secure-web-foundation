import { useEffect, useState } from 'react';
import type { SectionTheme, StickyCtaBarProps } from '@/lib/landing-sections/types';
import { fontFamily } from './_shared';

export function StickyCtaBar({ props, theme }: { props: StickyCtaBarProps; theme: SectionTheme }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return <div style={{ display: 'none' }} />;
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0,
      [props.position === 'top' ? 'top' : 'bottom']: 0,
      background: props.background || theme.primary,
      color: props.textColor || '#fff',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
      flexWrap: 'wrap',
      boxShadow: props.position === 'top' ? '0 4px 12px rgba(0,0,0,.1)' : '0 -4px 12px rgba(0,0,0,.1)',
      zIndex: 80,
      fontFamily: fontFamily(theme, 'body'),
    } as React.CSSProperties}>
      <span style={{ fontSize: 15, fontWeight: 500 }}>{props.text}</span>
      <a
        href={props.cta?.href || '#lead-form'}
        style={{
          padding: '10px 20px', background: theme.accent, color: '#fff',
          borderRadius: 9999, textDecoration: 'none', fontWeight: 600, fontSize: 14,
        }}
      >
        {props.cta?.label || 'Get started'}
      </a>
    </div>
  );
}
