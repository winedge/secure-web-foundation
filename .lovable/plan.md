
# Website Doctor | AI Website Intelligence & Autonomous Repair

A new vertical-agnostic tool inside the existing SaaS. Users enter a URL, get a deep AI audit (UI/UX, SEO, performance, security, accessibility), optionally install a framework connector for codebase-level analysis, and receive AI-generated patches with safe apply + rollback. Designed multi-tenant from day one.

Since the existing repo is a React + Vite + Supabase (Lovable Cloud) app, this plan is scoped to what we can ship inside that stack. Heavy infra items (K8s, Playwright workers, multi-region) are called out as future phases — MVP runs on Edge Functions + queue tables + Firecrawl + Lovable AI.

---

## 1. Scope of this first build (MVP)

In-app deliverables:
- New tool "Website Doctor" exposed to **every vertical** (not gated by `enabled_modules`, or added to all vertical presets).
- Sidebar entry + route `/website-doctor` and detail route `/website-doctor/:projectId`.
- Pages: Projects list, New Project (URL input), Audit Report, Findings detail, Patches, Monitoring, Activity, Settings.
- External scan pipeline (no connector required) using Firecrawl + Lovable AI.
- Connector scaffolding (DB + token issuance + verify endpoint) but only the **Generic JS snippet** + **WordPress plugin stub** + **Laravel/Node SDK stubs** documented. Deep codebase analysis = Phase 2.
- Patch model + diff viewer UI in "suggest only" mode. Autonomous apply = Phase 3.
- Continuous monitoring scheduled via `pg_cron` calling an Edge Function (uptime + re-scan weekly).

Out of scope for MVP (tracked in roadmap below): autonomous apply, validation engine running real test suites, vector DB / AI memory, K8s workers, multi-region.

---

## 2. Vertical integration

Website Doctor is universal. Two changes:
- Add `website_doctor` to `ModuleKey` in `src/lib/verticals/types.ts`.
- Enable it by default in every preset in `src/lib/verticals/presets.ts` AND in a migration that inserts `vertical_module_access` rows for all existing verticals.
- Sidebar item in `sidebar-nav-data.ts` rendered unconditionally (or via `ModuleGate` that defaults open).

---

## 3. Database schema (new migration)

All tables in `public`, RLS on, GRANTs included. Scoped by `firm_id` via existing `get_user_firm_id` / `is_admin` helpers.

- `wd_projects` — id, firm_id, url, normalized_domain, name, detected_stack jsonb, health_score, monitoring_enabled, created_by, timestamps.
- `wd_connectors` — id, project_id, firm_id, type (`wordpress|laravel|node|generic`), status (`pending|verified|revoked`), token_hash, public_id, last_seen_at, framework_metadata jsonb.
- `wd_audits` — id, project_id, firm_id, kind (`external|internal`), status (`queued|running|complete|failed`), started_at, finished_at, summary jsonb, lighthouse jsonb, screenshots jsonb, error.
- `wd_findings` — id, audit_id, project_id, firm_id, category (`ui|seo|perf|security|a11y|code|infra`), severity (`info|low|medium|high|critical`), title, description, evidence jsonb, suggested_fix jsonb, confidence numeric, status (`open|acknowledged|fixed|ignored`).
- `wd_patches` — id, finding_id, project_id, firm_id, file_path, diff text, before_preview, after_preview, risk (`low|med|high`), confidence, status (`proposed|approved|applied|reverted|failed`), applied_at, applied_by, rollback_ref.
- `wd_monitor_events` — id, project_id, firm_id, kind (`uptime|cwv|error|security|seo_change`), payload jsonb, severity, created_at (partitioned-friendly index).
- `wd_ai_activity` — id, project_id, firm_id, agent (`auditor|uiux|perf|seo|security|code|patcher|validator|maintenance`), action, input jsonb, output jsonb, tokens, cost_cents, created_at.
- `wd_jobs` — id, project_id, firm_id, type, payload jsonb, status, attempts, run_after, locked_until, last_error. Drives the queue.

Indexes on `firm_id`, `project_id`, `(status, run_after)` for the job table.

RLS pattern: firm members SELECT/INSERT/UPDATE rows where `firm_id = get_user_firm_id(auth.uid())`; admins full access via `is_admin`. Connectors authenticate via signed token (verified in Edge Function with service role) — no anon GRANT on connector tables.

---

## 4. Edge Functions

- `wd-detect-stack` — input URL; uses Firecrawl scrape (html + headers + branding) and a Lovable AI call to classify CMS / framework / hosting / CDN / analytics.
- `wd-external-audit` — orchestrates Firecrawl scrape + a Lighthouse-style report via PageSpeed Insights public API (no key needed) + AI summarization into structured findings. Writes `wd_findings`.
- `wd-issue-connector-token` — creates `wd_connectors` row, returns one-time token (hashed at rest).
- `wd-connector-verify` — connector POSTs signed handshake; marks verified, stores framework metadata.
- `wd-connector-ingest` — receives codebase metadata/snippets from agents (Phase 2 stub now).
- `wd-generate-patch` — takes a finding + optional code context, calls Lovable AI with structured `Output.object` to return unified diff + risk + explanation.
- `wd-monitor-tick` — cron entrypoint; iterates projects with `monitoring_enabled`, runs uptime check + scheduled re-audit, writes `wd_monitor_events`.
- `wd-job-runner` — pulls from `wd_jobs`, dispatches.

