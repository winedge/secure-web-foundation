/**
 * Section types for the multi-section landing page builder.
 * A `Section` is a typed block with editable `props`. The user can stack
 * many of them inside `firm_branding.sections` to compose a full landing page.
 */

export type SectionType =
  | 'hero'
  | 'video_hero'
  | 'features'
  | 'bento'
  | 'logo_cloud'
  | 'marquee'
  | 'stats'
  | 'testimonials'
  | 'faq'
  | 'pricing'
  | 'steps'
  | 'timeline'
  | 'gallery'
  | 'before_after'
  | 'comparison'
  | 'team'
  | 'countdown'
  | 'embed'
  | 'newsletter'
  | 'cta'
  | 'content'
  | 'divider'
  | 'form'
  | 'footer';

export interface SectionAnimation {
  entrance: 'none' | 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'zoom' | 'blur-in' | 'mask-reveal';
  trigger: 'on-load' | 'on-scroll' | 'on-hover';
  duration: number;
  delay: number;
  stagger?: number;
  easing: 'ease' | 'linear' | 'spring' | 'bounce';
  parallax?: number;
  repeat?: boolean;
}

export interface Section<T = Record<string, any>> {
  id: string;
  type: SectionType;
  visible: boolean;
  /** Optional conditional visibility (audience + form responses). */
  visibility?: VisibilityConfig;
  /** Optional motion config rendered through <AnimatedSection>. */
  animation?: SectionAnimation;
  props: T;
}

// -- Conditional visibility -------------------------------------------------

export type VisibilitySource = 'audience' | 'form';

export type VisibilityOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'truthy'
  | 'falsy';

export interface VisibilityRule {
  source: VisibilitySource;
  /**
   * For `audience`: one of `device | visitor | referrer | utm_source | utm_medium |
   *   utm_campaign | utm_content | utm_term | query:<paramName>`.
   * For `form`: the name of a form field (built-in or custom).
   */
  key: string;
  operator: VisibilityOperator;
  /** Comma-separated for `in` / `not_in`. */
  value?: string;
}

export interface VisibilityConfig {
  mode: 'all' | 'any';
  rules: VisibilityRule[];
}

export interface SectionTheme {
  primary: string;
  background: string;
  accent: string;
  headingFont?: string;
  bodyFont?: string;
  radius: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  spacing: 'compact' | 'normal' | 'airy';
  buttonStyle: 'solid' | 'outline' | 'gradient' | 'pill';
  maxWidth: 'narrow' | 'normal' | 'wide';
}

// -- Per-type prop shapes ---------------------------------------------------

export interface HeroProps {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  primaryCta?: { label: string; href?: string };
  secondaryCta?: { label: string; href?: string };
  imageUrl?: string;
  layout: 'centered' | 'split-left' | 'split-right' | 'image-bg';
  align?: 'left' | 'center';
}

export interface FeatureItem {
  icon?: string; // lucide icon name
  title: string;
  description?: string;
}
export interface FeaturesProps {
  heading?: string;
  intro?: string;
  columns: 2 | 3 | 4;
  items: FeatureItem[];
}

export interface LogoCloudProps {
  heading?: string;
  logos: { src: string; alt?: string }[];
}

export interface StatItem {
  value: string;
  label: string;
  suffix?: string;
}
export interface StatsProps {
  heading?: string;
  items: StatItem[];
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role?: string;
  avatar?: string;
  rating?: number;
}
export interface TestimonialsProps {
  heading?: string;
  layout: 'grid' | 'carousel';
  items: TestimonialItem[];
}

export interface FaqItem {
  question: string;
  answer: string;
}
export interface FaqProps {
  heading?: string;
  items: FaqItem[];
}

export interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  cta?: { label: string; href?: string };
  highlighted?: boolean;
}
export interface PricingProps {
  heading?: string;
  intro?: string;
  plans: PricingPlan[];
}

export interface StepItem {
  title: string;
  description?: string;
}
export interface StepsProps {
  heading?: string;
  intro?: string;
  items: StepItem[];
}

export interface GalleryImage {
  url: string;
  caption?: string;
}
export interface GalleryProps {
  heading?: string;
  layout: 'grid' | 'masonry';
  images: GalleryImage[];
}

export interface CtaProps {
  heading: string;
  subheading?: string;
  primaryCta?: { label: string; href?: string };
  secondaryCta?: { label: string; href?: string };
  style: 'soft' | 'bold' | 'gradient';
}

export interface ContentProps {
  heading?: string;
  body: string; // plain text or simple markdown
  align: 'left' | 'center';
}

export interface FormProps {
  heading?: string;
  description?: string;
  sticky: boolean;
}

export interface FooterProps {
  firmName?: string;
  tagline?: string;
  links: { label: string; href: string }[];
  social: { type: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'youtube'; href: string }[];
  legal?: string;
}

// -- Inspector field schema -------------------------------------------------

export type InspectorField =
  | { kind: 'text'; key: string; label: string; placeholder?: string }
  | { kind: 'textarea'; key: string; label: string; placeholder?: string; rows?: number }
  | { kind: 'image'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: 'number'; key: string; label: string; min?: number; max?: number }
  | { kind: 'toggle'; key: string; label: string }
  | { kind: 'cta'; key: string; label: string }
  | {
      kind: 'repeater';
      key: string;
      label: string;
      itemLabel: string;
      fields: InspectorField[];
      defaultItem: Record<string, any>;
    };
