
# Meta Ads Manager (2026) | Gap Audit & Roadmap

Audit of existing code under `src/components/meta-ads/*`, `supabase/functions/meta-*`, and tables `meta_campaigns / meta_ad_sets / meta_ads / meta_creatives / meta_custom_audiences / meta_lead_forms / meta_pixels / meta_pages / meta_ig_accounts / meta_insights_* / meta_audit_log / meta_job_queue / meta_automated_rules / meta_ab_tests / meta_saved_reports / meta_recommendations`.

Existing edge actions in `meta-ads-sync`: get/set ad_accounts, create/update/delete campaign, create/update adset, create ad, refresh creative, fetch analytics, sync_from_meta, publish_campaign, toggle_status, reach_estimate, live_insights, duplicate_campaign, create_ab_test, get_lead_forms, fetch_form_leads, subscribe_lead_updates, verify_webhook, verify_pixel, lead_form_webhook. Plus `meta-publish-campaign`, `meta-webhook`, `meta-lead-webhook`, `meta-targeting-search`, `meta-job-worker`, `meta-oauth`, `meta-ai-*`.

Legend | P0 Critical | P1 High | P2 Medium | P3 Low

---

## SECTION A | Campaign Layer

| Feature | Status | Priority |
|---|---|---|
| Buying type (AUCTION) | column exists, no UI selector | P2 |
| Reach & Frequency buying | missing entirely | P2 |
| Special Ad Categories | column exists, no UI enforcement | P0 (legal/compliance) |
| A/B Testing | `meta_ab_tests` table + create_ab_test action exist; no results UI, no winner promotion | P1 |
| CBO (Campaign Budget Optimization) | `is_cbo` column, no UI toggle, no enforcement vs adset budgets | P1 |
| Advantage Campaign Budget | missing | P1 |
| Budget scheduling (high/low spend dates) | missing | P2 |
| Day parting / ad scheduling | missing (no `adset_schedule` field) | P1 |
| Spend cap | column exists, no UI | P1 |
| Campaign drafts | implicit via `status='draft'` | OK |
| Campaign versioning | none | P2 |
| Approval workflows | `review_status/reviewed_by` exist; no UI flow | P1 |
| Campaign templates | missing | P2 |
| Duplicate campaign | `duplicate_campaign` exists, no deep-copy of adsets/ads | P1 |
| Bulk editing (multi-select status/budget) | missing | P0 |

## SECTION B | Ad Set Layer

Conversion Locations: only Website / Instant Form / Phone / Messenger / WhatsApp / App in wizard | Calls and **Instagram-profile** and **App** destinations not wired to publish payload | P0 |
Optimization Goals: enum exists, only a subset in UI (LEADS, LINK_CLICKS) | missing REACH, IMPRESSIONS, LANDING_PAGE_VIEWS, OFFSITE_CONVERSIONS, VALUE, THRUPLAY | P0 |

Audiences:
- Custom Audiences: `meta_custom_audiences` table + AudiencePickers exist | no create/sync flow | P0
- Lookalike: `lookalike-audience` function exists | not surfaced in adset builder | P1
- Advantage+ Audience | missing | P1
- Audience suggestions / expansion toggles | missing | P2

Targeting:
- Age/Gender | present
- Languages | missing
- Interests/Behaviors/Demographics search | `meta-targeting-search` exists | not wired into wizard
- Life events / income / job titles / education / parents / relationship status | missing UI

Location:
- Country/States | present
- Radius / postal codes / regions / cities / excluded locations / pin drop | missing

Placements: only Advantage placements assumed; no manual placements UI (FB/IG/Messenger/Audience Network checkboxes, device, OS, position) | P0

Delivery: cost cap / bid cap / ROAS goal not exposed | attribution_spec column exists, no UI | frequency_control_specs column exists, no UI | P1

## SECTION C | Ad Layer

