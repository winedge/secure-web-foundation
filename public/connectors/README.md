# Website Doctor — Connector Clients

Lightweight agents that run on the customer's website host. They poll the
Website Doctor API for **approved** patches, apply them to local files
(with a rollback snapshot), and report success/failure back.

All clients speak the same protocol:

```
POST {SUPABASE_URL}/functions/v1/wd-connector-sync
{
  "public_id": "<connector public id>",
  "token":     "<connector secret token>",
  "action":    "poll" | "report",
  ...
}
```

Issued via `wd-issue-connector-token` from the Website Doctor UI.

## Available clients

- `wordpress/` — drop-in PHP must-use plugin for WordPress sites.
- `node/`      — Node.js CLI agent for any static / Node-based site.

Both clients:
1. Poll every N seconds for `approved` patches.
2. Snapshot the target file (`.wd-backup/<file>.<ts>.bak`).
3. Apply the unified diff.
4. Report `applied` + `rollback_ref`, or `failed` + error message.
