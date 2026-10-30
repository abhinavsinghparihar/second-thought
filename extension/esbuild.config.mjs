import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, statSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'bundle');
const coreAlias = resolve(root, '../../packages/core/src/index.ts');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const common = {
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'iife',
  target: ['chrome116'],
  platform: 'browser',
  alias: { '@second-thought/core': coreAlias },
  legalComments: 'none',
  logLevel: 'info',
};

const entries = [
  { in: join(root, 'src/background/worker.ts'), out: 'background' },
  { in: join(root, 'src/content/main.ts'), out: 'content' },
  { in: join(root, 'src/popup/popup.ts'), out: 'popup' },
  { in: join(root, 'src/options/options.ts'), out: 'options' },
];

await build({
  ...common,
  entryPoints: entries,
  outdir: out,
  entryNames: '[name]',
});

// Static assets
cpSync(join(root, 'public'), out, { recursive: true });
cpSync(join(root, 'popup.html'), join(out, 'popup.html'));
cpSync(join(root, 'options.html'), join(out, 'options.html'));

function report(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files.push(...report(p));
    else files.push([p, statSync(p).size]);
  }
  return files;
}
console.log('\nBundle contents:');
for (const [p, size] of report(out).sort()) {
  console.log(`  ${p.replace(out + '/', '').padEnd(24)} ${(size / 1024).toFixed(1)} KB`);
}
console.log(`\nExtension built → ${out}`);
console.log('Load unpacked from this directory in chrome://extensions (Developer mode).');
