# Core Platform API v1 — Extended Endpoints

All endpoints require:

```
x-client-id: <your api_client id>
x-client-secret: <your api_client secret>
Authorization: Bearer <user access token>   # end-user Supabase JWT on the Core Platform
Content-Type: application/json
```

Base URL:
```
https://sdtphgskqpelpbwhipls.supabase.co/functions/v1
```

The `firm_id` is derived server-side from the authenticated user via `firm_members`. Never pass `firm_id` in the body — it is ignored.

Errors: `{ "error": "<code>" }` with an HTTP status. `401 invalid_client`, `401 missing_access_token`, `403 no_firm`, `402 insufficient_credits`, `404 not_found`, `400` for validation.

---

## Marketing — `/api-v1-marketing`

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET  | `/meta-campaigns` | List firm's Meta campaigns |
| POST | `/meta-campaigns` | Create draft: `{ name, objective, ad_account_id, daily_budget?, tort_type?, target_states? }` |
| GET  | `/meta-campaigns/{id}` | Fetch one |
| GET  | `/meta-ads?campaign_id=` | List Meta ads |
| GET  | `/meta-creatives` | List Meta creatives |
| GET  | `/marketplace/leads?tort_type=&state=&limit=` | Mass Tort Marketplace listings (available, promoted, relisted) |
| POST | `/marketplace/leads/{id}/claim` | Purchase a lead. Charges wallet. Returns purchase result. |
| GET  | `/creative-studio` | List Creative Studio projects |
| POST | `/creative-studio` | `{ name, brief, tort_type?, target_audience?, brand_tone? }` |
| GET  | `/creative-studio/{id}` | Fetch full project incl. variants |
| GET  | `/brand-kit` | Read firm brand kit |
| PUT  | `/brand-kit` | Upsert `{ logo_url, colors, fonts, tone_of_voice, guidelines_md, trust_badges, disclaimer, ... }` |
| GET  | `/video-ads` | List video ad projects |
| POST | `/video-ads` | `{ title, brief, tort_type?, format?, duration_seconds? }` |
| GET  | `/video-ads/{id}` | Fetch one |

---

## Intelligence — `/api-v1-intelligence`

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/case-evaluate` | Runs AI case evaluator. Charges **5 credits**. Body forwards to internal `ai-case-evaluator` (e.g. `{ lead_id }` or `{ text }`). |
| GET  | `/case-evaluations` | List firm's evaluations |
| GET  | `/case-evaluations/{lead_id}` | Fetch evaluation for a lead |
| GET  | `/judges?q=&state=&jurisdiction=` | Search judge profiles (global reference data) |
| GET  | `/judges/{id}` | Full judge profile incl. sentiment, win rate, strategy notes |
| GET  | `/evidence?lead_id=` | List evidence vault items |
| GET  | `/evidence/{id}` | Fetch item |
| POST | `/evidence` | Append to chain of custody: `{ lead_id, file_name, file_url, sha256_hash, file_size?, mime_type?, metadata? }` — server computes `previous_hash` + `chain_position` |

---

## Landing Page Builder — `/api-v1-landing`

Full builder parity with the Core Platform UI: pages, reusable templates, snapshot versions, shareable preview links, custom domains, static catalogs (themes / section types / starter stacks), and AI helpers. Every resource is scoped to the caller's firm.

### Pages (published/live)
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/pages` | List firm's landing pages |
| POST   | `/pages` | `{ slug, page_title, headline?, subheadline?, cta_text?, cta_color?, sections?, personalization_rules?, campaign_id? }` |
| GET    | `/pages/{id}` | Fetch |
| PATCH  | `/pages/{id}` | Update fields |
| DELETE | `/pages/{id}` | Remove |
| POST   | `/pages/{id}/publish` / `/unpublish` | Toggle `is_published` |

Published pages are served publicly at `https://snuggle-site-synth.lovable.app/lp/{slug}`.

### Templates (starter, user, firm-shared)
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/templates` | List (query: `category`, `vertical`, `mine=1`) — includes starters, public, own, and firm |
| POST   | `/templates` | `{ name, snapshot, description?, category?, tags?, is_public?, thumbnail_url? }` |
| GET    | `/templates/{id}` | Fetch full snapshot |
| PATCH  | `/templates/{id}` | Update meta or snapshot |
| DELETE | `/templates/{id}` | Remove (firm-owned only) |

### Versions (snapshot history)
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/versions` | List firm snapshots |
| POST   | `/versions` | `{ snapshot, label?, note? }` |
| GET    | `/versions/{id}` | Fetch |
| DELETE | `/versions/{id}` | Remove |

### Previews (time-limited share links)
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/previews` | List firm previews |
| POST   | `/previews` | `{ version_id, expires_in_days? }` (default 7). Returns `{ preview: { token, expires_at } }` |
| DELETE | `/previews/{id}` | Revoke |
| GET    | `/preview-token/{token}` | **Public** — resolves a token to snapshot (no auth, no client secret; 410 when expired) |

### Custom domains
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/domains` | List firm domains |
| POST   | `/domains` | `{ hostname }` — enforces valid FQDN, returns DNS verification token |
| PATCH  | `/domains/{id}` | `{ is_primary?, notes? }` |
| DELETE | `/domains/{id}` | Remove |
| POST   | `/domains/{id}/verify` | Trigger DNS/SSL verification via `verify-landing-domain` |

