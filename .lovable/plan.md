

## Production-Grade Multi-Vertical System + Full AI Suite Optimization

Transform LeadThru into a fully industry-agnostic platform where **every page, AI tool, pipeline, intake, setting, and edge function** adapts to the active firm's vertical (Mass Tort, Skin Clinic, Real Estate, Solar, Dental, Home Services, Custom). Zero breaking changes for existing users.

---

### 1. Database Schema (New Migration)

**New tables:**
- `industry_verticals` — `slug`, `name`, `description`, `icon`, `is_system`, `is_active`
- `vertical_pipeline_stages` — stages with `order`, `default_fee`, `icon`, `color`, `requires_payment`
- `vertical_intake_fields` — dynamic field definitions (`field_type`, `options`, `required`, `validation_regex`)
- `vertical_lead_categories` — generic replacement for tort_types
- `vertical_terminology` — UI label overrides (`lead_singular`, `category_label`, `evaluator_title`, `marketplace_title`, etc.)
- `vertical_ai_prompts` — `prompt_type` (scoring/evaluation/intake/document/creative/competitor/predictive/settlement/background/fraud/social/video/intent/judge/market/dark_funnel), `system_prompt`, `output_schema` jsonb, `model`, `version`
- `vertical_module_access` — which modules are enabled per vertical (e.g., "settlement_predictor" only for legal verticals)

**Modified tables (backward compatible):**
- `firms` → `vertical_id`, `vertical_locked`
- `leads` → `vertical_id`, `category` (mirrors `tort_type`), `custom_fields jsonb`
- `lead_purchases` → drop hardcoded stage trigger; replace with vertical-aware version

**New SQL functions:**
- `get_vertical_config(_firm_id)` — bundled config (stages + fields + terminology + categories + enabled modules) in one call
- `get_pipeline_stage_counts(_firm_id, _vertical_id)` — dynamic stage counts
- Updated `match_lead_to_firms()` and `get_marketplace_leads()` to filter by vertical

**Backfill:** All existing firms → `mass_tort`; all existing leads → `mass_tort` + `category = tort_type`.

**Seeded presets (6 verticals):**

| Vertical | Stages | Categories | Enabled AI Modules |
|---|---|---|---|
| Mass Tort | New → Call Verify → Medical → Retainer | Camp Lejeune, Roundup, AFFF | All (legal-specific: Settlement Predictor, Judge Intel, Case Evaluator) |
| Skin Clinic | New → Consultation → Treatment Plan → Booked | Botox, Laser, Acne | Lead Scoring, Background, Document, Intake AI, Creative, Social, Video |
| Real Estate | New → Qualified → Showing → Offer → Closed | Buy, Sell, Rent | Lead Scoring, Background, Market Pulse, Predictive, Creative, Social, Video |
| Solar | New → Site Survey → Quote → Contract | Residential, Commercial, Battery | Lead Scoring, Document, Intake AI, Creative, Social, Geofence |
| Dental | New → Consult → Quote → Booked | Implants, Ortho, Cosmetic | Lead Scoring, Background, Document, Intake AI, Creative, Social |
| Home Services | New → Estimate → Scheduled → Completed | HVAC, Plumbing, Roofing | Lead Scoring, Document, Intake AI, Creative, Social, Geofence |

---

### 2. Vertical Configuration Layer

**New files:**
- `src/lib/verticals/types.ts` — TypeScript types
- `src/lib/verticals/presets.ts` — full preset definitions (mirrors migration seed for client fallback)
- `src/lib/verticals/vertical-context.tsx` — React context provider, cached via React Query (5-min stale)
- `src/hooks/use-vertical.ts` — `useVertical()` returns `{ vertical, stages, terminology, categories, intakeFields, enabledModules, isLoading }`
- `src/hooks/use-pipeline-stages.ts` — vertical-aware replacement for hardcoded `PIPELINE_STAGES`
- `src/hooks/use-vertical-module.ts` — `useVerticalModule(moduleKey)` returns whether module is enabled for active vertical

