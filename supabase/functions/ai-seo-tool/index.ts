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

// Tool registry: maps tool key -> system prompt + user prompt builder + output shape hint
type Tool = {
  key: string;
  systemPrompt: string;
  buildUserPrompt: (input: Record<string, any>) => string;
  model?: string;
};

const TOOLS: Record<string, Tool> = {
  ai_visibility: {
    key: 'ai_visibility',
    systemPrompt:
      'You are an expert in AI Search Visibility analysis (AI engines: ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews). Return strictly valid JSON only.',
    buildUserPrompt: (i) =>
      `Analyze AI search visibility for brand "${i.brand}" in industry "${i.industry || 'general'}" ${
        i.location ? `targeting ${i.location}` : ''
      }${i.competitors ? `, against competitors: ${i.competitors}` : ''}.\n\nReturn JSON: {\n  "prompts": [ { "prompt": str, "intent": str, "engine_target": str } ] (12-20 items),\n  "share_of_voice": { "your_brand": number 0-100, "competitors": [{ "name": str, "share": number }] },\n  "engine_breakdown": [{ "engine": "ChatGPT"|"Perplexity"|"Gemini"|"Claude"|"Google AI Overviews", "visibility_score": 0-100, "mention_frequency": int, "sentiment": "positive"|"neutral"|"negative" }],\n  "citation_sources": [{ "domain": str, "frequency": int, "authority": "high"|"medium"|"low" }],\n  "trends": [{ "month": str, "visibility": 0-100 }] (last 6 months estimated),\n  "recommendations": [str] (5-7 items)\n}`,
  },
  geo_optimizer: {
    key: 'geo_optimizer',
    systemPrompt:
      'You are a Generative Engine Optimization (GEO) expert. Score and optimize content for AI engines. Return strictly valid JSON only.',
    buildUserPrompt: (i) =>
      `Analyze this content/URL for GEO (AI search optimization). ${
        i.url ? `URL: ${i.url}.` : ''
      } ${i.content ? `Content: ${i.content.slice(0, 4000)}` : 'Use the URL context to reason about likely on-page content.'}\n\nReturn JSON: {\n  "overall_score": 0-100,\n  "scores": { "ai_readability": 0-100, "semantic_chunking": 0-100, "citation_friendliness": 0-100, "answer_extraction": 0-100, "entity_clarity": 0-100, "factual_density": 0-100 },\n  "engine_scores": { "chatgpt": 0-100, "perplexity": 0-100, "google_aio": 0-100 },\n  "citation_simulation": { "confidence": 0-100, "likely_to_appear_in_aio": boolean, "likely_cited_by_perplexity": boolean, "missing_trust_signals": [str] },\n  "weaknesses": [str],\n  "rewrite_suggestions": [{ "section": str, "current_issue": str, "rewrite": str }] (3-5 items),\n  "faq_additions": [{ "question": str, "answer": str }] (3-5 items)\n}`,
  },
  entity_authority: {
    key: 'entity_authority',
    systemPrompt:
      'You are an entity/semantic SEO expert. Extract entities, map relationships, generate schema. Return strictly valid JSON only.',
    buildUserPrompt: (i) =>
      `Analyze entity authority for ${i.url ? `URL "${i.url}"` : `topic "${i.topic}"`} representing "${
        i.brand || 'the business'
      }".${i.competitor ? ` Compare against competitor "${i.competitor}".` : ''}\n\nReturn JSON: {\n  "entities": [{ "name": str, "type": "brand"|"service"|"product"|"person"|"location"|"topic", "salience": 0-100 }] (10-20 items),\n  "relationships": [{ "source": str, "target": str, "type": str }] (10-20 items),\n  "topical_clusters": [{ "cluster": str, "entities": [str], "authority_score": 0-100 }],\n  "schema_jsonld": { "Organization": object, "FAQ": object, "Article": object, "LocalBusiness": object },\n  "gaps": { "missing_entities": [str], "weak_authority_areas": [str], "missing_relationships": [str] },\n  "recommendations": [str]\n}`,
  },
  prompt_mining: {
    key: 'prompt_mining',
    systemPrompt: 'You are an AI prompt discovery expert. Mine real prompts people ask AI systems. Return strictly valid JSON only.',
    buildUserPrompt: (i) =>
      `Discover prompts people ask AI engines about "${i.topic || i.brand}" in industry "${i.industry || 'general'}"${
        i.location ? ` (${i.location})` : ''
      }.\n\nReturn JSON: {\n  "prompts": [{ "prompt": str, "intent": "informational"|"transactional"|"local"|"comparison"|"purchase", "opportunity_score": 0-100, "competition": "low"|"medium"|"high", "buyer_intent": 0-100, "conversion_probability": 0-100 }] (30-50 items),\n  "clusters": [{ "intent": str, "count": int, "avg_opportunity": number, "top_prompts": [str] }]\n}`,
  },
  internal_linking: {
    key: 'internal_linking',
    systemPrompt: 'You are a technical SEO expert specializing in internal linking and information architecture. Return strictly valid JSON only.',
    buildUserPrompt: (i) =>
      `Analyze internal linking opportunities for domain "${i.domain}".${
        i.urls ? ` Known URLs: ${i.urls}` : ''
      }\n\nReturn JSON: {\n  "silos": [{ "topic": str, "pillar_url": str, "supporting_urls": [str] }] (3-6 silos),\n  "orphans": [{ "url": str, "reason": str, "suggested_links_from": [str] }] (3-8 items),\n  "link_suggestions": [{ "from_url": str, "to_url": str, "anchor_text": str, "context_snippet": str }] (10-15 items),\n  "crawl_flow": { "depth_issues": [str], "authority_distribution_notes": str },\n  "recommendations": [str]\n}`,
  },
  content_decay: {
    key: 'content_decay',
    systemPrompt: 'You are a content decay & ranking-risk expert. Predict decline before traffic drops. Return strictly valid JSON only.',
    buildUserPrompt: (i) =>
      `Analyze content decay risk for URL "${i.url}"${i.content ? ` (content: ${i.content.slice(0, 3000)})` : ''}.\n\nReturn JSON: {\n  "decay_score": 0-100,\n  "risk_level": "low"|"medium"|"high"|"critical",\n  "signals": { "freshness_decay": 0-100, "ranking_decline_risk": 0-100, "outdated_entities": [str], "declining_authority_signals": [str], "competitor_improvements": [str] },\n  "refresh_recommendations": [{ "type": "content_update"|"faq_addition"|"new_section"|"entity_expansion"|"schema_improvement", "title": str, "description": str, "impact": "low"|"medium"|"high" }] (5-8 items),\n  "estimated_traffic_recovery_pct": number\n}`,
  },
  competitor_ai: {
    key: 'competitor_ai',
    systemPrompt: 'You are a competitive SEO/GEO strategist. Reveal why competitors dominate in AI search. Return strictly valid JSON only.',
    buildUserPrompt: (i) =>
      `Compare "${i.your_domain}" against competitors "${i.competitors}".\n\nReturn JSON: {\n  "comparison": [{ "domain": str, "is_you": boolean, "entity_coverage": 0-100, "topical_depth": 0-100, "content_depth": 0-100, "schema_usage": 0-100, "ai_citations": 0-100, "semantic_structure": 0-100 }],\n  "weaknesses_in_competitors": [{ "competitor": str, "weakness": str, "how_to_exploit": str }],\n  "attack_strategies": [{ "title": str, "description": str, "expected_impact": "low"|"medium"|"high" }] (4-6 items),\n  "missing_topic_opportunities": [{ "topic": str, "search_intent": str, "priority": "low"|"medium"|"high" }] (5-8 items),\n  "ai_visibility_gaps": [str]\n}`,
  },
  brand_reputation: {
    key: 'brand_reputation',
    systemPrompt: 'You are an AI brand reputation analyst. Track how AI systems describe brands. Return strictly valid JSON only.',
    buildUserPrompt: (i) =>
      `Analyze AI brand reputation for "${i.brand}"${i.industry ? ` (${i.industry})` : ''}.\n\nReturn JSON: {\n  "ai_descriptions": [{ "engine": "ChatGPT"|"Perplexity"|"Gemini"|"Claude"|"Google AIO", "description": str, "sentiment": "positive"|"neutral"|"negative", "confidence": 0-100 }],\n  "sentiment_summary": { "positive_pct": number, "neutral_pct": number, "negative_pct": number, "trust_score": 0-100, "authority_perception": 0-100 },\n  "detected_issues": [{ "type": "misinformation"|"negative_framing"|"hallucination"|"outdated_info", "description": str, "severity": "low"|"medium"|"high" }],\n  "repair_suggestions": [{ "type": "pr_opportunity"|"trust_page"|"review_improvement"|"authority_content", "title": str, "description": str }] (5-8 items)\n}`,
  },
  seo_agent: {
    key: 'seo_agent',
    model: 'google/gemini-2.5-pro',
    systemPrompt:
      'You are an autonomous AI SEO agent. Audit pages, identify issues, recommend fixes, content, schema, internal links, GEO improvements. Return strictly valid JSON only.',
    buildUserPrompt: (i) =>
      `Run an autonomous SEO + GEO audit for domain "${i.domain}"${i.goal ? ` with goal "${i.goal}"` : ''}.\n\nReturn JSON: {\n  "audit_summary": { "overall_health": 0-100, "seo_score": 0-100, "geo_score": 0-100, "critical_issues": int, "warnings": int },\n  "recommendations": [{ "id": str, "category": "content"|"entity"|"technical"|"geo"|"schema"|"links", "title": str, "description": str, "impact": "low"|"medium"|"high", "effort": "low"|"medium"|"high", "priority_score": 0-100 }] (10-15 items),\n  "content_opportunities": [{ "topic": str, "format": str, "reason": str }] (5-8 items),\n  "next_actions": [str] (3-5 immediate steps)\n}`,
  },
};

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

    const body = await req.json();
    const toolKey: string = body.tool;
    const input: Record<string, any> = body.input || {};
    const tool = TOOLS[toolKey];
    if (!tool) return json({ error: `unknown tool: ${toolKey}` }, 400);

    const model = tool.model || 'google/gemini-2.5-flash';
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: tool.systemPrompt },
          { role: 'user', content: tool.buildUserPrompt(input) },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) return json({ error: 'Rate limit exceeded. Try again shortly.' }, 429);
      if (aiRes.status === 402) return json({ error: 'AI credits exhausted. Add credits in Settings > Workspace > Usage.' }, 402);
      return json({ error: `AI gateway failed: ${aiRes.status} ${t}` }, 502);
    }
    const aiJson = await aiRes.json();
    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? '{}');
    } catch {
      parsed = { error: 'Failed to parse AI response' };
    }

    // Persist run (best-effort; pull firm_id from firm_members)
    let firmId: string | null = null;
    try {
      const { data: fm } = await userClient
        .from('firm_members')
        .select('firm_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();
      firmId = fm?.firm_id ?? null;
    } catch { /* ignore */ }

    try {
      await userClient.from('ai_seo_runs').insert({
        tool: toolKey,
        firm_id: firmId,
        user_id: userData.user.id,
        input,
        output: parsed,
        model,
        status: 'completed',
      });
    } catch { /* ignore */ }

    return json({ tool: toolKey, model, result: parsed });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
