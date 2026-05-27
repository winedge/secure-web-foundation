// Website Doctor — detect website tech stack via Firecrawl + Lovable AI
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')!;

async function firecrawlScrape(url: string) {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['html', 'links', 'summary'],
      onlyMainContent: false,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function classifyStack(url: string, html: string, summary: string) {
  const prompt = `You are a website technology fingerprinting expert. Identify the stack from the HTML below.
Return STRICT JSON: {"cms":string|null,"framework":string|null,"frontend":string|null,"backend":string|null,"hosting":string|null,"cdn":string|null,"analytics":string[],"payment":string[],"auth":string|null,"third_party":string[],"summary":string}
URL: ${url}
SUMMARY: ${summary?.slice(0, 500) ?? ''}
HTML (truncated): ${(html || '').slice(0, 12000)}`;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Lovable-API-Key': LOVABLE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'You are a precise JSON-only website tech detector.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`AI Gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { summary: 'Could not parse stack', raw: data.choices?.[0]?.message?.content };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { url, project_id } = await req.json();
    if (!url) throw new Error('url required');

    const scraped = await firecrawlScrape(url);
    const html = scraped?.data?.html ?? scraped?.html ?? '';
    const summary = scraped?.data?.summary ?? scraped?.summary ?? '';
    const stack = await classifyStack(url, html, summary);

    if (project_id) {
      const supa = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await supa.from('wd_projects').update({ detected_stack: stack }).eq('id', project_id);
    }

    return new Response(JSON.stringify({ stack }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
