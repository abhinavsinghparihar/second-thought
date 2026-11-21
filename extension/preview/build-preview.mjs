/**
 * Generates self-contained, offline preview pages for the extension UI.
 *
 * The popup and settings page are real extension pages: they need the `chrome`
 * extension APIs. This script inlines the built CSS/JS together with a minimal
 * `chrome` stub backed by an in-memory store, so the design can be reviewed in
 * a plain browser (or a sandboxed preview iframe) without installing anything.
 *
 * Output: preview/popup.html, preview/options.html, preview/panel.html
 * Run:    node extension/preview/build-preview.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { build } from 'esbuild';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const extRoot = resolve(root, '..');
const bundle = join(extRoot, 'bundle');
const out = root;

const read = (path) => readFileSync(path, 'utf8');

const coreAlias = resolve(extRoot, '..', 'packages', 'core', 'src', 'index.ts');

async function buildPanelBundle(outfile) {
  await build({
    entryPoints: [join(extRoot, 'preview', 'panel-demo.ts')],
    outfile,
    bundle: true,
    minify: false,
    format: 'iife',
    target: ['chrome116'],
    platform: 'browser',
    alias: { '@second-thought/core': coreAlias },
    logLevel: 'error',
  });
}

const CHROME_STUB = `
<script>
/* ── minimal chrome extension API stub, in-memory ─────────────────────────── */
(function () {
  const sync = {
    settings: {
      enabled: true, autoIntercept: true, analysisEngine: 'ai',
      aiProvider: 'gemini', aiModel: 'gemini-2.0-flash',
      maxQuestions: 4, adaptiveFollowUp: true, historyEnabled: false,
      excludedSites: [], customSites: [], theme: 'system', onboarded: true
    }
  };
  const local = { 'apiKey:gemini': { key: 'AIza-DEMO-KEY-NOT-REAL-0000', savedAt: Date.now() - 86400000, hint: '0000' } };
  const session = { analyses: {} };
  const listeners = [];

  const area = (store) => ({
    get(keys, cb) {
      const result = {};
      if (keys === null || keys === undefined) Object.assign(result, store);
      else if (typeof keys === 'string') { if (keys in store) result[keys] = store[keys]; }
      else if (Array.isArray(keys)) keys.forEach((k) => { if (k in store) result[k] = store[k]; });
      else Object.keys(keys).forEach((k) => { result[k] = k in store ? store[k] : keys[k]; });
      const p = Promise.resolve(result);
      if (cb) p.then(cb);
      return p;
    },
    set(items, cb) {
      Object.assign(store, items);
      listeners.forEach((fn) => fn({}, 'sync'));
      const p = Promise.resolve();
      if (cb) p.then(cb);
      return p;
    },
    remove(keys, cb) {
      (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete store[k]);
      const p = Promise.resolve();
      if (cb) p.then(cb);
      return p;
    }
  });

  const KEYS = ['gemini', 'openai', 'anthropic', 'openrouter', 'ollama'];
  const PROVIDERS = {
    gemini: { name: 'Google Gemini', defaultModel: 'gemini-2.0-flash', models: ['gemini-2.0-flash','gemini-2.5-flash','gemini-1.5-flash','gemini-1.5-pro'], keyUrl: 'https://aistudio.google.com/app/apikey', needsKey: true, transport: 'Your request text is sent from this browser directly to Google, never to us.' },
    openai: { name: 'OpenAI', defaultModel: 'gpt-4o-mini', models: ['gpt-4o-mini','gpt-4o','gpt-4.1','gpt-4.1-mini','o4-mini'], keyUrl: 'https://platform.openai.com/api-keys', needsKey: true, transport: 'Your request text is sent from this browser directly to OpenAI, never to us.' },
    anthropic: { name: 'Anthropic', defaultModel: 'claude-3-5-haiku-latest', models: ['claude-3-5-haiku-latest','claude-3-5-sonnet-latest'], keyUrl: 'https://console.anthropic.com/settings/keys', needsKey: true, transport: 'Your request text is sent from this browser directly to Anthropic, never to us.' },
    openrouter: { name: 'OpenRouter', defaultModel: 'openai/gpt-4o-mini', models: ['openai/gpt-4o-mini','anthropic/claude-3.5-haiku'], keyUrl: 'https://openrouter.ai/keys', needsKey: true, transport: 'Your request text is sent from this browser directly to OpenRouter, never to us.' },
    ollama: { name: 'Ollama (local)', defaultModel: 'llama3.1', models: ['llama3.1','llama3.2','qwen2.5'], needsKey: false, transport: 'Runs entirely on your machine. Nothing leaves your computer.' }
  };

  function engineStatus(s) {
    if (s.analysisEngine !== 'ai') return { engine: 'local', aiReady: false, providerName: PROVIDERS[s.aiProvider].name, model: s.aiModel, reason: 'Local analysis is on-device and needs no API key.' };
    const has = Boolean(local['apiKey:' + s.aiProvider]);
    if (!has) return { engine: 'local', aiReady: false, providerName: PROVIDERS[s.aiProvider].name, model: s.aiModel, reason: 'No API key saved for ' + PROVIDERS[s.aiProvider].name + ' — using local analysis.' };
    return { engine: 'ai', aiReady: true, providerName: PROVIDERS[s.aiProvider].name, model: s.aiModel };
  }

  window.chrome = {
    runtime: {
      id: 'preview',
      getManifest: () => ({ version: '0.3.0' }),
      openOptionsPage: () => { window.location.href = 'options.html'; },
      onMessage: { addListener() {} },
      sendMessage(message) {
        const s = sync.settings;
        switch (message.type) {
          case 'st/settings-get': {
            const keys = {};
            KEYS.forEach((id) => {
              const rec = local['apiKey:' + id];
              keys[id] = rec ? { hasKey: true, savedAt: rec.savedAt, hint: rec.hint } : { hasKey: false, savedAt: 0, hint: '' };
            });
            return Promise.resolve({ settings: s, keys, engineStatus: engineStatus(s) });
          }
          case 'st/settings-set':
            Object.assign(s, message.settings);
            return Promise.resolve({ settings: s });
          case 'st/key-set':
            local['apiKey:' + message.provider] = { key: message.apiKey, savedAt: Date.now(), hint: message.apiKey.slice(-4) };
            return Promise.resolve({ ok: true, hasKey: true, savedAt: Date.now(), hint: message.apiKey.slice(-4) });
          case 'st/key-clear':
            delete local['apiKey:' + message.provider];
            return Promise.resolve({ ok: true, hasKey: false });
          case 'st/key-clear-all':
            KEYS.forEach((id) => delete local['apiKey:' + id]);
            return Promise.resolve({ ok: true });
          case 'st/test-connection':
            return Promise.resolve({ ok: true, message: 'Connected to ' + PROVIDERS[message.provider].name + ' (' + message.model + ') in 412 ms.', latencyMs: 412 });
          case 'st/history-list':
            return Promise.resolve({ history: [
              { id: 'h1', createdAt: Date.now() - 3600e3, providerId: 'software', original: 'Build me a really cool app.', refinedPrompt: '…', scoreBefore: 31, scoreAfter: 74, taskType: 'software', engine: 'ai' },
              { id: 'h2', createdAt: Date.now() - 86400e3, providerId: 'website', original: 'I need a website for my bakery', refinedPrompt: '…', scoreBefore: 22, scoreAfter: 68, taskType: 'website', engine: 'local' }
            ] });
          case 'st/history-clear':
            return Promise.resolve({ ok: true });
          default:
            return Promise.resolve({ ok: true });
        }
      }
    },
    storage: { sync: area(sync), local: area(local), session: area(session), onChanged: { addListener(fn) { listeners.push(fn); } } },
    tabs: { query: () => Promise.resolve([{ id: 1, url: 'https://chatgpt.com/c/abc' }]), sendMessage: () => Promise.reject(new Error('preview')) },
    scripting: { getRegisteredContentScripts: () => Promise.resolve([]), registerContentScripts: () => Promise.resolve(), unregisterContentScripts: () => Promise.resolve() },
    permissions: { contains: () => Promise.resolve(false), request: () => Promise.resolve(true) }
  };
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
})();
</script>
`;

function page({ title, css, js, body, note }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${css}</style>
<style>
  /* preview chrome only — not part of the product */
  html { background: #f4f4f4; }
  body { margin: 0; }
  .preview-note {
    font-family: ui-monospace, Menlo, monospace; font-size: 11px;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: #737373; padding: 12px 16px; background: #fafafa;
    border-bottom: 1px solid rgba(0,0,0,.1); display: flex; gap: 12px; align-items: center;
  }
  .preview-note b { color: #000; }
  .preview-note a { color: #525252; }
  .preview-stage { display: flex; justify-content: center; padding: 28px 16px 40px; }
  .preview-stage--page { padding: 0; display: block; }
</style>
</head>
<body>
<div class="preview-note"><b>UI preview</b><span>${note}</span></div>
<div class="preview-stage${body.stageClass ? ' ' + body.stageClass : ''}">${body.html}</div>
${CHROME_STUB}
<script>${js}</script>
</body>
</html>`;
}

