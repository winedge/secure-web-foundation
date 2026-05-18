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
