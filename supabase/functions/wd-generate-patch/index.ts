// Website Doctor — AI patch generator for a finding (suggest-only)
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { finding_id, code_context } = await req.json();
    if (!finding_id) throw new Error('finding_id required');

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: finding, error } = await supa
      .from('wd_findings')
      .select('id, project_id, firm_id, category, severity, title, description, suggested_fix')
      .eq('id', finding_id)
      .single();
    if (error || !finding) throw new Error('finding not found');

    const prompt = `Generate a code patch suggestion to fix the issue below.
Return STRICT JSON: {"file_path":string|null,"diff":string,"before_preview":string,"after_preview":string,"explanation":string,"risk":"low"|"med"|"high","confidence":0-1}
The diff must be a unified diff. If no code context is available, suggest a representative snippet.

CATEGORY: ${finding.category}
SEVERITY: ${finding.severity}
TITLE: ${finding.title}
DESCRIPTION: ${finding.description}
SUGGESTED FIX HINT: ${JSON.stringify(finding.suggested_fix)}
CODE CONTEXT: ${(code_context || '').slice(0, 6000)}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Lovable-API-Key': LOVABLE_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'You produce valid JSON containing a safe minimal unified diff.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`AI Gateway ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const patch = JSON.parse(data.choices[0].message.content);

    const { data: row } = await supa
      .from('wd_patches')
      .insert({
        finding_id: finding.id,
        project_id: finding.project_id,
        firm_id: finding.firm_id,
        file_path: patch.file_path,
        diff: patch.diff,
        before_preview: patch.before_preview,
        after_preview: patch.after_preview,
        explanation: patch.explanation,
        risk: ['low', 'med', 'high'].includes(patch.risk) ? patch.risk : 'med',
        confidence: typeof patch.confidence === 'number' ? patch.confidence : 0.6,
        status: 'proposed',
      })
      .select()
      .single();

    await supa.from('wd_ai_activity').insert({
      project_id: finding.project_id,
      firm_id: finding.firm_id,
      agent: 'patcher',
      action: 'generate_patch',
      output: { patch_id: row?.id, finding_id: finding.id },
    });

    return new Response(JSON.stringify({ patch: row }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
