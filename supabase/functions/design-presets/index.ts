import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const BackgroundSchema = z.object({
  type: z.enum(['none', 'solid', 'gradient', 'mesh', 'glass', 'image']).optional(),
}).passthrough();

const ListSchema = z.object({ action: z.literal('list') });
const CreateSchema = z.object({
  action: z.literal('create'),
  name: z.string().trim().min(1).max(120),
  background: BackgroundSchema,
});
const UpdateSchema = z.object({
  action: z.literal('update'),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  background: BackgroundSchema.optional(),
});
const DeleteSchema = z.object({ action: z.literal('delete'), id: z.string().uuid() });

const BodySchema = z.discriminatedUnion('action', [ListSchema, CreateSchema, UpdateSchema, DeleteSchema]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
  if (authErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = claims.claims.sub as string;

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const input = parsed.data;
    if (input.action === 'list') {
      const { data, error } = await supabase
        .from('landing_design_presets')
        .select('id, name, background, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json({ presets: data ?? [] });
    }
    if (input.action === 'create') {
      const { data, error } = await supabase
        .from('landing_design_presets')
        .insert({ user_id: userId, name: input.name, background: input.background as any })
        .select('id, name, background, created_at')
        .single();
      if (error) throw error;
      return json({ preset: data });
    }
    if (input.action === 'update') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.name !== undefined) patch.name = input.name;
      if (input.background !== undefined) patch.background = input.background;
      const { data, error } = await supabase
        .from('landing_design_presets')
        .update(patch)
        .eq('id', input.id)
        .select('id, name, background, created_at')
        .single();
      if (error) throw error;
      return json({ preset: data });
    }
    // delete
    const { error } = await supabase.from('landing_design_presets').delete().eq('id', input.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