Creative types: only single image/video; missing Carousel, Collection, Dynamic Creative, Instant Experience, Catalog (DPA), Advantage+ Creative | P0
Asset variations / multiple headlines & descriptions / dynamic text | missing | P1
AI enhancements (cropping, expansion, brightness, text variations) | missing | P2
UTM builder / URL params builder | missing | P1
Deep links / app links | missing | P2
Identity: Page selected via adset; IG account binding partial; WhatsApp identity missing | P1

## SECTION D | Lead Generation

Instant Forms:
- Form Types (More Volume / Higher Intent / Rich Creative) | missing
- Form builder UI (intro, custom questions, conditional logic, appointment, consent, privacy, disclaimer, thank-you) | missing | P0
- Question types beyond defaults | missing
- Lead delivery: webhook + Supabase sync exists; CRM-side connectors (Salesforce/HubSpot/Zoho/GHL/Zapier) | `crm-sync` exists but no per-provider mapping UI | P1

## SECTION E | Audience System

Audience Builder UI | missing | P0
Custom + Lookalike + Value-based Lookalike | partial backend, no UI | P0
Audience Insights / Recommendations / Overlap | missing | P2
Audience library / sharing / permissions | missing | P2

## SECTION F | Reporting

Metrics columns exist in `meta_insights_*_daily` (impressions, reach, clicks, spend, conversions). Missing: CPM/CPC/CTR/CPL/ROAS computed views, Purchases & Revenue ingest from `actions`/`action_values`, multi-attribution windows.
Breakdowns: age, gender, placement, device, country/region/city, hour, day | not implemented in ingest or UI | P0
Saved Reports table exists | no schedule/export pipeline | P1
Exports: CSV/XLSX/PDF | missing | P1

## SECTION G | Automation

`meta_automated_rules` table + `campaign-autopilot` exist. Missing: rule builder UI (conditions, time windows), Slack/email/webhook actions, scale rules, monitoring dashboard | P1

## SECTION H | Infrastructure

Webhook receiver exists. Missing: lead-gen subscription auto-provisioning per page, retry/DLQ visibility, rate-limit backoff metrics, audit log viewer (table exists, no UI), version history | P1

## SECTION I | Enterprise

Workspaces (firms exist) | OK
RBAC for Meta Ads (publisher/viewer/approver) | missing | P1
Asset permissions / approval flows | partial (`review_status`) | P1
Comments / change history UI | missing | P2

## SECTION J | Media Library

`meta_media_assets` table exists. Missing: library UI, folders, tags, search, bulk upload, asset reuse, creative templates | P1

## SECTION K | Meta API Coverage

Implemented: `/me/adaccounts`, `/act_{id}/campaigns`, `/act_{id}/adsets`, `/act_{id}/ads`, `/act_{id}/adcreatives` (basic), `/act_{id}/insights` (basic), `/{form_id}/leads`, `/{page_id}/leadgen_forms`, `/{page_id}/subscribed_apps`, pixel verify.

Missing / needed:
- `/act_{id}/reachestimate` (have stub) + `/act_{id}/delivery_estimate`
- `/act_{id}/targetingsearch`, `/targetingbrowse`, `/targetingsuggestions`, `/targetingvalidation`
- `/act_{id}/customaudiences` CRUD + `/{audience}/users` (hashed upload)
- `/act_{id}/saved_audiences`
- `/act_{id}/adimages`, `/act_{id}/advideos` (upload + chunked)
- `/act_{id}/adcreatives` full (carousel, collection, asset_feed_spec, dynamic_creative)
- `/act_{id}/adlabels`, `/act_{id}/adrules_library`, `/act_{id}/adrules_history`
- `/act_{id}/insights` with `breakdowns`, `action_breakdowns`, `time_increment`, `action_attribution_windows`
- `/act_{id}/copies` (bulk duplication)
- `/{ad_id}/previews` (multi-format)
- `/{campaign_id}/budget_schedules`
- `/act_{id}/instant_experiences`
- `/{page_id}/instagram_accounts`, `/me/businesses`
- Webhook fields: `ad_account`, `application`, `page` leadgen | only leadgen subscribed
- Deprecated to remove: `reach` & `conversions` legacy objectives if any | enum currently OK (uses `OUTCOME_*`)

