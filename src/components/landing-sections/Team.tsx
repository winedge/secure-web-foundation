import type { SectionTheme } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

export interface TeamMember {
  name: string;
  role?: string;
  photoUrl?: string;
  bio?: string;
  linkedin?: string;
  twitter?: string;
}
export interface TeamProps {
  heading?: string;
  intro?: string;
  columns: 2 | 3 | 4;
  members: TeamMember[];
}

export function Team({ props, theme }: { props: TeamProps; theme: SectionTheme }) {
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.intro) && (
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(28px,3vw,40px)', fontWeight: 800, margin: 0 }}>{props.heading}</h2>}
            {props.intro && <p style={{ marginTop: 12, opacity: 0.7 }}>{props.intro}</p>}
          </div>
        )}
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: `repeat(${props.columns ?? 3}, minmax(0,1fr))` }}>
          {(props.members || []).map((m, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 20, borderRadius: radiusPx(theme.radius), background: `${theme.primary}06`, transition: 'transform .2s' }}
              onMouseEnter={(e)=>{(e.currentTarget as HTMLDivElement).style.transform='translateY(-4px)';}}
              onMouseLeave={(e)=>{(e.currentTarget as HTMLDivElement).style.transform='none';}}>
              <div style={{ width: 120, height: 120, margin: '0 auto 16px', borderRadius: '50%', overflow: 'hidden', background: `${theme.accent}22` }}>
                {m.photoUrl && <img src={m.photoUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 18, fontWeight: 700 }}>{m.name}</div>
              {m.role && <div style={{ fontSize: 13, color: theme.accent, fontWeight: 600, marginTop: 2 }}>{m.role}</div>}
              {m.bio && <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.5, marginTop: 10 }}>{m.bio}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                {m.linkedin && <a href={m.linkedin} style={{ color: theme.primary, opacity: 0.6, fontSize: 13 }}>LinkedIn</a>}
                {m.twitter && <a href={m.twitter} style={{ color: theme.primary, opacity: 0.6, fontSize: 13 }}>Twitter</a>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