`VerticalProvider` wraps app inside `App.tsx` after `AuthProvider`, with realtime invalidation on vertical changes.

---

### 3. Onboarding Flow (Vertical Selection)

**Edit `src/pages/Onboarding.tsx`:**
- New **Step 1: Choose Industry Vertical** with visual cards (icon, name, description, "what's included" preview of stages/fields/AI tools)
- Existing firm-creation step becomes Step 2
- New `src/components/onboarding/VerticalSelector.tsx`

---

### 4. Settings — Industry & Workflow Tab

**Edit `src/pages/Settings.tsx`** — new "Industry & Workflow" tab:
- **Current vertical** display + switch button (warning modal explaining label changes)
- **Pipeline Stages editor** — reorder, rename, edit fees (validates min 2 stages)
- **Intake Fields editor** — add/edit/remove custom fields, mark required, reorder
- **Categories editor** — manage lead categories (e.g., add new tort type or treatment type)
- **Terminology overrides** — customize labels (e.g., "Lead" → "Patient" / "Client")
- **AI Prompt customization** — per-tool system prompt editor with reset-to-default
- **Module toggles** — enable/disable individual AI tools for the vertical

---

### 5. Full AI Suite — Vertical-Aware Optimization

**Every AI edge function** is updated to load `vertical_ai_prompts` for the firm's `vertical_id` and use vertical-specific schemas. New `supabase/functions/_shared/vertical.ts` helper loads vertical config + prompts in one call (cached per cold start).

| Edge Function | Vertical Adaptation |
|---|---|
| `ai-lead-scoring` | Vertical-specific scoring rubric & factors (legal viability vs. clinical fit vs. buyer qualification vs. solar suitability) |
| `ai-case-evaluator` & `ai-document-case-evaluator` | Vertical-specific evaluation prompts + output schemas (case viability vs. treatment plan vs. property valuation vs. site assessment); also dynamic UI title in `AiCaseEvaluator.tsx` |
| `intake-chatbot` | Vertical-specific conversation flow + dynamic required-field set from `vertical_intake_fields` |
| `ingest-leads` | Validates against vertical's intake schema; auto-assigns `vertical_id` |
| `ai-lead-search` | Search ranking criteria per vertical (urgency for legal, budget for real estate, timeline for home services) |
| `background-check` | Adjusts source databases per vertical (PACER for legal; license boards for clinics; credit checks for real estate) |
| `document-analyzer` | Vertical-specific document types (medical records → consultation forms → property deeds → utility bills) |
| `ai-creative-studio` | Vertical-specific creative briefs, tone, compliance disclaimers |
| `social-content-generator` & `viral-content` | Vertical-specific platforms, hashtags, content angles |
| `generate-video-ad` & `ai-video-ads` | Vertical-specific scripts, scenes, CTAs |
| `competitor-intelligence` | Vertical-specific competitor categories & messaging analysis |
| `meta-ai-assistant` & `google-ads-ai` | Vertical-specific targeting, keywords, ad copy guidance |
| `predictive-leads` | Vertical-specific conversion patterns (gated to verticals where it makes sense) |
| `settlement-predictor` | **Gated to legal verticals only**; hidden for others |
| `judge-intelligence` | **Gated to legal verticals only** |
| `market-pulse` | Vertical-specific market signals (legal claims trends vs. real estate inventory vs. solar incentives) |
| `intent-signals` & `dark-funnel` | Vertical-specific intent keywords & funnel stages |
| `lookalike-audience` | Vertical-specific seed-audience attributes |
| `geofence-engine` | Vertical-specific radius defaults & trigger conditions |
| `fraud-detection` | Vertical-specific fraud signals (legal red flags vs. real estate wire fraud vs. solar door-to-door scams) |
| `ai-self-learning` | Vertical-specific feedback loop + blueprint generation |
| `cross-firm-benchmarks` | Benchmarks scoped to same vertical for fair comparison |
| `cross-platform-autopilot` & `campaign-autopilot` & `budget-reallocation` | Vertical-specific KPIs (CPA targets, conversion definitions) |
| `dynamic-landing` | Vertical-specific landing page templates & copy |

