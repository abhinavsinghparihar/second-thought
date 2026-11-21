import type { Settings, AiProviderId, AnalysisEngine } from '../shared/settings';
import type { HistoryItem, ListModelsResponse, SettingsResponse, TestConnectionResponse } from '../shared/types';
import { normalizeBaseUrl } from '../background/providers/types';
import { allProviderMeta, providerMeta } from '../background/providers/registry';
import { markSvg, MARK_CSS } from '../ui/mark';
import { CSS_TOKENS, CSS_BASE } from '../ui/tokens';
import { buildMatchPatterns, CUSTOM_SCRIPT_ID } from '../shared/custom-sites';

/**
 * Settings page.
 *
 * Notable fixes vs. the original:
 *  - the `scripting` permission is requested BEFORE any scripting API call
 *    (the original called getRegisteredContentScripts() first and always threw);
 *  - a stored API key can be removed, and shows which key it is (last 4) and
 *    when it was saved;
 *  - the key is never read back into a field — only its metadata is displayed;
 *  - the engine status is explicit: local vs AI, with the reason.
 */

const PROVIDER_CAPABILITY_ORDER = ['supported', 'partial', 'unknown'] as const;

const BUILTIN_SITES: Array<{ name: string; host: string; capability: string }> = [
  { name: 'ChatGPT', host: 'chatgpt.com', capability: 'supported' },
  { name: 'Claude', host: 'claude.ai', capability: 'partial' },
  { name: 'Google Gemini', host: 'gemini.google.com', capability: 'partial' },
  { name: 'Microsoft Copilot', host: 'copilot.microsoft.com', capability: 'unknown' },
];

interface State {
  settings: Settings;
  keys: Record<string, { hasKey: boolean; savedAt: number; hint: string }>;
}

let state: State | null = null;

async function init(): Promise<void> {
  injectStyles();

  document.getElementById('brand-mark')!.innerHTML = markSvg({ size: 40, animated: true, label: 'Second Thought' });
  document.getElementById('version-label')!.textContent = `v${chrome.runtime.getManifest().version}`;
  document.getElementById('foot-ver')!.textContent = `Second Thought · engine 0.3.0`;

  const response = (await send({ type: 'st/settings-get' })) as SettingsResponse | undefined;
  if (!response) {
    toast('Could not read settings. Reload the extension.', true);
    return;
  }
  state = { settings: response.settings, keys: response.keys };

  applyTheme(response.settings.theme);
  buildProviderOptions();
  renderSites();
  bindControls();
  renderAll();
  void loadModels();
  document.getElementById('ext-id')!.textContent = chrome.runtime.id;
  void refreshCompanion();
}

// ── rendering ───────────────────────────────────────────────────────────────

function renderAll(): void {
  if (!state) return;
  const s = state.settings;

  // segmented engine control
  for (const btn of Array.from(document.querySelectorAll<HTMLButtonElement>('.segmented__opt'))) {
    btn.setAttribute('aria-checked', String(btn.dataset['engine'] === s.analysisEngine));
  }
  const explain = document.getElementById('engine-explain')!;
  explain.textContent =
    s.analysisEngine === 'ai'
      ? 'In AI mode the message you were about to send is sent from this browser directly to your provider to generate sharper questions. The final prompt is always assembled locally from your answers.'
      : 'Local mode runs the full requirement engine on-device: intent detection, gap analysis, question synthesis and prompt assembly. No key, no network, no cost.';

  const aiConfig = document.getElementById('ai-config')!;
  aiConfig.setAttribute('aria-hidden', String(s.analysisEngine !== 'ai'));

  // provider / model inputs
  const providerSel = document.getElementById('st-provider') as HTMLSelectElement;
  providerSel.value = s.aiProvider;
  const meta = providerMeta(s.aiProvider);
  const keyBlock = document.getElementById('key-block')!;
  keyBlock.style.display = meta && !meta.needsKey && !meta.keyOptional ? 'none' : '';

  const baseBlock = document.getElementById('base-url-block')!;
  baseBlock.hidden = s.aiProvider !== 'custom';
  (document.getElementById('st-base-url') as HTMLInputElement).value = s.customBaseUrl;
  syncModelControl();

  const keyLink = document.getElementById('key-link') as HTMLAnchorElement;
  if (meta?.keyUrl) {
    keyLink.href = meta.keyUrl;
    keyLink.style.display = '';
  } else {
    keyLink.style.display = 'none';
  }

  renderKeyState();

  // dataflow note
  const dataflow = document.getElementById('dataflow')!;
  dataflow.textContent = meta
    ? meta.transport
    : 'Select a provider to see exactly where your request text travels.';

  // toggles
  setChecked('st-enabled', s.enabled);
  setChecked('st-intercept', s.autoIntercept);
  setChecked('st-adaptive', s.adaptiveFollowUp);
  setChecked('st-history', s.historyEnabled);
  (document.getElementById('st-maxq') as HTMLSelectElement).value = String(s.maxQuestions);
  (document.getElementById('st-excluded') as HTMLTextAreaElement).value = s.excludedSites.join('\n');
  (document.getElementById('st-custom') as HTMLTextAreaElement).value = s.customSites.join('\n');
  (document.getElementById('st-theme') as HTMLSelectElement).value = s.theme;

  renderStatusStrip();
}

