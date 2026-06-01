# LeadsThru | MySQL Migration Strategy

This directory contains everything needed to recreate the entire LeadsThru
schema (~113 tables / 8 enums) in **MySQL 8** from the source Supabase
Postgres database, plus an idempotent seeder for reference data.

```
backend/db/
├── migrations/                  # Versioned MySQL DDL (applied in lexical order)
│   ├── 0001_init_enums.sql      # Enum reference values (CHECK-emulated)
│   ├── 0002_init_tables.sql     # All CREATE TABLE statements (no FKs)
│   ├── 0003_init_foreign_keys.sql
│   └── 0004_init_indexes.sql
├── seed/                        # JSON dumps of system / reference tables
│   ├── industry_verticals.json
│   ├── vertical_pipeline_stages.json
│   └── … (15 reference tables, ~445 rows)
├── scripts/
│   ├── pg-to-mysql.mjs          # Introspect PG -> regenerate migrations/
│   ├── export-seed.mjs          # Dump reference data from PG -> seed/
│   ├── apply-migrations.sh      # Apply migrations/ to a MySQL DB (tracked)
│   └── load-seed.mjs            # Upsert seed/*.json into MySQL
└── package.json
```

## Strategy

### 1 | Schema export (one-shot)

`pg-to-mysql.mjs` introspects the live Postgres catalog (`pg_class`,
`pg_constraint`, `information_schema`) and regenerates the four migration
files end-to-end. It is **deterministic and re-runnable** | every time the
Postgres schema changes, re-run it and commit the diff.

Type mapping highlights:

| Postgres            | MySQL 8                                  |
| ------------------- | ---------------------------------------- |
| `uuid`              | `CHAR(36)` with `DEFAULT (UUID())`       |
| `jsonb` / `json`    | `JSON` (defaults wrapped in `(...)`)     |
| `timestamptz`       | `DATETIME(6)` (UTC convention)           |
| `text[]` / arrays   | `JSON`                                   |
| `USER-DEFINED` enum | `VARCHAR(64)` + comment `/* enum:name */`|
| `inet` / `cidr`     | `VARCHAR(45)`                            |
| `bytea`             | `LONGBLOB`                               |

FKs that reference Supabase's `auth.users` are emitted as **comments** in
`0003`. In a self-hosted MySQL deployment, replace those with a FK to your
own `users` table (or drop them and validate at the application layer).

### 2 | Versioned migrations

`apply-migrations.sh` is a tiny dependency-free runner. It creates a
`_schema_migrations(name PK, applied_at)` tracking table and applies each
`migrations/NNNN_*.sql` file exactly once, in order.

```bash
DATABASE_URL=mysql://leadsthru:secret@db:3306/leadsthru \
  ./scripts/apply-migrations.sh
```

New migrations: drop another file in `migrations/` named
`NNNN_description.sql` (e.g. `0005_add_lead_archived_flag.sql`). They run on
the next deploy.

### 3 | Seed data

`export-seed.mjs` dumps **system / reference tables only** (verticals,
pipeline stage templates, intake field templates, AI prompt templates, lead
sources, tort types, landing page templates, role/module permissions,
admin_settings…). Tenant data is never exported.

`load-seed.mjs` upserts those JSON files into MySQL using
`INSERT … ON DUPLICATE KEY UPDATE` on `id`, so it is safe to run on every
deploy (idempotent).

## Typical workflows

### Initial provisioning of a new MySQL environment

```bash
cd backend/db
npm install
DATABASE_URL=mysql://root:root@127.0.0.1:3306/leadsthru npm run db:reset
#   = db:migrate (creates 113 tables) + db:seed (loads 445 reference rows)
```

### Regenerate after a Postgres schema change

```bash
# Point PG* env vars at the source Supabase project, then:
cd backend/db
npm run db:export-schema   # rewrites migrations/0001..0004
npm run db:export-seed     # refreshes seed/*.json
git diff                   # review, commit, ship
```

### Production deploy

```bash
DATABASE_URL=$PROD_MYSQL_URL ./scripts/apply-migrations.sh
DATABASE_URL=$PROD_MYSQL_URL node scripts/load-seed.mjs
```

The `.github/workflows/ci.yml` `migration-test` job already spins up a
MySQL 8 service and validates that migrations apply cleanly and are
idempotent (re-running must be a no-op).

## Caveats and intentional gaps

1. **RLS policies are not portable** | Postgres RLS does not exist in
   MySQL. All tenant isolation must be re-implemented in the application
   layer (see `src/lib/auth-context.tsx` and `backend` service code). The
   CI job `test:isolation` exists to enforce this at the integration-test
   level.
2. **Database functions / triggers** | The 25+ `SECURITY DEFINER`
   functions in Postgres (`purchase_lead`, `append_lead_block`,
   `match_lead_to_firms`, `charge_and_move_stage`, …) are **not**
   auto-converted. Port them one by one to MySQL stored procedures, or
   (preferred) move the logic into the Node backend service layer so it
   stays portable and easier to test.
3. **Enums** | MySQL has a native `ENUM` type but it is awkward to extend.
   We use `VARCHAR(64)` and rely on application-level validation. Reference
   values are documented in `0001_init_enums.sql`.
4. **Expression indexes** | Skipped automatically; recreate by hand if
   they prove necessary for query performance.
5. **Storage buckets** (`firm-logos`, `lead-documents`, …) are Supabase
   Storage and have no MySQL equivalent. Plan a parallel migration to S3 /
   GCS / local disk and update `src/lib/landing-media/process-image.ts` and
   related upload helpers.
6. **`auth.*` schema** | Supabase Auth tables are not exported. Pick a
   replacement (Auth.js, Lucia, Keycloak…) before cutover and update the
   commented-out FKs in `0003_init_foreign_keys.sql`.

## Verifying a fresh install

```bash
mysql -uroot -p leadsthru -e "
  SELECT
    (SELECT COUNT(*) FROM information_schema.tables
       WHERE table_schema=DATABASE()) AS tables,
    (SELECT COUNT(*) FROM industry_verticals)         AS verticals,
    (SELECT COUNT(*) FROM vertical_pipeline_stages)   AS stages,
    (SELECT COUNT(*) FROM landing_page_templates)     AS templates;"
```

Expected: 114 tables (113 + `_schema_migrations`), 6 verticals, 25 stages,
28 templates.
