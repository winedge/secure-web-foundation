# Deploy | CI/CD, MySQL migrations, zero-downtime cutover

End-to-end pipeline for the self-hosted MySQL + Node + PM2 + Nginx stack
described in `.lovable/plan.md` (backend migration brief).

## Pipeline overview

```text
PR --> ci.yml ---------> lint + type-check + unit tests
                         MySQL service + Prisma migrate deploy + integration tests
                         npm audit + Trivy + Gitleaks
                         Build frontend + backend artifacts

push develop ----------> deploy-staging.yml --> staging.leadsthru.com
tag v*.*.*  ----------> deploy-production.yml --> app.leadsthru.com
```

## Workflows

| File                                      | Trigger                          | Purpose                                                    |
| ----------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| `.github/workflows/ci.yml`                | PR + push to main/develop        | Lint, type-check, unit + integration tests, security scans |
| `.github/workflows/deploy-staging.yml`    | push to `develop`                | Zero-downtime deploy to staging                            |
| `.github/workflows/deploy-production.yml` | git tag `v*.*.*` or manual w/ confirmation | Zero-downtime deploy to production               |

## Zero-downtime strategy

1. **Build off-host** in GitHub Actions runners (frontend `dist/` + backend `dist/` + Prisma client).
2. **Snapshot MySQL** to S3 (KMS-encrypted) via `lt-db-snapshot.sh` BEFORE migrations run.
3. **Ship release tarball** to `releases/<sha>/` on the box | never overwrite the current release.
4. **Run `prisma migrate deploy`** | forward-only, idempotent. Re-running is a no-op.
5. **Pre-swap health check**: boot the new release on port 4001 and curl `/health` before touching production traffic. Fail closed.
6. **Atomic symlink swap**: `ln -sfn releases/<sha> current` is a single rename | no torn state.
7. **PM2 cluster reload** (`pm2 reload ecosystem.config.js --update-env`) | workers restart one at a time, each waits for `process.send('ready')` before old worker is killed (`wait_ready: true`, `listen_timeout: 10s`, `kill_timeout: 8s` for in-flight drain).
8. **Nginx graceful reload** (`systemctl reload nginx`) | new workers serve new connections, old workers finish in-flight requests.
9. **Live smoke tests** against `/health`, `/api/health/db`, `/api/health/redis`, `/api/health/blockchain`, `/api/health/stripe`.
10. **Auto-rollback** on any failure | re-symlink to previous release, `pm2 reload`, `nginx -s reload`.

## Migration rules (MySQL via Prisma)

- **Forward-only.** No `prisma migrate reset` in CI/CD. Ever.
- **Expand-then-contract** for schema changes that touch live data:
  1. Release N: add new column (nullable) | dual-write.
  2. Release N+1: backfill via job, swap reads.
  3. Release N+2: drop old column.
- **CI gates a migration if `prisma migrate status` reports drift** after `migrate deploy`.
- **Tenant isolation tests** (`npm run test:isolation`) must pass | they enforce the RLS-equivalent service-layer guards (`firm_id` scoping in every repository).
- **Blockchain integrity test** (`npm run test:blockchain-integrity`) verifies the SHA-256 hash chain after migrations | no migration may break `append_lead_block` continuity.

## Server prerequisites (one-time)

```bash
# Directory layout
sudo mkdir -p /var/www/leadsthru/{releases,shared/uploads}
sudo ln -sfn /var/www/leadsthru/releases/<first-release> /var/www/leadsthru/current

# Shared env file (NEVER committed)
sudo install -m 600 -o deploy -g deploy /dev/null /var/www/leadsthru/shared/.env

# PM2 + log rotation
npm i -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 14
pm2 startup systemd
pm2 save

# Nginx config + TLS
sudo cp deploy/nginx/leadsthru.conf /etc/nginx/sites-available/leadsthru
sudo ln -sf /etc/nginx/sites-available/leadsthru /etc/nginx/sites-enabled/
sudo certbot --nginx -d app.leadsthru.com

# DB snapshot helper
sudo install -m 750 -o root -g deploy deploy/scripts/lt-db-snapshot.sh /usr/local/bin/
sudo install -m 600 -o root -g deploy /dev/null /etc/leadsthru/db.env
# Populate db.env with DB_HOST / DB_USER / DB_PASS / DB_NAME
```

## Required GitHub secrets

| Secret                | Used by                | Notes                                       |
| --------------------- | ---------------------- | ------------------------------------------- |
| `STAGING_HOST`        | deploy-staging         | DNS or IP                                   |
| `STAGING_SSH_USER`    | deploy-staging         | Typically `deploy`                          |
| `STAGING_SSH_KEY`     | deploy-staging         | Ed25519 private key                         |
| `PROD_HOST`           | deploy-production      |                                             |
| `PROD_SSH_USER`       | deploy-production      |                                             |
| `PROD_SSH_KEY`        | deploy-production      |                                             |
| `SLACK_WEBHOOK_URL`   | deploy-production      | Success/failure notifications               |

## Rollback (manual)

```bash
ssh deploy@app
PREV=$(ls -1t /var/www/leadsthru/releases | sed -n '2p')
ln -sfn "/var/www/leadsthru/releases/$PREV" /var/www/leadsthru/current
cd /var/www/leadsthru/current
pm2 reload ecosystem.config.js --update-env
sudo systemctl reload nginx
```

To roll back the database, restore the pre-deploy snapshot from
`s3://leadsthru-db-backups/snapshots/<tag>/<timestamp>-pre-prod-<sha>.sql.gz`
and replay binlogs to the desired point-in-time.

## Acceptance checklist

- [ ] CI fails on any failing migration, isolation, or blockchain test.
- [ ] Staging deploy succeeds end-to-end on every `develop` push.
- [ ] Production deploy requires either a `v*.*.*` tag or manual `DEPLOY` confirmation.
- [ ] Pre-deploy snapshot exists in S3 before every production migration.
- [ ] `pm2 reload` reports zero failed workers; `pm2 logs` shows clean restart.
- [ ] Smoke tests green within 60s of cutover.
- [ ] Auto-rollback exercised in a game-day drill at least once per quarter.