function renderStatusStrip(): void {
  if (!state) return;
  const s = state.settings;
  const meta = providerMeta(s.aiProvider);
  const keyInfo = state.keys[s.aiProvider];

  const engineEl = document.getElementById('status-engine')!;
  if (s.analysisEngine === 'ai') {
    engineEl.textContent = keyInfo?.hasKey || meta?.needsKey === false ? 'AI-powered' : 'Local (no key — AI unavailable)';
  } else {
    engineEl.textContent = 'Local (on-device)';
  }

  document.getElementById('status-provider')!.textContent = meta ? `${meta.name}` : '—';

  const keyEl = document.getElementById('status-key')!;
  if (meta && !meta.needsKey && !(meta.keyOptional && keyInfo?.hasKey)) {
    keyEl.textContent = meta.keyOptional ? 'Optional' : 'Not required';
  } else if (keyInfo?.hasKey) {
    keyEl.textContent = `Saved ····${keyInfo.hint}`;
  } else {
    keyEl.textContent = 'Not configured';
  }
}

function renderKeyState(): void {
  if (!state) return;
  const info = state.keys[state.settings.aiProvider];
  const stateEl = document.getElementById('key-state')!;
  const input = document.getElementById('st-apikey') as HTMLInputElement;
  const removeBtn = document.getElementById('btn-remove-key') as HTMLButtonElement;

  if (info?.hasKey) {
    const when = info.savedAt ? new Date(info.savedAt).toLocaleDateString() : '';
    stateEl.textContent = `Saved ····${info.hint}${when ? ` · ${when}` : ''}`;
    stateEl.className = 'key-block__state key-block__state--saved';
    input.placeholder = 'Replace key… (leave blank to keep)';
    removeBtn.disabled = false;
  } else {
    stateEl.textContent = 'No key saved';
    stateEl.className = 'key-block__state';
    input.placeholder = 'Paste your key…';
    removeBtn.disabled = true;
  }
}


function buildProviderOptions(): void {
  const select = document.getElementById('st-provider') as HTMLSelectElement;
  select.textContent = '';
  for (const meta of allProviderMeta()) {
    const option = document.createElement('option');
    option.value = meta.id;
    option.textContent = meta.needsKey ? meta.name : `${meta.name} — no key`;
    select.appendChild(option);
  }
}

function renderSites(): void {
  const host = document.getElementById('builtin-sites')!;
  host.textContent = '';
  for (const site of BUILTIN_SITES) {
    const row = document.createElement('div');
    row.className = 'site-list__row';

    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'site-list__name';
    name.textContent = site.name;
    const hostEl = document.createElement('div');
    hostEl.className = 'site-list__host';
    hostEl.textContent = site.host;
    left.append(name, hostEl);

    const chip = document.createElement('span');
    const cap = site.capability as (typeof PROVIDER_CAPABILITY_ORDER)[number];
    chip.className = `st-chip ${
      cap === 'supported' ? 'st-chip--ok' : cap === 'partial' ? 'st-chip--warn' : ''
    }`;
    chip.textContent = cap === 'supported' ? 'Supported' : cap === 'partial' ? 'Beta' : 'Experimental';

    row.append(left, chip);
    host.appendChild(row);
  }
}

