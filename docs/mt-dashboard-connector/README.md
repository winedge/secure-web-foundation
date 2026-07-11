# Mass Tort Dashboard → LeadsThru Platform Connector

This folder contains a drop-in client for the **other** (external) Mass Tort
Dashboard project to call this platform's `mt-proxy` edge function.

## What this platform exposes

- **Endpoint:** `https://snuggle-site-synth.lovable.app/functions/v1/mt-proxy`
- **Method:** `POST`
- **Auth headers required on every call:**
  - `x-client-id` — your API client ID (provisioned below)
  - `x-client-secret` — your API client secret (shown once — store in secrets)
  - `Authorization: Bearer <user_jwt>` — the signed-in user's Supabase JWT from the dashboard
- **Body shape:** `{ "resource": string, "action": string, "payload": object }`

Every call is:
1. Validated against `api_clients` (client_id + SHA-256 of secret).
2. Validated against the user's JWT — the user must belong to a firm (`firm_members`).
3. Firm-scoped automatically — a user can only see/mutate rows in their own firm.
4. Audited to `mt_audit_log` for every mutation.

## Credentials for the Mass Tort Dashboard

```
CLIENT_ID     = mt_dash_3908442da3a14300
CLIENT_SECRET = Hm2eQ4cFmG4btLKkD5EV2qfKgdpuW4IVxZqT5D6qzvbZPQuUBJV9uNhJKMn-S1mE
```

**Save these in the OTHER project's secrets as:**
- `VITE_MT_PROXY_CLIENT_ID` (public — used from browser)
- `VITE_MT_PROXY_CLIENT_SECRET` (⚠️ if you don't want the secret in the browser,
  proxy the call through an edge function in the other project and keep the
  secret server-side as `MT_PROXY_CLIENT_SECRET` — recommended.)

The secret is stored here as a SHA-256 hash only — it cannot be recovered.
If lost, re-run the "rotate" step below.

## Resources & actions available

| resource        | actions                                                              |
| --------------- | -------------------------------------------------------------------- |
| `me`            | (any) → returns `{ user_id, firm_id, is_owner }`                     |
| `cases`         | `list`, `get`, `create`, `update`, `bulk_advance`, `bulk_reject`, `bulk_delete` |
| `documents`     | `list`, `upload_url`, `register`, `download_url`, `delete`           |
| `notifications` | `list`, `mark_read`                                                  |
| `saved_views`   | `list`, `create`, `delete`                                           |
| `audit`         | `list` (firm_owner only)                                             |
| `quotas`        | `get`  (firm_owner only)                                             |

## Rotating the secret

Run this SQL on the platform's database (via the platform's Lovable project):

```sql
-- generate a new secret in any language, e.g. python -c "import secrets;print(secrets.token_urlsafe(48))"
-- then hash it: python -c "import hashlib;print(hashlib.sha256(b'NEWSECRET').hexdigest())"
UPDATE public.api_clients
   SET client_secret_hash = '<sha256 hex>', updated_at = now()
 WHERE client_id = 'mt_dash_3908442da3a14300';
```
