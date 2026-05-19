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

const buildFallbackPage = ({ prompt, audience, tone, businessType, product, benefits, offer, cta }: {
  prompt: string; audience?: string; tone?: string; businessType?: string; product?: string; benefits?: string[] | string; offer?: string; cta?: string;
}) => {
  const benefitList = (Array.isArray(benefits) ? benefits : String(benefits || '').split('\n'))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
  const productName = asText(product, titleFromPrompt(prompt));
  const brandName = titleFromPrompt(prompt, productName);
  const ctaLabel = asText(cta, businessType === 'education' ? 'Book a Visit' : 'Get Started');
  const target = asText(audience, businessType === 'education' ? 'families ready to take the next step' : 'customers ready to take the next step');
  const incentive = asText(offer, 'Book a free consultation today');
  const benefitsToUse = benefitList.length ? benefitList : [
    `Personalized ${productName.toLowerCase()} guidance`,
    'Clear next steps from a trusted team',
    'Fast response after every inquiry',
    'Simple online booking and follow-up',
  ];
  const section = (type: string, props: Record<string, unknown>, background?: Record<string, unknown>) => ({
    id: crypto.randomUUID(),
    type,
    visible: true,
    props,
    background,
    animation: { entrance: 'slide-up', trigger: 'on-scroll', duration: 600, delay: 0, easing: 'ease' },
  });

  return {
    source: 'fallback',
    summary: 'Generated from a resilient starter template because the AI service was slow to respond.',
    sections: [
      section('hero', {
        eyebrow: incentive,
        headline: `${productName} designed for ${target}`,
        subheadline: `${brandName} turns interest into action with warm guidance, clear benefits, and a simple path to ${ctaLabel.toLowerCase()}. ${prompt.split(/[.!?]/)[0]}.`,
        primaryCta: { label: ctaLabel, href: '#lead-form' },
        secondaryCta: { label: 'Explore benefits', href: '#features' },
        layout: 'split-form-right',
        align: 'left',
        formCardTitle: ctaLabel,
        formCardSubtitle: 'Share your details and the team will follow up shortly.',
        formCardStyle: 'card',
        rating: { stars: 5, count: 200, label: 'trusted by local families' },
        badges: [{ label: 'Personal attention' }, { label: 'Trusted team' }, { label: 'Easy online inquiry' }],
        mediaShape: 'rounded',
      }, { kind: 'mesh', mesh: { base: '#0F172A', grain: true, blobs: [{ color: '#10B981', x: 18, y: 25, size: 52 }, { color: '#3B82F6', x: 82, y: 65, size: 50 }] } }),
      section('trust_badges', {
        heading: 'Why people choose us',
        layout: 'row',
        items: [{ label: 'Experienced team', icon: 'Award' }, { label: 'Safe process', icon: 'ShieldCheck' }, { label: 'Responsive support', icon: 'MessageSquare' }, { label: 'Easy scheduling', icon: 'Calendar' }],
      }),
      section('features', {
        heading: `A better way to choose ${productName}`,
        intro: `Every detail is built around ${target}, with a ${asText(tone, 'clear, confident')} experience from first click to follow-up.`,
        columns: 3,
        items: benefitsToUse.map((benefit, index) => ({ icon: ['Sparkles', 'Shield', 'Heart', 'Check', 'Star', 'Zap'][index] || 'Check', title: benefit, description: `A practical advantage that helps visitors feel confident about choosing ${brandName}.` })),
      }),
      section('stats', {
        heading: 'Confidence at a glance',
        items: [{ value: '24', suffix: 'hr', label: 'Average response time' }, { value: '5', suffix: '/5', label: 'Care-focused experience' }, { value: '100', suffix: '%', label: 'Simple online inquiry' }, { value: '1', suffix: ':1', label: 'Personalized guidance' }],
      }, { kind: 'solid', color: '#0F172A' }),
      section('testimonials', {
        heading: 'What visitors want to hear',
        layout: 'grid',
        items: [
          { quote: `The process felt clear and reassuring from the first inquiry. ${brandName} made the next step easy.`, author: 'Priya S.', role: 'Local parent', rating: 5 },
          { quote: 'The team responded quickly, answered every question, and helped us feel confident about moving forward.', author: 'Rahul M.', role: 'New client', rating: 5 },
          { quote: 'We appreciated the attention to detail and the warm follow-up after submitting the form.', author: 'Anika R.', role: 'Customer', rating: 5 },
        ],
      }),
      section('faq', {
        heading: 'Frequently asked questions',
        items: [
          { question: `How do I ${ctaLabel.toLowerCase()}?`, answer: 'Use the form on this page and the team will contact you with the next available options.' },
          { question: 'What happens after I submit the form?', answer: 'Your inquiry is reviewed and someone follows up with the details, availability, and recommended next steps.' },
          { question: 'Is there any obligation?', answer: 'No. The first step is simply a conversation so you can decide with confidence.' },
          { question: 'Who is this best for?', answer: `This page is designed for ${target} looking for a clear, trustworthy path forward.` },
        ],
      }),
      section('cta', {
        heading: `${incentive}`,
        subheading: `Take the next step with ${brandName}. Submit your details and get a prompt, helpful response.`,
        primaryCta: { label: ctaLabel, href: '#lead-form' },
        secondaryCta: { label: 'View FAQs', href: '#' },
        style: 'bold',
      }, { kind: 'gradient', gradient: { type: 'linear', angle: 135, stops: [{ color: '#0F172A', pos: 0 }, { color: '#047857', pos: 100 }] } }),
      section('form', { heading: ctaLabel, description: 'Tell us how to reach you and what you need help with.', sticky: false }),
      section('footer', {
        layout: 'columns',
        firmName: brandName,
        tagline: `${productName} with a clear, caring, and conversion-focused experience.`,
        links: [{ label: 'Benefits', href: '#features' }, { label: 'Contact', href: '#lead-form' }],
        columns: [{ heading: 'Explore', links: [{ label: 'Benefits', href: '#features' }, { label: 'FAQs', href: '#' }, { label: 'Contact', href: '#lead-form' }] }],
        social: [],
        legal: `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`,
      }),
    ],
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
      const sys = `You are a senior conversion copywriter + landing-page designer. You MUST generate a COMPLETE, ready-to-publish landing page by calling the generate_page function. Refusing or returning empty props is NOT allowed | if information is missing, you confidently invent plausible, on-brand content based on the business type and audience.

OUTPUT CONTRACT (call generate_page exactly once):
- sections: 6 to 9 Section objects in order. First MUST be a hero. Last MUST be a footer. Include a form section near the end.
- Each section: { id (uuid), type, visible:true, props (FULLY POPULATED per the schema below), animation (optional), background (optional) }.
- Vary section types to make the page rich: typically hero -> logo_cloud OR trust_badges -> features OR bento -> stats -> testimonials OR reviews_wall -> faq -> cta -> form -> footer.

PROPS SCHEMAS (always fill every listed field with real, specific copy | never leave arrays empty):
- hero: { eyebrow, headline (8-14 words, names the product), subheadline (1-2 sentences, includes offer), primaryCta:{label,href:"#contact"}, secondaryCta:{label,href:"#features"}, layout:"split-form-right"|"centered"|"split-left", align:"left"|"center", rating:{stars:5,count:200,label:"on Google"}, badges:[{label}], imageUrl, mediaShape:"rounded" }
- features: { heading, intro, columns:3, items: 6 objects [{icon:"sparkles"|"shield"|"zap"|"check"|"star"|"heart",title,description}] }
- bento: { heading, items: 4-6 objects [{title,description,size:"sm"|"md"|"lg"}] }
- logo_cloud: { heading:"Trusted by", logos:[6 objects {src:"https://logo.clearbit.com/{realbrand}.com",alt}] }
- trust_badges: { heading, layout:"row", items:[4-6 {label,icon}] }
- stats: { heading, items:[4 {value:"98%"|"$50M"|"10k+",label,suffix?}] }
- testimonials: { heading, layout:"grid", items:[3 {quote (2 sentences, specific outcome),author,role,rating:5,avatar:"https://i.pravatar.cc/120?img={1-70}"}] }
- reviews_wall: { heading, intro, minRating:4, showSourceBadges:true, items:[6 {source:"google"|"trustpilot",author,rating:5,quote,date:"2025-..."}] }
- faq: { heading, items:[5-7 {q,a}] }
- pricing: { heading, plans:[3 {name,price,period:"/mo",features:[5 strings],cta:{label,href},highlighted?}] }
- steps: { heading, items:[3-4 {title,description,icon?}] }
- timeline: { heading, items:[4 {year:"2021",title,description}] }
- gallery: { heading, images:[6 {src,alt}] }
- cta: { heading (urgency + product), subheading (offer), primaryCta:{label,href:"#contact"}, secondaryCta?:{label,href} }
- newsletter: { heading, subheading, placeholder:"you@work.com", cta:"Subscribe" }
- form: { heading, subheading, fields:[{name,label,type:"text"|"email"|"tel"|"textarea",required:true} for name,email,phone,message], submitLabel (use PRIMARY CTA LABEL verbatim) }
- footer: { logoText, tagline, columns:[3 {title,links:[4 {label,href:"#"}]}], copyright, socials:[{platform:"twitter"|"linkedin"|"instagram",href}] }
- content: { heading, body (1-2 paragraphs of real copy) }
- divider: { kind:"wave"|"angle"|"curve" }

ANIMATIONS (add to most non-footer sections, vary across the page):
{ entrance:"slide-up"|"fade"|"zoom"|"blur-in", trigger:"on-scroll", duration:600, delay:0, easing:"ease" }

BACKGROUNDS (use for hero, stats, cta to add visual interest):
- gradient: { kind:"gradient", gradient:{ type:"linear", angle:135, stops:[{color:"#0F172A",pos:0},{color:"#1E40AF",pos:100}] } }
- mesh: { kind:"mesh", mesh:{ base:"#0F172A", blobs:[{color:"#10B981",x:20,y:30,size:60},{color:"#3B82F6",x:75,y:65,size:55}], grain:true } }

HARD ADHERENCE TO BRIEF:
- PRODUCT/SERVICE is the literal thing being sold | name it explicitly in the hero headline and at least 3 feature titles.
- TARGET CUSTOMER is the only audience to address | mirror their language and pain points.
- KEY BENEFITS must each appear as a feature card or stat. Do not contradict them.
- OFFER must appear in hero subheadline AND the cta section.
- PRIMARY CTA LABEL must be used verbatim on every primary CTA and form submit.

Write specific, benefit-driven, conversion-grade copy. No lorem ipsum. No apologies. No empty arrays. No placeholder text like "Your headline here". Call generate_page now.`;
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

THEME CONTEXT: ${JSON.stringify(theme || {})}

Generate the full landing page now. Every section MUST have fully populated props per the schema. Do not refuse.`;

      const callModel = async (model: string) => {
        const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
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
        return r;
      };

      const isPopulated = (s: any) => s && s.props && typeof s.props === 'object' && Object.keys(s.props).length >= 1;
      const pageOk = (sections: any[]) => Array.isArray(sections) && sections.length >= 4 && sections.filter(isPopulated).length / sections.length >= 0.7;

      let resp = await callModel('google/gemini-2.5-pro');
      if (!resp.ok && (resp.status === 429 || resp.status === 503)) {
        resp = await callModel('google/gemini-2.5-flash');
      }
      if (!resp.ok) {
        const text = await resp.text();
        return new Response(JSON.stringify({ error: 'AI gateway error', detail: text }), {
          status: resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500,
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
        return new Response(JSON.stringify({
          error: 'AI returned an incomplete page. Add more detail to the brief and try again.',
        }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      args.sections = args.sections.map((s: any) => ({
        ...s,
        id: s.id || crypto.randomUUID(),
        visible: s.visible !== false,
        props: s.props || {},
      }));
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