// ── controls ────────────────────────────────────────────────────────────────

function bindControls(): void {
  const on = <T extends HTMLElement>(id: string, event: string, handler: (e: Event) => void): void => {
    document.getElementById(id)?.addEventListener(event, handler);
  };

  // segmented engine
  for (const btn of Array.from(document.querySelectorAll<HTMLButtonElement>('.segmented__opt'))) {
    btn.addEventListener('click', () => {
      void patch({ analysisEngine: btn.dataset['engine'] as AnalysisEngine });
    });
  }

  on('st-enabled', 'change', () => void patch({ enabled: getChecked('st-enabled') }));
  on('st-intercept', 'change', () => void patch({ autoIntercept: getChecked('st-intercept') }));
  on('st-adaptive', 'change', () => void patch({ adaptiveFollowUp: getChecked('st-adaptive') }));
  on('st-history', 'change', () => void patch({ historyEnabled: getChecked('st-history') }));
  on('st-maxq', 'change', () => void patch({ maxQuestions: Number((document.getElementById('st-maxq') as HTMLSelectElement).value) }));
  on('st-theme', 'change', () => {
    const theme = (document.getElementById('st-theme') as HTMLSelectElement).value as Settings['theme'];
    applyTheme(theme);
    void patch({ theme });
  });

  on('st-provider', 'change', () => {
    const provider = (document.getElementById('st-provider') as HTMLSelectElement).value as AiProviderId;
    modelList = [];
    void patch({ aiProvider: provider, aiModel: '' }).then(() => loadModels());
  });
  on('st-model', 'change', () => {
    void patch({ aiModel: (document.getElementById('st-model') as HTMLSelectElement).value.trim() });
  });
  on('st-model-manual', 'change', () => {
    void patch({ aiModel: (document.getElementById('st-model-manual') as HTMLInputElement).value.trim() });
  });
  on('btn-models', 'click', () => void loadModels(true));
  on('btn-companion', 'click', () => void connectCompanion());
  on('btn-companion-off', 'click', () => void disconnectCompanion());
  on('btn-base-url', 'click', () => void saveBaseUrl());

  on('st-excluded', 'change', () => {
    void patch({ excludedSites: parseLines((document.getElementById('st-excluded') as HTMLTextAreaElement).value) });
  });

  // key management
  on('btn-toggle-key', 'click', () => {
    const input = document.getElementById('st-apikey') as HTMLInputElement;
    const btn = document.getElementById('btn-toggle-key')!;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', show ? 'Hide key' : 'Show key');
  });

  on('btn-save-key', 'click', () => void saveKey());
  on('st-apikey', 'keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void saveKey();
  });
  on('btn-remove-key', 'click', () => void removeKey());
  on('btn-test', 'click', () => void testConnection());

  on('btn-history', 'click', () => void openHistory());
  on('btn-close-history', 'click', () => {
    document.getElementById('history-modal')?.removeAttribute('open');
    (document.getElementById('history-modal') as HTMLDialogElement | null)?.close();
  });
  on('btn-clear-history', 'click', () => void clearHistory());
  on('btn-apply-custom', 'click', () => void applyCustomSites());
  on('btn-wipe', 'click', () => void wipeAll());
}

async function patch(update: Partial<Settings>): Promise<void> {
  if (!state) return;
  const previous = state.settings;
  // Optimistic update so the UI never lags behind a click.
  state.settings = { ...state.settings, ...update };
  renderAll();

  const result = (await send({ type: 'st/settings-set', settings: update })) as
    | { settings: Settings }
    | undefined;
  if (!result?.settings) {
    state.settings = previous;
    renderAll();
    toast('Could not save that setting.', true);
    return;
  }
  state.settings = result.settings;

  // Refresh key metadata when the provider changed.
  if (update.aiProvider) await refreshKeys();
}

async function refreshKeys(): Promise<void> {
  const response = (await send({ type: 'st/settings-get' })) as SettingsResponse | undefined;
  if (response && state) {
    state.keys = response.keys;
    renderKeyState();
    renderStatusStrip();
  }
}

