# Website Doctor — WordPress Connector

A self-contained WordPress plugin that polls Website Doctor for approved
patches and applies them to your WordPress install, with backups.

## Install

1. Copy `website-doctor-connector.php` to `wp-content/plugins/website-doctor-connector/`.
2. Add to `wp-config.php`:

```php
define('WD_API_URL',   'https://<your-project-ref>.supabase.co/functions/v1');
define('WD_PUBLIC_ID', 'conn_pub_xxx');
define('WD_TOKEN',     'conn_secret_xxx'); // shown ONCE in Website Doctor UI
// define('WD_ROOT',     ABSPATH);          // optional
// define('WD_INTERVAL', 'wd_five_minutes'); // optional WP-Cron schedule
```

3. Activate **Website Doctor Connector** in Plugins.

A WP-Cron job runs every 5 minutes by default. Force a run with an
authenticated admin request:

```
POST /wp-admin/admin-post.php?action=wd_tick_now
```

## What it does

1. Calls `wd-connector-sync` with `action=poll`.
2. For each approved patch: backs up the file into `.wd-backup/`, applies the
   unified diff, writes the file.
3. Reports `applied` + `rollback_ref`, or `failed` + error.

Path traversal is blocked — file paths must resolve inside `WD_ROOT` (defaults to `ABSPATH`).

## Rollback

```bash
cp wp-content/.wd-backup/<rollback_ref> path/to/file
```
