## Competitor Ad Library (Google Ads Transparency)

Add a new tool that lets users look up the live & historical ads a competitor is running on Google — pulling from Google's Ads Transparency Center, plus AI analysis of creatives and messaging angles.

### What the user gets

A new page under **SEO → AI Search & GEO Tools** called **"Competitor Ad Library"**:

- Input: competitor brand/domain, region (default India), date range, ad format filter (Text / Image / Video / Shopping).
- Output:
  - List of active and recently-run ads with advertiser name, format, regions, first/last seen dates, and a link to the original Transparency Center entry.
  - Creative preview (image/video thumbnail or text headline+description).
  - AI breakdown: dominant offers, emotional angles, CTAs, keywords/themes, audience targeting hints, ad cadence over time.
  - "Counter-ad ideas" — AI-generated headline/description variants the user can run against the competitor.
  - Export to CSV.

### Data sources (in order of preference)

1. **Google Ads Transparency Center scrape via Firecrawl** — `https://adstransparency.google.com/advertiser/<id>?region=IN`. Firecrawl is already wired in. We resolve domain → advertiser ID via Transparency search, then scrape the advertiser page (`formats: ['html','rawHtml','screenshot','links']`), parse out creatives. Falls back to a `/search?...` scrape when no direct ID is found.
2. **SerpApi-style fallback (optional)** — if scraping is blocked, surface a friendly empty state telling the user to paste a Transparency Center URL directly; we then scrape that URL.
3. **AI enrichment** via Lovable AI Gateway (`google/gemini-2.5-flash`) on the parsed creatives to produce the breakdown + counter-ad ideas.

No paid third-party SDK is required. The Google Ads Library itself is Meta — Google's equivalent is the Ads Transparency Center, which is what we'll use.

### Backend

- New edge function `competitor-ad-library/index.ts`:
  - Input: `{ brand, domain, region, dateRange, formats[], firmId, advertiserUrl? }`.
  - Step 1: if `advertiserUrl` given, use it; else Firecrawl `scrape` on `https://adstransparency.google.com/?region=...` search for the domain, extract advertiser id.
  - Step 2: Firecrawl `scrape` advertiser page → parse creative cards (HTML selectors + regex on JSON blobs Google embeds).
  - Step 3: normalize into `{ creativeId, format, headline, body, mediaUrl, firstSeen, lastSeen, regions, transparencyUrl }[]`.
  - Step 4: send a compact summary to Lovable AI → returns `{ themes, offers, ctas, audienceHints, cadenceNotes, counterAdIdeas[] }`.
  - Persist run + results in two new tables; return `{ runId }`.
- Wrap the long work in `EdgeRuntime.waitUntil()` so the client gets `runId` immediately (same pattern as `seo-deep-scan`).

### Database (one migration)

- `competitor_ad_runs` — `firm_id`, `brand`, `domain`, `region`, `date_range`, `formats`, `status` (`pending|complete|error`), `advertiser_id`, `advertiser_url`, `ai_summary jsonb`, `error_message`, timestamps.
- `competitor_ad_creatives` — `run_id` FK, `creative_id`, `format`, `headline`, `body`, `media_url`, `first_seen`, `last_seen`, `regions text[]`, `transparency_url`, `raw jsonb`.
- RLS: firm members can read/write rows where `firm_id` matches the user's firm (reuse the existing `has_role` / firm membership helpers).

### Frontend

- New page `src/pages/seo/ai/CompetitorAdLibrary.tsx` (not the generic `AiSeoToolPage` — this one has a custom layout):
  - Top: input form (brand, domain, region select, date range, format chips, optional advertiser URL).
  - Polling on `runId` until status = `complete`.
  - Tabs: **Creatives grid** (cards with thumbnail/headline, format badge, date range, "View on Google" link), **AI Insights** (themes, offers, CTAs, cadence chart), **Counter-Ad Ideas** (copy-to-clipboard cards), **Raw data / CSV export**.
- Hook `src/hooks/use-competitor-ads.ts` — start run, poll status, fetch creatives, list past runs.
- Register route `/seo/ai/competitor-ad-library` in `src/App.tsx`.
- Add a card on `SeoHub.tsx` under "AI Search & GEO Tools" with the `Megaphone` icon.

### Compliance & limits

- Show "Source: Google Ads Transparency Center" attribution on every result, with link back to the original entry (required by Google's ToS for derived data).
- Log every AI call to `ai_transparency_logs` (existing pattern from memory).
- Rate-limit: max 5 runs per firm per hour, enforced in the edge function via a `select count(*) … where created_at > now() - interval '1 hour'` check.

### Out of scope (call out, don't build)

- Real-time ad spend estimates (Google doesn't expose this).
- Meta / TikTok / LinkedIn ad libraries — separate tools, can be follow-ups.
- Auto-launching counter ads into Google Ads — manual copy/paste for now.
