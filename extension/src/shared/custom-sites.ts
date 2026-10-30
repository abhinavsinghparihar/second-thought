/**
 * Custom-site support: match-pattern building + dynamic content-script
 * registration helpers. Pure functions — unit tested.
 *
 * Custom sites are registered with chrome.scripting.registerContentScripts
 * (persists across browser restarts) after the user grants host permissions
 * from the options page. Builtin sites stay in the static manifest.
 */

export const CUSTOM_SCRIPT_ID = 'st-custom-sites';

/**
 * Build match patterns for user-added hostnames.
 * https for everything; localhost additionally gets http (local test pages).
 * Invalid hostnames are dropped (defense in depth — callers also validate).
 */
export function buildMatchPatterns(sites: string[]): string[] {
  const out = new Set<string>();
  for (const raw of sites) {
    const site = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(site) && site !== 'localhost') continue;
    if (site === 'localhost' || site.endsWith('.localhost')) {
      out.add('http://localhost/*');
      out.add('https://localhost/*');
      continue;
    }
    out.add(`https://${site}/*`);
  }
  return Array.from(out).sort();
}