async function saveKey(): Promise<void> {
  if (!state) return;
  const input = document.getElementById('st-apikey') as HTMLInputElement;
  const value = input.value.trim();
  if (value === '') {
    toast('Paste a key first.');
    return;
  }
  const provider = state.settings.aiProvider;
  const btn = document.getElementById('btn-save-key') as HTMLButtonElement;
  btn.disabled = true;
  setStatus('test-status', '', '');
  try {
    await send({ type: 'st/key-set', provider, apiKey: value });
    input.value = '';
    input.type = 'password';
    document.getElementById('btn-toggle-key')!.textContent = 'Show';
    await refreshKeys();
    toast('Key saved on this device.');
    // A saved key is a promise; prove it works straight away.
    await loadModels(true);
    await testConnection(true);
  } finally {
    btn.disabled = false;
  }
}

async function removeKey(): Promise<void> {
  if (!state) return;
  const provider = state.settings.aiProvider;
  await send({ type: 'st/key-clear', provider });
  await refreshKeys();
  setStatus('test-status', 'Key removed from this device.', 'ok');
  toast('Key removed.');
  modelList = [];
  syncModelControl('Add a key to load the models it can use. The best one is selected for you.');
}

async function testConnection(auto = false): Promise<void> {
  if (!state) return;
  const btn = document.getElementById('btn-test') as HTMLButtonElement;
  const input = document.getElementById('st-apikey') as HTMLInputElement;
  btn.disabled = true;
  setStatus('test-status', auto ? 'Key saved — testing…' : 'Testing…', '');

  try {
    if (!(await ensureAccess(state.settings.aiProvider))) {
      setStatus('test-status', 'Access to this server was not granted. Click Test connection again and allow it.', 'err');
      return;
    }
    const result = (await send({
      type: 'st/test-connection',
      provider: state.settings.aiProvider,
      model: state.settings.aiModel,
      apiKey: input.value.trim(),
    })) as TestConnectionResponse | undefined;

    if (!result) {
      setStatus('test-status', 'No response from the extension background. Reload the extension.', 'err');
      return;
    }
    setStatus('test-status', result.message, result.ok ? 'ok' : 'err');
  } catch {
    setStatus('test-status', 'Connection test failed unexpectedly.', 'err');
  } finally {
    btn.disabled = false;
  }
}

async function applyCustomSites(): Promise<void> {
  const status = document.getElementById('custom-status')!;
  const btn = document.getElementById('btn-apply-custom') as HTMLButtonElement;
  const raw = (document.getElementById('st-custom') as HTMLTextAreaElement).value;
  const sites = parseLines(raw);
  const matches = buildMatchPatterns(sites);

  btn.disabled = true;
  try {
    // Persist the list first so the UI reflects intent even if permission is denied.
    await patch({ customSites: sites });

    const existing = await chrome.scripting
      .getRegisteredContentScripts()
      .catch(() => [] as chrome.scripting.RegisteredContentScript[]);
    const isRegistered = existing.some((script) => script.id === CUSTOM_SCRIPT_ID);

    if (matches.length === 0) {
      if (isRegistered) await chrome.scripting.unregisterContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
      setStatus('custom-status', 'Saved — custom sites cleared.', 'ok');
      return;
    }

    // Request permission BEFORE using any scripting API (fixes the original
    // bug where getRegisteredContentScripts() threw for lack of the permission).
    const want = { permissions: ['scripting'] as chrome.permissions.Permissions['permissions'], origins: matches };
    const already = await chrome.permissions.contains({ origins: matches });
    const granted = already || (await chrome.permissions.request(want));
    if (!granted) {
      setStatus('custom-status', 'Permission denied — those sites stay inactive.', 'err');
      return;
    }

    if (isRegistered) await chrome.scripting.unregisterContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
    await chrome.scripting.registerContentScripts([
      {
        id: CUSTOM_SCRIPT_ID,
        js: ['content.js'],
        matches,
        runAt: 'document_idle',
        persistAcrossSessions: true,
      },
    ]);
    setStatus(
      'custom-status',
      `Active on ${sites.length} site${sites.length === 1 ? '' : 's'} — refresh the tab once.`,
      'ok',
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    setStatus('custom-status', `Could not apply: ${message.slice(0, 120)}`, 'err');
  } finally {
    btn.disabled = false;
  }
}

async function openHistory(): Promise<void> {
  const dialog = document.getElementById('history-modal') as HTMLDialogElement;
  const body = document.getElementById('history-body')!;
  body.textContent = '';

  const response = (await send({ type: 'st/history-list' })) as { history?: HistoryItem[] } | undefined;
  const items = response?.history ?? [];

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = state?.settings.historyEnabled
      ? 'No refined prompts yet. They will appear here after your first refinement.'
      : 'History is off. Turn on “Keep prompt history” above to record refined prompts on this device.';
    body.appendChild(empty);
  } else {
    for (const item of items.slice(0, 50)) {
      body.appendChild(historyRow(item));
    }
  }

  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function historyRow(item: HistoryItem): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'history-item';

  const meta = document.createElement('div');
  meta.className = 'history-item__meta';
  const when = new Date(item.createdAt).toLocaleString();
  for (const text of [when, item.taskType, item.engine]) {
    const span = document.createElement('span');
    span.textContent = text;
    meta.appendChild(span);
  }
  const score = document.createElement('span');
  score.className = 'history-item__score';
  score.textContent = `${item.scoreBefore}% → ${item.scoreAfter}%`;
  meta.appendChild(score);

  const original = document.createElement('div');
  original.className = 'history-item__text';
  original.textContent = item.original;

  wrap.append(meta, original);
  return wrap;
}

