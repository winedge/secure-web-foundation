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

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/templates` | Global template catalog |
| GET    | `/pages` | List firm's landing pages |
| POST   | `/pages` | `{ slug, page_title, headline?, subheadline?, cta_text?, cta_color?, sections?, personalization_rules?, campaign_id? }` |
| GET    | `/pages/{id}` | Fetch |
| PATCH  | `/pages/{id}` | Update fields |
| DELETE | `/pages/{id}` | Remove |
| POST   | `/pages/{id}/publish` | Sets `is_published = true` |

Published pages are served publicly at `https://snuggle-site-synth.lovable.app/lp/{slug}`.

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
