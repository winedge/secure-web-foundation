# Website Doctor — Node Connector

A tiny Node.js agent that polls Website Doctor for approved patches and
applies them to a local website tree, with automatic file backups.

## Install

```bash
cd /path/to/your/site
npm install website-doctor-connector # or copy this folder
```

## Run

```bash
export WD_API_URL="https://<your-project-ref>.supabase.co/functions/v1"
export WD_PUBLIC_ID="conn_pub_xxx"
export WD_TOKEN="conn_secret_xxx"   # shown ONCE in the Website Doctor UI
export WD_ROOT="/var/www/mysite"    # optional, default = cwd
export WD_INTERVAL=30               # optional, seconds

npx wd-connector
```

Run it under `systemd`, `pm2`, or Docker for a persistent agent.

## What it does

1. `POST /wd-connector-sync { action: "poll" }` — fetches up to 10 approved patches.
2. Snapshots each target file into `.wd-backup/<file>.<ts>.bak`.
3. Applies the unified diff with the `diff` package.
4. Reports `applied` + `rollback_ref` (or `failed` + error message).

Path traversal is blocked: every `file_path` must resolve inside `WD_ROOT`.

## Rollback

To roll back a patch manually:

```bash
cp .wd-backup/<rollback_ref> path/to/file
```

The `rollback_ref` is stored on the patch record in Website Doctor.
