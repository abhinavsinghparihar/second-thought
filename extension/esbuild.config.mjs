import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, statSync, readdirSync, existsSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Extension build.
 *
 * The original rm -rf'd `bundle/` BEFORE building, so any build failure left
 * the user with no loadable extension at all (observed during the audit: a
 * failed build deleted the committed bundle). This script builds into a
 * temporary directory and only swaps it into place on success, so a broken
 * build can never destroy a working one.
 */

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, 'bundle');
const stagingDir = join(root, '.bundle-staging');
const coreAlias = resolve(root, '..', 'packages', 'core', 'src', 'index.ts');

if (!existsSync(coreAlias)) {
  console.error(`\n✖ Cannot find the requirement engine at:\n  ${coreAlias}\n`);
  process.exit(1);
}

// 1. Clean only the staging directory.
rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

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
  define: { 'process.env.NODE_ENV': '"production"' },
};

const entries = [
  { in: join(root, 'src/background/worker.ts'), out: 'background' },
  { in: join(root, 'src/content/main.ts'), out: 'content' },
  { in: join(root, 'src/popup/popup.ts'), out: 'popup' },
  { in: join(root, 'src/options/options.ts'), out: 'options' },
];

try {
  // 2. Build the JS entries.
  await build({
    ...common,
    entryPoints: entries,
    outdir: stagingDir,
    entryNames: '[name]',
  });

  // 3. Bundle the two static stylesheets from the shared token source, so the
  //    popup/options pages and the in-page panel can never drift apart.
  await build({
    bundle: true,
    minify: true,
    sourcemap: false,
    target: ['chrome116'],
    legalComments: 'none',
    logLevel: 'info',
    entryPoints: [
      join(root, 'src/popup/popup.css'),
      join(root, 'src/options/options.css'),
    ],
    outdir: stagingDir,
    entryNames: '[name]',
  });

  // 4. Static assets.
  cpSync(join(root, 'public'), stagingDir, { recursive: true });
  cpSync(join(root, 'popup.html'), join(stagingDir, 'popup.html'));
  cpSync(join(root, 'options.html'), join(stagingDir, 'options.html'));

  // 5. Swap into place only on success.
  rmSync(outDir, { recursive: true, force: true });
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  cpSync(stagingDir, outDir, { recursive: true });
  rmSync(stagingDir, { recursive: true, force: true });
} catch (err) {
  rmSync(stagingDir, { recursive: true, force: true });
  console.error('\n✖ Build failed. The existing bundle/ directory was left untouched.\n');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

function report(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...report(path));
    else files.push([path, statSync(path).size]);
  }
  return files;
}

console.log('\nBundle contents:');
let total = 0;
for (const [path, size] of report(outDir).sort()) {
  total += size;
  console.log(`  ${path.replace(`${outDir}/`, '').padEnd(24)} ${(size / 1024).toFixed(1)} KB`);
}
console.log(`  ${''.padEnd(24)} ${(total / 1024).toFixed(1)} KB total`);
console.log(`\nExtension built → ${outDir}`);
console.log('Load unpacked from this directory in chrome://extensions (Developer mode).');
