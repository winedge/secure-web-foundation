import type { SectionTheme, ContentProps } from '@/lib/landing-sections/types';
import { fontFamily, sectionPadding } from './_shared';

export function Content({ props, theme }: { props: ContentProps; theme: SectionTheme }) {
  const paragraphs = props.body.split(/\n{2,}/);
  return (
    <section style={{ padding: sectionPadding(theme.spacing), background: theme.background, color: theme.primary, fontFamily: fontFamily(theme, 'body') }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: props.align }}>
        {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 700, margin: '0 0 20px', letterSpacing: '-0.01em' }}>{props.heading}</h2>}
        {paragraphs.map((p, i) => (
          <p key={i} style={{ fontSize: 16.5, lineHeight: 1.7, opacity: 0.85, margin: '0 0 16px', whiteSpace: 'pre-line' }}>{p}</p>
        ))}
      </div>
    </section>
  );
}
