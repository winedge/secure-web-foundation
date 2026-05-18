/**
 * Curated landing-page themes. Picking a theme loads its values into the
 * builder state; the user can then freely edit any field.
 */
export type FontPair = {
  heading: string;
  body: string;
  /** Google Fonts URL family params, e.g. "Inter:wght@400;600;700" */
  googleFamilies: string[];
};

export type LayoutConfig = {
  radius: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  buttonStyle: 'solid' | 'outline' | 'gradient' | 'pill';
  spacing: 'compact' | 'normal' | 'airy';
  maxWidth: 'narrow' | 'normal' | 'wide';
};

export type HeroConfig = {
  layout: 'centered' | 'split' | 'image-left' | 'image-right';
  eyebrow?: string;
  secondaryCta?: string;
  imageUrl?: string;
};

export type LandingTheme = {
  key: string;
  name: string;
  tagline: string;
  bestFor: string;
  colors: {
    primary: string;
    background: string;
    accent: string;
  };
  typography: FontPair;
  layout: LayoutConfig;
  hero: HeroConfig;
};

export const LANDING_THEMES: LandingTheme[] = [
  {
    key: 'clean_slate',
    name: 'Clean Slate',
    tagline: 'Minimal white + navy. Trustworthy and professional.',
    bestFor: 'Legal, Finance, Consulting',
    colors: { primary: '#0f172a', background: '#ffffff', accent: '#3b82f6' },
    typography: {
      heading: 'Inter',
      body: 'Inter',
      googleFamilies: ['Inter:wght@400;600;700'],
    },
    layout: { radius: 'md', buttonStyle: 'solid', spacing: 'normal', maxWidth: 'normal' },
    hero: { layout: 'centered', eyebrow: 'Trusted by thousands', secondaryCta: 'Learn more' },
  },
  {
    key: 'emerald_trust',
    name: 'Emerald Trust',
    tagline: 'White + emerald accent. The LeadThru default.',
    bestFor: 'SaaS, Lead Gen, Tech',
    colors: { primary: '#0f172a', background: '#ffffff', accent: '#10b981' },
    typography: {
      heading: 'DM Sans',
      body: 'Inter',
      googleFamilies: ['DM+Sans:wght@500;700', 'Inter:wght@400;500'],
    },
    layout: { radius: 'lg', buttonStyle: 'solid', spacing: 'normal', maxWidth: 'normal' },
    hero: { layout: 'centered', eyebrow: 'Free | No obligation', secondaryCta: 'See how it works' },
  },
  {
    key: 'bold_sunset',
    name: 'Bold Sunset',
    tagline: 'Warm gradient hero. Energetic and action-driven.',
    bestFor: 'Solar, Roofing, Home Services',
    colors: { primary: '#1f2937', background: '#fff7ed', accent: '#f97316' },
    typography: {
      heading: 'Space Grotesk',
      body: 'Inter',
      googleFamilies: ['Space+Grotesk:wght@500;700', 'Inter:wght@400;500'],
    },
    layout: { radius: 'xl', buttonStyle: 'gradient', spacing: 'airy', maxWidth: 'normal' },
    hero: { layout: 'split', eyebrow: 'Limited time offer', secondaryCta: 'Get a quote' },
  },
  {
    key: 'medical_calm',
    name: 'Medical Calm',
    tagline: 'Sky blue + soft grey. Reassuring and clinical.',
    bestFor: 'Dental, Aesthetics, Medical',
    colors: { primary: '#0c4a6e', background: '#f0f9ff', accent: '#0ea5e9' },
    typography: {
      heading: 'Manrope',
      body: 'Inter',
      googleFamilies: ['Manrope:wght@500;700', 'Inter:wght@400;500'],
    },
    layout: { radius: '2xl', buttonStyle: 'pill', spacing: 'airy', maxWidth: 'normal' },
    hero: { layout: 'centered', eyebrow: 'Book your free consultation', secondaryCta: 'View services' },
  },
  {
    key: 'estate_luxe',
    name: 'Estate Luxe',
    tagline: 'Cream + gold. Premium and aspirational.',
    bestFor: 'Real Estate, Luxury, Wealth',
    colors: { primary: '#1c1917', background: '#fafaf9', accent: '#b45309' },
    typography: {
      heading: 'Playfair Display',
      body: 'Lora',
      googleFamilies: ['Playfair+Display:wght@500;700', 'Lora:wght@400;500'],
    },
    layout: { radius: 'sm', buttonStyle: 'outline', spacing: 'airy', maxWidth: 'narrow' },
    hero: { layout: 'image-right', eyebrow: 'Exclusive listings', secondaryCta: 'Browse properties' },
  },
  {
    key: 'dark_pro',
    name: 'Dark Pro',
    tagline: 'Dark navy + electric. Modern SaaS confidence.',
    bestFor: 'SaaS, Tech, Crypto',
    colors: { primary: '#0a0a1a', background: '#0f172a', accent: '#22d3ee' },
    typography: {
      heading: 'Space Grotesk',
      body: 'Inter',
      googleFamilies: ['Space+Grotesk:wght@500;700', 'Inter:wght@400;500'],
    },
    layout: { radius: 'lg', buttonStyle: 'solid', spacing: 'normal', maxWidth: 'normal' },
    hero: { layout: 'centered', eyebrow: 'Built for 2026', secondaryCta: 'See the demo' },
  },
  {
    key: 'vibrant_pop',
    name: 'Vibrant Pop',
    tagline: 'Coral + violet. Playful and creative.',
    bestFor: 'Marketing, Creative, Agencies',
    colors: { primary: '#5b21b6', background: '#fdf4ff', accent: '#ec4899' },
    typography: {
      heading: 'Outfit',
      body: 'Inter',
      googleFamilies: ['Outfit:wght@500;700', 'Inter:wght@400;500'],
    },
    layout: { radius: '2xl', buttonStyle: 'gradient', spacing: 'airy', maxWidth: 'normal' },
    hero: { layout: 'split', eyebrow: 'New & exciting', secondaryCta: 'Watch the reel' },
  },
  {
    key: 'eco_natural',
    name: 'Eco Natural',
    tagline: 'Sage + earth tones. Calm and grounded.',
    bestFor: 'Wellness, Eco, Lifestyle',
    colors: { primary: '#1f2937', background: '#f5f5f4', accent: '#65a30d' },
    typography: {
      heading: 'Lora',
      body: 'Inter',
      googleFamilies: ['Lora:wght@500;700', 'Inter:wght@400;500'],
    },
    layout: { radius: 'lg', buttonStyle: 'pill', spacing: 'normal', maxWidth: 'normal' },
    hero: { layout: 'centered', eyebrow: 'Natural | Honest', secondaryCta: 'Our promise' },
  },
];

export const DEFAULT_THEME = LANDING_THEMES[1]; // Emerald Trust

export function getTheme(key: string | null | undefined): LandingTheme {
  if (!key) return DEFAULT_THEME;
  return LANDING_THEMES.find((t) => t.key === key) ?? DEFAULT_THEME;
}

export function radiusClass(r: LayoutConfig['radius']): string {
  return { sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', xl: 'rounded-xl', '2xl': 'rounded-2xl' }[r];
}