All use the shared CORS + JWT-validation pattern, plus zod input validation. AI calls go through the AI SDK + Lovable AI Gateway (`google/gemini-3-flash-preview` default; `gpt-5-mini` for code reasoning).

---

## 5. Frontend architecture

New folder `src/components/website-doctor/` and pages under `src/pages/website-doctor/`:

- `WebsiteDoctorProjects.tsx` — list + "Add website" dialog (URL only).
- `WebsiteDoctorProject.tsx` — tabs: Overview, Audit, Findings, Patches, Connector, Monitoring, Activity, Settings.
- `NewScanFlow.tsx` — URL → detect stack → run external audit (live progress via Supabase Realtime on `wd_audits`).
- `FindingCard.tsx`, `SeverityBadge.tsx`, `HealthScoreRing.tsx`, `StackBadge.tsx`.
- `DiffViewer.tsx` — react-diff-viewer for `wd_patches.diff`.
- `ConnectorInstall.tsx` — tabbed install instructions (WordPress / Laravel / Node / Generic JS) + token reveal + verification status (polls/realtime).
- `MonitoringPanel.tsx` — uptime sparkline, CWV trend, alert list.
- `AiActivityFeed.tsx` — live stream of `wd_ai_activity`.

Hooks: `use-wd-projects`, `use-wd-audit`, `use-wd-findings`, `use-wd-patches`, `use-wd-monitor`, all using `@tanstack/react-query` + Supabase realtime subscriptions.

Design follows existing tokens (dark navy / emerald). Pipe symbol `|` instead of em dashes (project rule).

---

## 6. Connector architecture (scaffolding now, depth later)

- Token issued by `wd-issue-connector-token`, stored hashed; connector keeps it in env.
- Handshake: connector signs `{project_id, timestamp, nonce}` with HMAC(token), Edge Function verifies and marks verified.
- Ingest channel: connector POSTs framework metadata (routes, plugins, package.json, composer.json, etc.) → stored in `wd_connectors.framework_metadata`.
- Repo placeholders: `connectors/wordpress/`, `connectors/laravel/`, `connectors/node/`, `connectors/generic/` each with a README describing handshake + ingest contract. Actual plugin/package publishing is Phase 2.

Safety contract documented up-front: connectors never receive shell commands in MVP. Patch apply endpoint (`wd-apply-patch`) exists but returns `mode_disabled` until Phase 3.

---

## 7. AI agent orchestration

Single orchestrator Edge Function `wd-orchestrator` that runs an AI SDK loop with `stopWhen: stepCountIs(50)` and tools:
- `detectStack`, `runExternalAudit`, `summarizeLighthouse`, `classifyFinding`, `generatePatch`, `scoreRisk`, `writeFinding`, `writePatch`.

Each tool's result is logged to `wd_ai_activity`. Agents 1–10 from the brief are realized as **prompts + tool subsets** rather than separate services, which keeps MVP shippable while matching the conceptual model.

Memory: per-project rolling summary stored on `wd_projects.detected_stack` + a `wd_project_memory` table (Phase 2, pgvector).

---

## 8. Monitoring & scheduling

- `pg_cron` job every 5 min → `wd-monitor-tick` (uptime).
- Daily cron → CWV re-check via PageSpeed Insights.
- Weekly cron → full external re-audit.
- Realtime publication added for `wd_audits`, `wd_findings`, `wd_ai_activity`, `wd_monitor_events`.

---

## 9. Security

- RLS on every table; firm isolation enforced via `get_user_firm_id`.
- Connector tokens stored as SHA-256 hash; shown once.
- Signed connector requests (HMAC) verified server-side.
- Edge Functions validate JWT for user-facing endpoints; connector endpoints validate HMAC instead.
- All AI decisions written to `wd_ai_activity` (matches existing AI transparency rule).
- Compliance badge ("ABA 512 / GDPR / EU AI Act") shown on Website Doctor pages per project memory.

---

## 10. Roadmap

- **MVP (this build):** schema, vertical wiring, projects, external audit, findings, patch suggestions (no apply), connector token issuance + verify, basic monitoring, dashboards.
- **Phase 2:** real connector packages (WordPress plugin, Laravel/Node SDKs), codebase ingestion, pgvector memory, validation engine running connector-side tests, richer diff/PR flow.
- **Phase 3:** approved-apply mode, autonomous maintenance mode ("AI CTO"), rollback automation, K8s Playwright workers, multi-region queue, billing/usage metering per scan.

---

## 11. Files to add / change (high level)

- Migration: create `wd_*` tables + RLS + GRANTs + cron jobs + realtime publication + seed `vertical_module_access` rows.
- `src/lib/verticals/types.ts`, `src/lib/verticals/presets.ts` — add `website_doctor` module.
- `src/components/layout/sidebar-nav-data.ts` — add nav entry.
- `src/App.tsx` — add routes.
- New pages + components under `src/pages/website-doctor/` and `src/components/website-doctor/`.
- New hooks under `src/hooks/website-doctor/`.
- Edge Functions under `supabase/functions/wd-*`.
- `connectors/` folder with README stubs for each framework.

Approve this and I'll start with the migration + vertical wiring, then the projects/audit UI, then the AI orchestrator + Firecrawl/PageSpeed integrations.
