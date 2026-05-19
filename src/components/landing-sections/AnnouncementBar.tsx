import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { SectionTheme, AnnouncementBarProps } from '@/lib/landing-sections/types';
import { fontFamily } from './_shared';

function useCountdown(iso?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso) return null;
  const diff = Math.max(0, new Date(iso).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${d}d ${h}h ${m}m ${s}s`;
}

export function AnnouncementBar({ props, theme }: { props: AnnouncementBarProps; theme: SectionTheme }) {
  const [dismissed, setDismissed] = useState(false);
  const countdown = useCountdown(props.countdownIso);
  if (dismissed) return null;

  return (
    <div style={{
      background: props.background || theme.primary,
      color: props.textColor || '#fff',
      padding: '10px 16px',
      fontFamily: fontFamily(theme, 'body'),
      fontSize: 13,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      position: 'relative',
    }}>
      <span style={{ fontWeight: 500 }}>{props.text}</span>
      {countdown && <span style={{ fontWeight: 700, opacity: 0.9 }}>· {countdown}</span>}
      {props.link?.label && (
        <a href={props.link.href} style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>
          {props.link.label} →
        </a>
      )}
      {props.dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