async function clearHistory(): Promise<void> {
  await send({ type: 'st/history-clear' });
  toast('History cleared.');
  const dialog = document.getElementById('history-modal') as HTMLDialogElement;
  if (dialog.open) await openHistory();
}

async function wipeAll(): Promise<void> {
  await send({ type: 'st/key-clear-all' });
  await send({ type: 'st/history-clear' });
  await refreshKeys();
  setStatus('wipe-status', 'All saved keys and history removed from this device.', 'ok');
  toast('Everything removed.');
}

// ── helpers ─────────────────────────────────────────────────────────────────

function send(message: unknown): Promise<unknown> {
  return chrome.runtime.sendMessage(message).catch(() => undefined);
}

function parseLines(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,]/)
        .map((line) => line.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
        .filter((line) => line !== '' && (line === 'localhost' || /^[a-z0-9.-]+\.[a-z]{2,}$/.test(line))),
    ),
  );
}

function getChecked(id: string): boolean {
  return (document.getElementById(id) as HTMLInputElement).checked;
}

function setChecked(id: string, value: boolean): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.checked = value;
}

function setStatus(id: string, message: string, tone: 'ok' | 'err' | ''): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `status-line${tone === 'ok' ? ' status-line--ok' : tone === 'err' ? ' status-line--err' : ''}`;
}

function applyTheme(theme: Settings['theme']): void {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.dataset['theme'] = resolved;
  document.getElementById('shell')?.setAttribute('data-theme', resolved);
}

let toastTimer: number | undefined;
function toast(message: string, danger = false): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = `toast show${danger ? ' toast--danger' : ''}`;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.className = 'toast';
  }, 3600);
}

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = `${CSS_TOKENS}\n${CSS_BASE}\n${MARK_CSS}`;
  document.head.prepend(style);
}

document.addEventListener('DOMContentLoaded', () => void init());


// ── models, access and custom provider ──────────────────────────────────────

let modelList: string[] = [];

/** Origins the extension needs permission for before it can talk to a provider. */
function originsFor(provider: AiProviderId): string[] {
  if (provider === 'ollama') return ['http://127.0.0.1/*', 'http://localhost/*'];
  if (provider === 'custom') {
    const base = normalizeBaseUrl(state?.settings.customBaseUrl);
    if (!base) return [];
    const url = new URL(base);
    return [`${url.protocol}//${url.hostname}/*`];
  }
  return [];
}

/** Ask for host access when a provider needs it (must run from a click). */
async function ensureAccess(provider: AiProviderId): Promise<boolean> {
  const origins = originsFor(provider);
  if (origins.length === 0) return true;
  try {
    if (await chrome.permissions.contains({ origins })) return true;
    return await chrome.permissions.request({ origins });
  } catch {
    return false;
  }
}

