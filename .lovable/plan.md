## Mass Tort Sub-Project | Architecture Plan

### Deployment model
Lovable projects are one app per project, so a truly independent deploy requires a **second Lovable project** in this workspace: `mass-tort-dashboard`. This plan covers the work in both projects.

- **Project A (this one, "Core Platform")**: expose a versioned, JWT-authenticated public API. No UI changes.
- **Project B (new, "Mass Tort Dashboard")**: standalone React/Vite app with its own branding, routing, Cloud DB (for tort-specific tables), and marketing platform. Talks to Core only via HTTPS APIs — never touches Core's DB.
- Auth: Mass Tort logs users in against Core via OAuth2 (Authorization Code + PKCE) and stores the returned JWT. Core remains the single identity/subscription/credits/roles source of truth.

### Project A | Core Platform API surface
New edge function group under `supabase/functions/api-v1-*` acting as the public REST facade. All endpoints:
- Validate a Core-issued JWT (RS256 via `SUPABASE_JWKS`) + `X-Client-Id` header.
- Enforce firm/role/module gates already in the DB.
- Return only the fields listed below (no internal columns, prompts, or admin data).

Endpoints (all `/api/v1/*`):
- `POST /oauth/token`, `POST /oauth/refresh`, `GET /oauth/userinfo` | delegate to Supabase Auth; issue short-lived access token + refresh token scoped to `mass_tort`.
- `GET /me`, `GET /me/firm`, `GET /me/subscription`, `GET /me/credits`, `GET /me/permissions`.
- `GET/POST /leads`, `GET/PATCH /leads/{id}`, `POST /leads/{id}/purchase`, `POST /leads/{id}/stage` | wraps `purchase_lead` + `charge_and_move_stage`.
- `GET/POST /campaigns`, `GET/POST /intake-forms`, `POST /intake-submissions` (public, no JWT for the submit route, HMAC-signed by the form).
- `GET/POST /crm/contacts`, `GET/POST /crm/notes`, `GET /crm/activity`.
- `POST /ai/case-evaluate`, `POST /ai/settlement-predict` | proxies existing functions; charges Core credits.
- `GET /analytics/leads`, `GET /analytics/campaigns`, `GET /analytics/pipeline`.
- `POST /webhooks/subscribe`, `DELETE /webhooks/{id}`, plus outbound webhook signer (`X-Signature: sha256=...`) for `lead.created`, `lead.stage_changed`, `subscription.updated`, `credits.updated`.

New tables in Core (migration in Project A):
- `api_clients` (client_id, hashed_secret, firm_id, allowed_scopes, is_active) | one row per sub-project install.
- `api_tokens` (client_id, user_id, refresh_hash, scopes, expires_at, revoked_at).
- `api_webhook_subscriptions` (client_id, firm_id, event, target_url, secret, is_active).
- `api_audit_log` (client_id, user_id, method, path, status, latency_ms, ip).

Rate limiting: per client_id + IP, in-memory + `api_audit_log` sliding window.

### Project B | Mass Tort Dashboard (new Lovable project)
Independent Vite + React + Tailwind app. Its own Lovable Cloud DB for tort-specific data.

Structure:
```
src/
  services/api/            auth, leads, campaigns, intake, crm, ai, analytics, billing, credits
  services/api/client.ts   fetch wrapper, token refresh, error normalization
  lib/branding/            per-firm white-label loader (logo/colors/fonts/company)
  lib/theme/               CSS var injector driven by branding
  routes/                  auth, dashboard, campaigns, intake-builder, cases,
                           plaintiffs, medical-records, litigation, marketing,
                           landing-builder, settings/branding
  features/mass-tort/      cases, plaintiffs, defendants, medical, litigation
  features/marketing/      landing pages, social calendar, ads (Meta/TikTok/Google)
                           via Core /marketing/* proxy endpoints
  features/landing-builder/  reuses shape of existing builder, stores in local DB,
                             publishes via Core /landing/publish
```

Mass-Tort-only tables (in Project B's Cloud DB):
- `mt_law_firms` (mirrors Core firm_id + tort-specific fields: bar numbers, MDL memberships).
- `mt_cases` (case_number, plaintiff_id, defendant_ids[], tort_type, litigation_status enum, statute_of_limitations, jurisdiction, mdl_number).
- `mt_plaintiffs`, `mt_defendants`, `mt_case_parties`.
- `mt_medical_records` (case_id, provider, record_date, storage_path, extracted_facts jsonb).
- `mt_litigation_events` (case_id, event_type, event_date, notes).
- `mt_campaigns` (tort_type, targeting jsonb, linked_core_campaign_id).
- `mt_intake_forms`, `mt_intake_submissions` (submissions push to Core `/intake-submissions`).
- `mt_landing_pages`, `mt_landing_versions`, `mt_landing_domains`.
- `mt_branding` (firm_id, logo_url, colors jsonb, fonts jsonb, company_name, login_bg, email_from_name, email_from_address, email_templates jsonb).

All tables get RLS scoped to `firm_id = current_firm()` (derived from Core JWT on the edge boundary).

### White-label (per-firm from DB)
- On login, `services/api/branding.ts` fetches `mt_branding` for the firm and writes CSS variables (`--brand-primary`, `--brand-accent`, `--font-heading`, `--font-body`, etc.) plus swaps logo/company name in header, sidebar, login screen, and email templates rendered server-side.
- Custom domains resolved via `mt_landing_domains`; Mass Tort app boots by `host` header, loads the matching firm's branding before first paint.

### Security posture
- No Core DB URL, service role key, admin routes, AI prompts, or internal function names in Project B.
- Project B only knows: `VITE_CORE_API_BASE`, `VITE_CORE_OAUTH_CLIENT_ID`, and its own Cloud creds.
- CORS allowlist on Core `/api/v1/*` is driven by `api_clients.allowed_origins`.
- Every AI call goes through Core; prompts stay in Core edge functions.

### Delivery phases
1. **Core API foundation** (this project): `api_clients`, OAuth token endpoints, JWT middleware, audit log, rate limiter, `/me/*` endpoints.
2. **Core resource endpoints**: leads, campaigns, intake, crm, ai proxy, analytics, webhooks.
3. **Scaffold Project B**: new Lovable project, base layout, routing, `services/api` layer, OAuth login, branding loader.
4. **Mass Tort DB + core screens**: cases, plaintiffs/defendants, medical records, litigation status, case detail view.
5. **Marketing suite in Project B**: landing builder, social calendar, ads dashboards (all backed by Core proxy endpoints).
6. **White-label polish + independent deploy**: per-firm branding editor, custom domains, publish `mass-tort.<domain>`.

### Out of scope
- Migrating existing Core UI screens into Project B.
- Rewriting existing Core AI functions | Project B calls them via `/api/v1/ai/*`.
- Building new AI models | reuses `ai-case-evaluator` and `settlement-predictor`.

### What I need from you before Phase 3
The second Lovable project. Create it in this workspace named `mass-tort-dashboard` and @mention it back here so I can scaffold into it.
