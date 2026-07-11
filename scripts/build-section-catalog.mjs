#!/usr/bin/env node
/**
 * Serializes the SECTION_REGISTRY (labels, descriptions, icon names,
 * defaultProps, inspector schema), LANDING_THEMES, and starter stacks into a
 * static JSON catalog consumed by the api-v1-landing edge function.
 *
 * The catalog is what lets the external dashboard render the exact same
 * builder UI over the API.
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const stubPlugin = {
  name: 'stub-registry-imports',
  setup(b) {
    // Stub every React component + lucide icon with a Proxy that records the imported name.
    const stubOut = {
      contents: `module.exports = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? { __stub: k } : undefined) });`,
      loader: 'js',
    };
    b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide-stub', namespace: 'stub' }));
    b.onResolve({ filter: /^@\/components\// }, () => ({ path: 'comp-stub', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => stubOut);
    // Resolve @/lib/... to real files
    b.onResolve({ filter: /^@\// }, (args) => ({
      path: path.resolve(projectRoot, 'src', args.path.slice(2)) + (args.path.endsWith('.ts') ? '' : '.ts'),
    }));
  },
};

const outFile = '/tmp/registry-bundle.mjs';

await build({
  entryPoints: [path.resolve(projectRoot, 'src/lib/landing-sections/registry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: outFile,
  plugins: [stubPlugin],
  logLevel: 'error',
});

const themesFile = '/tmp/themes-bundle.mjs';
await build({
  entryPoints: [path.resolve(projectRoot, 'src/lib/landing-themes.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: themesFile,
  plugins: [stubPlugin],
  logLevel: 'error',
});

const reg = await import(pathToFileURL(outFile).href);
const themes = await import(pathToFileURL(themesFile).href);

function serializeIcon(v) {
  if (v && typeof v === 'object' && '__stub' in v) return v.__stub;
  return null;
}

const SECTION_ORDER = reg.SECTION_ORDER;
const sections = SECTION_ORDER.map((type) => {
  const def = reg.SECTION_REGISTRY[type];
  return {
    type,
    label: def.label,
    description: def.description,
    icon: serializeIcon(def.icon),
    defaultProps: def.defaultProps,
    schema: def.schema,
  };
});

const STARTER_STACKS = {
  clean_slate:   ['hero','features','testimonials','faq','form','footer'],
  emerald_trust: ['hero','logo_cloud','features','stats','testimonials','form','footer'],
  bold_sunset:   ['hero','steps','features','cta','form','footer'],
  medical_calm:  ['hero','features','steps','testimonials','faq','form','footer'],
  estate_luxe:   ['hero','gallery','features','testimonials','cta','form','footer'],
  dark_pro:      ['hero','logo_cloud','features','stats','pricing','faq','cta','form','footer'],
  vibrant_pop:   ['hero','features','gallery','testimonials','cta','form','footer'],
  eco_natural:   ['hero','content','features','testimonials','form','footer'],
};

const catalog = {
  generated_at: new Date().toISOString(),
  order: SECTION_ORDER,
  sections,
  themes: themes.LANDING_THEMES,
  default_theme_key: themes.DEFAULT_THEME?.key,
  starter_stacks: STARTER_STACKS,
};

const outDir = path.resolve(projectRoot, 'supabase/functions/api-v1-landing');
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'section-catalog.json'), JSON.stringify(catalog, null, 2));
console.log(`wrote catalog: ${sections.length} sections, ${themes.LANDING_THEMES.length} themes`);
