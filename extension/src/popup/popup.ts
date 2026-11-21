import { detectProvider } from '../providers/registry';
import { markSvg, MARK_CSS } from '../ui/mark';
import { CSS_TOKENS, CSS_BASE } from '../ui/tokens';
import type { EngineStatus, SettingsResponse, TabInfoResponse } from '../shared/types';
import type { Settings } from '../shared/settings';

/**
 * Popup.
 *
 * Responsibilities are deliberately small: report what site you are on, what
 * engine will run, and let you flip the two switches or open the panel. All
 * analysis happens in the worker / content script.
 */

const CAPABILITY_LABEL: Record<string, { text: string; cls: string }> = {
  supported: { text: 'Supported', cls: 'chip--supported' },
  partial: { text: 'Beta', cls: 'chip--partial' },
  unknown: { text: 'Experimental', cls: 'chip--unknown' },
};

const MANUAL_HINT = 'Focus the message box on the page with your draft typed, then open Second Thought to review it.';

async function init(): Promise<void> {
  injectStyles();

  const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

  // ── brand mark (real site mark, with its entrance animation) ──────────────
  const markHost = $('brand-mark');
  markHost.innerHTML = markSvg({ size: 19, animated: true, label: 'Second Thought' });

  const version = chrome.runtime.getManifest().version;
  $('foot-ver').textContent = `v${version}`;

  // ── load settings + current tab ──────────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? '';
  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    hostname = '';
  }

  let response: SettingsResponse | undefined;
  try {
    response = (await chrome.runtime.sendMessage({ type: 'st/settings-get' })) as SettingsResponse | undefined;
  } catch {
    response = undefined;
  }

  const settings = response?.settings;
  if (!settings) {
    showToast('Second Thought could not read its settings. Reload the extension.', true);
  }

  applyTheme(settings?.theme ?? 'system');
  renderSite(hostname, settings);
  renderEngine(response?.engineStatus);
  if (tab?.id !== undefined && hostname !== '' && detectProvider(hostname, settings?.customSites ?? []).adapter) {
    void diagnoseTab(tab.id);
  }

  // ── switches ─────────────────────────────────────────────────────────────
  const tgEnabled = $('tg-enabled') as HTMLInputElement;
  const tgIntercept = $('tg-intercept') as HTMLInputElement;
  if (settings) {
    tgEnabled.checked = settings.enabled;
    tgIntercept.checked = settings.autoIntercept;
  }
  tgEnabled.addEventListener('change', () => void persist({ enabled: tgEnabled.checked }));
  tgIntercept.addEventListener('change', () => void persist({ autoIntercept: tgIntercept.checked }));

  // ── navigation ───────────────────────────────────────────────────────────
  $('open-options').addEventListener('click', () => void chrome.runtime.openOptionsPage());
  $('engine-change').addEventListener('click', () => void chrome.runtime.openOptionsPage());
  $('link-history').addEventListener('click', (e) => {
    e.preventDefault();
    void chrome.runtime.openOptionsPage();
  });
  $('link-privacy').addEventListener('click', (e) => {
    e.preventDefault();
    void chrome.runtime.openOptionsPage();
  });

  // ── manual review ────────────────────────────────────────────────────────
  const refineBtn = $('refine-draft') as HTMLButtonElement;
  const ctaNote = $('cta-note');

  if (!hostname) {
    refineBtn.disabled = true;
    ctaNote.textContent = 'Open an AI chat to use Second Thought.';
  }

  refineBtn.addEventListener('click', async () => {
    if (!tab?.id) return;
    refineBtn.disabled = true;
    const label = refineBtn.querySelector('.cta__label');
    const original = label?.textContent ?? '';
    if (label) label.textContent = 'Opening…';
    try {
      const reply = (await chrome.tabs.sendMessage(tab.id, { type: 'st/open-panel' })) as
        | { ok?: boolean }
        | undefined;
      if (reply?.ok === false) {
        showToast(MANUAL_HINT);
        refineBtn.disabled = false;
      } else {
        window.close();
      }
    } catch {
      // No content script in this tab (not an AI site, or it has not loaded).
      showToast(MANUAL_HINT);
      refineBtn.disabled = false;
    } finally {
      if (label) label.textContent = original;
    }
  });
}

// ── rendering ───────────────────────────────────────────────────────────────

