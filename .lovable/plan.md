# SEO & Google My Business for Non-Legal Verticals

Add a new "Local Presence" section visible to all verticals **except** Mass Tort, containing two flagship features:
1. **Google My Business (GMB) Manager** | create, claim, and manage GMB listings from inside the platform
2. **SEO Suite** | site deep-scan reports plus intermediate SEO tools

## Scope: which verticals get this

GMB + SEO modules will be enabled for: `skin_clinic`, `real_estate`, `solar`, `dental`, `home_services`, `custom`. Explicitly **excluded** from `mass_tort` (legal firms have their own intelligence stack).

---

## 1. Module + navigation wiring

**`src/lib/verticals/types.ts`** | add new module keys:
```
| 'gmb_manager'
| 'seo_suite'
| 'tool_seo_deep_scan'
| 'tool_keyword_research'
| 'tool_backlink_audit'
| 'tool_local_citations'
| 'tool_review_manager'
| 'tool_gmb_post_scheduler'
```

**`src/lib/verticals/presets.ts`** | append `gmb_manager`, `seo_suite`, and the 6 tool keys to `enabledModules` for every preset except `mass_tort`.

**Database migration** | insert matching rows into `vertical_module_access` so server-side `get_vertical_config` returns them. Also insert `seo_*` and `gmb_*` records into `ai_tools` registry (if applicable) and into `vertical_lead_categories` if needed.

**`src/components/layout/sidebar-nav-data.ts`** | add a new `Local Presence` group:
```
{
  label: 'Local Presence', icon: MapPin, items: [
    { name: 'Google My Business', href: '/gmb', icon: Store, module: 'gmb_manager' },
    { name: 'SEO Suite', href: '/seo', icon: Search, module: 'seo_suite' },
    { name: 'SEO Deep Scan', href: '/seo/deep-scan', icon: ScanLine, module: 'tool_seo_deep_scan' },
    { name: 'Keyword Research', href: '/seo/keywords', icon: KeyRound, module: 'tool_keyword_research' },
    { name: 'Backlink Audit', href: '/seo/backlinks', icon: Link2, module: 'tool_backlink_audit' },
    { name: 'Local Citations', href: '/seo/citations', icon: ListChecks, module: 'tool_local_citations' },
    { name: 'Review Manager', href: '/gmb/reviews', icon: Star, module: 'tool_review_manager' },
    { name: 'GMB Post Scheduler', href: '/gmb/posts', icon: CalendarPlus, module: 'tool_gmb_post_scheduler' },
  ],
}
```
Existing `applyVerticalToNav` automatically hides items whose `module` is not enabled, so Mass Tort firms see nothing.

---

## 2. Google My Business pages

**Routes** (all under `DashboardLayout`, gated by `ModuleGate`):
- `/gmb` | overview dashboard (locations, status pills, insights snapshot, "Connect / Create Listing" CTA)
- `/gmb/locations/:id` | per-location editor: NAP (name/address/phone), hours, categories, services, attributes, photos
- `/gmb/reviews` | review inbox with AI-suggested replies (uses Lovable AI `google/gemini-2.5-flash`)
- `/gmb/posts` | scheduled posts/offers/events calendar

**Backend**:
- New table `gmb_locations` (firm_id, place_id, name, address, phone, primary_category, status, oauth_token_ref, last_synced_at, raw_payload jsonb).
- New table `gmb_reviews` (location_id, reviewer, rating, text, reply_text, replied_at).
- New table `gmb_posts` (location_id, type, summary, media_url, scheduled_for, status).
- New edge functions: `gmb-oauth` (Google OAuth callback), `gmb-sync` (pull locations/reviews), `gmb-publish` (push posts/replies).
- Secrets required (request via `add_secret` after approval): `GMB_CLIENT_ID`, `GMB_CLIENT_SECRET` for the Google Business Profile API.

**MVP fallback**: until OAuth is configured, the UI renders fully functional CRUD against our own tables and shows a "Connect Google" banner | this lets the feature ship even before the Google Cloud project is set up.

---

## 3. SEO Suite pages

**Routes**:
- `/seo` | hub showing recent scans + quick actions
- `/seo/deep-scan` | input URL → triggers crawl → results page
- `/seo/deep-scan/:reportId` | the polished report (see below)
- `/seo/keywords`, `/seo/backlinks`, `/seo/citations` | individual tool pages following the existing `AiToolPage` shell pattern

