import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

// Thin orchestrator:
// POST { prompt, provider, ... } -> create job, trigger worker, return 202 { job_id, status:"pending" }
// POST { job_id }                -> return current job row (poll)

interface Body {
  prompt?: string;
  provider?: string;
  preset?: string;
  aspect_ratio?: string;
  firm_id?: string;
  variant_id?: string;
  brand_colors?: string[];
  on_image_text?: string;
  midjourney_style_refs?: string[];
  job_id?: string;
}

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = (await req.json()) as Body;
    const admin = adminClient();

    // Poll path
    if (body.job_id) {
      const { data, error } = await admin.from("creative_image_jobs").select("*").eq("id", body.job_id).maybeSingle();
      if (error) throw error;
      if (!data) return jsonResponse({ error: "job not found" }, 404);
      const lastTouch = new Date(data.updated_at ?? data.created_at).getTime();
      if ((data.status === "pending" || data.status === "processing") && Date.now() - lastTouch > 145_000) {
        const staleError = "Image generation took too long. Try ChatGPT Image Mini, Midjourney prompt export, or a shorter prompt.";
        await admin
          .from("creative_image_jobs")
          .update({ status: "failed", error: staleError, updated_at: new Date().toISOString() })
          .eq("id", body.job_id);
        return jsonResponse({ job_id: data.id, status: "failed", error: staleError });
      }
      return jsonResponse({
        job_id: data.id,
        status: data.status,
        ...(data.result || {}),
        ...(data.error ? { error: data.error } : {}),
      });
    }

    if (!body?.prompt) return jsonResponse({ error: "prompt required" }, 400);

    // Best-effort user id
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await admin.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    // Enrich body with brand kit so the worker can compose a real ad
    let enriched: Record<string, unknown> = { ...body };
    if (body.firm_id) {
      try {
        const { data: kit } = await admin
          .from("firm_brand_kit")
          .select("*")
          .eq("firm_id", body.firm_id)
          .maybeSingle();
        if (kit) {
          enriched = {
            ...enriched,
            brand_name: (enriched as any).brand_name ?? kit.brand_name ?? kit.name ?? undefined,
            tagline: (enriched as any).tagline ?? kit.tagline ?? undefined,
            logo_description: (enriched as any).logo_description ?? kit.logo_description ?? undefined,
            trust_badges: (enriched as any).trust_badges ?? (Array.isArray(kit.trust_badges)
              ? kit.trust_badges.map((x: any) => (typeof x === "string" ? x : x?.label)).filter(Boolean)
              : undefined),
            disclaimer: (enriched as any).disclaimer ?? kit.disclaimer ?? undefined,
            brand_colors: (enriched as any).brand_colors ?? (kit.colors
              ? [kit.colors.primary, kit.colors.secondary, kit.colors.accent].filter(Boolean)
              : undefined),
          };
        }
        const { data: firm } = await admin
          .from("firms")
          .select("name, city, state")
          .eq("id", body.firm_id)
          .maybeSingle();
        if (firm) {
          (enriched as any).brand_name = (enriched as any).brand_name ?? firm.name ?? undefined;
          (enriched as any).location = (enriched as any).location ?? ([firm.city, firm.state].filter(Boolean).join(", ") || undefined);
        }
      } catch (e) {
        console.warn("brand kit enrich failed", e);
      }
    }

    const { data: job, error: insErr } = await admin
      .from("creative_image_jobs")
      .insert({
        user_id: userId,
        firm_id: body.firm_id ?? null,
        provider: body.provider ?? "openai",
        request: enriched,
        status: "pending",
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // Fire-and-forget the worker. Don't await — its 150s window is independent.
    const workerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-creative-image-worker`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const triggerPromise = fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ job_id: job.id, body: enriched }),
    }).then((r) => r.body?.cancel()).catch((e) => console.error("worker trigger failed", e));

    // Brief waitUntil ensures the outbound request is actually sent before isolate recycles,
    // but does NOT block the response.
    try {
      // @ts-ignore EdgeRuntime is provided in Supabase edge runtime
      EdgeRuntime?.waitUntil?.(triggerPromise);
    } catch {
      /* no-op */
    }

    return jsonResponse({ job_id: job.id, status: "pending" }, 202);
  } catch (e) {
    console.error("ai-creative-image error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
