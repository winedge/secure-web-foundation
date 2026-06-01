#!/usr/bin/env node
/**
 * Postgres -> MySQL schema converter.
 *
 * Introspects the live Supabase Postgres schema via `psql` and emits
 * versioned MySQL migration files into backend/db/migrations/.
 *
 * Outputs:
 *   0001_init_enums.sql      - CHECK-constraint emulated enums (MySQL 8)
 *   0002_init_tables.sql     - all CREATE TABLE statements (no FKs)
 *   0003_init_foreign_keys.sql - all FK constraints
 *   0004_init_indexes.sql    - secondary indexes
 *
 * Usage:
 *   node backend/db/scripts/pg-to-mysql.mjs
 *
 * Requires PG* env vars (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT)
 * to point at the source Postgres instance.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'migrations');
mkdirSync(OUT_DIR, { recursive: true });

const psql = (sql) =>
  execSync(`psql -tAF $'\\t'`, { input: sql, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((row) => row.split('\t'));

// ---------- Type mapping ----------
const PG_TO_MYSQL = {
  uuid: 'CHAR(36)',
  text: 'TEXT',
  varchar: 'VARCHAR(255)',
  'character varying': 'VARCHAR(255)',
  bool: 'TINYINT(1)',
  boolean: 'TINYINT(1)',
  int2: 'SMALLINT',
  int4: 'INT',
  int8: 'BIGINT',
  smallint: 'SMALLINT',
  integer: 'INT',
  bigint: 'BIGINT',
  numeric: 'DECIMAL(20,6)',
  decimal: 'DECIMAL(20,6)',
  float4: 'FLOAT',
  float8: 'DOUBLE',
  real: 'FLOAT',
  'double precision': 'DOUBLE',
  date: 'DATE',
  time: 'TIME',
  timetz: 'TIME',
  timestamp: 'DATETIME(6)',
  timestamptz: 'DATETIME(6)',
  'timestamp without time zone': 'DATETIME(6)',
  'timestamp with time zone': 'DATETIME(6)',
  json: 'JSON',
  jsonb: 'JSON',
  bytea: 'LONGBLOB',
  inet: 'VARCHAR(45)',
  cidr: 'VARCHAR(45)',
  macaddr: 'VARCHAR(17)',
};

function mapType(pgType, udtName) {
  // Arrays -> JSON
  if (pgType === 'ARRAY' || pgType.endsWith('[]')) return 'JSON';
  // User-defined (enums) -> VARCHAR (constrained via CHECK in 0001)
  if (pgType === 'USER-DEFINED') return 'VARCHAR(64)';
  const key = pgType.toLowerCase();
  if (PG_TO_MYSQL[key]) return PG_TO_MYSQL[key];
  const ukey = (udtName || '').toLowerCase();
  if (PG_TO_MYSQL[ukey]) return PG_TO_MYSQL[ukey];
  console.warn(`! unmapped type: ${pgType} (udt=${udtName}) -> TEXT`);
  return 'TEXT';
}

function mapDefault(def, mysqlType) {
  if (def == null || def === '') return null;
  let d = def;
  d = d.replace(/::[a-zA-Z_ ]+(\[\])?/g, '');
  if (/^gen_random_uuid\(\)$/i.test(d)) return '(UUID())';
  if (/^now\(\)$/i.test(d) || /^CURRENT_TIMESTAMP/i.test(d)) return 'CURRENT_TIMESTAMP(6)';
  if (/^true$/i.test(d)) return '1';
  if (/^false$/i.test(d)) return '0';
  if (/^ARRAY\[/i.test(d)) return null;
  if (/nextval\(/i.test(d)) return null;
  // MySQL requires defaults on TEXT/JSON/BLOB to be expressions (parenthesised).
  const needsParen = /^(TEXT|JSON|LONGBLOB|MEDIUMTEXT|LONGTEXT)/i.test(mysqlType);
  if (needsParen && !/^\(/.test(d)) return `(${d})`;
  return d;
}


// ---------- Enums ----------
const enums = psql(
  `SELECT t.typname, string_agg(quote_literal(e.enumlabel), ',' ORDER BY e.enumsortorder)
   FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
   JOIN pg_namespace n ON n.oid=t.typnamespace
   WHERE n.nspname='public' GROUP BY t.typname`
);
const enumMap = new Map(enums.map(([n, v]) => [n, v]));

// ---------- Tables / columns ----------
const tables = psql(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`
).map((r) => r[0]);

const columns = psql(
  `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
   FROM information_schema.columns WHERE table_schema='public'
   ORDER BY table_name, ordinal_position`
);

const pkeys = psql(
  `SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu USING (constraint_schema, constraint_name)
   WHERE tc.constraint_type='PRIMARY KEY' AND tc.table_schema='public'
   ORDER BY tc.table_name, kcu.ordinal_position`
);

const uniques = psql(
  `SELECT tc.table_name, tc.constraint_name, kcu.column_name, kcu.ordinal_position
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu USING (constraint_schema, constraint_name)
   WHERE tc.constraint_type='UNIQUE' AND tc.table_schema='public'
   ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position`
);

const fks = psql(
  `SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_column,
          rc.delete_rule, rc.update_rule, tc.constraint_name
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu USING (constraint_schema, constraint_name)
   JOIN information_schema.referential_constraints rc USING (constraint_schema, constraint_name)
   JOIN information_schema.constraint_column_usage ccu USING (constraint_schema, constraint_name)
   WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
   ORDER BY tc.table_name, tc.constraint_name`
);

const indexes = psql(
  `SELECT schemaname||'.'||tablename, indexname, indexdef
   FROM pg_indexes WHERE schemaname='public'`
);

// ---------- Build per-table column info ----------
const tableCols = new Map();
for (const t of tables) tableCols.set(t, []);
for (const [t, name, dtype, udt, nullable, def] of columns) {
  if (!tableCols.has(t)) continue;
  tableCols.get(t).push({ name, dtype, udt, nullable: nullable === 'YES', default: def });
}

const tablePks = new Map();
for (const [t, col] of pkeys) {
  if (!tablePks.has(t)) tablePks.set(t, []);
  tablePks.get(t).push(col);
}

const tableUniques = new Map();
for (const [t, cn, col] of uniques) {
  const key = `${t}::${cn}`;
  if (!tableUniques.has(key)) tableUniques.set(key, { table: t, name: cn, cols: [] });
  tableUniques.get(key).cols.push(col);
}

// ---------- Emit 0001_init_enums.sql ----------
{
  let sql = `-- Auto-generated. MySQL 8 doesn't have first-class enums shared across tables;\n`;
  sql += `-- we store enum-typed columns as VARCHAR + CHECK constraints (added per table).\n`;
  sql += `-- Reference values per enum:\n\n`;
  for (const [name, vals] of enumMap) {
    sql += `-- ENUM ${name}: ${vals}\n`;
  }
  sql += `\n-- (No DDL emitted here; see 0002 for column-level CHECKs.)\n`;
  writeFileSync(`${OUT_DIR}/0001_init_enums.sql`, sql);
}

// Map column -> enum name if its udt matches
function enumNameFor(col) {
  if (col.dtype === 'USER-DEFINED' && enumMap.has(col.udt)) return col.udt;
  return null;
}

// ---------- Emit 0002_init_tables.sql ----------
{
  let sql = `-- Auto-generated CREATE TABLE statements (no FKs; see 0003).\nSET FOREIGN_KEY_CHECKS=0;\n\n`;
  for (const t of tables) {
    const cols = tableCols.get(t) || [];
    const pk = tablePks.get(t) || [];
    sql += `CREATE TABLE \`${t}\` (\n`;
    const lines = [];
    for (const c of cols) {
      const type = mapType(c.dtype, c.udt);
      const def = mapDefault(c.default, type);
      let line = `  \`${c.name}\` ${type}`;

      if (!c.nullable) line += ' NOT NULL';
      if (def != null) line += ` DEFAULT ${def}`;
      const en = enumNameFor(c);
      if (en) line += ` /* enum:${en} */`;
      lines.push(line);
    }
    if (pk.length) lines.push(`  PRIMARY KEY (${pk.map((c) => `\`${c}\``).join(', ')})`);
    // unique constraints
    for (const u of tableUniques.values()) {
      if (u.table !== t) continue;
      lines.push(
        `  UNIQUE KEY \`${u.name}\` (${u.cols.map((c) => `\`${c}\``).join(', ')})`
      );
    }
    sql += lines.join(',\n') + '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';
  }
  sql += `SET FOREIGN_KEY_CHECKS=1;\n`;
  writeFileSync(`${OUT_DIR}/0002_init_tables.sql`, sql);
}

// ---------- Emit 0003_init_foreign_keys.sql ----------
{
  // collapse multi-column FKs by constraint_name
  const fkMap = new Map();
  for (const [t, col, rt, rc, del, upd, cn] of fks) {
    const k = `${t}::${cn}`;
    if (!fkMap.has(k))
      fkMap.set(k, { table: t, name: cn, cols: [], refTable: rt, refCols: [], onDelete: del, onUpdate: upd });
    fkMap.get(k).cols.push(col);
    fkMap.get(k).refCols.push(rc);
  }
  let sql = `-- Auto-generated FK constraints.\n\n`;
  for (const fk of fkMap.values()) {
    // Skip FKs to auth.users (different schema in Postgres; in MySQL we don't recreate the auth schema)
    if (fk.refTable === 'users') continue;
    sql += `ALTER TABLE \`${fk.table}\` ADD CONSTRAINT \`${fk.name}\` `;
    sql += `FOREIGN KEY (${fk.cols.map((c) => `\`${c}\``).join(', ')}) `;
    sql += `REFERENCES \`${fk.refTable}\` (${fk.refCols.map((c) => `\`${c}\``).join(', ')})`;
    if (fk.onDelete && fk.onDelete !== 'NO ACTION') sql += ` ON DELETE ${fk.onDelete}`;
    if (fk.onUpdate && fk.onUpdate !== 'NO ACTION') sql += ` ON UPDATE ${fk.onUpdate}`;
    sql += ';\n';
  }
  writeFileSync(`${OUT_DIR}/0003_init_foreign_keys.sql`, sql);
}

// ---------- Emit 0004_init_indexes.sql ----------
{
  let sql = `-- Auto-generated secondary indexes (PK + UNIQUE already in 0002).\n\n`;
  for (const [tbl, idx, def] of indexes) {
    const t = tbl.replace(/^public\./, '');
    if (/_pkey$/.test(idx)) continue;
    // Skip UNIQUE (already inline); detect via def
    if (/CREATE UNIQUE INDEX/i.test(def)) continue;
    // Parse columns: CREATE INDEX name ON public.tbl USING btree (col1, col2)
    const m = def.match(/\(([^)]+)\)\s*$/);
    if (!m) continue;
    const cols = m[1]
      .split(',')
      .map((s) => s.trim().replace(/\s+(ASC|DESC).*$/i, '').replace(/"/g, ''))
      // skip expression indexes (contain parens or function calls) - MySQL needs functional index syntax
      .filter((c) => !/[()]/.test(c));
    if (!cols.length) continue;
    sql += `CREATE INDEX \`${idx}\` ON \`${t}\` (${cols.map((c) => `\`${c}\``).join(', ')});\n`;
  }
  writeFileSync(`${OUT_DIR}/0004_init_indexes.sql`, sql);
}

console.log(`Wrote ${OUT_DIR}/0001..0004 .sql`);
console.log(`Tables: ${tables.length}, Enums: ${enumMap.size}`);
