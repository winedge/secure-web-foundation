# Rebuild Mass Tort Backend

Rebuild the backend that Phase 4a/4b/4c summaries claimed shipped but that never landed. The Mass Tort frontend and the `api_clients` row (`mt_9f96f723f3489b5c`) already exist and stay untouched.

## 1. Database (single migration)

Create these tables in `public`, each with `GRANT` → `ENABLE RLS` → policies, following project convention (scope by `firm_id` via `is_firm_member` / `is_firm_owner`, `service_role` full access):

- **`mt_cases`** — id, firm_id, case_number, title, status, assigned_to, plaintiff_name (encrypted), tort_type, incident_date, statute_of_limitations, metadata jsonb, timestamps.
- **`mt_case_documents`** — id, case_id, firm_id, storage_path, file_name, mime_type, size_bytes, `scan_status` (`pending|clean|infected|error`), scan_result jsonb, uploaded_by, timestamps.
- **`mt_audit_log`** — id, firm_id, actor_id, action, resource_type, resource_id, before jsonb, after jsonb, ip, user_agent, created_at. Append-only (no UPDATE/DELETE policy).
- **`mt_notifications`** — id, firm_id, user_id, type (`case.assigned|case.status_changed|doc.scanned|quota.warning`), title, body, payload jsonb, read_at, created_at.
- **`mt_webhook_errors`** — id, firm_id, endpoint, event_type, payload jsonb, error, status_code, `retry_count`, `next_retry_at`, `last_attempt_at`, `resolved_at`, created_at (DLQ).
- **`mt_firm_quotas`** — firm_id PK, storage_bytes_used bigint, storage_bytes_limit bigint, doc_count, doc_count_limit, cases_count, cases_limit, updated_at.
- **`mt_saved_views`** — id, firm_id, user_id, name, view_type (`cases|documents`), filters jsonb, is_shared, timestamps.

Also:
- Trigger on `mt_case_documents` insert/delete → keep `mt_firm_quotas.storage_bytes_used` / `doc_count` in sync.
- Trigger on `mt_cases` insert/delete → keep `mt_firm_quotas.cases_count` in sync.
- Trigger on `mt_cases` update (status, assigned_to) → insert into `mt_notifications` + `mt_audit_log`.
- Materialized view **`mt_analytics_daily`** (firm_id, day, cases_created, cases_advanced, cases_rejected, docs_uploaded, avg_stage_seconds); grant SELECT only to `service_role`.
- Storage bucket **`mt-documents`** (private) via migration if not present, plus RLS on `storage.objects` scoping to `firm_id/`.

## 2. Edge functions

- **`mt-proxy`** — main API surface consumed by the sub-project. Validates `x-client-id` / `x-client-secret` against `api_clients` (already in `_shared/api-v1.ts`), validates user JWT, routes `resource + action`:
  - resources: `cases`, `documents`, `notifications`, `saved_views`, `audit` (read-only, `firm_owner` gated), `quotas` (read-only, `firm_owner` gated).
  - every mutation → append `mt_audit_log` row.
  - assignment/status changes → insert `mt_notifications`.
- **`mt-doc-scan`** — stub scanner. Called after upload, flips `scan_status` to `clean` after a stub check (structure ready for a real AV provider swap). Emits `doc.scanned` notification.
- **`mt-webhook`** — outbound webhook dispatcher. On failure writes to `mt_webhook_errors` with exponential `next_retry_at`.
- **`mt-webhook-retry`** — cron-driven; picks `mt_webhook_errors` where `next_retry_at <= now()` and `resolved_at IS NULL`, retries, updates DLQ row.
- **`mt-analytics-refresh`** — cron-driven; runs `REFRESH MATERIALIZED VIEW CONCURRENTLY mt_analytics_daily`.

Signed-URL uploads/downloads go through `mt-proxy` (`documents.upload_url`, `documents.download_url`) using `service_role` and the `mt-documents` bucket.

## 3. Cron jobs (via `insert` tool, not migration — contain project URL + anon key)

- `mt-analytics-refresh` — daily at 02:00.
- `mt-webhook-retry` — every 5 minutes.

## 4. Verification

After deploy: read `pg_matviews`, `cron.job`, and `information_schema.tables` to confirm every piece landed, and hit `mt-proxy` `me` route with the existing client to prove auth works end-to-end.

## Out of scope

- Frontend changes to the Mass Tort sub-project (already built and published).
- Rate limiting (per your earlier decision — CDN/edge layer).
- Real AV integration inside `mt-doc-scan` (stub; drop-in ready).
- Sentry DSN wiring (still your call when you have the DSN).

## Technical details

- All tables `authenticated` GRANT + `service_role` GRANT; no `anon` GRANT on any `mt_*` table.
- Policies reuse existing `public.is_firm_member(auth.uid(), firm_id)` and `public.is_firm_owner(auth.uid(), firm_id)`.
- Encrypted columns (plaintiff PII) stored as bytea; encryption remains client-side per existing ZK pattern — no plaintext PII on server.
- `mt_analytics_daily` uses `CREATE UNIQUE INDEX` on `(firm_id, day)` so `REFRESH ... CONCURRENTLY` works.
- Edge functions use `_shared/api-v1.ts` `authenticateRequest` + `withAudit`. CORS via `_shared/cors.ts`. Zod validation on all inputs.
- Deploy order: migration → edge functions → cron jobs → verification queries.