---

## FINAL ROADMAP

### Phase 1 | Critical (blocks parity with Ads Manager)
1. **Manual Placements & Advantage toggle** | adset wizard step, `targeting.publisher_platforms/facebook_positions/instagram_positions/device_platforms`, persist + publish.
2. **Full Optimization Goals + Billing Event matrix** | enum mapping per objective; validation.
3. **Special Ad Categories enforcement** | required selector on campaign step; lock targeting (age/gender/zip) when CREDIT/EMPLOYMENT/HOUSING/SOCIAL_ISSUES.
4. **Location targeting** | radius, cities, postal codes, regions, excluded locations | `meta-targeting-search` extension + map UI.
5. **Custom Audience CRUD + Lookalike builder** | new `audience-builder` edge actions, Audiences tab UI replacing read-only table.
6. **Carousel + Dynamic Creative ads** | `asset_feed_spec` builder, multi-card UI, publish payload.
7. **Instant Form Builder** | full form designer (intro, questions, conditional logic, consent, TY screen), `create_lead_form` action.
8. **Reporting breakdowns + computed KPIs** | extend `meta-ads-sync.fetch_analytics` with `breakdowns`, new tables `meta_insights_breakdown_daily`, ratio views.
9. **Bulk editing & multi-select toolbar** | tables refactor.
10. **Conversion-location wiring fix** | App / IG profile / Calls payload mapping in `meta-publish-campaign`.

### Phase 2 | High
11. CBO + spend caps + budget scheduling + day parting UI.
12. A/B test results & winner promotion.
13. Approval workflow UI (uses existing `review_status`).
14. UTM builder + URL params on ad form.
15. Automated rules builder + Slack/email actions.
16. CRM mapping UI per provider (Salesforce/HubSpot/Zoho/GHL/Zapier) on top of `crm-sync`.
17. Saved/scheduled reports + CSV/XLSX/PDF export pipeline.
18. Media Library UI on `meta_media_assets` + chunked video upload.
19. Ad previews for all placements via `/{ad_id}/previews`.
20. Audit log viewer (table exists).

### Phase 3 | Growth
21. Advantage+ Audience / Advantage+ Creative.
22. Audience Insights, Overlap, Recommendations.
23. Catalog (DPA) + Collection + Instant Experience.
24. AI creative enhancements (cropping, expansion, text variants).
25. Reach & Frequency buying type.
26. Lookalike value-based + seed sharing.
27. Campaign templates + versioning.

### Phase 4 | Enterprise
28. Meta-Ads RBAC (publisher/viewer/approver) on top of existing `firm_members`.
29. Asset permissions + approval routing.
30. Comments + change history UI.
31. Workspace-level shared audiences/creatives library.
32. Rate-limit/DLQ dashboards, webhook health, replay tools.

---

## Per-feature task template (applied to each roadmap item)

For every item the implementation ticket will contain:

- **Frontend**: components touched, new wizard steps, validation states, semantic-token styling.
- **Backend**: new actions in `meta-ads-sync` (or new edge function), Zod schemas, error handling.
- **DB**: migration (new columns/tables, GRANTs, RLS via `is_firm_member`).
- **API**: exact Meta Graph endpoints + fields.
- **Validation**: required fields, objective→goal→billing matrix, Special Ad Category lockouts.
- **Testing**: unit (Zod), edge function curl test, UI smoke, publish dry-run.

No existing functionality will be rebuilt | only the gaps above will be implemented, reusing current tables, hooks (`use-meta-campaigns`, `use-meta-tables`, `use-meta-targeting`, `use-meta-realtime`), and shells (`MetaAdsManagerShell`, `MetaCampaignWizard`, `CampaignCreateWizard`).

Approve this audit + roadmap and I'll start Phase 1 in order (item 1 → 10), one PR-sized change per turn.
