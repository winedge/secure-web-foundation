/**
 * Section types for the multi-section landing page builder.
 */

export type SectionType =
  | 'header'
  | 'announcement_bar'
  | 'hero'
  | 'video_hero'
  | 'features'
  | 'bento'
  | 'logo_cloud'
  | 'marquee'
  | 'stats'
  | 'testimonials'
  | 'reviews_wall'
  | 'case_study'
  | 'trust_badges'
  | 'faq'
  | 'accordion'
  | 'tabs'
  | 'pricing'
  | 'pricing_toggle'
  | 'steps'
  | 'timeline'
  | 'gallery'
  | 'image_slider'
  | 'video_gallery'
  | 'before_after'
  | 'comparison'
  | 'team'
  | 'countdown'
  | 'embed'
  | 'booking'
  | 'newsletter'
  | 'multi_step_form'
  | 'cta'
  | 'sticky_cta_bar'
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

export type SectionBackgroundPreset =
  | 'paper-texture'
  | 'cream-paper'
  | 'aurora-mesh'
  | 'dark-grain'
  | 'gold-on-black'
  | 'full-bleed-photo'
  | 'editorial-white'
  | 'noir';

export interface SectionBackground {
  kind: 'none' | 'gradient' | 'mesh' | 'glass' | 'solid' | 'preset';
  color?: string;
  preset?: SectionBackgroundPreset;
  /** Image URL used by preset 'full-bleed-photo' and as fallback for glass/mesh overlays. */
  imageUrl?: string;
  /** Optional scrim opacity (0..1) layered over preset photo backdrops. */
  scrim?: number;
  gradient?: {
    type: 'linear' | 'radial' | 'conic';
    angle?: number;
    stops: { color: string; pos: number }[];
  };
  mesh?: {
    base?: string;
    blobs: { color: string; x: number; y: number; size: number; opacity?: number }[];
    grain?: boolean;
  };
  glass?: {
    blur: number;
    opacity: number;
    border?: boolean;
    imageUrl?: string;
  };
}

export type SectionDensity = 'tight' | 'default' | 'roomy' | 'editorial';
export type HeadlineScale = 'sm' | 'md' | 'lg' | 'hero' | 'oversized';

export interface Section<T = Record<string, any>> {
  id: string;
  type: SectionType;
  visible: boolean;
  visibility?: VisibilityConfig;
  animation?: SectionAnimation;
  background?: SectionBackground;
  /** Vertical rhythm scale applied to this section's padding and max-width. */
  density?: SectionDensity;
  /** Headline display-size token for sections that read it (Hero, CTA, Stats). */
  headlineScale?: HeadlineScale;
  /** Per-section typography override (otherwise inherits global theme). */
  typography?: { heading?: string; body?: string };
  props: T;
}

// -- Conditional visibility -------------------------------------------------

export type VisibilitySource = 'audience' | 'form';
export type VisibilityOperator =
  | 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'in' | 'not_in' | 'is_empty' | 'is_not_empty' | 'truthy' | 'falsy';

export interface VisibilityRule {
  source: VisibilitySource;
  key: string;
  operator: VisibilityOperator;
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
  /** Optional brand logo URL — used by section components that fall back to the brand mark. */
  logoUrl?: string;
  /** Optional dark-mode logo, swapped automatically over dark section backgrounds. */
  logoUrlDark?: string;
  /** Dark-mode brand token overrides applied automatically on dark sections. */
  dark?: {
    primary?: string;
    background?: string;
    accent?: string;
  };
}

// -- Per-type prop shapes ---------------------------------------------------

export interface HeaderProps {
  logoUrl?: string;
  logoText?: string;
  links: { label: string; href: string }[];
  primaryCta?: { label: string; href?: string };
  secondaryCta?: { label: string; href?: string };
  layout: 'left-nav' | 'centered-logo' | 'split' | 'logo-left-cta-right' | 'minimal';
  style: 'solid' | 'transparent' | 'glass' | 'bordered-bottom' | 'floating-pill';
  sticky: boolean;
  shrinkOnScroll?: boolean;
}

export interface AnnouncementBarProps {
  text: string;
  link?: { label: string; href: string };
  background: string;
  textColor: string;
  dismissible: boolean;
  countdownIso?: string;
}

export interface HeroProps {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  primaryCta?: { label: string; href?: string };
  secondaryCta?: { label: string; href?: string };
  imageUrl?: string;
  layout:
    | 'centered'
    | 'split-left'
    | 'split-right'
    | 'image-bg'
    | 'split-form-right'
    | 'split-form-left'
    | 'editorial-centered'  // huge serif headline, thin rule lines, asymmetric meta row
    | 'noir-photo'          // full-bleed photo, dark scrim, gold/cream type
    | 'magazine-split';     // 60/40 split, oversized number, tag chips
  align?: 'left' | 'center';
  // form-split extras
  formCardTitle?: string;
  formCardSubtitle?: string;
  formCardStyle?: 'card' | 'glass' | 'minimal';
  // social proof in hero
  rating?: { stars: number; count?: number; label?: string };
  badges?: { label: string; icon?: string }[];
  mediaShape?: 'rounded' | 'browser-frame' | 'phone-frame' | 'tilted';
}

export interface FeatureItem { icon?: string; title: string; description?: string; imageUrl?: string; }
export interface FeaturesProps {
  heading?: string; intro?: string; columns: 2 | 3 | 4; items: FeatureItem[];
  layout?: 'grid' | 'zigzag' | 'accordion-list' | 'icon-row' | 'two-col-large';
}

