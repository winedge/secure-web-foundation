## Goal
Extend the existing SEO Suite (`/seo/*`) with **9 new AI-powered tools** focused on AI search visibility (GEO/AEO), built using the same patterns as the current `SeoKeywords` / `SeoBacklinks` / `SeoCitations` pages: one React page per tool + one Supabase Edge Function per tool, all calling the Lovable AI Gateway (`google/gemini-2.5-flash` for analysis, `gemini-2.5-pro` for deep simulation).

## Tools to add

| # | Tool | Route | Edge Function |
|---|------|-------|---------------|
| 1 | AI Search Visibility Tracker | `/seo/ai-visibility` | `ai-visibility-tracker` |
| 2 | GEO Optimizer | `/seo/geo-optimizer` | `geo-optimizer` |
| 3 | Entity Authority Engine | `/seo/entity-authority` | `entity-authority` |
| 4 | AI Prompt Mining Engine | `/seo/prompt-mining` | `prompt-mining` |
| 5 | AI Internal Linking Engine | `/seo/internal-linking` | `internal-linking-ai` |
| 6 | AI Content Decay Detector | `/seo/content-decay` | `content-decay-detector` |
| 7 | Competitor AI Intelligence | `/seo/competitor-ai` | `competitor-ai-intel` |
| 8 | AI Brand Reputation Monitor | `/seo/brand-reputation` | `brand-reputation-ai` |
| 9 | Autonomous SEO Agent | `/seo/seo-agent` | `autonomous-seo-agent` |

## Architecture (uniform across all 9 tools)

**Frontend page** (under `src/pages/seo/ai/`):
- Input form (brand, domain, competitors, topic, etc. | tool-specific)
- "Run Analysis" button → `supabase.functions.invoke(<fn>)`
- Result rendered as score cards + tables + AI-generated recommendations
- Loading state, error toast, history list of past runs for that firm
- Reuses existing UI primitives (Card, Table, Badge, Progress, Tabs)
- Compliance badge "ABA 512 / GDPR / EU AI Act" (per core memory)

**Edge function** (`supabase/functions/<name>/index.ts`):
- CORS + JWT validation (same pattern as `seo-keyword-research`)
- Zod validation of body
- Calls Lovable AI Gateway with `response_format: json_object` and a tool-specific structured-output prompt
- For Tools 1, 7, 8: also calls **Firecrawl search** (already configured) to fetch real AI Overview / competitor SERP data when needed
- For Tools 2, 6: scrapes target URL via Firecrawl `scrape` before sending to AI
- Inserts a row into `ai_seo_runs` table for history + audit
- Returns structured JSON

## Database

One new table `ai_seo_runs`:
- `tool` text (one of the 9 keys)
- `firm_id` uuid
- `user_id` uuid
- `input` jsonb
- `output` jsonb
- `model` text
- `created_at` timestamptz
- RLS: firm members can read their firm's runs; admins read all; insert via service role from edge functions

This gives every tool free history, exportability, and compliance logging without per-tool tables.

## Hub & navigation updates

- `src/pages/seo/SeoHub.tsx`: add a second section **"AI Search & GEO Tools"** that lists the 9 new tools as cards (icon + name + 1-line description + "NEW" badge).
- `src/App.tsx`: register 9 new routes (lazy-loaded), protected by `ProtectedRoute`.
- `src/components/layout/sidebar-nav-data.ts`: add an "AI SEO" sub-group under the existing SEO section linking to each tool.

## Per-tool specifics (summary)

1. **AI Visibility Tracker** | inputs: brand, industry, location, competitors. Generates 15-25 prompt variations via AI, optionally executes a subset via Firecrawl search against `chatgpt.com/share`, `perplexity.ai`, `google.com/search?udm=50` to capture real mentions; computes Share of Voice, mention frequency, citation domains, sentiment. Dashboard with charts (Recharts) + per-engine breakdown.
2. **GEO Optimizer** | inputs: URL or pasted content. Scrapes via Firecrawl, scores AI-readability/semantic chunking/citation friendliness/answer extraction/entity clarity/factual density (0-100 each, plus per-engine scores for ChatGPT / Perplexity / Google AIO). "Rewrite" button regenerates content optimized for AI extraction. Citation simulation returns confidence + missing trust signals.
3. **Entity Authority Engine** | inputs: URL or topic. Extracts entities (brands/services/products/people/locations/topics), renders relationship map (simple force-graph using `react-force-graph-2d` already viable, otherwise SVG cluster). Schema generator outputs JSON-LD for Organization/FAQ/Article/Event/Product/LocalBusiness with copy-to-clipboard. Gap detector compares against competitor URL.
4. **Prompt Mining Engine** | inputs: brand/topic/industry. AI generates 50+ conversational prompts, clusters by intent (informational/transactional/local/comparison/purchase), scores each for AI visibility opportunity, competition, buyer intent, conversion probability. Sortable table + cluster view.
5. **AI Internal Linking Engine** | inputs: domain. Uses Firecrawl `map` to enumerate URLs, then AI groups pages into topic silos, identifies orphans, suggests contextual links with anchor text. Crawl-flow visualization (simple tree).
6. **Content Decay Detector** | inputs: URL. Scrapes content + metadata, AI estimates freshness decay, ranking-risk score, outdated entities, declining authority signals; generates refresh recommendations (new sections, FAQs, entity expansion, schema improvements).
7. **Competitor AI Intelligence** | inputs: your domain + 1-3 competitor domains. Scrapes top pages of each, AI compares entity coverage / topical clusters / content depth / schema usage / semantic structure; outputs competitor weakness analysis, attack strategies, missing topic opportunities, AI visibility gaps.
8. **AI Brand Reputation Monitor** | inputs: brand name. Generates "describe X", "is X trustworthy", "X reviews", "X vs competitors" prompts and runs them via Firecrawl search across AI engines; captures AI-generated descriptions, sentiment, detected misinformation / hallucinations / outdated info; returns reputation-repair suggestions (PR opportunities, trust pages, review improvements).
9. **Autonomous SEO Agent** | inputs: domain. Runs an orchestrated multi-step audit (uses existing `seo-deep-scan` + new GEO Optimizer + Entity Authority + Internal Linking under the hood), then emits a prioritized recommendations feed (content opportunities, entity opportunities, technical fixes, GEO improvements). Each recommendation has impact / effort / category + "Apply" stub (creates a task in `ai_seo_runs` with `tool='agent_recommendation'`).

## Out of scope (this pass)
- Real-time scheduled scans / cron jobs (can be added later via `pg_cron`)
- Direct API integration with ChatGPT/Perplexity/Claude APIs for live mentions (we use Firecrawl-based scraping as a proxy; can swap later when official APIs are available)
- Paid third-party SEO data providers (Semrush/Ahrefs) | all metrics are AI-estimated and clearly labelled "AI-estimated"

## Deliverables
- 1 migration (table + RLS)
- 9 edge functions
- 9 new React pages under `src/pages/seo/ai/`
- Updated `SeoHub.tsx`, `App.tsx`, sidebar nav
- All tools functional with mock-free real AI output via Lovable AI Gateway