import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { review_id, template_id, tone, custom_instructions } = await req.json();
    if (!review_id) return new Response(JSON.stringify({ error: "review_id required" }), { status: 400, headers: corsHeaders });

    const { data: review, error: revErr } = await supabase
      .from("gmb_reviews")
      .select("id, firm_id, rating, text, reviewer_name")
      .eq("id", review_id)
      .maybeSingle();
    if (revErr || !review) return new Response(JSON.stringify({ error: "Review not found" }), { status: 404, headers: corsHeaders });

    let template: { name: string; body: string; tone: string } | null = null;
    if (template_id) {
      const { data: t } = await supabase.from("gmb_reply_templates").select("name, body, tone").eq("id", template_id).maybeSingle();
      template = t;
    }

    const sysPrompt = `You are a professional reputation manager replying to a Google Business review.
Tone: ${tone ?? template?.tone ?? "professional"}.
Keep the reply under 500 characters. Address the reviewer by first name when available.
Never make legal claims, promise outcomes, or share PII.${template ? `\n\nUse this template as a base, customizing for the specific review:\n${template.body}` : ""}${custom_instructions ? `\n\nAdditional instructions: ${custom_instructions}` : ""}`;

    const userPrompt = `Reviewer: ${review.reviewer_name ?? "Anonymous"}
Rating: ${review.rating ?? "N/A"}/5
Review: ${review.text ?? "(no text)"}

Generate a reply.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: corsHeaders });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI: ${text}` }), { status: 500, headers: corsHeaders });
    }
    const aiJson = await aiRes.json();
    const body = aiJson.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(
      JSON.stringify({ body, model: "google/gemini-2.5-flash" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
