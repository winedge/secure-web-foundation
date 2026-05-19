// Lets users describe a theme tweak in plain English and returns an updated
// theme object the builder can apply directly. No DB writes — pure transform.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GENERATE_TIMEOUT_MS = 22_000;

interface ThemeInput {
  theme_key?: string | null;
  primary_color?: string;
  background_color?: string;
  accent_color?: string;
  heading_text?: string;
  description_text?: string;
  typography?: { heading?: string; body?: string };
  layout_config?: {
    radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    buttonStyle?: 'solid' | 'outline' | 'gradient' | 'pill';
    spacing?: 'compact' | 'normal' | 'airy';
    maxWidth?: 'narrow' | 'normal' | 'wide';
  };
  hero_config?: {
    layout?: 'centered' | 'split' | 'image-left' | 'image-right';
    eyebrow?: string;
    secondaryCta?: string;
  };
}

const asText = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const titleFromPrompt = (prompt: string, product?: string) => {
  const match = prompt.trim().match(/^(.{3,80}?)\s+(?:is|offers|provides|helps|serves)\b/i);
  return (match?.[1] || product || prompt.split(/[.!?]/)[0] || 'Your Business').trim().slice(0, 80);
};

// ============================================================================
// DESIGN DNA | randomized per request so every generated page looks different
// ============================================================================

type Palette = { name: string; mood: string; colors: [string, string, string, string]; dark: boolean };

const PALETTES: Palette[] = [
  { name: 'Midnight Indigo', mood: 'tech sophisticated', colors: ['#0a0a1a', '#141432', '#1e1e5a', '#4f46e5'], dark: true },
  { name: 'Charcoal Ember', mood: 'premium bold', colors: ['#1a1a1a', '#2d2d2d', '#4a4a4a', '#e85d3a'], dark: true },
  { name: 'Noir Gold', mood: 'luxury editorial', colors: ['#0d0d0d', '#1a1a1a', '#c9a84c', '#f0d78c'], dark: true },
  { name: 'Cloud White', mood: 'airy saas', colors: ['#fafbfc', '#e8ecf1', '#94a3b8', '#3b82f6'], dark: false },
  { name: 'Warm Sand', mood: 'welcoming approachable', colors: ['#faf8f5', '#f0ebe3', '#c9b99a', '#8b7355'], dark: false },
  { name: 'Paper Ink', mood: 'swiss editorial', colors: ['#f5f3ee', '#e8e4dd', '#2d2d2d', '#0d0d0d'], dark: false },
  { name: 'Terracotta Sage', mood: 'natural grounded', colors: ['#c4654a', '#e8a87c', '#87a878', '#4a6741'], dark: false },
  { name: 'Ocean Deep', mood: 'calm professional', colors: ['#0c2340', '#1a4a6e', '#2d8a9e', '#5cbdb9'], dark: true },
  { name: 'Electric Coral', mood: 'energetic vibrant', colors: ['#ff6b6b', '#ee5a70', '#c44569', '#574b90'], dark: false },
  { name: 'Neon Mint', mood: 'fresh startup', colors: ['#0d1b2a', '#1b4332', '#2dd4a8', '#73ffb8'], dark: true },
  { name: 'Sunset Blaze', mood: 'warm dynamic', colors: ['#ff6b35', '#f7931e', '#e84393', '#6c5ce7'], dark: false },
  { name: 'Blush Lavender', mood: 'romantic elegant', colors: ['#f8e8ee', '#e8c5d0', '#c9a0dc', '#9b72cf'], dark: false },
  { name: 'Sage Cream', mood: 'wellness serene', colors: ['#f5f0e8', '#dce5d4', '#a8c0a0', '#7d9b76'], dark: false },
  { name: 'Forest Moss', mood: 'organic grounded', colors: ['#1a3c2a', '#2d5a3d', '#5a8a5c', '#a0c49d'], dark: true },
  { name: 'Autumn Harvest', mood: 'rich seasonal', colors: ['#5c2018', '#9b4423', '#d4842a', '#e8b84a'], dark: true },
  { name: 'Brutalist Pop', mood: 'high contrast pop', colors: ['#ffffff', '#0a0a0a', '#ff5722', '#ffeb3b'], dark: false },
  { name: 'Glass Aurora', mood: 'glassmorphism futuristic', colors: ['#1a1a2e', '#16213e', '#4ade80', '#a78bfa'], dark: true },
  { name: 'Navy Trust', mood: 'finance legal trust', colors: ['#0f1b3d', '#1e3a5f', '#3b6fa0', '#e8edf3'], dark: true },
  { name: 'Emerald Prestige', mood: 'luxury authority', colors: ['#064e3b', '#0d7a5f', '#c9a84c', '#f5f0e0'], dark: true },
];

const TYPOGRAPHY = [
  { pair: 'space-grotesk-dm-sans', heading: 'Space Grotesk', body: 'DM Sans', vibe: 'modern tech' },
  { pair: 'instrument-serif-work-sans', heading: 'Instrument Serif', body: 'Work Sans', vibe: 'editorial magazine' },
  { pair: 'cormorant-karla', heading: 'Cormorant Garamond', body: 'Karla', vibe: 'luxury fashion' },
  { pair: 'libre-baskerville-ibm-plex', heading: 'Libre Baskerville', body: 'IBM Plex Sans', vibe: 'law finance' },
  { pair: 'bebas-neue-barlow', heading: 'Bebas Neue', body: 'Barlow', vibe: 'sports events bold' },
  { pair: 'archivo-black-hind', heading: 'Archivo Black', body: 'Hind', vibe: 'news activism' },
  { pair: 'abril-fatface-cabin', heading: 'Abril Fatface', body: 'Cabin', vibe: 'creative portfolio' },
  { pair: 'dm-serif-display-fira-sans', heading: 'DM Serif Display', body: 'Fira Sans', vibe: 'brand storytelling' },
  { pair: 'urbanist-epilogue', heading: 'Urbanist', body: 'Epilogue', vibe: 'architecture real estate' },
  { pair: 'sora-manrope', heading: 'Sora', body: 'Manrope', vibe: 'digital tools' },
  { pair: 'jetbrains-mono-work-sans', heading: 'JetBrains Mono', body: 'Work Sans', vibe: 'developer docs' },
  { pair: 'space-mono-rubik', heading: 'Space Mono', body: 'Rubik', vibe: 'indie gaming' },
];

