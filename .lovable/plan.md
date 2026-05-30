# Migration Brief: Lovable Cloud + Supabase → Self-Hosted MySQL + Node/PM2

Produce a single handoff document (Markdown + DOCX in `/mnt/documents/`) that a VSCode-based engineering team (or Cursor/Copilot agent) can execute against. The doc is prescriptive: target stack, mapping tables, file-by-file rewrite checklist, env vars, and a phased cutover plan.

## Deliverable

- `/mnt/documents/backend-migration-brief.md`
- `/mnt/documents/backend-migration-brief.docx` (same content, formatted for partners)

## Document outline

1. **Executive summary** | why migrate (HIPAA control, vendor lock-in, cost), what stays (React/Vite frontend), what changes (DB, auth, storage, edge functions, realtime, AI gateway).
2. **Target architecture**
   - DB: MySQL 8.0 (AWS RDS or self-managed) + Prisma ORM
   - API: Node.js 20 + Express (or Fastify) running under PM2 cluster mode on EC2 / bare metal
   - Auth: Custom JWT (access + refresh, httpOnly cookies) + Passport + WebAuthn (`@simplewebauthn/server`) + TOTP (`speakeasy`)
   - Storage: S3 (BAA) via `@aws-sdk/client-s3`, signed URLs
   - Realtime: Socket.IO replacing Supabase Realtime
   - Background jobs: BullMQ + Redis (replaces edge function crons)
   - AI: direct Azure OpenAI / Vertex (BAA) replacing Lovable AI Gateway
   - Email: AWS SES (replaces Resend) | SMS: Twilio
   - Reverse proxy: Nginx + Let's Encrypt; PM2 ecosystem.config.js for process mgmt
3. **Schema migration**
   - Full list of every `public.*` table currently in Supabase (firms, leads, lead_purchases, user_roles, profiles, lead_blockchain, ai_transparency_logs, consent_logs, audit_logs, lead_activity_logs, wallet, etc.)
   - Postgres → MySQL type map (uuid → CHAR(36) or BINARY(16), jsonb → JSON, timestamptz → DATETIME(6) UTC, text[] → JSON, enum → ENUM or lookup table, `gen_random_uuid()` → app-side UUID v4)
   - RLS replacement: every `auth.uid()` policy becomes a service-layer guard (middleware + repository scoping by `firm_id` / `user_id`)
   - All 25+ `SECURITY DEFINER` functions (`purchase_lead`, `charge_and_move_stage`, `append_lead_block`, `match_lead_to_firms`, `get_vertical_config`, etc.) reimplemented as transactional service methods using `SELECT ... FOR UPDATE`
   - Triggers (blockchain append, activity logs, updated_at) become Prisma middleware or service hooks
   - `pgcrypto` (`digest`, `gen_random_bytes`) → Node `crypto` module
4. **Edge functions inventory & rewrite**
   - Walk `supabase/functions/*` and list each one with its new Express route, auth requirement, and dependencies (budget-reallocation, cross-firm-benchmarks, fraud-detection, google-lead-webhook, meta-lead-webhook, meta-oauth, webhook-handler, wallet-subscribe, admin-create-firm, etc.)
5. **Frontend changes**
   - Replace `@/integrations/supabase/client` with a typed `apiClient` (axios + React Query)
   - Swap `supabase.auth.*` calls for `/api/auth/*`
   - Swap `.from().select()` for REST endpoints (auto-generated table)
   - Swap realtime channels for Socket.IO hooks
   - Regenerate types from Prisma instead of `src/integrations/supabase/types.ts`
6. **Zero-knowledge crypto preservation**
   - Keep AES-256-GCM + ML-KEM-1024 client-side flow intact; server only stores ciphertext
   - WebAuthn challenge endpoint moves to Node
7. **Infra & DevOps**
   - `ecosystem.config.js` (cluster mode, instances: max, autorestart, log rotation)
   - Nginx config sample (TLS, gzip, websocket upgrade for Socket.IO)
   - MySQL hardening (TLS-only, IAM auth, encryption at rest, automated snapshots, point-in-time recovery)
   - Backup strategy (mysqldump nightly to S3 + binlog streaming)
   - CI/CD (GitHub Actions → SSH deploy → `pm2 reload ecosystem.config.js`)
   - Observability: Datadog APM, Winston → CloudWatch, Sentry
8. **Phased cutover (4 phases, ~6–8 weeks)**
   - Phase 1: Stand up MySQL + Node API in parallel, mirror schema, dual-write
   - Phase 2: Backfill historical data (Supabase → MySQL ETL script)
   - Phase 3: Cut frontend reads to new API behind feature flag
   - Phase 4: Cut writes, freeze Supabase, decommission
9. **Risk register & rollback** | per phase
10. **Acceptance checklist** | auth flows, lead purchase atomicity, blockchain hash chain integrity, RLS-equivalent isolation tests, AI consent logging, WebAuthn, MFA, Stripe webhooks, file uploads, realtime notifications
11. **Out of scope** | frontend UI, Stripe account, business logic changes

## Process

1. Read `supabase/functions/` directory listing and `src/integrations/supabase/types.ts` to enumerate every table and edge function exactly.
2. Generate the Markdown brief with the inventories filled in (no placeholders).
3. Convert to DOCX via `docx-js` with branded styling (navy/emerald per project memory, "|" instead of em dashes).
4. QA the DOCX by rendering pages to images and inspecting before delivery.
5. Emit `<presentation-artifact>` tags for both files.
