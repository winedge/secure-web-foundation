import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";
import { getVerticalContext } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { firm_id, period, tort_type, category } = await req.json();
    if (!firm_id) throw new Error("firm_id required");
    const subject = category || tort_type;

    const currentPeriod = period || new Date().toISOString().slice(0, 7);

    const { config, verticalSlug } = await getVerticalContext(firm_id, "autopilot");
    const verticalName = config?.vertical?.name ?? "Mass Tort";

    const { data: firmBenchmark } = await supabase
      .from("firm_benchmarks")
      .select("*")
      .eq("firm_id", firm_id)
      .eq("period", currentPeriod)
      .maybeSingle();

    const periodStart = `${currentPeriod}-01`;
    const { data: purchases } = await supabase
      .from("lead_purchases")
      .select("amount, purchased_at, pipeline_stage")
      .eq("firm_id", firm_id)
      .gte("purchased_at", periodStart)
      .order("purchased_at", { ascending: false });

    const totalSpend = (purchases || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const totalLeads = (purchases || []).length;
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

    if (!firmBenchmark && totalLeads > 0) {
      await supabase.from("firm_benchmarks").insert({
        firm_id,
        period: currentPeriod,
        tort_type: subject || null,
        avg_cpl: avgCpl,
        total_leads_purchased: totalLeads,
        total_spend: totalSpend,
        avg_conversion_rate: 0.15,
        avg_case_value: 0,
        avg_response_time_minutes: 0,
        pipeline_velocity_days: 0,
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an industry benchmarking AI for the ${verticalName} sector. Compare a firm's performance metrics against ${verticalName}-specific industry averages and provide actionable insights. Use realistic benchmarks for ${verticalName}, not legal industry numbers (unless this IS the legal vertical).

Firm metrics:
- CPL: $${avgCpl.toFixed(2)}
- Total leads: ${totalLeads}
- Total spend: $${totalSpend.toFixed(2)}
- Period: ${currentPeriod}
${subject ? `- Category/focus: ${subject}` : ''}

Return JSON:
{
  "firm_metrics": { "cpl": number, "leads": number, "spend": number, "conversion_rate": number },
  "industry_benchmarks": {
    "avg_cpl": number,
    "p25_cpl": number,
    "p75_cpl": number,
    "avg_conversion_rate": number,
    "avg_case_value": number,
    "avg_response_time_minutes": number,
    "avg_pipeline_velocity_days": number
  },
  "percentile_rank": {
    "cpl": number,
    "conversion": number,
    "response_time": number
  },
  "performance_grade": "A+|A|B|C|D|F",
  "strengths": ["strength1", "strength2"],
  "improvement_areas": [{"area": "string", "current": "string", "target": "string", "action": "string"}],
  "competitive_position": "string",
  "monthly_trend": "improving|stable|declining"
}`,
          },
          {
            role: "user",
            content: `Generate comprehensive benchmark comparison for this ${verticalName} firm's performance in ${currentPeriod}.`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return jsonResponse({ error: "Rate limit exceeded" }, 429);
      if (aiResponse.status === 402) return jsonResponse({ error: "AI credits exhausted" }, 402);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
    } catch {
      parsed = { error: "Could not parse benchmarks" };
    }

    return jsonResponse({ ...parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("cross-firm-benchmarks error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
