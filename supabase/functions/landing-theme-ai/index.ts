// Lets users describe a theme tweak in plain English and returns an updated
// theme object the builder can apply directly. No DB writes — pure transform.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
      const sys = `You are a senior conversion copywriter + landing-page designer. Given a structured business brief, generate a COMPLETE landing page as an ordered array of section blocks.
Allowed section types: hero, video_hero, features, bento, logo_cloud, marquee, stats, testimonials, faq, pricing, steps, timeline, gallery, before_after, comparison, team, countdown, embed, newsletter, cta, content, divider, form, footer.
Always include a hero first, a form section near the bottom, and a footer last. Use 6-10 sections total. Vary section types so the page feels rich (mix proof, features, social proof, FAQ, CTA).
Each section must have: id (uuid), type, visible:true, props (typed for the section), and optional animation { entrance, trigger:"on-scroll", duration:600, delay:0, easing:"ease" } and background { kind: "none"|"gradient"|"mesh"|"glass", ... }.
- Use background.kind="gradient" or "mesh" for hero / cta / stats to add visual interest. Provide gradient {type,angle,stops:[{color,pos}]} or mesh {base,blobs:[{color,x,y,size}]}.
- Use animation entrance from: fade, slide-up, slide-left, slide-right, zoom, blur-in, mask-reveal. Vary across sections.
STRICT ADHERENCE TO BRIEF:
- The PRODUCT/SERVICE field is the literal thing being sold | name it explicitly in the hero headline and features.
- TARGET CUSTOMER is the only audience to address | mirror their language and pains throughout.
- KEY BENEFITS must each appear (one per feature card / stat / FAQ where natural). Do not invent benefits that contradict them.
- OFFER (price, trial, guarantee, bonus) must appear in hero subheadline AND the final CTA section.
- PRIMARY CTA label must be used verbatim on the hero button, the CTA section button, and the form submit button.
Write specific, benefit-driven copy referencing the actual product and audience. No lorem ipsum. Real headlines, real stat numbers, real testimonial quotes with named personas matching the target customer.
Return STRICT JSON via the tool call.`;
      const user = `BUSINESS BRIEF:
${prompt}

PRODUCT / SERVICE: ${product || '(not specified | infer from brief)'}
TARGET CUSTOMER: ${audience || '(not specified | infer from brief)'}
KEY BENEFITS:
${benefitsList || '(not specified | infer 3-5 from brief)'}
OFFER / INCENTIVE: ${offer || '(none specified)'}
PRIMARY CTA LABEL: ${cta || '(choose a short action verb phrase)'}
TONE: ${tone || 'confident, friendly'}
BUSINESS TYPE: ${businessType || 'service business'}

THEME CONTEXT: ${JSON.stringify(theme || {})}

Generate the full landing page now, honoring every structured field above.`;
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
          tools: [{
            type: 'function',
            function: {
              name: 'generate_page',
              description: 'Return the generated full landing page sections',
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
      // Ensure every section has an id
      if (Array.isArray(args?.sections)) {
        args.sections = args.sections.map((s: any) => ({
          ...s,
          id: s.id || crypto.randomUUID(),
          visible: s.visible !== false,
          props: s.props || {},
        }));
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
