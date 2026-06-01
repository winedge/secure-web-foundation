#!/usr/bin/env node
/**
 * Load seed JSON files into a MySQL 8 database.
 *
 *   DATABASE_URL=mysql://user:pass@host:3306/db node backend/db/scripts/load-seed.mjs
 *
 * Idempotent: uses INSERT ... ON DUPLICATE KEY UPDATE keyed on `id`.
 * Skips rows whose target table doesn't exist yet.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, '..', 'seed');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required (mysql://user:pass@host:port/db)');
  process.exit(1);
}

const conn = await mysql.createConnection(url + (url.includes('?') ? '&' : '?') + 'multipleStatements=true');

// Load order must respect FKs: parents first.
const ORDER = [
  'industry_verticals',
  'vertical_pipeline_stages',
  'vertical_intake_fields',
  'vertical_lead_categories',
  'vertical_terminology',
  'vertical_module_access',
  'vertical_ai_prompts',
  'lead_sources',
  'lead_statuses',
  'tort_types',
  'landing_design_presets',
  'landing_page_templates',
  'seo_thresholds',
  'admin_settings',
  'role_module_permissions',
];

const files = new Set(readdirSync(SEED_DIR).filter((f) => f.endsWith('.json')));

await conn.query('SET FOREIGN_KEY_CHECKS=0');

let totalRows = 0;
for (const table of ORDER) {
  const fname = `${table}.json`;
  if (!files.has(fname)) continue;
  const rows = JSON.parse(readFileSync(resolve(SEED_DIR, fname), 'utf8'));
  if (!Array.isArray(rows) || rows.length === 0) continue;

  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `\`${c}\``).join(',');
  const placeholders = cols.map(() => '?').join(',');
  const updates = cols.filter((c) => c !== 'id').map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(',');
  const sql = `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;

  let ok = 0;
  for (const r of rows) {
    const values = cols.map((c) => {
      const v = r[c];
      if (v === null || v === undefined) return null;
      if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    try {
      await conn.execute(sql, values);
      ok++;
    } catch (err) {
      console.warn(`! ${table} row failed: ${err.message}`);
    }
  }
  console.log(`  ${table.padEnd(30)} ${ok}/${rows.length}`);
  totalRows += ok;
}

await conn.query('SET FOREIGN_KEY_CHECKS=1');
await conn.end();
console.log(`\nSeed complete: ${totalRows} rows inserted/updated.`);