mkdirSync(out, { recursive: true });

// ── popup ──────────────────────────────────────────────────────────────────
const popupHtml = read(join(extRoot, 'popup.html'));
const popupBody = popupHtml.slice(popupHtml.indexOf('<body>') + 6, popupHtml.indexOf('<script'));

writeFileSync(
  join(out, 'popup.html'),
  page({
    title: 'Second Thought — popup preview',
    css: read(join(bundle, 'popup.css')),
    js: read(join(bundle, 'popup.js')),
    note: 'Popup · 332px width · shown with demo settings',
    body: { html: popupBody, stageClass: '' },
  }),
);

// ── options ────────────────────────────────────────────────────────────────
const optionsHtml = read(join(extRoot, 'options.html'));
const optionsBody = optionsHtml.slice(optionsHtml.indexOf('<body>') + 6, optionsHtml.indexOf('<script'));

writeFileSync(
  join(out, 'options.html'),
  page({
    title: 'Second Thought — settings preview',
    css: read(join(bundle, 'options.css')),
    js: read(join(bundle, 'options.js')),
    note: 'Settings page · full width · relative URLs are inert in preview',
    body: { html: optionsBody, stageClass: 'preview-stage--page' },
  }),
);

// ── panel demo ─────────────────────────────────────────────────────────────
// Bundled from source (it imports the real panel + the real engine), then
// inlined so the page is completely self-contained and offline.
const panelBundlePath = join(out, 'panel-demo.bundle.js');
await buildPanelBundle(panelBundlePath);

writeFileSync(
  join(out, 'panel.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Second Thought — clarification panel preview</title>
<style>${read(join(out, 'panel.css'))}</style>
</head>
<body>
${read(join(out, 'panel-body.html'))}
<script>${read(panelBundlePath)}</script>
</body>
</html>`,
);

console.log('Preview written to extension/preview/{popup,options,panel}.html');
