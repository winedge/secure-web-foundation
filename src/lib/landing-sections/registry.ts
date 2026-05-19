import {
  LayoutTemplate, Sparkles, Image as ImageIcon, BarChart3, Quote, HelpCircle,
  Tag, ListOrdered, GalleryHorizontal, Megaphone, FileText, ClipboardList, PanelBottom,
  Film, LayoutGrid, Repeat, History, ArrowLeftRight, Columns3, Users, Timer, Code2, Mail, Minus,
  Navigation, Bell, ToggleLeft, ShieldCheck, Award, MessageSquare, Calendar, PlayCircle,
  Images, ListChecks, AlignJustify, Star as StarIcon, ArrowUpToLine,
} from 'lucide-react';
import type { SectionType, InspectorField } from '@/lib/landing-sections/types';
import { Header } from '@/components/landing-sections/Header';
import { AnnouncementBar } from '@/components/landing-sections/AnnouncementBar';
import { Tabs as TabsBlock } from '@/components/landing-sections/Tabs';
import { Accordion as AccordionBlock } from '@/components/landing-sections/Accordion';
import { PricingToggle } from '@/components/landing-sections/PricingToggle';
import { TrustBadges } from '@/components/landing-sections/TrustBadges';
import { StickyCtaBar } from '@/components/landing-sections/StickyCtaBar';
import { ReviewsWall } from '@/components/landing-sections/ReviewsWall';
import { CaseStudy } from '@/components/landing-sections/CaseStudy';
import { Booking } from '@/components/landing-sections/Booking';
import { ImageSlider } from '@/components/landing-sections/ImageSlider';
import { VideoGallery } from '@/components/landing-sections/VideoGallery';
import { MultiStepForm } from '@/components/landing-sections/MultiStepForm';

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
        { value: 'split-form-right', label: 'Copy left + Form right' },
        { value: 'split-form-left', label: 'Form left + Copy right' },
      ] },
      { kind: 'image', key: 'imageUrl', label: 'Hero image' },
      { kind: 'select', key: 'mediaShape', label: 'Image style', options: [
        { value: 'rounded', label: 'Rounded' },
        { value: 'browser-frame', label: 'Browser frame' },
        { value: 'phone-frame', label: 'Phone frame' },
        { value: 'tilted', label: '3D tilted' },
      ] },
      { kind: 'cta', key: 'primaryCta', label: 'Primary button' },
      { kind: 'cta', key: 'secondaryCta', label: 'Secondary button' },
      { kind: 'text', key: 'formCardTitle', label: 'Form card title (split-form layouts)' },
      { kind: 'text', key: 'formCardSubtitle', label: 'Form card subtitle' },
      { kind: 'select', key: 'formCardStyle', label: 'Form card style', options: [
        { value: 'card', label: 'Card (shadow)' },
        { value: 'glass', label: 'Glass' },
        { value: 'minimal', label: 'Minimal' },
      ] },
      { kind: 'repeater', key: 'badges', label: 'Trust badges', itemLabel: 'Badge',
        fields: [{ kind: 'text', key: 'label', label: 'Label' }],
        defaultItem: { label: 'New badge' },
      },
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
  video_hero: {
    type: 'video_hero', label: 'Video hero', description: 'Full-bleed background video with overlay + CTA', icon: Film, Component: VideoHero,
    defaultProps: {
      videoUrl: '',
      posterUrl: '',
      overlayOpacity: 0.55,
      eyebrow: 'Watch the story',
      headline: 'Built for ambitious teams',
      subheadline: 'Cinematic landing pages without writing a line of code.',
      primaryCta: { label: 'Get started', href: '#lead-form' },
      secondaryCta: { label: 'Watch demo', href: '#' },
    },
    schema: [
      { kind: 'text', key: 'videoUrl', label: 'Video URL (mp4/webm)' },
      { kind: 'image', key: 'posterUrl', label: 'Poster image' },
      { kind: 'number', key: 'overlayOpacity', label: 'Overlay opacity (0-1)', min: 0, max: 1 },
      { kind: 'text', key: 'eyebrow', label: 'Eyebrow' },
      { kind: 'text', key: 'headline', label: 'Headline' },
      { kind: 'textarea', key: 'subheadline', label: 'Sub-headline', rows: 2 },
      { kind: 'cta', key: 'primaryCta', label: 'Primary button' },
      { kind: 'cta', key: 'secondaryCta', label: 'Secondary button' },
    ],
  },
  bento: {
    type: 'bento', label: 'Bento grid', description: 'Apple-style mixed-size feature grid', icon: LayoutGrid, Component: Bento,
    defaultProps: {
      heading: 'Everything in one place',
      intro: 'A modular toolkit that grows with your team.',
      items: [
        { title: 'Lightning fast', description: 'Sub-second loads worldwide.', icon: 'Zap', size: 'lg', accent: true },
        { title: 'Smart AI', description: 'Qualifies leads automatically.', icon: 'Sparkles', size: 'md' },
        { title: 'Secure', description: 'Bank-grade encryption.', icon: 'Shield', size: 'sm' },
        { title: 'Analytics', description: 'Real-time dashboards.', icon: 'BarChart3', size: 'tall' },
        { title: 'Integrations', description: '50+ apps out of the box.', icon: 'Plug', size: 'wide' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'repeater', key: 'items', label: 'Cards', itemLabel: 'Card',
        fields: [
          { kind: 'text', key: 'title', label: 'Title' },
          { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
          { kind: 'text', key: 'icon', label: 'Icon (lucide name)' },
          { kind: 'image', key: 'imageUrl', label: 'Background image' },
          { kind: 'select', key: 'size', label: 'Size', options: [
            { value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large (featured)' }, { value: 'tall', label: 'Tall' }, { value: 'wide', label: 'Wide' },
          ] },
          { kind: 'toggle', key: 'accent', label: 'Use accent gradient' },
        ],
        defaultItem: { title: 'New card', description: '', icon: 'Sparkles', size: 'md' },
      },
    ],
  },
  marquee: {
    type: 'marquee', label: 'Marquee', description: 'Infinite scrolling band of logos or quotes', icon: Repeat, Component: Marquee,
    defaultProps: {
      heading: 'Trusted by teams worldwide',
      speed: 'normal',
      direction: 'left',
      items: [
        { text: '✦ Ship faster' }, { text: '✦ Convert more' }, { text: '✦ Look incredible' },
        { text: '✦ Backed by AI' }, { text: '✦ Zero code' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'select', key: 'speed', label: 'Speed', options: [
        { value: 'slow', label: 'Slow' }, { value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Fast' },
      ] },
      { kind: 'select', key: 'direction', label: 'Direction', options: [
        { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
      ] },
      { kind: 'repeater', key: 'items', label: 'Items', itemLabel: 'Item',
        fields: [
          { kind: 'text', key: 'text', label: 'Text' },
          { kind: 'image', key: 'imageUrl', label: 'Image (optional)' },
        ],
        defaultItem: { text: 'New item' },
      },
    ],
  },
  timeline: {
    type: 'timeline', label: 'Timeline', description: 'Vertical milestone story', icon: History, Component: Timeline,
    defaultProps: {
      heading: 'Our journey',
      intro: 'A few moments that shaped where we are today.',
      items: [
        { date: '2021', title: 'The idea', description: 'Two co-founders, one whiteboard, an espresso machine.' },
        { date: '2022', title: 'First customer', description: 'A scrappy product-market fit moment.' },
        { date: '2023', title: 'Series A', description: 'Backed by world-class operators.' },
        { date: '2026', title: 'AI-native v2', description: 'A reinvention from the ground up.' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'repeater', key: 'items', label: 'Milestones', itemLabel: 'Milestone',
        fields: [
          { kind: 'text', key: 'date', label: 'Date' },
          { kind: 'text', key: 'title', label: 'Title' },
          { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
        ],
        defaultItem: { date: '2026', title: 'New milestone', description: '' },
      },
    ],
  },
  before_after: {
    type: 'before_after', label: 'Before / After', description: 'Drag-to-compare image slider', icon: ArrowLeftRight, Component: BeforeAfter,
    defaultProps: {
      heading: 'See the difference',
      beforeUrl: '',
      afterUrl: '',
      beforeLabel: 'Before',
      afterLabel: 'After',
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'image', key: 'beforeUrl', label: 'Before image' },
      { kind: 'image', key: 'afterUrl', label: 'After image' },
      { kind: 'text', key: 'beforeLabel', label: 'Before label' },
      { kind: 'text', key: 'afterLabel', label: 'After label' },
    ],
  },
  comparison: {
    type: 'comparison', label: 'Comparison table', description: '"Us vs. Them" feature checklist', icon: Columns3, Component: Comparison,
    defaultProps: {
      heading: 'Why choose us',
      intro: 'See how we stack up against the alternatives.',
      usLabel: 'Us',
      themLabel: 'Others',
      rows: [
        { feature: 'AI-powered automation', us: true, them: false },
        { feature: '24/7 support', us: true, them: false },
        { feature: 'No setup fees', us: true, them: true },
        { feature: 'Custom integrations', us: true, them: false },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'text', key: 'usLabel', label: 'Us column label' },
      { kind: 'text', key: 'themLabel', label: 'Them column label' },
      { kind: 'repeater', key: 'rows', label: 'Features', itemLabel: 'Row',
        fields: [
          { kind: 'text', key: 'feature', label: 'Feature' },
          { kind: 'toggle', key: 'us', label: 'We have it' },
          { kind: 'toggle', key: 'them', label: 'They have it' },
        ],
        defaultItem: { feature: 'New feature', us: true, them: false },
      },
    ],
  },
  team: {
    type: 'team', label: 'Team', description: 'Member cards with bios and socials', icon: Users, Component: Team,
    defaultProps: {
      heading: 'Meet the team',
      intro: 'The humans behind the product.',
      columns: 3,
      members: [
        { name: 'Alex Carter', role: 'CEO', bio: 'Ex-Stripe, builds for delight.' },
        { name: 'Priya Singh', role: 'CTO', bio: 'Distributed systems nerd.' },
        { name: 'Marcus Lee', role: 'Head of Design', bio: 'Obsessed with pixels.' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'select', key: 'columns', label: 'Columns', options: [
        { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' },
      ] },
      { kind: 'repeater', key: 'members', label: 'Members', itemLabel: 'Member',
        fields: [
          { kind: 'image', key: 'photoUrl', label: 'Photo' },
          { kind: 'text', key: 'name', label: 'Name' },
          { kind: 'text', key: 'role', label: 'Role' },
          { kind: 'textarea', key: 'bio', label: 'Bio', rows: 2 },
          { kind: 'text', key: 'linkedin', label: 'LinkedIn URL' },
          { kind: 'text', key: 'twitter', label: 'Twitter URL' },
        ],
        defaultItem: { name: 'New person', role: '', bio: '' },
      },
    ],
  },
  countdown: {
    type: 'countdown', label: 'Countdown', description: 'Live timer to a launch / event date', icon: Timer, Component: Countdown,
    defaultProps: {
      heading: 'Launching soon',
      subheading: 'Be among the first to try it.',
      targetIso: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      cta: { label: 'Join the waitlist', href: '#lead-form' },
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'subheading', label: 'Sub-heading', rows: 2 },
      { kind: 'text', key: 'targetIso', label: 'Target date (ISO, e.g. 2026-06-01T12:00:00Z)' },
      { kind: 'cta', key: 'cta', label: 'Button' },
    ],
  },
  embed: {
    type: 'embed', label: 'Video / Embed', description: 'YouTube, Vimeo, Loom or iframe URL', icon: Code2, Component: Embed,
    defaultProps: {
      heading: 'Watch the demo',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      aspect: '16:9',
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'text', key: 'url', label: 'URL' },
      { kind: 'select', key: 'aspect', label: 'Aspect ratio', options: [
        { value: '16:9', label: '16:9' }, { value: '4:3', label: '4:3' }, { value: '1:1', label: '1:1' }, { value: '21:9', label: '21:9 (cinema)' },
      ] },
    ],
  },
  newsletter: {
    type: 'newsletter', label: 'Newsletter', description: 'Inline email capture banner', icon: Mail, Component: Newsletter,
    defaultProps: {
      heading: 'Stay in the loop',
      subheading: 'Monthly product updates. No spam. Unsubscribe anytime.',
      placeholder: 'you@company.com',
      ctaLabel: 'Subscribe',
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'subheading', label: 'Sub-heading', rows: 2 },
      { kind: 'text', key: 'placeholder', label: 'Input placeholder' },
      { kind: 'text', key: 'ctaLabel', label: 'Button label' },
    ],
  },
  divider: {
    type: 'divider', label: 'Shape divider', description: 'Decorative SVG section break', icon: Minus, Component: Divider,
    defaultProps: { shape: 'wave', flip: false },
    schema: [
      { kind: 'select', key: 'shape', label: 'Shape', options: [
        { value: 'wave', label: 'Wave' }, { value: 'slant', label: 'Slant' },
        { value: 'arc', label: 'Arc' }, { value: 'zigzag', label: 'Zigzag' },
      ] },
      { kind: 'text', key: 'color', label: 'Color (hex, optional)' },
      { kind: 'toggle', key: 'flip', label: 'Flip vertically' },
    ],
  },
  header: {
    type: 'header', label: 'Header / Navbar', description: 'Logo, navigation links, and a primary CTA at the top of the page', icon: Navigation, Component: Header,
    defaultProps: {
      logoText: 'Brand', logoUrl: '',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'About', href: '#about' },
        { label: 'Contact', href: '#contact' },
      ],
      primaryCta: { label: 'Get started', href: '#lead-form' },
      secondaryCta: { label: 'Sign in', href: '#' },
      layout: 'logo-left-cta-right', style: 'solid', sticky: true, shrinkOnScroll: true,
    },
    schema: [
      { kind: 'image', key: 'logoUrl', label: 'Logo image' },
      { kind: 'text', key: 'logoText', label: 'Logo text (fallback)' },
      { kind: 'select', key: 'layout', label: 'Layout', options: [
        { value: 'left-nav', label: 'Logo + nav left' },
        { value: 'centered-logo', label: 'Centered logo' },
        { value: 'split', label: 'Split' },
        { value: 'logo-left-cta-right', label: 'Logo left, CTA right' },
        { value: 'minimal', label: 'Minimal (logo + CTA only)' },
      ] },
      { kind: 'select', key: 'style', label: 'Style', options: [
        { value: 'solid', label: 'Solid' },
        { value: 'transparent', label: 'Transparent' },
        { value: 'glass', label: 'Glass (frosted)' },
        { value: 'bordered-bottom', label: 'Bordered bottom' },
        { value: 'floating-pill', label: 'Floating pill' },
      ] },
      { kind: 'toggle', key: 'sticky', label: 'Sticky on scroll' },
      { kind: 'toggle', key: 'shrinkOnScroll', label: 'Shrink on scroll' },
      { kind: 'repeater', key: 'links', label: 'Navigation links', itemLabel: 'Link',
        fields: [{ kind: 'text', key: 'label', label: 'Label' }, { kind: 'text', key: 'href', label: 'URL' }],
        defaultItem: { label: 'Link', href: '#' },
      },
      { kind: 'cta', key: 'primaryCta', label: 'Primary CTA' },
      { kind: 'cta', key: 'secondaryCta', label: 'Secondary CTA' },
    ],
  },
  announcement_bar: {
    type: 'announcement_bar', label: 'Announcement bar', description: 'Slim bar at the very top for promos or news', icon: Bell, Component: AnnouncementBar,
    defaultProps: {
      text: '🎉 Limited time | 20% off all annual plans',
      link: { label: 'Claim now', href: '#pricing' },
      background: '#0f172a', textColor: '#ffffff',
      dismissible: true, countdownIso: '',
    },
    schema: [
      { kind: 'text', key: 'text', label: 'Message' },
      { kind: 'cta', key: 'link', label: 'Link' },
      { kind: 'color', key: 'background', label: 'Background color' },
      { kind: 'color', key: 'textColor', label: 'Text color' },
      { kind: 'toggle', key: 'dismissible', label: 'User can dismiss' },
      { kind: 'text', key: 'countdownIso', label: 'Countdown target (ISO date, optional)' },
    ],
  },
  tabs: {
    type: 'tabs', label: 'Tabs', description: 'Switch between titled panels of content', icon: AlignJustify, Component: TabsBlock,
    defaultProps: {
      heading: 'Built for every team',
      intro: 'Explore the features that matter to you.',
      tabs: [
        { label: 'For Marketers', heading: 'Launch campaigns fast', body: 'Drag and drop pages, A/B test, and ship in hours, not weeks.', imageUrl: '' },
        { label: 'For Sales', heading: 'Convert more leads', body: 'Embedded forms route directly into your CRM with full attribution.', imageUrl: '' },
        { label: 'For Founders', heading: 'Own your funnel', body: 'No more stitching tools together. One platform, one source of truth.', imageUrl: '' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'repeater', key: 'tabs', label: 'Tabs', itemLabel: 'Tab',
        fields: [
          { kind: 'text', key: 'label', label: 'Tab label' },
          { kind: 'text', key: 'heading', label: 'Panel heading' },
          { kind: 'textarea', key: 'body', label: 'Body', rows: 4 },
          { kind: 'image', key: 'imageUrl', label: 'Image (optional)' },
        ],
        defaultItem: { label: 'New tab', body: '' },
      },
    ],
  },
  accordion: {
    type: 'accordion', label: 'Accordion', description: 'Expandable sections for rich content', icon: ListChecks, Component: AccordionBlock,
    defaultProps: {
      heading: 'Everything you should know',
      intro: '',
      allowMultiple: false,
      items: [
        { title: 'Why choose us?', body: 'We combine the speed of a startup with the polish of a Fortune 500.' },
        { title: 'How does pricing work?', body: 'Flat monthly pricing with no per-seat fees. Cancel anytime.' },
        { title: 'Is my data secure?', body: 'AES-256-GCM encryption, SOC 2 controls, and zero-knowledge architecture.' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'toggle', key: 'allowMultiple', label: 'Allow multiple open' },
      { kind: 'repeater', key: 'items', label: 'Items', itemLabel: 'Item',
        fields: [{ kind: 'text', key: 'title', label: 'Title' }, { kind: 'textarea', key: 'body', label: 'Body', rows: 3 }],
        defaultItem: { title: 'New item', body: '' },
      },
    ],
  },
  pricing_toggle: {
    type: 'pricing_toggle', label: 'Pricing (monthly/yearly)', description: 'Pricing tiers with a monthly / yearly billing switch', icon: ToggleLeft, Component: PricingToggle,
    defaultProps: {
      heading: 'Simple, scalable pricing',
      intro: 'Save 20% with annual billing.',
      monthlyLabel: 'Monthly', yearlyLabel: 'Yearly', yearlyDiscountLabel: 'Save 20%',
      plans: [
        { name: 'Starter', monthlyPrice: '$29', yearlyPrice: '$279', description: 'For solo creators', features: ['1 landing page', 'Basic intake form', 'Email support'], cta: { label: 'Start free', href: '#lead-form' } },
        { name: 'Pro', monthlyPrice: '$99', yearlyPrice: '$949', description: 'Most popular', features: ['Unlimited pages', 'AI assistant', 'Priority support', 'Custom branding'], cta: { label: 'Start free trial', href: '#lead-form' }, highlighted: true },
        { name: 'Enterprise', monthlyPrice: 'Custom', yearlyPrice: 'Custom', description: 'For large teams', features: ['Everything in Pro', 'Dedicated CSM', 'SLA & compliance'], cta: { label: 'Contact sales', href: '#contact' } },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'text', key: 'monthlyLabel', label: 'Monthly label' },
      { kind: 'text', key: 'yearlyLabel', label: 'Yearly label' },
      { kind: 'text', key: 'yearlyDiscountLabel', label: 'Yearly discount badge' },
      { kind: 'repeater', key: 'plans', label: 'Plans', itemLabel: 'Plan',
        fields: [
          { kind: 'text', key: 'name', label: 'Name' },
          { kind: 'text', key: 'monthlyPrice', label: 'Monthly price' },
          { kind: 'text', key: 'yearlyPrice', label: 'Yearly price' },
          { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
          { kind: 'textarea', key: 'features', label: 'Features (one per line)', rows: 4 },
          { kind: 'cta', key: 'cta', label: 'Button' },
          { kind: 'toggle', key: 'highlighted', label: 'Highlight as most popular' },
        ],
        defaultItem: { name: 'New plan', monthlyPrice: '$0', yearlyPrice: '$0', features: [], cta: { label: 'Choose', href: '#' } },
      },
    ],
  },
  trust_badges: {
    type: 'trust_badges', label: 'Trust badges', description: 'Compliance, security, and recognition badges', icon: ShieldCheck, Component: TrustBadges,
    defaultProps: {
      heading: 'Trusted & secure',
      layout: 'row',
      items: [
        { label: 'SOC 2 Type II', icon: 'Shield' },
        { label: 'GDPR compliant', icon: 'Lock' },
        { label: 'ISO 27001', icon: 'BadgeCheck' },
        { label: '4.9 / 5 rating', icon: 'Star' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'select', key: 'layout', label: 'Layout', options: [{ value: 'row', label: 'Row' }, { value: 'grid', label: 'Grid' }] },
      { kind: 'repeater', key: 'items', label: 'Badges', itemLabel: 'Badge',
        fields: [
          { kind: 'text', key: 'label', label: 'Label' },
          { kind: 'text', key: 'icon', label: 'Lucide icon (Shield, Lock, Award, BadgeCheck, Star)' },
          { kind: 'image', key: 'imageUrl', label: 'Image (overrides icon)' },
        ],
        defaultItem: { label: 'New badge', icon: 'BadgeCheck' },
      },
    ],
  },
  reviews_wall: {
    type: 'reviews_wall', label: 'Reviews wall', description: 'Aggregated reviews from Google, Trustpilot, and more', icon: StarIcon, Component: ReviewsWall,
    defaultProps: {
      heading: 'What our customers say',
      intro: '',
      minRating: 4,
      showSourceBadges: true,
      items: [
        { source: 'google', author: 'Priya S.', rating: 5, quote: 'Best decision we made this quarter.', date: 'Aug 2025' },
        { source: 'trustpilot', author: 'James R.', rating: 5, quote: 'Setup in minutes, leads within hours.', date: 'Sep 2025' },
        { source: 'google', author: 'Maya K.', rating: 5, quote: 'Doubled our conversions in one month.', date: 'Oct 2025' },
        { source: 'manual', author: 'David T.', rating: 5, quote: 'Their support team is unreal.', date: 'Nov 2025' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'number', key: 'minRating', label: 'Minimum rating to show', min: 1, max: 5 },
      { kind: 'toggle', key: 'showSourceBadges', label: 'Show source badges' },
      { kind: 'repeater', key: 'items', label: 'Reviews', itemLabel: 'Review',
        fields: [
          { kind: 'select', key: 'source', label: 'Source', options: [
            { value: 'google', label: 'Google' }, { value: 'trustpilot', label: 'Trustpilot' },
            { value: 'facebook', label: 'Facebook' }, { value: 'manual', label: 'Manual' },
          ] },
          { kind: 'text', key: 'author', label: 'Author' },
          { kind: 'number', key: 'rating', label: 'Rating (1-5)', min: 1, max: 5 },
          { kind: 'textarea', key: 'quote', label: 'Quote', rows: 2 },
          { kind: 'text', key: 'date', label: 'Date' },
        ],
        defaultItem: { source: 'google', author: '', rating: 5, quote: '' },
      },
    ],
  },
  case_study: {
    type: 'case_study', label: 'Case study spotlight', description: 'Big result number + customer quote', icon: Award, Component: CaseStudy,
    defaultProps: {
      heading: 'Customer story',
      customerName: 'Acme Co.',
      customerLogo: '',
      imageUrl: '',
      resultValue: '3.2x',
      resultLabel: 'increase in qualified leads in 60 days',
      quote: 'It paid for itself in the first week. We have not looked back.',
      quoteAuthor: 'Jamie Chen, Head of Growth',
      cta: { label: 'Read full case study', href: '#' },
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Eyebrow' },
      { kind: 'text', key: 'customerName', label: 'Customer name' },
      { kind: 'image', key: 'customerLogo', label: 'Customer logo' },
      { kind: 'image', key: 'imageUrl', label: 'Side image' },
      { kind: 'text', key: 'resultValue', label: 'Result value (e.g. 3.2x)' },
      { kind: 'text', key: 'resultLabel', label: 'Result label' },
      { kind: 'textarea', key: 'quote', label: 'Quote', rows: 3 },
      { kind: 'text', key: 'quoteAuthor', label: 'Quote author' },
      { kind: 'cta', key: 'cta', label: 'Button' },
    ],
  },
  booking: {
    type: 'booking', label: 'Booking / Calendar', description: 'Embed a Calendly, Cal.com or Google Calendar booking widget', icon: Calendar, Component: Booking,
    defaultProps: {
      heading: 'Book a free consultation',
      intro: 'Pick a time that works for you.',
      provider: 'calendly', url: '', height: 720,
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'select', key: 'provider', label: 'Provider', options: [
        { value: 'calendly', label: 'Calendly' }, { value: 'cal', label: 'Cal.com' },
        { value: 'google', label: 'Google Calendar' }, { value: 'custom', label: 'Custom URL' },
      ] },
      { kind: 'text', key: 'url', label: 'Booking URL' },
      { kind: 'number', key: 'height', label: 'Height (px)', min: 400, max: 1400 },
    ],
  },
  image_slider: {
    type: 'image_slider', label: 'Image slider', description: 'Carousel of images with autoplay, dots, and arrows', icon: Images, Component: ImageSlider,
    defaultProps: {
      heading: '',
      autoplay: true, intervalMs: 4500, showDots: true, showArrows: true,
      images: [{ url: '', caption: 'Slide 1' }, { url: '', caption: 'Slide 2' }],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'toggle', key: 'autoplay', label: 'Autoplay' },
      { kind: 'number', key: 'intervalMs', label: 'Interval (ms)', min: 1500, max: 12000 },
      { kind: 'toggle', key: 'showDots', label: 'Show dots' },
      { kind: 'toggle', key: 'showArrows', label: 'Show arrows' },
      { kind: 'repeater', key: 'images', label: 'Slides', itemLabel: 'Slide',
        fields: [
          { kind: 'image', key: 'url', label: 'Image' },
          { kind: 'text', key: 'caption', label: 'Caption' },
          { kind: 'cta', key: 'cta', label: 'Optional button' },
        ],
        defaultItem: { url: '', caption: '' },
      },
    ],
  },
  video_gallery: {
    type: 'video_gallery', label: 'Video gallery', description: 'Grid of video thumbnails that open in a lightbox', icon: PlayCircle, Component: VideoGallery,
    defaultProps: {
      heading: 'Watch the product in action',
      intro: '',
      videos: [
        { title: 'Product tour', duration: '2:14', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnailUrl: '' },
        { title: 'Customer story', duration: '3:42', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnailUrl: '' },
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'intro', label: 'Intro', rows: 2 },
      { kind: 'repeater', key: 'videos', label: 'Videos', itemLabel: 'Video',
        fields: [
          { kind: 'text', key: 'title', label: 'Title' },
          { kind: 'text', key: 'duration', label: 'Duration (e.g. 2:14)' },
          { kind: 'text', key: 'url', label: 'YouTube / Vimeo / MP4 URL' },
          { kind: 'image', key: 'thumbnailUrl', label: 'Thumbnail' },
        ],
        defaultItem: { url: '', title: '' },
      },
    ],
  },
  multi_step_form: {
    type: 'multi_step_form', label: 'Multi-step form', description: 'Higher-converting multi-step lead capture form', icon: ClipboardList, Component: MultiStepForm,
    defaultProps: {
      heading: 'Get your free estimate',
      description: 'Just a couple of questions | takes under 60 seconds.',
      successMessage: 'Thanks! Our team will be in touch shortly.',
      steps: [
        { title: 'Tell us about your project', fields: [
          { id: 'project_type', label: 'Project type', type: 'select', required: true, options: 'New build, Renovation, Repair, Consultation' },
          { id: 'budget', label: 'Budget range', type: 'select', required: false, options: 'Under $5k, $5k-$25k, $25k-$100k, $100k+' },
        ]},
        { title: 'How can we reach you?', fields: [
          { id: 'name', label: 'Full name', type: 'text', required: true },
          { id: 'email', label: 'Email', type: 'email', required: true },
          { id: 'phone', label: 'Phone', type: 'tel', required: false },
        ]},
      ],
    },
    schema: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'description', label: 'Description', rows: 2 },
      { kind: 'textarea', key: 'successMessage', label: 'Success message', rows: 2 },
      { kind: 'repeater', key: 'steps', label: 'Steps', itemLabel: 'Step',
        fields: [
          { kind: 'text', key: 'title', label: 'Step title' },
          { kind: 'repeater', key: 'fields', label: 'Fields', itemLabel: 'Field',
            fields: [
              { kind: 'text', key: 'id', label: 'Field id' },
              { kind: 'text', key: 'label', label: 'Field label' },
              { kind: 'select', key: 'type', label: 'Type', options: [
                { value: 'text', label: 'Text' }, { value: 'email', label: 'Email' },
                { value: 'tel', label: 'Phone' }, { value: 'textarea', label: 'Long text' },
                { value: 'select', label: 'Dropdown' },
              ] },
              { kind: 'toggle', key: 'required', label: 'Required' },
              { kind: 'text', key: 'options', label: 'Options (comma-separated, for Dropdown)' },
            ],
            defaultItem: { id: 'field_' + Date.now(), label: 'New field', type: 'text' },
          },
        ],
        defaultItem: { title: 'New step', fields: [] },
      },
    ],
  },
  sticky_cta_bar: {
    type: 'sticky_cta_bar', label: 'Sticky CTA bar', description: 'Floating bar that appears as visitors scroll', icon: ArrowUpToLine, Component: StickyCtaBar,
    defaultProps: {
      text: 'Ready to get started?',
      cta: { label: 'Claim your free trial', href: '#lead-form' },
      position: 'bottom', background: '#0f172a', textColor: '#ffffff',
    },
    schema: [
      { kind: 'text', key: 'text', label: 'Message' },
      { kind: 'cta', key: 'cta', label: 'Button' },
      { kind: 'select', key: 'position', label: 'Position', options: [{ value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }] },
      { kind: 'color', key: 'background', label: 'Background color' },
      { kind: 'color', key: 'textColor', label: 'Text color' },
    ],
  },
};

export const SECTION_ORDER: SectionType[] = [
  'header', 'announcement_bar',
  'hero', 'video_hero',
  'features', 'bento', 'tabs',
  'logo_cloud', 'trust_badges', 'marquee',
  'stats', 'case_study', 'steps', 'timeline',
  'testimonials', 'reviews_wall',
  'pricing', 'pricing_toggle', 'comparison',
  'team', 'gallery', 'image_slider', 'video_gallery', 'before_after', 'embed',
  'faq', 'accordion', 'countdown', 'booking',
  'newsletter', 'cta', 'content', 'divider',
  'form', 'multi_step_form', 'sticky_cta_bar', 'footer',
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