function renderSite(hostname: string, settings: Settings | undefined): void {
  const nameEl = document.getElementById('site-name')!;
  const chipEl = document.getElementById('site-status')!;
  const noteEl = document.getElementById('site-note')!;

  const detection = hostname === '' ? { adapter: null } : detectProvider(hostname, settings?.customSites ?? []);

  if (detection.adapter) {
    nameEl.textContent = detection.adapter.name;
    const label = CAPABILITY_LABEL[detection.adapter.capability] ?? CAPABILITY_LABEL.unknown!;
    chipEl.textContent = label.text;
    chipEl.className = `chip ${label.cls}`;

    if (settings && !settings.enabled) {
      noteEl.textContent = 'Second Thought is switched off. Requests will send unchanged.';
    } else if (settings && !settings.autoIntercept) {
      noteEl.textContent = 'Pause-before-send is off. Use “Review current draft” to run it manually.';
    } else {
      noteEl.textContent = '';
    }
    return;
  }

  chipEl.textContent = hostname === '' ? 'Unknown' : 'Passive';
  chipEl.className = 'chip chip--off';
  nameEl.textContent = hostname === '' ? 'No page' : hostname;
  noteEl.textContent = hostname === ''
    ? 'Open ChatGPT, Claude, Gemini or Copilot.'
    : 'Second Thought stays passive here. Add this site in Settings to enable it.';
}

function renderEngine(status: EngineStatus | undefined): void {
  const badge = document.getElementById('engine-badge')!;
  const name = document.getElementById('engine-name')!;
  const reason = document.getElementById('engine-reason')!;

  if (!status) {
    badge.textContent = 'Local';
    badge.className = 'engine__badge engine__badge--local';
    name.textContent = 'On-device requirement engine';
    reason.textContent = '';
    return;
  }

  if (status.engine === 'ai') {
    badge.textContent = 'AI';
    badge.className = 'engine__badge';
    name.textContent = `${status.providerName} · ${status.model}`;
    reason.textContent = 'Sharper questions via your own key. Your text goes straight to the provider.';
    return;
  }

  badge.textContent = 'Local';
  badge.className = 'engine__badge engine__badge--local';
  name.textContent = 'On-device requirement engine';
  reason.textContent = status.reason ?? 'Runs entirely in your browser. No key, no network.';
}

// ── helpers ─────────────────────────────────────────────────────────────────

async function persist(patch: Partial<Settings>): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: 'st/settings-set', settings: patch });
  } catch {
    showToast('Could not save that setting. Reload the extension.', true);
  }
}

function applyTheme(theme: Settings['theme']): void {
  const shell = document.getElementById('shell');
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  if (shell) shell.dataset['theme'] = resolved;
  document.documentElement.dataset['theme'] = resolved;
}

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = `${CSS_TOKENS}\n${CSS_BASE}\n${MARK_CSS}`;
  document.head.prepend(style);
}

let toastTimer: number | undefined;
function showToast(message: string, danger = false): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show${danger ? ' toast--danger' : ''}`;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.className = 'toast';
  }, 4200);
}

void init();

export type { TabInfoResponse };


/**
 * "Installed but does nothing" is almost always one of two things: the tab was
 * opened before the extension was installed (Chrome does not inject into
 * existing tabs), or the site changed its composer markup. Say which.
 */
async function diagnoseTab(tabId: number): Promise<void> {
  const chipEl = document.getElementById('site-status')!;
  const noteEl = document.getElementById('site-note')!;
  try {
    const reply = (await chrome.tabs.sendMessage(tabId, { type: 'st/ping' })) as
      | { ok?: boolean; inputFound?: boolean; sendFound?: boolean }
      | undefined;
    if (!reply?.ok) throw new Error('no reply');
    if (reply.inputFound === false) {
      chipEl.textContent = 'No input found';
      chipEl.className = 'chip chip--partial';
      noteEl.textContent = 'Second Thought is running but cannot see the message box on this page yet. Click into the box, or reload the tab. If it persists the site layout changed — use “Review current draft”.';
    } else if (reply.sendFound === false) {
      noteEl.textContent = 'Message box found. The send button is not visible yet — it appears once you type.';
    }
  } catch {
    chipEl.textContent = 'Reload tab';
    chipEl.className = 'chip chip--partial';
    noteEl.textContent = 'This tab was opened before Second Thought was installed. Reload it once (F5) and it will attach.';
  }
}