// heroLayout values must match HeroProps.layout in src/lib/landing-sections/types.ts
const ARCHETYPES = [
  { name: 'Editorial Serif',     radius: 'sm',  buttonStyle: 'outline',  spacing: 'airy',    heroLayout: 'editorial-centered', anim: 'fade' },
  { name: 'Brutalist Mono',      radius: 'sm',  buttonStyle: 'solid',    spacing: 'compact', heroLayout: 'split-left',         anim: 'slide-up' },
  { name: 'Glassy Aurora',       radius: '2xl', buttonStyle: 'gradient', spacing: 'normal',  heroLayout: 'split-form-right',   anim: 'blur-in' },
  { name: 'Swiss Minimal',       radius: 'sm',  buttonStyle: 'solid',    spacing: 'airy',    heroLayout: 'editorial-centered', anim: 'fade' },
  { name: 'Warm Organic',        radius: 'xl',  buttonStyle: 'pill',     spacing: 'normal',  heroLayout: 'split-form-right',   anim: 'slide-up' },
  { name: 'Neo-Noir Luxury',     radius: 'md',  buttonStyle: 'outline',  spacing: 'airy',    heroLayout: 'noir-photo',         anim: 'fade' },
  { name: 'Vibrant Gradient',    radius: 'xl',  buttonStyle: 'gradient', spacing: 'normal',  heroLayout: 'split-form-right',   anim: 'zoom' },
  { name: 'Corporate Trust',     radius: 'md',  buttonStyle: 'solid',    spacing: 'normal',  heroLayout: 'split-form-right',   anim: 'slide-up' },
  { name: 'Playful Pastel',      radius: '2xl', buttonStyle: 'pill',     spacing: 'normal',  heroLayout: 'split-left',         anim: 'zoom' },
  { name: 'Tech Dark-Mode',      radius: 'lg',  buttonStyle: 'gradient', spacing: 'normal',  heroLayout: 'split-form-right',   anim: 'blur-in' },
  { name: 'Magazine Editorial',  radius: 'sm',  buttonStyle: 'outline',  spacing: 'airy',    heroLayout: 'magazine-split',     anim: 'fade' },
  { name: 'Soft Neumorphic',     radius: '2xl', buttonStyle: 'solid',    spacing: 'normal',  heroLayout: 'centered',           anim: 'slide-up' },
  { name: 'High-End Boutique',   radius: 'sm',  buttonStyle: 'outline',  spacing: 'airy',    heroLayout: 'noir-photo',         anim: 'fade' },
  { name: 'Broadsheet Daily',    radius: 'sm',  buttonStyle: 'solid',    spacing: 'airy',    heroLayout: 'magazine-split',     anim: 'fade' },
];

const RECIPES: { name: string; sections: string[] }[] = [
  { name: 'Classic SaaS', sections: ['hero', 'logo_cloud', 'features', 'stats', 'testimonials', 'faq', 'cta', 'form', 'footer'] },
  { name: 'Magazine Story', sections: ['hero', 'content', 'gallery', 'testimonials', 'stats', 'cta', 'form', 'footer'] },
  { name: 'Bento Showcase', sections: ['hero', 'bento', 'logo_cloud', 'reviews_wall', 'pricing', 'faq', 'cta', 'form', 'footer'] },
  { name: 'Minimalist Service', sections: ['hero', 'features', 'testimonials', 'cta', 'form', 'footer'] },
  { name: 'Process-Led', sections: ['hero', 'trust_badges', 'steps', 'features', 'testimonials', 'faq', 'cta', 'form', 'footer'] },
  { name: 'Conversion Sprint', sections: ['hero', 'stats', 'features', 'reviews_wall', 'cta', 'form', 'footer'] },
  { name: 'Heritage Brand', sections: ['hero', 'content', 'timeline', 'gallery', 'testimonials', 'cta', 'form', 'footer'] },
  { name: 'Product Launch', sections: ['hero', 'logo_cloud', 'bento', 'features', 'pricing', 'faq', 'cta', 'form', 'footer'] },
  { name: 'Comparison Pitch', sections: ['hero', 'features', 'comparison', 'testimonials', 'pricing', 'cta', 'form', 'footer'] },
  { name: 'Local Service', sections: ['hero', 'trust_badges', 'gallery', 'features', 'reviews_wall', 'faq', 'cta', 'form', 'footer'] },
];

