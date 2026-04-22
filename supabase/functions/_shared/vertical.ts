/**
 * Shared vertical helper for edge functions.
 * Loads vertical config + AI prompts for a given firm with a per-cold-start cache.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type PromptType =
  | "scoring"
  | "evaluation"
  | "document"
  | "intake"
  | "creative"
  | "competitor"
  | "predictive"
  | "settlement"
  | "background"
  | "fraud"
  | "social"
  | "video"
  | "intent"
  | "judge"
  | "market"
  | "dark_funnel"
  | "geofence"
  | "lookalike"
  | "viral"
  | "autopilot"
  | "landing";

export interface VerticalConfig {
  vertical: { id: string; slug: string; name: string };
  stages: Array<Record<string, unknown>>;
  intake_fields: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  terminology: Record<string, string>;
  enabled_modules: string[];
}

const cache = new Map<string, { value: VerticalConfig; expires: number }>();
const promptCache = new Map<string, { value: string | null; expires: number }>();
const TTL_MS = 5 * 60 * 1000;

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/** Load the firm's vertical config (cached). Falls back to mass_tort. */
export async function getVerticalConfig(firmId: string | null | undefined): Promise<VerticalConfig | null> {
  if (!firmId) return null;
  const cached = cache.get(firmId);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const { data, error } = await adminClient().rpc("get_vertical_config", { _firm_id: firmId });
    if (error || !data) return null;
    const cfg = data as VerticalConfig;
    cache.set(firmId, { value: cfg, expires: Date.now() + TTL_MS });
    return cfg;
  } catch {
    return null;
  }
}

/** Resolve a system prompt for a given vertical + prompt type. Returns null if not configured. */
export async function getVerticalPrompt(
  verticalId: string | null | undefined,
  promptType: PromptType
): Promise<string | null> {
  if (!verticalId) return null;
  const key = `${verticalId}:${promptType}`;
  const cached = promptCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const { data } = await adminClient()
      .from("vertical_ai_prompts")
      .select("system_prompt")
      .eq("vertical_id", verticalId)
      .eq("prompt_type", promptType)
      .maybeSingle();
    const value = (data?.system_prompt as string | undefined) ?? null;
    promptCache.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
  } catch {
    return null;
  }
}

/** Convenience: load both config and a specific prompt at once. */
export async function getVerticalContext(
  firmId: string | null | undefined,
  promptType: PromptType
): Promise<{ config: VerticalConfig | null; prompt: string | null; verticalSlug: string }> {
  const config = await getVerticalConfig(firmId);
  const verticalId = config?.vertical?.id ?? null;
  const prompt = await getVerticalPrompt(verticalId, promptType);
  return { config, prompt, verticalSlug: config?.vertical?.slug ?? "mass_tort" };
}

/**
 * Resolve and validate a category against the firm's vertical-configured
 * `vertical_lead_categories`. Use this in every AI edge function so tools
 * automatically use the correct categories for the selected vertical and
 * never fall back to mass-tort terminology when another vertical is active.
 *
 * - If `requested` matches (case-insensitively) a configured category name or
 *   slug, that canonical name is returned.
 * - If `requested` is empty / invalid, the first configured category is used.
 * - If the vertical has no configured categories, `requested` is returned
 *   verbatim (or "general" if none was supplied).
 */
export interface ResolvedCategory {
  /** Canonical category name to feed the AI prompt. */
  category: string;
  /** All category names available to the vertical (canonical order). */
  allCategories: string[];
  /** True when the requested value matched a configured category. */
  matched: boolean;
  /** True when no configured category was found and we fell back to a default. */
  fallbackUsed: boolean;
  /** Optional metadata for the resolved category (description, etc.). */
  meta: Record<string, unknown> | null;
}

