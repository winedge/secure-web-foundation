import {
  LayoutTemplate, Sparkles, Image as ImageIcon, BarChart3, Quote, HelpCircle,
  Tag, ListOrdered, GalleryHorizontal, Megaphone, FileText, ClipboardList, PanelBottom,
  Film, LayoutGrid, Repeat, History, ArrowLeftRight, Columns3, Users, Timer, Code2, Mail, Minus,
} from 'lucide-react';
import type { SectionType, InspectorField } from '@/lib/landing-sections/types';

import { Hero } from '@/components/landing-sections/Hero';
import { VideoHero } from '@/components/landing-sections/VideoHero';
import { Features } from '@/components/landing-sections/Features';
import { Bento } from '@/components/landing-sections/Bento';
import { LogoCloud } from '@/components/landing-sections/LogoCloud';
import { Marquee } from '@/components/landing-sections/Marquee';
import { Stats } from '@/components/landing-sections/Stats';
import { Testimonials } from '@/components/landing-sections/Testimonials';
import { Faq } from '@/components/landing-sections/Faq';
import { Pricing } from '@/components/landing-sections/Pricing';
import { Steps } from '@/components/landing-sections/Steps';
import { Timeline } from '@/components/landing-sections/Timeline';
import { Gallery } from '@/components/landing-sections/Gallery';
import { BeforeAfter } from '@/components/landing-sections/BeforeAfter';
import { Comparison } from '@/components/landing-sections/Comparison';
import { Team } from '@/components/landing-sections/Team';
import { Countdown } from '@/components/landing-sections/Countdown';
import { Embed } from '@/components/landing-sections/Embed';
import { Newsletter } from '@/components/landing-sections/Newsletter';
import { Cta } from '@/components/landing-sections/Cta';
import { Content } from '@/components/landing-sections/Content';
import { Divider } from '@/components/landing-sections/Divider';
import { FormSection } from '@/components/landing-sections/FormSection';
import { Footer } from '@/components/landing-sections/Footer';

