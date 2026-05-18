import type { SectionTheme } from '@/lib/landing-sections/types';

export const DEFAULT_THEME: SectionTheme = {
  primary: '#0f172a',
  background: '#ffffff',
  accent: '#10b981',
  radius: 'lg',
  spacing: 'normal',
  buttonStyle: 'solid',
  maxWidth: 'normal',
};

export function radiusPx(r: SectionTheme['radius']): string {
  return { sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px' }[r];
}

export function sectionPadding(s: SectionTheme['spacing']): string {
  return { compact: '40px 16px', normal: '64px 16px', airy: '96px 16px' }[s];
}

export function maxWidthPx(m: SectionTheme['maxWidth']): string {
  return { narrow: '768px', normal: '1100px', wide: '1280px' }[m];
}

export function buttonStyles(
  theme: SectionTheme,
  variant: 'primary' | 'secondary' = 'primary'
): React.CSSProperties {
  const radius = theme.buttonStyle === 'pill' ? '9999px' : radiusPx(theme.radius);
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 22px',
    fontWeight: 600,
    fontSize: 15,
    borderRadius: radius,
    cursor: 'pointer',
    transition: 'transform .15s ease, opacity .15s ease',
    border: '1px solid transparent',
    textDecoration: 'none',
  };
  if (variant === 'secondary') {
    return {
      ...base,
      background: 'transparent',
      color: theme.primary,
      borderColor: theme.primary + '40',
    };
  }
  if (theme.buttonStyle === 'outline') {
    return { ...base, background: 'transparent', color: theme.accent, borderColor: theme.accent };
  }
  if (theme.buttonStyle === 'gradient') {
    return {
      ...base,
      background: `linear-gradient(135deg, ${theme.accent}, ${theme.primary})`,
      color: '#fff',
    };
  }
  return { ...base, background: theme.accent, color: '#fff' };
}

export function fontFamily(theme: SectionTheme, type: 'heading' | 'body'): string {
  const name = type === 'heading' ? theme.headingFont : theme.bodyFont;
  if (!name) return 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  return `"${name}", system-ui, -apple-system, sans-serif`;
}