/** Show the dropdown when the key's models are known, otherwise a plain text box. */
function syncModelControl(message?: string): void {
  if (!state) return;
  const select = document.getElementById('st-model') as HTMLSelectElement;
  const manual = document.getElementById('st-model-manual') as HTMLInputElement;
  const status = document.getElementById('model-status')!;
  const current = state.settings.aiModel;

  if (modelList.length > 0) {
    select.textContent = '';
    for (const id of modelList) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = id;
      select.appendChild(option);
    }
    select.value = modelList.includes(current) ? current : modelList[0]!;
    select.hidden = false;
    manual.hidden = true;
  } else {
    select.hidden = true;
    manual.hidden = false;
    manual.value = current;
  }
  if (message !== undefined) status.textContent = message;
}

/** Fetch the models this key can use, then select the best one automatically. */
async function loadModels(userClick = false): Promise<void> {
  if (!state) return;
  const provider = state.settings.aiProvider;
  const meta = providerMeta(provider);
  const typed = (document.getElementById('st-apikey') as HTMLInputElement).value.trim();
  const hasKey = Boolean(state.keys[provider]?.hasKey) || typed !== '';
  const btn = document.getElementById('btn-models') as HTMLButtonElement;

  if (meta?.needsKey && !hasKey) {
    modelList = [];
    syncModelControl('Add and save a key to load the models it can use. The best one is selected for you.');
    return;
  }
  if (provider === 'custom' && !normalizeBaseUrl(state.settings.customBaseUrl)) {
    modelList = [];
    syncModelControl('Enter your Base URL above and click "Save & allow".');
    return;
  }

  btn.disabled = true;
  syncModelControl('Loading the models your key can use…');
  try {
    if (userClick && !(await ensureAccess(provider))) {
      modelList = [];
      syncModelControl('Access was not granted, so the model list could not be loaded.');
      return;
    }
    const res = (await send({ type: 'st/list-models', provider, apiKey: typed })) as ListModelsResponse | undefined;
    if (!res || !res.ok) {
      modelList = [];
      syncModelControl(res?.message ?? 'Could not load models. You can type a model id instead.');
      return;
    }
    modelList = res.models;
    const keep = modelList.includes(state.settings.aiModel);
    if (!keep && res.best) await patch({ aiModel: res.best });
    syncModelControl(`${modelList.length} model${modelList.length === 1 ? '' : 's'} available for your key · best one selected automatically.`);
  } finally {
    btn.disabled = false;
  }
}

async function saveBaseUrl(): Promise<void> {
  if (!state) return;
  const input = document.getElementById('st-base-url') as HTMLInputElement;
  const base = normalizeBaseUrl(input.value);
  if (!base) {
    toast('Enter a valid https://…/v1 address (http is allowed only for localhost).', true);
    return;
  }
  await patch({ customBaseUrl: base, aiModel: '' });
  if (!(await ensureAccess('custom'))) {
    toast('Access to that server was not granted.', true);
    return;
  }
  modelList = [];
  toast('Base URL saved.');
  await loadModels();
}


// ── Windows companion ───────────────────────────────────────────────────────

async function refreshCompanion(): Promise<void> {
  const el = document.getElementById('companion-status');
  if (!el) return;
  const status = (await send({ type: 'st/companion-status' })) as { state: string; detail: string; version?: string } | undefined;
  el.textContent = status ? `${status.detail}${status.version ? ` (v${status.version})` : ''}` : 'Could not check the companion.';
  el.className = `status-line ${status?.state === 'connected' ? 'status-line--ok' : ''}`;
}

/** Must run from a click: Chrome only grants nativeMessaging on a user gesture. */
async function connectCompanion(): Promise<void> {
  let granted = false;
  try {
    granted = await chrome.permissions.request({ permissions: ['nativeMessaging'] });
  } catch {
    granted = false;
  }
  if (!granted) {
    toast('Permission was not granted, so the companion stays disconnected.', true);
    return;
  }
  await patch({ useCompanion: true });
  await refreshCompanion();
}

async function disconnectCompanion(): Promise<void> {
  await patch({ useCompanion: false });
  try {
    await chrome.permissions.remove({ permissions: ['nativeMessaging'] });
  } catch {
    // already gone
  }
  await refreshCompanion();
}
