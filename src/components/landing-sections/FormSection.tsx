import type { ReactNode } from 'react';
import type { SectionTheme, FormProps } from '@/lib/landing-sections/types';
import { fontFamily, maxWidthPx, radiusPx, sectionPadding } from './_shared';

/**
 * Renders a slot for the intake form. The actual form is passed in as
 * `formSlot` from BrandedIntake so submission logic stays in one place.
 */
export function FormSection({
  props,
  theme,
  formSlot,
}: {
  props: FormProps;
  theme: SectionTheme;
  formSlot?: ReactNode;
}) {
  return (
    <section
      id="lead-form"
      style={{ padding: sectionPadding(theme.spacing), background: theme.accent + '08', color: theme.primary, fontFamily: fontFamily(theme, 'body') }}
    >
      <div style={{ maxWidth: maxWidthPx(theme.maxWidth), margin: '0 auto' }}>
        {(props.heading || props.description) && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            {props.heading && <h2 style={{ fontFamily: fontFamily(theme, 'heading'), fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{props.heading}</h2>}
            {props.description && <p style={{ fontSize: 16, opacity: 0.75, marginTop: 10 }}>{props.description}</p>}
          </div>
        )}
        <div style={{ maxWidth: 640, margin: '0 auto', background: theme.background, padding: 28, borderRadius: radiusPx(theme.radius), boxShadow: '0 8px 30px rgba(0,0,0,.06)' }}>
          {formSlot ?? <p style={{ textAlign: 'center', opacity: 0.6 }}>Form will appear here when this page is published.</p>}
        </div>
      </div>
    </section>
  );
}