### Catalogs (static, mirrors UI registries — full builder parity)
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/catalog` | Entire catalog in one payload (sections + themes + starter stacks) |
| GET    | `/catalog/themes` | Curated theme presets (`key`, `name`, `tagline`, `bestFor`) |
| GET    | `/catalog/themes/full` | Complete `LANDING_THEMES` incl. fonts, layout, hero config, palette |
| GET    | `/catalog/sections` | Compact list of section types |
| GET    | `/catalog/sections/full` | **Complete `SECTION_REGISTRY`** — for every section type: `label`, `description`, `icon` (lucide-react name), `defaultProps`, and `schema` (inspector field list). This is everything the external dashboard needs to render the exact same builder UI (add-section picker + right-rail inspector) 1:1 with the Core Platform. |
| GET    | `/catalog/sections/{type}` | One section definition (e.g. `hero`, `pricing_toggle`, `multi_step_form`) |
| GET    | `/catalog/starter-stacks` | Recommended section stack per theme key |

Inspector `schema` uses this `InspectorField` union — render each field with the matching control:

```ts
type InspectorField =
  | { kind: 'text';    key: string; label: string; placeholder?: string }
  | { kind: 'textarea';key: string; label: string; placeholder?: string; rows?: number }
  | { kind: 'image';   key: string; label: string }
  | { kind: 'select';  key: string; label: string; options: { value: string; label: string }[] }
  | { kind: 'number';  key: string; label: string; min?: number; max?: number }
  | { kind: 'toggle';  key: string; label: string }
  | { kind: 'cta';     key: string; label: string }
  | { kind: 'color';   key: string; label: string }
  | { kind: 'slider';  key: string; label: string; min: number; max: number; step?: number; unit?: string }
  | { kind: 'repeater';key: string; label: string; itemLabel: string;
      fields: InspectorField[]; defaultItem: Record<string, any> };
```

`icon` values are string names from `lucide-react` (e.g. `"LayoutTemplate"`, `"Sparkles"`) — import dynamically in the external dashboard to render the section picker.

### AI helpers
| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST   | `/ai/generate` | Full-page AI generation. Forwards to `dynamic-landing` — `{ tort_type?, category?, firm_name?, cta?, target_audience? }` → returns `{ page_title, hero, sections, personalization_rules, seo_keywords, … }` |
| POST   | `/ai/theme` | AI theme tweak. Forwards to `landing-theme-ai` |

### Typical builder flow (client-side)
```ts
// 1. Get starter theme + stack
const [themes, stacks] = await Promise.all([
  proxy('api-v1-landing', '/catalog/themes'),
  proxy('api-v1-landing', '/catalog/starter-stacks'),
]);

// 2. AI-generate the page snapshot
const gen = await proxy('api-v1-landing', '/ai/generate', 'POST', {
  tort_type: 'Roundup', firm_name: 'Doe & Partners',
});

// 3. Save as a version, then create a shareable preview link
const { version } = await proxy('api-v1-landing', '/versions', 'POST', { snapshot: gen });
const { preview } = await proxy('api-v1-landing', '/previews', 'POST', {
  version_id: version.id, expires_in_days: 14,
});
// preview.token → https://core-platform/lp-preview/{token}  (public route)

// 4. Publish as a live page
await proxy('api-v1-landing', '/pages', 'POST', {
  slug: 'roundup-doe-partners',
  page_title: gen.page_title,
  sections: gen.sections,
});
```

---

## Teams — `/api-v1-teams`

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/teams` | List firm's teams |
| POST   | `/teams` | `{ name, description? }` |
| GET    | `/teams/{id}` | Fetch |
| PATCH  | `/teams/{id}` | Rename / update description |
| DELETE | `/teams/{id}` | Remove |
| GET    | `/teams/{id}/members` | List team members |
| POST   | `/teams/{id}/members` | Invite: `{ email, full_name?, permissions? }` |
| DELETE | `/teams/{id}/members/{member_id}` | Remove |

---

## Smart Alerts — `/api-v1-alerts`

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/rules` | List firm's alert rules |
| POST   | `/rules` | `{ name, rule_type, conditions, notify_email?, notify_in_app? }` |
| PATCH  | `/rules/{id}` | Update |
| DELETE | `/rules/{id}` | Remove |
| GET    | `/notifications?unread=true` | List notifications (200 max) |
| POST   | `/notifications/{id}/read` | Mark read |

---

## Client integration

From the Mass Tort Dashboard, keep calling through the **server-side** `mt-proxy-forward` edge function (never expose `x-client-secret` in the browser). The proxy's `resource` maps 1:1 to the URL segment after `/api-v1-`; add an `action` for sub-paths and a `body` for POST/PATCH payloads.

Example (browser):
```ts
const { data } = await supabase.functions.invoke('mt-proxy-forward', {
  body: { endpoint: 'api-v1-intelligence', path: '/judges', method: 'GET', query: { state: 'TX' } },
});
```

Update `mt-proxy-forward` (server side) to forward `endpoint` + `path` to the corresponding Core Platform URL: `${CORE_URL}/functions/v1/${endpoint}${path}`, injecting `x-client-id`, `x-client-secret`, and the caller's Supabase JWT.
