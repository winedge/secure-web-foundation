#!/usr/bin/env bash
# Apply all numbered SQL migrations under backend/db/migrations to a MySQL 8 DB.
#
# Usage:
#   DATABASE_URL=mysql://user:pass@host:3306/db ./backend/db/scripts/apply-migrations.sh
#
# Requires the `mysql` CLI. Migrations run in lexical order; failures abort.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (mysql://user:pass@host:port/db)" >&2
  exit 1
fi

# Parse mysql:// URL
proto_removed="${DATABASE_URL#mysql://}"
creds="${proto_removed%@*}"
hostpath="${proto_removed#*@}"
USER="${creds%%:*}"
PASS="${creds#*:}"
HOST="${hostpath%%:*}"
rest="${hostpath#*:}"
PORT="${rest%%/*}"
DB="${rest#*/}"
DB="${DB%%\?*}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/migrations"

# Record applied migrations in a tracking table.
mysql --protocol=TCP -h"$HOST" -P"$PORT" -u"$USER" -p"$PASS" "$DB" <<SQL
CREATE TABLE IF NOT EXISTS \`_schema_migrations\` (
  \`name\` VARCHAR(255) NOT NULL PRIMARY KEY,
  \`applied_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;
SQL

for f in "$DIR"/*.sql; do
  name="$(basename "$f")"
  applied=$(mysql --protocol=TCP -h"$HOST" -P"$PORT" -u"$USER" -p"$PASS" -N -B -e \
    "SELECT 1 FROM \`_schema_migrations\` WHERE name='$name'" "$DB" || true)
  if [[ "$applied" == "1" ]]; then
    echo "  skip   $name (already applied)"
    continue
  fi
  echo "  apply  $name"
  mysql --protocol=TCP -h"$HOST" -P"$PORT" -u"$USER" -p"$PASS" "$DB" < "$f"
  mysql --protocol=TCP -h"$HOST" -P"$PORT" -u"$USER" -p"$PASS" "$DB" -e \
    "INSERT INTO \`_schema_migrations\` (name) VALUES ('$name')"
done

echo "All migrations applied."
