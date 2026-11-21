// Replaces the __SITE_URL__ placeholder (canonical / Open Graph / Twitter tags)
// with Netlify's primary site URL. If no URL is known (local run), the tags that
// need an absolute URL are removed instead of shipping a placeholder.
import { readFileSync, writeFileSync } from 'node:fs';
const url = (process.env.URL || process.env.SITE_URL || '').replace(/\/$/, '');
// Safety: this edits site/index.html in place, which is fine inside Netlify's
// throw-away build checkout but would damage a local working copy.
if (!process.env.NETLIFY && !process.env.FORCE_INJECT) {
  console.log('inject-site-url: skipped (not running on Netlify; set FORCE_INJECT=1 to override)');
  process.exit(0);
}
const file = new URL('../site/index.html', import.meta.url);
let html = readFileSync(file, 'utf8');
if (!html.includes('__SITE_URL__')) { console.log('inject-site-url: nothing to do'); process.exit(0); }
if (url) html = html.replaceAll('__SITE_URL__', url);
else html = html.split('\n').filter((l) => !l.includes('__SITE_URL__')).join('\n');
writeFileSync(file, html);
console.log(url ? `inject-site-url: set ${url}` : 'inject-site-url: no URL, removed absolute-URL tags');
