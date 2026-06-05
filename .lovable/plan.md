## Goal

Add a "Download PDF Report" button on the SEO Deep Scan results page that exports a polished, client-ready PDF of the full scan report.

## Approach

Use client-side PDF generation with `jspdf` + `jspdf-autotable` (lightweight, no server round-trip, instantly downloadable). All scan data is already loaded in the page (`scan`, `issues`, `summary`), so the export reads from existing state.

## PDF Design

Branded, multi-page document:

1. **Cover page** — Big title "SEO Deep Scan Report", scanned URL, scan date, overall score (large color-coded number), compliance footer ("ABA 512 / GDPR / EU AI Act").
2. **Executive Summary** — AI summary text, key metrics grid (pages crawled, errors, warnings, score).
3. **Page Vitals** — Title, meta description (with char counts), word count, links, headings, schema types.
4. **Site Health Checks** — Crawl & AI discoverability (robots, sitemap, llms.txt, hreflang), security headers (HSTS, CSP, etc.), on-page technical (canonical, viewport, OG, etc.) | rendered as check/cross rows.
5. **Priority Actions** — Each action as a card-style block with title, impact/effort badges, and recommendation text.
6. **Issues Table** — Full list grouped by severity (critical → info), columns: Severity, Category, Page, Issue, Recommendation. Uses autoTable for clean pagination.
7. **Page-by-page breakdown** — Table of crawled pages with words, H1 count, alt-missing, issues.
8. **Footer on every page** — Page number, generated date, brand mark.

Styling uses the project's dark navy + emerald palette translated to RGB for jsPDF, clean typography hierarchy, proper margins and spacing, color-coded severity badges, and section dividers.

## Files

- **`package.json`** — add `jspdf` and `jspdf-autotable`.
- **`src/lib/seo-report-pdf.ts`** (new) — `generateSeoReportPdf(scan, issues)` function. Encapsulates all PDF layout/styling logic so the page stays clean.
- **`src/pages/seo/SeoDeepScanReport.tsx`** — add a "Download PDF" button next to "Export CSV" wired to the new helper, with a loading state and toast.

## Out of scope

No backend changes, no edge function, no changes to scan logic or data shape.
