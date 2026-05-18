import type { SectionType } from '@/lib/landing-sections/types';
import { newSection } from '@/lib/landing-sections/registry';

/**
 * When a theme is picked and `sections` is empty, seed a starter stack so the
 * builder feels "ready" instead of blank.
 */
const STACKS: Record<string, SectionType[]> = {
  clean_slate:   ['hero', 'features', 'testimonials', 'faq', 'form', 'footer'],
  emerald_trust: ['hero', 'logo_cloud', 'features', 'stats', 'testimonials', 'form', 'footer'],
  bold_sunset:   ['hero', 'steps', 'features', 'cta', 'form', 'footer'],
  medical_calm:  ['hero', 'features', 'steps', 'testimonials', 'faq', 'form', 'footer'],
  estate_luxe:   ['hero', 'gallery', 'features', 'testimonials', 'cta', 'form', 'footer'],
  dark_pro:      ['hero', 'logo_cloud', 'features', 'stats', 'pricing', 'faq', 'cta', 'form', 'footer'],
  vibrant_pop:   ['hero', 'features', 'gallery', 'testimonials', 'cta', 'form', 'footer'],
  eco_natural:   ['hero', 'content', 'features', 'testimonials', 'form', 'footer'],
};

const DEFAULT_STACK: SectionType[] = ['hero', 'features', 'testimonials', 'faq', 'cta', 'form', 'footer'];

export function starterStack(themeKey: string | null | undefined) {
  const types = (themeKey && STACKS[themeKey]) || DEFAULT_STACK;
  return types.map(newSection);
}