const pickRand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const biasPalette = (businessType?: string, tone?: string): Palette => {
  const t = `${businessType || ''} ${tone || ''}`.toLowerCase();
  let pool = PALETTES;
  if (/legal|law|finance|bank|insur/.test(t)) pool = PALETTES.filter((p) => /Navy|Noir|Paper|Emerald|Ocean/.test(p.name));
  else if (/medical|health|wellness|clinic|dental/.test(t)) pool = PALETTES.filter((p) => /Sage|Cloud|Ocean|Blush|Sand/.test(p.name));
  else if (/saas|tech|software|developer/.test(t)) pool = PALETTES.filter((p) => /Midnight|Aurora|Neon|Glass/.test(p.name) || p.dark);
  else if (/luxury|premium|boutique|fashion/.test(t)) pool = PALETTES.filter((p) => /Noir|Emerald|Charcoal|Blush/.test(p.name));
  else if (/creative|art|design|agency/.test(t)) pool = PALETTES.filter((p) => /Coral|Sunset|Aurora|Brutalist|Lavender/.test(p.name));
  else if (/education|nonprofit|community/.test(t)) pool = PALETTES.filter((p) => /Sand|Sage|Cream|Cloud|Terracotta/.test(p.name));
  else if (/real.?estate|property/.test(t)) pool = PALETTES.filter((p) => /Sand|Navy|Sage|Cloud|Paper/.test(p.name));
  else if (/restaurant|food|hospitality/.test(t)) pool = PALETTES.filter((p) => /Terracotta|Sunset|Autumn|Sand|Coral/.test(p.name));
  return pickRand(pool.length ? pool : PALETTES);
};

const biasTypography = (businessType?: string) => {
  const t = (businessType || '').toLowerCase();
  let pool = TYPOGRAPHY;
  if (/legal|finance|law|bank/.test(t)) pool = TYPOGRAPHY.filter((x) => /baskerville|cormorant|instrument|urbanist/.test(x.pair));
  else if (/saas|tech|developer/.test(t)) pool = TYPOGRAPHY.filter((x) => /space-grotesk|sora|jetbrains|urbanist/.test(x.pair));
  else if (/luxury|fashion|boutique/.test(t)) pool = TYPOGRAPHY.filter((x) => /cormorant|instrument|abril|dm-serif/.test(x.pair));
  else if (/creative|agency|portfolio/.test(t)) pool = TYPOGRAPHY.filter((x) => /abril|bebas|archivo|space-mono/.test(x.pair));
  else if (/medical|wellness|nonprofit/.test(t)) pool = TYPOGRAPHY.filter((x) => /urbanist|sora|dm-serif|instrument/.test(x.pair));
  return pickRand(pool.length ? pool : TYPOGRAPHY);
};

const recentDna: string[] = [];
const buildDna = (businessType?: string, tone?: string) => {
  let chosen: any = null;
  for (let i = 0; i < 4; i++) {
    const palette = biasPalette(businessType, tone);
    const typography = biasTypography(businessType);
    const archetype = pickRand(ARCHETYPES);
    const recipe = pickRand(RECIPES);
    const density = pickRand(['compact-editorial', 'airy-luxury', 'dense-marketing', 'balanced']);
    const sig = `${palette.name}|${typography.pair}|${archetype.name}|${recipe.name}|${density}`;
    chosen = { palette, typography, archetype, recipe, density, seed: crypto.randomUUID(), sig };
    if (!recentDna.includes(sig)) break;
  }
  recentDna.push(chosen.sig);
  if (recentDna.length > 24) recentDna.shift();
  return chosen;
};

