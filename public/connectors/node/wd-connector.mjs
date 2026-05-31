#!/usr/bin/env node
/**
 * Website Doctor — Node connector agent.
 *
 * Env vars:
 *   WD_API_URL     Base URL to Supabase functions (e.g. https://xxx.supabase.co/functions/v1)
 *   WD_PUBLIC_ID   Connector public id (issued by Website Doctor UI)
 *   WD_TOKEN       Connector secret token (shown ONCE at issue time)
 *   WD_ROOT        Absolute path to the website root (default: cwd)
 *   WD_INTERVAL    Poll interval in seconds (default: 30)
 */
import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { applyPatch } from 'diff';

const API_URL    = process.env.WD_API_URL?.replace(/\/$/, '');
const PUBLIC_ID  = process.env.WD_PUBLIC_ID;
const TOKEN      = process.env.WD_TOKEN;
const ROOT       = resolve(process.env.WD_ROOT || process.cwd());
const INTERVAL   = Number(process.env.WD_INTERVAL || 30) * 1000;
const BACKUP_DIR = join(ROOT, '.wd-backup');

if (!API_URL || !PUBLIC_ID || !TOKEN) {
  console.error('[wd] missing WD_API_URL / WD_PUBLIC_ID / WD_TOKEN');
  process.exit(1);
}

function safeJoin(root, rel) {
  const p = resolve(root, rel);
  const r = relative(root, p);
  if (r.startsWith('..') || isAbsolute(r)) throw new Error(`unsafe path: ${rel}`);
  return p;
}

async function call(action, extra = {}) {
  const res = await fetch(`${API_URL}/wd-connector-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_id: PUBLIC_ID, token: TOKEN, action, ...extra }),
  });
  if (!res.ok) throw new Error(`${action} HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function backup(absPath) {
  await mkdir(BACKUP_DIR, { recursive: true });
  const ts = Date.now();
  const ref = `${relative(ROOT, absPath).replace(/[\\/]/g, '__')}.${ts}.bak`;
  const dst = join(BACKUP_DIR, ref);
  try { await copyFile(absPath, dst); } catch { /* new file */ }
  return ref;
}

async function applyOne(patch) {
  const abs = safeJoin(ROOT, patch.file_path);
  let original = '';
  try { original = await readFile(abs, 'utf8'); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const next = applyPatch(original, patch.diff);
  if (next === false) throw new Error('diff did not apply cleanly');
  const rollback_ref = await backup(abs);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, next, 'utf8');
  return rollback_ref;
}

async function tick() {
  try {
    const { patches = [] } = await call('poll');
    if (!patches.length) return;
    console.log(`[wd] received ${patches.length} patch(es)`);
    for (const p of patches) {
      try {
        const rollback_ref = await applyOne(p);
        await call('report', { patch_id: p.id, success: true, rollback_ref });
        console.log(`[wd] applied ${p.file_path}`);
      } catch (err) {
        await call('report', { patch_id: p.id, success: false, message: String(err?.message || err) });
        console.error(`[wd] failed ${p.file_path}: ${err?.message || err}`);
      }
    }
  } catch (err) {
    console.error('[wd] tick error:', err?.message || err);
  }
}

console.log(`[wd] connector started — root=${ROOT}, interval=${INTERVAL / 1000}s`);
await tick();
setInterval(tick, INTERVAL);
