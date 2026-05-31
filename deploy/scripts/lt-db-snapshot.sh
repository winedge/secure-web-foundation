#!/usr/bin/env bash
# Pre-deploy MySQL snapshot | streamed straight to S3 (BAA-covered bucket).
#
# Usage:  lt-db-snapshot.sh <label> [--tag=staging|production]
# Install at /usr/local/bin/lt-db-snapshot.sh (chmod 750, root:deploy).
#
# Requires:
#   - awscli configured with instance role that can write to s3://leadsthru-db-backups
#   - /etc/leadsthru/db.env with: DB_HOST, DB_USER, DB_PASS, DB_NAME
#   - mysqldump 8.0+

set -euo pipefail

LABEL="${1:-manual}"
TAG="staging"
for arg in "$@"; do
  case "$arg" in
    --tag=*) TAG="${arg#--tag=}" ;;
  esac
done

# shellcheck disable=SC1091
source /etc/leadsthru/db.env

TS=$(date -u +"%Y%m%dT%H%M%SZ")
KEY="snapshots/${TAG}/${TS}-${LABEL}.sql.gz"
BUCKET="leadsthru-db-backups"

echo "[snapshot] dumping ${DB_NAME} from ${DB_HOST} -> s3://${BUCKET}/${KEY}"

mysqldump \
  --host="${DB_HOST}" \
  --user="${DB_USER}" \
  --password="${DB_PASS}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  --source-data=2 \
  "${DB_NAME}" \
  | gzip -9 \
  | aws s3 cp - "s3://${BUCKET}/${KEY}" \
      --sse aws:kms \
      --sse-kms-key-id alias/leadsthru-backups \
      --expected-size 5368709120

# Record the binlog position for point-in-time recovery
aws s3 cp \
  <(echo "snapshot=${KEY}"; echo "timestamp=${TS}"; echo "label=${LABEL}"; echo "tag=${TAG}") \
  "s3://${BUCKET}/snapshots/${TAG}/${TS}-${LABEL}.meta" \
  --sse aws:kms --sse-kms-key-id alias/leadsthru-backups

echo "[snapshot] OK | s3://${BUCKET}/${KEY}"