export function resolveCategory(
  config: VerticalConfig | null,
  requested: string | null | undefined
): ResolvedCategory {
  const categories = (config?.categories ?? []) as Array<Record<string, unknown>>;
  const allCategories = categories
    .map((c) => (c?.name as string | undefined) ?? (c?.slug as string | undefined) ?? "")
    .filter(Boolean);

  const trimmed = (requested ?? "").trim();

  if (allCategories.length === 0) {
    return {
      category: trimmed || "general",
      allCategories: [],
      matched: false,
      fallbackUsed: !trimmed,
      meta: null,
    };
  }

  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");
  const target = norm(trimmed);
  const match = target
    ? categories.find(
        (c) =>
          norm((c.name as string) ?? "") === target ||
          norm((c.slug as string) ?? "") === target
      )
    : null;

  if (match) {
    return {
      category: (match.name as string) ?? (match.slug as string) ?? trimmed,
      allCategories,
      matched: true,
      fallbackUsed: false,
      meta: match,
    };
  }

  // Fallback to the first configured category for this vertical.
  const first = categories[0];
  return {
    category: (first.name as string) ?? (first.slug as string) ?? allCategories[0],
    allCategories,
    matched: false,
    fallbackUsed: true,
    meta: first,
  };
}


/** Build a vertical-aware system message with sensible defaults per prompt type. */
export function buildSystemPrompt(
  promptType: PromptType,
  verticalSlug: string,
  override: string | null
): string {
  if (override && override.trim().length > 0) return override;
  const subject = subjectFor(verticalSlug);
  const defaults: Record<PromptType, string> = {
    scoring: `You are a ${subject} lead conversion scoring AI. Always use the provided tool to return structured data tailored to ${subject}.`,
    evaluation: `You are a ${subject} evaluation AI. Always use the provided tool to return structured analysis with realistic, jurisdiction- and category-aware reasoning for ${subject}.`,
    document: `You are an AI that analyzes documents for ${subject} businesses. Extract relevant facts, flag risks, and produce structured output.`,
    intake: `You are an intake assistant for ${subject}. Collect required information naturally and confirm understanding.`,
    creative: `You are a creative director for ${subject} marketing. Produce on-brand, compliant, conversion-focused creative.`,
    competitor: `You are a competitor intelligence analyst for ${subject}. Identify strengths, weaknesses, and opportunities.`,
    predictive: `You are a predictive analytics AI for ${subject} lead pipelines.`,
    settlement: `You are a settlement valuation AI for legal cases.`,
    background: `You are a background check analyst for ${subject}.`,
    fraud: `You are a fraud detection AI for ${subject} lead intake.`,
    social: `You are a social content strategist for ${subject}.`,
    video: `You are a video ad scriptwriter for ${subject}.`,
    intent: `You are an intent signal detection AI for ${subject}.`,
    judge: `You are a judicial intelligence AI for legal cases.`,
    market: `You are a market analyst for ${subject}.`,
    dark_funnel: `You are a dark funnel analytics AI for ${subject}.`,
    geofence: `You are a geofence campaign strategist for ${subject}.`,
    lookalike: `You are a lookalike audience strategist for ${subject}.`,
    viral: `You are a viral content analyst for ${subject}.`,
    autopilot: `You are an autopilot optimization AI for ${subject} ad campaigns.`,
    landing: `You are a landing page optimization AI for ${subject}.`,
  };
  return defaults[promptType];
}

function subjectFor(slug: string): string {
  switch (slug) {
    case "mass_tort": return "mass tort legal";
    case "skin_clinic": return "skin / aesthetics clinic";
    case "real_estate": return "real estate";
    case "solar": return "solar / renewable energy";
    case "dental": return "dental practice";
    case "home_services": return "home services";
    default: return "lead-driven business";
  }
}

/** Resolve firm_id from user_id (cached briefly). */
const firmCache = new Map<string, { firmId: string | null; expires: number }>();
export async function getFirmIdForUser(userId: string): Promise<string | null> {
  const cached = firmCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.firmId;
  const { data } = await adminClient()
    .from("firm_members")
    .select("firm_id")
    .eq("user_id", userId)
    .maybeSingle();
  const firmId = (data?.firm_id as string | undefined) ?? null;
  firmCache.set(userId, { firmId, expires: Date.now() + 60_000 });
  return firmId;
}