**Deep Scan report design** (`/seo/deep-scan/:reportId`):
```
+----------------------------------------------------+
| Header: site URL, scan date, overall score (0-100) |
+----------------------------------------------------+
| StatCards:  Pages Crawled | Errors | Warnings |    |
|             Avg Load (ms) | Mobile Score | A11y    |
+----------------------------------------------------+
| Tabs: Overview · Issues · Performance · SEO · A11y |
|       · Best Practices · Backlinks · Sitemap       |
+----------------------------------------------------+
| Issue table: severity pill, category, page,        |
|              recommendation, "Fix it" CTA          |
+----------------------------------------------------+
| Charts (recharts):                                 |
|  - Score breakdown radial                          |
|  - Issues by severity (bar)                        |
|  - Page load distribution (histogram)              |
+----------------------------------------------------+
| Export: PDF / CSV  |  Re-run scan  |  Share link   |
+----------------------------------------------------+
```
Uses existing dark-navy theme, emerald trust accents, ABA/GDPR compliance badge in footer (per project memory).

**Backend**:
- Table `seo_scans` (id, firm_id, url, status, overall_score, summary jsonb, raw_report jsonb, created_at).
- Table `seo_issues` (scan_id, severity, category, page_url, message, recommendation).
- Edge function `seo-deep-scan` | uses **Firecrawl** (`FIRECRAWL_API_KEY` already configured) to crawl + Lovable AI (`google/gemini-2.5-flash`) to summarize/recommend fixes. Writes results to `seo_scans` / `seo_issues`. Returns `scan_id` for the report page to poll.
- Edge function `seo-keyword-research` and `seo-backlink-audit` | thin AI wrappers using Lovable AI Gateway for ideation/analysis (no extra keys needed).

---

## 4. Routing + access control

- Register new routes in `src/App.tsx`, each wrapped with `ProtectedRoute` and a `ModuleGate` so users without the module see the existing upgrade screen.
- Add `useFeatureGate`-friendly metadata (premium flag on advanced tools like backlink audit / GMB post scheduler).

---

## Technical details

- All new tables get RLS: firm members can `select/insert/update/delete` rows where `firm_id = get_user_firm_id(auth.uid())`; admins via `is_admin()`.
- GMB OAuth tokens stored encrypted via existing `pqc-wrapper` helper (project memory: AES-256-GCM + ML-KEM-1024).
- Every AI call writes an `ai_transparency_logs` row (per memory rule).
- Em dashes replaced with pipe `|` in all new copy.
- Loading: 5s timeout on data fetch, 3s on auth (per memory).
- Reuse `StatCard`, `ComplianceBadge`, `recharts`, `shadcn/ui` Tabs/Table primitives | no new deps required for MVP.

## Files to create / edit

Edit:
- `src/lib/verticals/types.ts`, `src/lib/verticals/presets.ts`
- `src/components/layout/sidebar-nav-data.ts`
- `src/App.tsx`

Create pages:
- `src/pages/gmb/GmbDashboard.tsx`, `GmbLocationEditor.tsx`, `GmbReviews.tsx`, `GmbPosts.tsx`
- `src/pages/seo/SeoHub.tsx`, `SeoDeepScan.tsx`, `SeoDeepScanReport.tsx`, `SeoKeywords.tsx`, `SeoBacklinks.tsx`, `SeoCitations.tsx`

Create hooks:
- `src/hooks/use-gmb.ts`, `src/hooks/use-seo-scans.ts`

Create edge functions:
- `supabase/functions/gmb-oauth/index.ts`, `gmb-sync/index.ts`, `gmb-publish/index.ts`
- `supabase/functions/seo-deep-scan/index.ts`, `seo-keyword-research/index.ts`, `seo-backlink-audit/index.ts`

Migrations:
- New tables: `gmb_locations`, `gmb_reviews`, `gmb_posts`, `seo_scans`, `seo_issues` (all with RLS).
- Insert module access rows for all non-`mass_tort` verticals.

## Open questions / asks before/during build

1. **GMB OAuth**: I'll ship CRUD against our own tables first; when you're ready to enable real Google sync, I'll request `GMB_CLIENT_ID` / `GMB_CLIENT_SECRET`. OK to defer?
2. **SEO crawl depth**: default to 50 pages / 2 levels deep for the deep-scan MVP (Firecrawl tier-friendly). Sound right?
