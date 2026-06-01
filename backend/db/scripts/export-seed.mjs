#!/usr/bin/env node
/**
 * Export reference / seed data from Postgres to JSON files.
 *
 * Only system / lookup tables are exported (no tenant data).
 * Output: backend/db/seed/<table>.json
 *
 * Run against the source Postgres (PG* env vars):
 *   node backend/db/scripts/export-seed.mjs
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'seed');
mkdirSync(OUT_DIR, { recursive: true });

// Tables that ship as application/reference data, not customer data.
const REFERENCE_TABLES = [
  'industry_verticals',
  'vertical_pipeline_stages',     // firm_id IS NULL rows
  'vertical_intake_fields',       // firm_id IS NULL rows
  'vertical_lead_categories',     // firm_id IS NULL rows
  'vertical_terminology',         // firm_id IS NULL rows
  'vertical_module_access',       // firm_id IS NULL rows
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

// Tables where the "system" rows are filtered by firm_id IS NULL.
const FIRM_SCOPED = new Set([
  'vertical_pipeline_stages',
  'vertical_intake_fields',
  'vertical_lead_categories',
  'vertical_terminology',
  'vertical_module_access',
]);

function dumpTable(table) {
  const where = FIRM_SCOPED.has(table) ? "WHERE firm_id IS NULL" : '';
  const sql = `SELECT json_agg(t) FROM (SELECT * FROM public."${table}" ${where}) t;`;
  const out = execSync(`psql -tAc ${JSON.stringify(sql)}`, { encoding: 'utf8' }).trim();
  return out === '' ? [] : JSON.parse(out);
}

let total = 0;
for (const t of REFERENCE_TABLES) {
  try {
    const rows = dumpTable(t) || [];
    writeFileSync(`${OUT_DIR}/${t}.json`, JSON.stringify(rows, null, 2));
    console.log(`  ${t.padEnd(30)} ${rows.length} rows`);
    total += rows.length;
  } catch (err) {
    console.warn(`! skip ${t}: ${err.message.split('\n')[0]}`);
  }
}
console.log(`\nTotal: ${total} rows across ${REFERENCE_TABLES.length} tables -> ${OUT_DIR}`);