const buildFallbackPage = ({ prompt, audience, tone, businessType, product, benefits, offer, cta }: {
  prompt: string; audience?: string; tone?: string; businessType?: string; product?: string; benefits?: string[] | string; offer?: string; cta?: string;
}) => {
  const benefitList = (Array.isArray(benefits) ? benefits : String(benefits || '').split('\n'))
    .map((item) => item.trim()).filter(Boolean).slice(0, 6);
  const productName = asText(product, titleFromPrompt(prompt));
  const brandName = titleFromPrompt(prompt, productName);
  const ctaLabel = asText(cta, businessType === 'education' ? 'Book a Visit' : 'Get Started');
  const target = asText(audience, 'customers ready to take the next step');
  const incentive = asText(offer, 'Book a free consultation today');
  const benefitsToUse = benefitList.length ? benefitList : [
    `Personalized ${productName.toLowerCase()} guidance`,
    'Clear next steps from a trusted team',
    'Fast response after every inquiry',
    'Simple online booking and follow-up',
  ];
  const dna = buildDna(businessType, tone);
  const [c1, c2, c3, c4] = dna.palette.colors;

  const section = (type: string, props: Record<string, unknown>, background?: Record<string, unknown>) => ({
    id: crypto.randomUUID(), type, visible: true, props, background,
    animation: { entrance: dna.archetype.anim, trigger: 'on-scroll', duration: 600, delay: 0, easing: 'ease' },
  });

  const bgGradient = { kind: 'gradient', gradient: { type: 'linear', angle: 135, stops: [{ color: c1, pos: 0 }, { color: c4, pos: 100 }] } };
  const bgMesh = { kind: 'mesh', mesh: { base: c1, grain: true, blobs: [{ color: c3, x: 18, y: 25, size: 52 }, { color: c4, x: 82, y: 65, size: 50 }] } };
  const bgSolid = (c: string) => ({ kind: 'solid', color: c });

  const baseSections = dna.recipe.sections.map((kind: string, idx: number) => {
    switch (kind) {
      case 'hero': return section('hero', {
        eyebrow: incentive, headline: `${productName} designed for ${target}`,
        subheadline: `${brandName} turns interest into action with warm guidance, clear benefits, and a simple path to ${ctaLabel.toLowerCase()}.`,
        primaryCta: { label: ctaLabel, href: '#lead-form' }, secondaryCta: { label: 'Explore benefits', href: '#features' },
        layout: dna.archetype.heroLayout, align: dna.archetype.heroLayout === 'centered' ? 'center' : 'left',
        formCardTitle: ctaLabel, formCardSubtitle: 'Share your details and the team will follow up shortly.', formCardStyle: 'card',
        rating: { stars: 5, count: 200, label: 'happy customers' },
        badges: [{ label: 'Personal attention' }, { label: 'Trusted team' }, { label: 'Easy inquiry' }], mediaShape: 'rounded',
      }, bgMesh);
      case 'trust_badges': return section('trust_badges', { heading: 'Why people choose us', layout: 'row',
        items: [{ label: 'Experienced team', icon: 'Award' }, { label: 'Safe process', icon: 'ShieldCheck' }, { label: 'Responsive support', icon: 'MessageSquare' }, { label: 'Easy scheduling', icon: 'Calendar' }] });
      case 'features': return section('features', { heading: `A better way to choose ${productName}`,
        intro: `Built around ${target}, with a ${asText(tone, 'clear, confident')} experience from first click to follow-up.`,
        columns: 3, items: benefitsToUse.map((benefit, i) => ({ icon: ['Sparkles', 'Shield', 'Heart', 'Check', 'Star', 'Zap'][i] || 'Check', title: benefit, description: `A practical advantage that helps visitors feel confident about ${brandName}.` })) });
      case 'bento': return section('bento', { heading: `Inside ${productName}`,
        items: benefitsToUse.slice(0, 5).map((b, i) => ({ title: b, description: 'A reason to choose us.', size: i === 0 ? 'lg' : i % 2 === 0 ? 'md' : 'sm' })) });
      case 'logo_cloud': return section('logo_cloud', { heading: 'Trusted by teams like yours',
        logos: ['google', 'shopify', 'stripe', 'notion', 'figma', 'linear'].map((b) => ({ src: `https://logo.clearbit.com/${b}.com`, alt: b })) });
      case 'stats': return section('stats', { heading: 'Confidence at a glance',
        items: [{ value: '24', suffix: 'hr', label: 'Average response time' }, { value: '5', suffix: '/5', label: 'Care-focused experience' }, { value: '100', suffix: '%', label: 'Simple online inquiry' }, { value: '1', suffix: ':1', label: 'Personalized guidance' }] }, bgSolid(c1));
      case 'testimonials': return section('testimonials', { heading: 'What people say', layout: 'grid',
        items: [
          { quote: `The process felt clear and reassuring. ${brandName} made the next step easy.`, author: 'Priya S.', role: 'Client', rating: 5 },
          { quote: 'Responsive team, helpful answers, and confidence to move forward.', author: 'Rahul M.', role: 'Customer', rating: 5 },
          { quote: 'We appreciated the warm follow-up after submitting the form.', author: 'Anika R.', role: 'Customer', rating: 5 },
        ] });
      case 'reviews_wall': return section('reviews_wall', { heading: 'Recent reviews', minRating: 4, showSourceBadges: true,
        items: Array.from({ length: 6 }).map((_, i) => ({ source: i % 2 ? 'google' : 'trustpilot', author: ['Ava', 'Liam', 'Noa', 'Eli', 'Mia', 'Zoe'][i] + ' R.', rating: 5, quote: 'Exceptional service from start to finish.', date: '2025-09-01' })) });
      case 'faq': return section('faq', { heading: 'Frequently asked questions',
        items: [
          { question: `How do I ${ctaLabel.toLowerCase()}?`, answer: 'Use the form on this page and the team will contact you.' },
          { question: 'What happens after I submit?', answer: 'Your inquiry is reviewed and someone follows up with details and next steps.' },
          { question: 'Is there any obligation?', answer: 'No. The first step is a simple conversation so you can decide with confidence.' },
          { question: 'Who is this best for?', answer: `${target} looking for a clear, trustworthy path forward.` },
        ] });
      case 'pricing': return section('pricing', { heading: 'Simple, transparent pricing', plans: [
        { name: 'Starter', price: '$0', period: '/mo', features: ['Free consult', 'Email support', 'No commitment', 'Cancel anytime', 'Get started today'], cta: { label: ctaLabel, href: '#lead-form' } },
        { name: 'Pro', price: '$49', period: '/mo', features: ['Everything in Starter', 'Priority response', 'Dedicated specialist', 'Advanced tooling', 'Monthly review'], cta: { label: 'Start Pro', href: '#lead-form' }, highlighted: true },
        { name: 'Scale', price: 'Custom', period: '', features: ['All Pro features', 'Custom SLA', 'Account team', 'Quarterly strategy', 'Volume pricing'], cta: { label: 'Talk to sales', href: '#lead-form' } },
      ] });
      case 'steps': return section('steps', { heading: 'How it works', items: [
        { title: 'Tell us about you', description: 'Share a few details so we can prepare.', icon: 'MessageSquare' },
        { title: 'Get a clear plan', description: 'We outline next steps and answer questions.', icon: 'ClipboardList' },
        { title: 'Move forward together', description: 'Start with confidence and full support.', icon: 'Rocket' },
      ] });
      case 'timeline': return section('timeline', { heading: 'Our story', items: [
        { year: '2019', title: 'Founded', description: 'Started with a simple goal: help people choose with clarity.' },
        { year: '2021', title: 'Team grew', description: 'Specialists joined to deepen the experience.' },
        { year: '2023', title: 'Recognized', description: 'Voted a top local choice by clients we serve.' },
        { year: '2025', title: 'Today', description: `Helping ${target} every week.` },
      ] });
      case 'gallery': return section('gallery', { heading: 'See the work', layout: 'grid',
        images: Array.from({ length: 6 }).map((_, i) => ({ url: `https://picsum.photos/seed/${dna.seed}-${i}/600/400`, caption: '' })) });
      case 'comparison': return section('comparison', { heading: `Why ${brandName}`, items: [
        { label: 'Response time', us: 'Within 24 hours', them: 'Days, sometimes a week' },
        { label: 'Personal attention', us: 'Dedicated specialist', them: 'Rotating agents' },
        { label: 'Pricing', us: 'Clear, upfront', them: 'Surprise fees' },
      ] });
      case 'content': return section('content', { heading: `About ${brandName}`,
        body: `${brandName} exists to make ${productName.toLowerCase()} feel less intimidating and more human. We listen first, then guide. Every conversation starts with your goals and ends with a clear plan you can act on.` });
      case 'cta': return section('cta', { heading: incentive,
        subheading: `Take the next step with ${brandName}. Submit your details and get a prompt, helpful response.`,
        primaryCta: { label: ctaLabel, href: '#lead-form' }, secondaryCta: { label: 'View FAQs', href: '#' }, style: 'bold',
      }, bgGradient);
      case 'form': return section('form', { heading: ctaLabel, description: 'Tell us how to reach you and what you need help with.', sticky: false });
      case 'footer': return section('footer', { layout: 'columns', firmName: brandName,
        tagline: `${productName} with a clear, caring, and conversion-focused experience.`,
        links: [{ label: 'Benefits', href: '#features' }, { label: 'Contact', href: '#lead-form' }],
        columns: [{ heading: 'Explore', links: [{ label: 'Benefits', href: '#features' }, { label: 'FAQs', href: '#' }, { label: 'Contact', href: '#lead-form' }] }],
        social: [], legal: `© ${new Date().getFullYear()} ${brandName}. All rights reserved.` });
      default: return section('content', { heading: brandName, body: prompt });
    }
  });

  return {
    source: 'fallback',
    designDna: { palette: dna.palette.name, typography: dna.typography.pair, archetype: dna.archetype.name, recipe: dna.recipe.name },
    summary: `Generated a ${dna.archetype.name} layout with the ${dna.palette.name} palette and ${dna.recipe.name} section flow.`,
    sections: baseSections,
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI key missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as any;

    // Generate mode | build a full landing page from a single prompt
    if (body?.mode === 'generate') {
      const { prompt, audience, tone, businessType, theme, product, benefits, offer, cta } = body as {
        prompt: string; audience?: string; tone?: string; businessType?: string; theme?: any;
        product?: string; benefits?: string[] | string; offer?: string; cta?: string;
      };
      if (!prompt || prompt.trim().length < 5) {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const benefitsList = Array.isArray(benefits)
        ? benefits.filter(Boolean).map((b) => `- ${b}`).join('\n')
        : (typeof benefits === 'string' && benefits.trim() ? benefits.trim() : '');

      // === Generate a UNIQUE Design DNA for THIS request ===
      const dna = buildDna(businessType, tone);
      const [c1, c2, c3, c4] = dna.palette.colors;
      const dnaBlock = `DESIGN DNA (you MUST honor every value below | do NOT default to dark navy + emerald unless the palette explicitly says so):
- STYLE ARCHETYPE: ${dna.archetype.name} | radius=${dna.archetype.radius}, buttonStyle=${dna.archetype.buttonStyle}, spacing=${dna.archetype.spacing}, density=${dna.density}
- PALETTE: ${dna.palette.name} (${dna.palette.mood}) | use ONLY these hex values for backgrounds, gradients, accents, and CTA fills:
    bg1=${c1}  bg2=${c2}  accent=${c3}  primary=${c4}  (palette mode: ${dna.palette.dark ? 'dark' : 'light'})
- TYPOGRAPHY: ${dna.typography.heading} headings + ${dna.typography.body} body | vibe="${dna.typography.vibe}"
- HERO LAYOUT: ${dna.archetype.heroLayout}
- ENTRANCE ANIMATION (default): ${dna.archetype.anim}
- SEED: ${dna.seed} (use this to ensure uniqueness | do NOT reuse copy from previous generations)

SECTION RECIPE (use EXACTLY this section flow in this order | do NOT substitute or skip):
${dna.recipe.sections.map((s: string, i: number) => `  ${i + 1}. ${s}`).join('\n')}

VARIETY RULES:
- Use at least 3 different background kinds across the page (mix solid / gradient / mesh / image-overlay).
- No two adjacent sections may share the same background kind.
- Every hero/cta/stats section MUST have a non-trivial background using the palette hex values above.
- Generate hero, cta, stats backgrounds first using palette colors; intermediate sections may use solid bg2 or undefined.

You are a senior conversion copywriter + landing-page designer. You MUST generate a COMPLETE, ready-to-publish landing page by calling the generate_page function. Refusing or returning empty props is NOT allowed | if information is missing, you confidently invent plausible, on-brand content based on the business type and audience.

OUTPUT CONTRACT (call generate_page exactly once):
- sections: follow the SECTION RECIPE above exactly. Each section: { id (uuid), type, visible:true, props (FULLY POPULATED per the schema below), animation (optional), background (optional) }.
`;
      const sys = `${dnaBlock}
PROPS SCHEMAS (always fill every listed field with real, specific copy | never leave arrays empty):
- hero: { eyebrow, headline (8-14 words, names the product), subheadline (1-2 sentences, includes offer), primaryCta:{label,href:"#lead-form"}, secondaryCta:{label,href:"#features"}, layout:"${dna.archetype.heroLayout}" (ALLOWED values: "centered" | "split-left" | "split-right" | "image-bg" | "split-form-right" | "split-form-left" | "editorial-centered" | "noir-photo" | "magazine-split"; you MUST keep the DNA value unless it makes no sense for the brief), align:"${dna.archetype.heroLayout === 'centered' || dna.archetype.heroLayout === 'editorial-centered' ? 'center' : 'left'}", rating:{stars:5,count:200,label:"on Google"}, badges:[{label}], imageUrl (REQUIRED for noir-photo and image-bg | use a real Unsplash URL https://images.unsplash.com/photo-... that matches the business), mediaShape:"rounded", formCardTitle, formCardSubtitle, formCardStyle:"card" }
  HERO LAYOUT GUIDE:
    * "editorial-centered" = huge serif headline centered, thin rule lines, minimal CTAs | pair with Editorial/Swiss/Paper palettes.
    * "noir-photo"         = full-bleed photo hero with dark scrim and gold/cream accents | pair with Noir/Charcoal/Forest palettes and ALWAYS set imageUrl.
    * "magazine-split"     = 60/40 split, oversized "№01" numeral on the right, tag chips | pair with Magazine/Editorial/Brutalist palettes.
    * "split-form-right"   = SaaS-style lead form on the right | use formCardTitle + formCardStyle:"glass" when palette.dark.
- features: { heading, intro, columns:3, items: 6 objects [{icon:"Sparkles"|"Shield"|"Zap"|"Check"|"Star"|"Heart",title,description}] }
- bento: { heading, items: 4-6 objects [{title,description,size:"sm"|"md"|"lg"}] }
- logo_cloud: { heading:"Trusted by", logos:[6 objects {src:"https://logo.clearbit.com/{realbrand}.com",alt}] }
- trust_badges: { heading, layout:"row", items:[4-6 {label,icon}] }
- stats: { heading, items:[4 {value:"98%"|"$50M"|"10k+",label,suffix?}] }
- testimonials: { heading, layout:"grid", items:[3 {quote (2 sentences, specific outcome),author,role,rating:5,avatar:"https://i.pravatar.cc/120?img={1-70}"}] }
- reviews_wall: { heading, intro, minRating:4, showSourceBadges:true, items:[6 {source:"google"|"trustpilot",author,rating:5,quote,date:"2025-..."}] }
- faq: { heading, items:[5-7 {question,answer}] }
- pricing: { heading, plans:[3 {name,price,period:"/mo",features:[5 strings],cta:{label,href},highlighted?}] }
- steps: { heading, items:[3-4 {title,description,icon?}] }
- timeline: { heading, items:[4 {year:"2021",title,description}] }
- gallery: { heading, layout:"grid", images:[6 {url,caption}] }
- comparison: { heading, items:[3-5 {label,us,them}] }
- cta: { heading (urgency + product), subheading (offer), primaryCta:{label,href:"#lead-form"}, secondaryCta?:{label,href}, style:"bold" }
- newsletter: { heading, subheading, placeholder:"you@work.com", cta:"Subscribe" }
- form: { heading, description, sticky:false }
- footer: { layout:"columns", firmName, tagline, links:[{label,href:"#"}], columns:[{heading,links:[{label,href:"#"}]}], social:[], legal }
- content: { heading, body (1-2 paragraphs of real copy) }
- divider: { kind:"wave"|"angle"|"curve" }

ANIMATIONS (use the DNA default entrance "${dna.archetype.anim}" for most sections, vary delay between 0-200):
{ entrance:"slide-up"|"fade"|"zoom"|"blur-in", trigger:"on-scroll", duration:600, delay:0, easing:"ease" }

BACKGROUNDS (use the PALETTE hex values ${c1}, ${c2}, ${c3}, ${c4} | NEVER use #0F172A/#10B981/#3B82F6 unless they are in this palette):
- gradient: { kind:"gradient", gradient:{ type:"linear", angle:135, stops:[{color:"${c1}",pos:0},{color:"${c4}",pos:100}] } }
- mesh: { kind:"mesh", mesh:{ base:"${c1}", blobs:[{color:"${c3}",x:20,y:30,size:60},{color:"${c4}",x:75,y:65,size:55}], grain:true } }
- solid: { kind:"solid", color:"${c2}" }

HARD ADHERENCE TO BRIEF:
- PRODUCT/SERVICE is the literal thing being sold | name it explicitly in the hero headline and at least 3 feature titles.
- TARGET CUSTOMER is the only audience to address | mirror their language and pain points.
- KEY BENEFITS must each appear as a feature card or stat. Do not contradict them.
- OFFER must appear in hero subheadline AND the cta section.
- PRIMARY CTA LABEL must be used verbatim on every primary CTA and form submit.

Write specific, benefit-driven, conversion-grade copy. No lorem ipsum. No apologies. No empty arrays. No placeholder text. Call generate_page now.`;
      const user = `BUSINESS BRIEF:
${prompt}

PRODUCT / SERVICE: ${product || '(infer from brief, then name it explicitly)'}
TARGET CUSTOMER: ${audience || '(infer from brief)'}
KEY BENEFITS:
${benefitsList || '(infer 3-5 strong benefits from brief)'}
OFFER / INCENTIVE: ${offer || '(invent a compelling first-action offer e.g. free consult, 14-day trial, money-back guarantee)'}
PRIMARY CTA LABEL: ${cta || '(choose a short action verb phrase, max 3 words)'}
TONE: ${tone || 'confident, friendly'}
BUSINESS TYPE: ${businessType || 'service business'}

THEME CONTEXT (informational only | DESIGN DNA above overrides): ${JSON.stringify(theme || {})}

Generate the full landing page now using the DESIGN DNA and SECTION RECIPE above. Every section MUST have fully populated props per the schema. Do not refuse.`;

      const callModel = async (model: string, timeoutMs = AI_GENERATE_TIMEOUT_MS) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              model,
              max_tokens: 6000,
              messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
              tools: [{
              type: 'function',
              function: {
                name: 'generate_page',
                description: 'Return the generated full landing page sections with fully populated props.',
                parameters: {
                  type: 'object',
                  properties: {
                    sections: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          type: { type: 'string' },
                          visible: { type: 'boolean' },
                          props: { type: 'object', additionalProperties: true },
                          animation: { type: 'object', additionalProperties: true },
                          background: { type: 'object', additionalProperties: true },
                        },
                        required: ['id', 'type', 'visible', 'props'],
                      },
                    },
                    summary: { type: 'string' },
                  },
                  required: ['sections'],
                },
              },
            }],
              tool_choice: { type: 'function', function: { name: 'generate_page' } },
            }),
          });
        } finally {
          clearTimeout(timeoutId);
        }
      };

      const isPopulated = (s: any) => s && s.props && typeof s.props === 'object' && Object.keys(s.props).length >= 1;
      const pageOk = (sections: any[]) => Array.isArray(sections) && sections.length >= 4 && sections.filter(isPopulated).length / sections.length >= 0.7;

      let resp: Response;
      try {
        resp = await callModel('google/gemini-3-flash-preview');
        if (!resp.ok && (resp.status === 429 || resp.status === 503 || resp.status === 504)) {
          resp = await callModel('google/gemini-2.5-flash', 12_000);
        }
      } catch (e) {
        console.warn('landing-theme-ai generate timeout, using fallback page:', e);
        return new Response(JSON.stringify(buildFallbackPage({ prompt, audience, tone, businessType, product, benefits, offer, cta })), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!resp.ok) {
        console.warn('landing-theme-ai gateway returned non-ok, using fallback page:', resp.status, await resp.text());
        return new Response(JSON.stringify(buildFallbackPage({ prompt, audience, tone, businessType, product, benefits, offer, cta })), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await resp.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let args: any = {};
      try { args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : {}; } catch { args = {}; }

      // Retry once with stricter model if the model returned empty/garbage props
      if (!pageOk(args?.sections)) {
        const retry = await callModel('openai/gpt-5-mini');
        if (retry.ok) {
          const d2 = await retry.json();
          const tc2 = d2.choices?.[0]?.message?.tool_calls?.[0];
          try {
            const a2 = tc2?.function?.arguments ? JSON.parse(tc2.function.arguments) : {};
            if (pageOk(a2?.sections)) args = a2;
          } catch { /* keep first */ }
        }
      }

      if (!pageOk(args?.sections)) {
        return new Response(JSON.stringify(buildFallbackPage({ prompt, audience, tone, businessType, product, benefits, offer, cta })), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      args.sections = args.sections.map((s: any) => ({
        ...s,
        id: s.id || crypto.randomUUID(),
        visible: s.visible !== false,
        props: s.props || {},
      }));
      args.designDna = {
        palette: dna.palette.name,
        typography: dna.typography.pair,
        archetype: dna.archetype.name,
        recipe: dna.recipe.name,
        density: dna.density,
      };
      if (!args.summary) {
        args.summary = `${dna.archetype.name} layout with the ${dna.palette.name} palette and ${dna.recipe.name} section flow.`;
      }
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // Sections mode | rewrite/reorder landing-page section blocks

    if (body?.mode === 'sections') {
      const { prompt, sections } = body as { prompt: string; sections: any[] };
      if (!prompt || prompt.trim().length < 3) {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const sys = `You are a landing-page editor. You receive the current ordered list of section blocks for a landing page and an instruction in plain English. Return an UPDATED sections array (full replacement) in the same shape: [{id, type, visible, props}]. Allowed types: hero, features, logo_cloud, stats, testimonials, faq, pricing, steps, gallery, cta, content, form, footer. Preserve existing ids when keeping a section. Generate new uuid-like ids for new sections. Keep edits minimal and on-instruction. Return STRICT JSON.`;
      const user = `CURRENT SECTIONS:\n${JSON.stringify(sections ?? [], null, 2)}\n\nINSTRUCTION:\n${prompt}\n\nReturn the updated sections array.`;
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
          tools: [{
            type: 'function',
            function: {
              name: 'update_sections',
              description: 'Return the updated sections array',
              parameters: {
                type: 'object',
                properties: {
                  sections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        type: { type: 'string' },
                        visible: { type: 'boolean' },
                        props: { type: 'object', additionalProperties: true },
                      },
                      required: ['id', 'type', 'visible', 'props'],
                    },
                  },
                  explanation: { type: 'string' },
                },
                required: ['sections'],
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'update_sections' } },
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        return new Response(JSON.stringify({ error: 'AI gateway error', detail: text }), {
          status: resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await resp.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Copy mode | rewrite headline/subheading/description/CTA for a single section.
    // Accepts: { mode:'copy', section:{type, props}, action:'generate'|'refine', tone?, length?, goal?, brand?, instruction? }
    // Returns: { props: <patched props> }
    if (body?.mode === 'copy') {
      const { section, action, tone, length, goal, brand, instruction } = body as {
        section: { type: string; props: Record<string, any> };
        action?: 'generate' | 'refine';
        tone?: string; length?: 'short' | 'medium' | 'long'; goal?: string;
        brand?: { name?: string; description?: string; primary_color?: string; accent_color?: string };
        instruction?: string;
      };
      if (!section || !section.type) {
        return new Response(JSON.stringify({ error: 'section is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const copyKeys = [
        'eyebrow', 'headline', 'heading', 'subheading', 'subheadline', 'description', 'body',
        'announcement', 'message', 'label', 'cta', 'ctaLabel', 'secondaryCta', 'secondaryCtaLabel',
      ];
      const presentCopy: Record<string, any> = {};
      for (const k of copyKeys) if (k in (section.props || {})) presentCopy[k] = section.props[k];
      // also detect cta object {label, href}
      const ctaObj = section.props?.cta && typeof section.props.cta === 'object' && 'label' in section.props.cta
        ? section.props.cta : null;
      if (ctaObj) presentCopy['cta.label'] = ctaObj.label;

      const lengthHint = length === 'short' ? '<= 6 words headlines, 1 sentence descriptions'
        : length === 'long' ? 'punchy headline + 2-3 sentence description'
        : 'concise headline + 1-2 sentence description';

      const sys = `You are a senior conversion copywriter for landing pages. ${action === 'refine' ? 'Refine' : 'Generate'} copy for a single "${section.type}" section. Match the brand voice, drive the goal, and stay on-message.
Rules:
- Headlines: benefit-led, specific, no fluff, sentence case.
- Subheadings: one short value-prop sentence.
- Descriptions: ${lengthHint}. Plain language, customer-centric.
- CTA labels: 2-4 words, action verb first (e.g., "Get free quote", "Start trial").
- Keep formatting plain text. No markdown, no emoji unless brand voice demands it.
- Only output keys that already exist in the current props (do not invent new fields).`;

      const user = `BRAND:\n${JSON.stringify(brand || {}, null, 2)}
SECTION TYPE: ${section.type}
TONE: ${tone || 'confident, trustworthy'}
GOAL: ${goal || 'maximize conversions'}
${instruction ? `EXTRA INSTRUCTION: ${instruction}\n` : ''}
CURRENT COPY (only rewrite these keys):
${JSON.stringify(presentCopy, null, 2)}

Return the updated copy as a flat JSON object using the SAME keys. For "cta.label", return it as { "cta": { "label": "..." } }.`;

      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
          tools: [{
            type: 'function',
            function: {
              name: 'apply_copy',
              description: 'Return the rewritten copy fields for this section.',
              parameters: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  eyebrow: { type: 'string' },
                  headline: { type: 'string' },
                  heading: { type: 'string' },
                  subheading: { type: 'string' },
                  subheadline: { type: 'string' },
                  description: { type: 'string' },
                  body: { type: 'string' },
                  announcement: { type: 'string' },
                  message: { type: 'string' },
                  label: { type: 'string' },
                  ctaLabel: { type: 'string' },
                  secondaryCta: { type: 'string' },
                  secondaryCtaLabel: { type: 'string' },
                  cta: {
                    type: 'object',
                    properties: { label: { type: 'string' }, href: { type: 'string' } },
                  },
                },
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'apply_copy' } },
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        return new Response(JSON.stringify({ error: 'AI gateway error', detail: text }), {
          status: resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await resp.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
      // Merge only into keys that already existed (or cta object)
      const nextProps: Record<string, any> = { ...(section.props || {}) };
      for (const k of Object.keys(args)) {
        if (k === 'cta' && ctaObj) {
          nextProps.cta = { ...ctaObj, ...args.cta };
        } else if (k in nextProps) {
          nextProps[k] = args[k];
        }
      }
      return new Response(JSON.stringify({ props: nextProps, raw: args }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { instruction, current } = body as { instruction: string; current: ThemeInput };

    if (!instruction || instruction.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'instruction is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a UI theme designer for landing pages.
Given the user's current landing page theme and an instruction in plain English, return an UPDATED theme.
Only change what the instruction implies; keep everything else identical.
Colors must be valid HEX (#rrggbb). Use tasteful pairings with strong contrast.
Available heading/body fonts: Inter, DM Sans, Space Grotesk, Manrope, Outfit, Lora, Playfair Display.
Return STRICT JSON only.`;

    const userPrompt = `CURRENT THEME:\n${JSON.stringify(current, null, 2)}\n\nINSTRUCTION:\n${instruction}\n\nReturn the updated theme JSON.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'apply_theme',
              description: 'Apply an updated theme to the landing page',
              parameters: {
                type: 'object',
                properties: {
                  primary_color: { type: 'string' },
                  background_color: { type: 'string' },
                  accent_color: { type: 'string' },
                  heading_text: { type: 'string' },
                  description_text: { type: 'string' },
                  typography: {
                    type: 'object',
                    properties: {
                      heading: { type: 'string' },
                      body: { type: 'string' },
                    },
                  },
                  layout_config: {
                    type: 'object',
                    properties: {
                      radius: { type: 'string', enum: ['sm', 'md', 'lg', 'xl', '2xl'] },
                      buttonStyle: { type: 'string', enum: ['solid', 'outline', 'gradient', 'pill'] },
                      spacing: { type: 'string', enum: ['compact', 'normal', 'airy'] },
                      maxWidth: { type: 'string', enum: ['narrow', 'normal', 'wide'] },
                    },
                  },
                  hero_config: {
                    type: 'object',
                    properties: {
                      layout: { type: 'string', enum: ['centered', 'split', 'image-left', 'image-right'] },
                      eyebrow: { type: 'string' },
                      secondaryCta: { type: 'string' },
                    },
                  },
                  explanation: { type: 'string', description: 'One-sentence summary of what changed' },
                },
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'apply_theme' } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: text }), {
        status: response.status === 429 ? 429 : response.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};

    return new Response(JSON.stringify({ updated: args }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