Plus client-side updates: `useAiLeadScore`, `useAiCaseEvaluation`, `useCompetitorIntelligence`, etc. all pass `vertical_id` and read vertical-specific output schemas.

---

### 6. UI — Dynamic Terminology & Module Gating Everywhere

Every hardcoded "Tort", "Mass Tort", "Medical Records", "Retainer" reference replaced with `useVertical()` lookups:

- `src/components/layout/sidebar-nav-data.ts` → labels become functions of vertical; modules hidden per `enabledModules` (e.g., Settlement Predictor hidden for non-legal verticals)
- `src/components/leads/PipelineStageCards.tsx` → renders stages from vertical config (not hardcoded 4)
- `LeadPipelineTable.tsx`, `LeadCard.tsx`, `LeadDetailModal.tsx` → dynamic columns, labels, stage actions, tabs (Medical tab only when vertical has medical fields; Property Photos tab for real estate)
- `src/pages/MyLeads.tsx`, `Marketplace.tsx`, `Intake.tsx`, `IntakeFormBuilder.tsx`, `Reports.tsx`, `Dashboard.tsx`, `AiCaseEvaluator.tsx`, `AdminLeads.tsx` → consume `useVertical()`
- `AiCaseEvaluatorPanel.tsx` → renamed via `terminology.evaluator_title`
- All AI tool pages (`CompetitorIntelligence`, `CreativeStudio`, `ViralContentEngine`, `VideoAdGenerator`, `PredictiveLeads`, `SmartAlerts`, `MarketPulseRadar`, `JudgeIntelligence`, `DarkFunnelIntelligence`, `IntentSignalTracker`, `LookalikeAudience`, `GeofenceCampaigns`, `FraudDetection`, `CrossFirmBenchmarks`, `CrossPlatformAutopilot`) → wrapped in `<ModuleGate moduleKey="..." />` with friendly "not available for your vertical" empty state and option to enable

---

### 7. Production Readiness

- **Type safety** — full TypeScript types + Zod validation in every edge function
- **Performance** — `get_vertical_config()` single round-trip; React Query 5-min cache; in-memory edge cache per cold start
- **Realtime** — vertical changes broadcast via Supabase realtime → instant UI refresh
- **Error boundaries** — graceful fallback to `mass_tort` defaults if vertical fetch fails
- **Audit logging** — all vertical/stage/field/prompt/module changes logged to `audit_logs`
- **RLS** — explicit policies on all new tables; admin-only writes for system presets; firm owners write their custom overrides
- **Migration idempotency** — `IF NOT EXISTS` + conditional inserts for safe re-runs
- **Loading & empty states** — skeleton screens + friendly empty UIs everywhere
- **Backward compatibility** — existing firms auto-mass_tort, `tort_type` ↔ `category` sync trigger, fallback prompts in edge functions
- **Documentation** — `src/lib/verticals/README.md` with "adding a new vertical" guide

---

### 8. Files Summary

**New (~12):**
- `supabase/migrations/<ts>_industry_verticals.sql`
- `supabase/functions/_shared/vertical.ts`
- `src/lib/verticals/types.ts`, `presets.ts`, `vertical-context.tsx`, `README.md`
- `src/hooks/use-vertical.ts`, `use-pipeline-stages.ts`, `use-vertical-module.ts`
- `src/components/onboarding/VerticalSelector.tsx`
- `src/components/settings/VerticalSettingsTab.tsx`
- `src/components/verticals/ModuleGate.tsx`

**Edited (~50):** all pages in `src/pages/`, all components in `src/components/leads/` and `src/components/layout/`, and ~25 edge functions to become vertical-aware.

---

### Quick confirms before building

1. Ship with the **6 verticals + Custom**, or different set?
2. Allow existing Mass Tort firms to **switch verticals** (with warning), or **lock** to preserve historical integrity?
3. Include the **full Settings editor** (stages, fields, AI prompts, module toggles) in this build, or ship presets first and editor in a follow-up?

