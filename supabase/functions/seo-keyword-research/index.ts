import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface Body {
  seed: string;
  location?: string;
  intent?: string;
  count?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return json({ error: 'AI gateway not configured' }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json({ error: 'unauthorized' }, 401);

    const body = (await req.json()) as Body;
    const seed = (body.seed || '').trim();
    if (!seed) return json({ error: 'seed required' }, 400);
    const count = Math.min(Math.max(body.count ?? 25, 5), 50);

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert SEO analyst. Return strictly valid JSON.' },
          {
            role: 'user',
            content: `Generate ${count} keyword ideas for the seed "${seed}"${body.location ? ` targeting ${body.location}` : ''}${body.intent ? ` with ${body.intent} intent` : ''}.\nFor each, estimate: monthly_volume (integer), difficulty (0-100), cpc_usd (number), intent (informational|commercial|transactional|navigational), and a one-sentence recommendation.\nReturn JSON only: { "keywords": [{ "keyword": str, "monthly_volume": int, "difficulty": int, "cpc_usd": number, "intent": str, "recommendation": str }] }`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: `ai gateway failed: ${aiRes.status} ${t}` }, 502);
    }
    const aiJson = await aiRes.json();
    let parsed: { keywords: unknown[] } = { keywords: [] };
    try {
      parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? '{"keywords":[]}');
    } catch { /* ignore */ }
    return json({ seed, keywords: parsed.keywords ?? [] });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