export interface LogoCloudProps {
  heading?: string; logos: { src: string; alt?: string }[];
  layout?: 'static-grid' | 'marquee' | 'dual-row' | 'with-quote';
  quote?: string; quoteAuthor?: string;
}

export interface StatItem { value: string; label: string; suffix?: string; }
export interface StatsProps {
  heading?: string; items: StatItem[];
  layout?: 'row' | 'cards-large' | 'inline-strip';
}

export interface TestimonialItem { quote: string; author: string; role?: string; avatar?: string; rating?: number; }
export interface TestimonialsProps {
  heading?: string;
  layout: 'grid' | 'carousel' | 'marquee-row' | 'big-quote' | 'masonry' | 'sidebar-photo';
  items: TestimonialItem[];
}

export interface ReviewItem { source: 'google' | 'trustpilot' | 'facebook' | 'manual'; author: string; rating: number; quote: string; date?: string; }
export interface ReviewsWallProps { heading?: string; intro?: string; minRating: number; items: ReviewItem[]; showSourceBadges: boolean; }

export interface CaseStudyProps {
  heading?: string;
  customerName: string;
  customerLogo?: string;
  imageUrl?: string;
  resultValue: string;
  resultLabel: string;
  quote?: string;
  quoteAuthor?: string;
  cta?: { label: string; href?: string };
}

export interface TrustBadgesProps {
  heading?: string;
  layout: 'row' | 'grid' | 'pill-cloud' | 'stat-strip';
  items: { label: string; icon?: string; imageUrl?: string }[];
}

export interface FaqItem { question: string; answer: string; }
export interface FaqProps {
  heading?: string; items: FaqItem[];
  layout?: 'accordion-single' | 'two-col' | 'card-grid';
}

export interface AccordionProps { heading?: string; intro?: string; allowMultiple: boolean; items: { title: string; body: string }[]; }

export interface TabsProps { heading?: string; intro?: string; tabs: { label: string; heading?: string; body: string; imageUrl?: string }[]; }

export interface PricingPlan {
  name: string; price: string; period?: string; description?: string;
  features: string[]; cta?: { label: string; href?: string }; highlighted?: boolean;
}
export interface PricingProps { heading?: string; intro?: string; plans: PricingPlan[]; }

export interface PricingTogglePlan {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  description?: string;
  features: string[];
  cta?: { label: string; href?: string };
  highlighted?: boolean;
}
export interface PricingToggleProps {
  heading?: string;
  intro?: string;
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyDiscountLabel?: string;
  plans: PricingTogglePlan[];
}

export interface StepItem { title: string; description?: string; }
export interface StepsProps { heading?: string; intro?: string; items: StepItem[]; }

export interface GalleryImage { url: string; caption?: string; }
export interface GalleryProps { heading?: string; layout: 'grid' | 'masonry'; images: GalleryImage[]; }

export interface ImageSliderProps {
  heading?: string;
  autoplay: boolean;
  intervalMs: number;
  showDots: boolean;
  showArrows: boolean;
  images: { url: string; caption?: string; cta?: { label: string; href?: string } }[];
}

export interface VideoGalleryProps {
  heading?: string;
  intro?: string;
  videos: { thumbnailUrl?: string; title?: string; url: string; duration?: string }[];
}

export interface CtaProps {
  heading: string;
  subheading?: string;
  primaryCta?: { label: string; href?: string };
  secondaryCta?: { label: string; href?: string };
  style: 'soft' | 'bold' | 'gradient';
  layout?: 'centered' | 'split-image' | 'banner-strip' | 'card-floating' | 'full-bleed-photo';
  imageUrl?: string;
}

export interface StickyCtaBarProps {
  text: string;
  cta: { label: string; href?: string };
  position: 'top' | 'bottom';
  background: string;
  textColor: string;
}

export interface BookingProps {
  heading?: string;
  intro?: string;
  provider: 'calendly' | 'cal' | 'google' | 'custom';
  url: string;
  height: number;
}

export interface MultiStepFormProps {
  heading?: string;
  description?: string;
  successMessage: string;
  steps: {
    title: string;
    fields: { id: string; label: string; type: 'text' | 'email' | 'tel' | 'textarea' | 'select'; required?: boolean; options?: string }[];
  }[];
}

export interface ContentProps { heading?: string; body: string; align: 'left' | 'center'; }

export interface FormProps { heading?: string; description?: string; sticky: boolean; }

export interface FooterColumn { heading: string; links: { label: string; href: string }[]; }
export interface FooterProps {
  layout?: 'simple' | 'columns' | 'newsletter-inline' | 'centered';
  logoUrl?: string;
  firmName?: string;
  tagline?: string;
  columns?: FooterColumn[];
  links: { label: string; href: string }[];
  social: { type: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'youtube'; href: string }[];
  newsletter?: { heading?: string; placeholder?: string; ctaLabel?: string };
  legal?: string;
  bottomLinks?: { label: string; href: string }[];
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
  | { kind: 'color'; key: string; label: string }
  | { kind: 'slider'; key: string; label: string; min: number; max: number; step?: number; unit?: string }
  | {
      kind: 'repeater';
      key: string;
      label: string;
      itemLabel: string;
      fields: InspectorField[];
      defaultItem: Record<string, any>;
    };
