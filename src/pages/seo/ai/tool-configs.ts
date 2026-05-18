import {
  Eye, Sparkles, Network, MessageSquare, Link2, TrendingDown,
  Swords, ShieldCheck, Bot, LucideIcon,
} from 'lucide-react';

export type FieldType = 'text' | 'textarea' | 'url' | 'location';

export interface ToolField {
  key: string;
  label: string;
  placeholder?: string;
  type?: FieldType;
  required?: boolean;
  helper?: string;
}

export interface ToolConfig {
  key: string;
  slug: string;          // url segment after /seo/ai/
  title: string;
  description: string;
  icon: LucideIcon;
  fields: ToolField[];
}

export const AI_SEO_TOOLS: ToolConfig[] = [
  {
    key: 'ai_visibility',
    slug: 'ai-visibility',
    title: 'AI Search Visibility Tracker',
    description: 'Track how your brand appears inside ChatGPT, Perplexity, Gemini, Claude, and Google AI Overviews.',
    icon: Eye,
    fields: [
      { key: 'brand', label: 'Brand', placeholder: 'Acme Tickets', required: true },
      { key: 'industry', label: 'Industry', placeholder: 'Event ticketing' },
      { key: 'location', label: 'Location', type: 'location', helper: 'Pick a city/country or auto-detect | results are localized to this geo.' },
      { key: 'competitors', label: 'Competitors (comma separated)', placeholder: 'Eventbrite, BookMyShow' },
    ],
  },
  {
    key: 'geo_optimizer',
    slug: 'geo-optimizer',
    title: 'GEO Optimizer',
    description: 'Score and rewrite pages for AI extraction, citation friendliness, and AI Overview readiness.',
    icon: Sparkles,
    fields: [
      { key: 'url', label: 'URL', placeholder: 'https://example.com/page', type: 'url' },
      { key: 'content', label: 'Or paste content', type: 'textarea', placeholder: 'Paste page text…' },
      { key: 'location', label: 'Target Location', type: 'location', helper: 'Optimize the rewrite for this geo audience.' },
    ],
  },
  {
    key: 'entity_authority',
    slug: 'entity-authority',
    title: 'Entity Authority Engine',
    description: 'Extract entities, map semantic relationships, and auto-generate JSON-LD schema.',
    icon: Network,
    fields: [
      { key: 'brand', label: 'Brand', placeholder: 'Acme Tickets', required: true },
      { key: 'url', label: 'URL (optional)', placeholder: 'https://example.com', type: 'url' },
      { key: 'topic', label: 'Topic (optional)', placeholder: 'event ticketing in India' },
      { key: 'competitor', label: 'Competitor (optional)', placeholder: 'competitor.com' },
    ],
  },
  {
    key: 'prompt_mining',
    slug: 'prompt-mining',
    title: 'AI Prompt Mining Engine',
    description: 'Discover real conversational prompts people ask AI engines, clustered by intent.',
    icon: MessageSquare,
    fields: [
      { key: 'topic', label: 'Topic / Brand', placeholder: 'Garba event tickets', required: true },
      { key: 'industry', label: 'Industry', placeholder: 'Event ticketing' },
      { key: 'location', label: 'Location (optional)', placeholder: 'Ahmedabad, India' },
    ],
  },
  {
    key: 'internal_linking',
    slug: 'internal-linking',
    title: 'AI Internal Linking Engine',
    description: 'Find orphan pages, build topic silos, and generate contextual link suggestions.',
    icon: Link2,
    fields: [
      { key: 'domain', label: 'Domain', placeholder: 'example.com', required: true },
      { key: 'urls', label: 'Known URLs (optional, comma separated)', type: 'textarea' },
    ],
  },
  {
    key: 'content_decay',
    slug: 'content-decay',
    title: 'AI Content Decay Detector',
    description: 'Predict ranking decline before traffic drops and get refresh recommendations.',
    icon: TrendingDown,
    fields: [
      { key: 'url', label: 'URL', placeholder: 'https://example.com/blog/post', required: true, type: 'url' },
      { key: 'content', label: 'Optional content snapshot', type: 'textarea' },
    ],
  },
  {
    key: 'competitor_ai',
    slug: 'competitor-ai',
    title: 'Competitor AI Intelligence',
    description: 'See why competitors dominate AI search and get attack strategies.',
    icon: Swords,
    fields: [
      { key: 'your_domain', label: 'Your domain', placeholder: 'example.com', required: true },
      { key: 'competitors', label: 'Competitors (comma separated, up to 3)', placeholder: 'a.com, b.com, c.com', required: true },
    ],
  },
  {
    key: 'brand_reputation',
    slug: 'brand-reputation',
    title: 'AI Brand Reputation Monitor',
    description: 'Track how AI engines describe your brand and detect misinformation or hallucinations.',
    icon: ShieldCheck,
    fields: [
      { key: 'brand', label: 'Brand', placeholder: 'Acme Tickets', required: true },
      { key: 'industry', label: 'Industry', placeholder: 'Event ticketing' },
    ],
  },
  {
    key: 'seo_agent',
    slug: 'seo-agent',
    title: 'Autonomous SEO Agent',
    description: 'Audit pages, prioritize fixes, recommend content, schema, links, and GEO improvements.',
    icon: Bot,
    fields: [
      { key: 'domain', label: 'Domain', placeholder: 'example.com', required: true },
      { key: 'goal', label: 'Goal (optional)', placeholder: 'increase AI Overview visibility' },
    ],
  },
];

export function getToolBySlug(slug: string) {
  return AI_SEO_TOOLS.find((t) => t.slug === slug);
}