export interface SectionDef {
  type: SectionType;
  label: string;
  description: string;
  icon: any;
  Component: React.ComponentType<any>;
  defaultProps: Record<string, any>;
  schema: InspectorField[];
}

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    type: 'hero',
    label: 'Hero',
    description: 'Big headline + call-to-action at the top of the page',
    icon: LayoutTemplate,
    Component: Hero,
    defaultProps: {
      eyebrow: 'Trusted by 10,000+ customers',
      headline: 'The smarter way to grow your business',
      subheadline: 'Beautiful landing pages, intake forms, and AI conversations | all in one place.',
      primaryCta: { label: 'Get started', href: '#lead-form' },
      secondaryCta: { label: 'See how it works', href: '#' },
      layout: 'centered',
      align: 'center',
      imageUrl: '',
    },
    schema: [
      { kind: 'text', key: 'eyebrow', label: 'Eyebrow tag' },
      { kind: 'text', key: 'headline', label: 'Headline', placeholder: 'Your big promise' },
      { kind: 'textarea', key: 'subheadline', label: 'Sub-headline', rows: 2 },
      { kind: 'select', key: 'layout', label: 'Layout', options: [
        { value: 'centered', label: 'Centered' },
        { value: 'split-left', label: 'Image right' },
        { value: 'split-right', label: 'Image left' },
        { value: 'image-bg', label: 'Image background' },
      ] },
      { kind: 'image', key: 'imageUrl', label: 'Hero image' },
      { kind: 'cta', key: 'primaryCta', label: 'Primary button' },
      { kind: 'cta', key: 'secondaryCta', label: 'Secondary button' },
    ],
  },
  features: {
    type: 'features',
    label: 'Features',
    description: 'Grid of feature cards with icons',
    icon: Sparkles,
    Component: Features,
    defaultProps: {
      heading: 'Everything you need',
      intro: 'Powerful features designed to help you win more customers.',
      columns: 3,
      items: [
        { icon: 'Zap', title: 'Lightning fast', description: 'Load in milliseconds, anywhere in the world.' },
        { icon: 'Shield', title: 'Secure by default', description: 'Bank-grade encryption and compliance baked in.' },
        { icon: 'Sparkles', title: 'AI-powered', description: 'Smart assistant qualifies and converts visitors for you.' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'select', key: 'columns', label: 'Columns', options: [
        { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' },
      ] },
      { kind: 'repeater', key: 'items', label: 'Features', itemLabel: 'Feature',
        fields: [
          { kind: 'text', key: 'icon', label: 'Icon (lucide name)', placeholder: 'Sparkles' },
          { kind: 'text', key: 'title', label: 'Title' },
          { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
        ],
        defaultItem: { icon: 'Sparkles', title: 'New feature', description: '' },
      },
    ],
  },
  logo_cloud: {
    type: 'logo_cloud',
    label: 'Logo cloud',
    description: '"As seen in" or partner logos row',
    icon: ImageIcon,
    Component: LogoCloud,
    defaultProps: {
      heading: 'Trusted by teams at',
      logos: [
        { src: 'https://cdn.simpleicons.org/google/64748b', alt: 'Google' },
        { src: 'https://cdn.simpleicons.org/microsoft/64748b', alt: 'Microsoft' },
        { src: 'https://cdn.simpleicons.org/airbnb/64748b', alt: 'Airbnb' },
        { src: 'https://cdn.simpleicons.org/stripe/64748b', alt: 'Stripe' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'repeater', key: 'logos', label: 'Logos', itemLabel: 'Logo',
        fields: [
          { kind: 'image', key: 'src', label: 'Image' },
          { kind: 'text', key: 'alt', label: 'Alt text' },
        ],
        defaultItem: { src: '', alt: '' },
      },
    ],
  },
  stats: {
    type: 'stats',
    label: 'Stats',
    description: 'Large numbers (clients served, ROI, etc.)',
    icon: BarChart3,
    Component: Stats,
    defaultProps: {
      heading: 'By the numbers',
      items: [
        { value: '10', suffix: 'K+', label: 'Happy customers' },
        { value: '99.9', suffix: '%', label: 'Uptime' },
        { value: '4.9', suffix: '/5', label: 'Average rating' },
        { value: '24', suffix: '/7', label: 'Support' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'repeater', key: 'items', label: 'Stats', itemLabel: 'Stat',
        fields: [
          { kind: 'text', key: 'value', label: 'Value' },
          { kind: 'text', key: 'suffix', label: 'Suffix' },
          { kind: 'text', key: 'label', label: 'Label' },
        ],
        defaultItem: { value: '100', suffix: '+', label: 'Stat' },
      },
    ],
  },
  testimonials: {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Customer quotes with avatars and ratings',
    icon: Quote,
    Component: Testimonials,
    defaultProps: {
      heading: 'Loved by customers',
      layout: 'grid',
      items: [
        { quote: 'Easily the best decision we made this year.', author: 'Priya Sharma', role: 'Founder, Lotus Co', rating: 5 },
        { quote: 'Setup took ten minutes and leads started rolling in.', author: 'Arjun Mehta', role: 'CMO, Northwind', rating: 5 },
        { quote: 'Our conversion rate doubled in the first month.', author: 'Sara Khan', role: 'Owner, Bright Smile', rating: 5 },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'select', key: 'layout', label: 'Layout', options: [
        { value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' },
      ] },
      { kind: 'repeater', key: 'items', label: 'Testimonials', itemLabel: 'Testimonial',
        fields: [
          { kind: 'textarea', key: 'quote', label: 'Quote', rows: 3 },
          { kind: 'text', key: 'author', label: 'Author' },
          { kind: 'text', key: 'role', label: 'Role' },
          { kind: 'image', key: 'avatar', label: 'Avatar' },
          { kind: 'number', key: 'rating', label: 'Rating (1-5)', min: 1, max: 5 },
        ],
        defaultItem: { quote: '', author: '', role: '', rating: 5 },
      },
    ],
  },
  faq: {
    type: 'faq',
    label: 'FAQ',
    description: 'Expandable question/answer list',
    icon: HelpCircle,
    Component: Faq,
    defaultProps: {
      heading: 'Frequently asked questions',
      items: [
        { question: 'How fast can I get started?', answer: 'You can publish your page in under five minutes.' },
        { question: 'Do I need a developer?', answer: 'No | everything is no-code. Just pick a theme and edit text.' },
        { question: 'Can I cancel anytime?', answer: 'Yes, cancel from your account settings, no questions asked.' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'repeater', key: 'items', label: 'Questions', itemLabel: 'Question',
        fields: [
          { kind: 'text', key: 'question', label: 'Question' },
          { kind: 'textarea', key: 'answer', label: 'Answer', rows: 3 },
        ],
        defaultItem: { question: '', answer: '' },
      },
    ],
  },
  pricing: {
    type: 'pricing',
    label: 'Pricing',
    description: 'Plan comparison cards',
    icon: Tag,
    Component: Pricing,
    defaultProps: {
      heading: 'Simple, transparent pricing',
      intro: 'Pick a plan that scales with you.',
      plans: [
        { name: 'Starter', price: '$0', period: 'mo', description: 'For trying things out', features: ['1 landing page', 'Basic intake form', 'Email support'], cta: { label: 'Get started', href: '#lead-form' } },
        { name: 'Pro', price: '$99', period: 'mo', description: 'For growing businesses', features: ['Unlimited pages', 'AI assistant', 'Priority support', 'Custom branding'], cta: { label: 'Start free trial', href: '#lead-form' }, highlighted: true },
        { name: 'Enterprise', price: 'Talk to us', description: 'For large teams', features: ['Everything in Pro', 'Dedicated CSM', 'SLA & compliance'], cta: { label: 'Contact sales', href: '#lead-form' } },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'repeater', key: 'plans', label: 'Plans', itemLabel: 'Plan',
        fields: [
          { kind: 'text', key: 'name', label: 'Name' },
          { kind: 'text', key: 'price', label: 'Price' },
          { kind: 'text', key: 'period', label: 'Period (e.g. mo)' },
          { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
          { kind: 'textarea', key: 'features', label: 'Features (one per line)', rows: 4 },
          { kind: 'cta', key: 'cta', label: 'Button' },
          { kind: 'toggle', key: 'highlighted', label: 'Highlight as most popular' },
        ],
        defaultItem: { name: 'New plan', price: '$0', period: 'mo', features: [], cta: { label: 'Choose', href: '#' } },
      },
    ],
  },
  steps: {
    type: 'steps',
    label: 'How it works',
    description: 'Numbered step-by-step process',
    icon: ListOrdered,
    Component: Steps,
    defaultProps: {
      heading: 'How it works',
      intro: 'Three steps from sign-up to first customer.',
      items: [
        { title: 'Sign up', description: 'Create your free account in seconds.' },
        { title: 'Customize', description: 'Pick a theme and add your branding.' },
        { title: 'Publish & grow', description: 'Share your page and start collecting leads.' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'repeater', key: 'items', label: 'Steps', itemLabel: 'Step',
        fields: [
          { kind: 'text', key: 'title', label: 'Title' },
          { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
        ],
        defaultItem: { title: 'New step', description: '' },
      },
    ],
  },
  gallery: {
    type: 'gallery',
    label: 'Gallery',
    description: 'Image grid with optional captions',
    icon: GalleryHorizontal,
    Component: Gallery,
    defaultProps: {
      heading: 'Gallery',
      layout: 'grid',
      images: [],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'select', key: 'layout', label: 'Layout', options: [
        { value: 'grid', label: 'Grid' }, { value: 'masonry', label: 'Masonry' },
      ] },
      { kind: 'repeater', key: 'images', label: 'Images', itemLabel: 'Image',
        fields: [
          { kind: 'image', key: 'url', label: 'Image' },
          { kind: 'text', key: 'caption', label: 'Caption' },
        ],
        defaultItem: { url: '', caption: '' },
      },
    ],
  },
  cta: {
    type: 'cta',
    label: 'Call to action',
    description: 'Bold banner pushing the visitor to act',
    icon: Megaphone,
    Component: Cta,
    defaultProps: {
      heading: 'Ready to get started?',
      subheading: 'Join thousands of businesses growing with us.',
      primaryCta: { label: 'Get started free', href: '#lead-form' },
      style: 'bold',
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'subheading', label: 'Sub-heading', rows: 2 },
      { kind: 'select', key: 'style', label: 'Style', options: [
        { value: 'soft', label: 'Soft' }, { value: 'bold', label: 'Bold' }, { value: 'gradient', label: 'Gradient' },
      ] },
      { kind: 'cta', key: 'primaryCta', label: 'Primary button' },
      { kind: 'cta', key: 'secondaryCta', label: 'Secondary button' },
    ],
  },
  content: {
    type: 'content',
    label: 'Text block',
    description: 'Free-form paragraph(s)',
    icon: FileText,
    Component: Content,
    defaultProps: {
      heading: 'About us',
      body: 'Tell your story here. Use blank lines to separate paragraphs.\n\nVisitors who read the about section are 3x more likely to convert.',
      align: 'left',
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'body', label: 'Body', rows: 6 },
      { kind: 'select', key: 'align', label: 'Alignment', options: [
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' },
      ] },
    ],
  },
  form: {
    type: 'form',
    label: 'Intake form',
    description: 'The lead-capture form (fields configured in the Fields tab)',
    icon: ClipboardList,
    Component: FormSection,
    defaultProps: {
      heading: 'Get your free quote',
      description: 'Fill out the form below and we will get back to you within 24 hours.',
      sticky: false,
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
    ],
  },
  footer: {
    type: 'footer',
    label: 'Footer',
    description: 'Links, social icons, legal text',
    icon: PanelBottom,
    Component: Footer,
    defaultProps: {
      firmName: '',
      tagline: '',
      links: [
        { label: 'Privacy', href: '#' },
        { label: 'Terms', href: '#' },
        { label: 'Contact', href: '#' },
      ],
      social: [],
      legal: `© ${new Date().getFullYear()} All rights reserved.`,
    },
    schema: [
      { kind: 'text', key: 'firmName', label: 'Company name' },
      { kind: 'text', key: 'tagline', label: 'Tagline' },
      { kind: 'repeater', key: 'links', label: 'Links', itemLabel: 'Link',
        fields: [
          { kind: 'text', key: 'label', label: 'Label' },
          { kind: 'text', key: 'href', label: 'URL' },
        ],
        defaultItem: { label: 'Link', href: '#' },
      },
      { kind: 'text', key: 'legal', label: 'Legal line' },
    ],
  },
};

export const SECTION_ORDER: SectionType[] = [
  'hero', 'features', 'logo_cloud', 'stats', 'steps',
  'testimonials', 'pricing', 'gallery', 'faq', 'cta',
  'content', 'form', 'footer',
];

export function newSection(type: SectionType) {
  const def = SECTION_REGISTRY[type];
  return {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    visible: true,
    props: JSON.parse(JSON.stringify(def.defaultProps)),
  };
}
