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

    const { data: job, error: insErr } = await admin
      .from("creative_image_jobs")
      .insert({
        user_id: userId,
        firm_id: body.firm_id ?? null,
        provider: body.provider ?? "openai",
        request: body,
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
      body: JSON.stringify({ job_id: job.id, body }),
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
