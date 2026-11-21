/**
 * Extension settings and credential storage.
 *
 * Privacy & security rules enforced here:
 *  - Non-sensitive settings → `chrome.storage.sync` (no prompts, no keys).
 *  - API keys → `chrome.storage.local` ONLY. Never synced (a synced key would
 *    travel to every signed-in Chrome profile and to Google's servers).
 *  - Keys are never logged and never included in error strings.
 *  - Prompt history → `chrome.storage.local`, off by default.
 *  - No default key, no bundled key, no fallback key. Ever.
 */

import { normalizeBaseUrl, type AiProviderId } from '../background/providers/types';
import { allProviderMeta, isAiProviderId } from '../background/providers/registry';

export type { AiProviderId };
export type AnalysisEngine = 'local' | 'ai';

export interface Settings {
  /** Master switch. Off ⇒ the extension never intercepts anything. */
  enabled: boolean;
  /** Intercept sends automatically (off = manual refine from the toolbar only). */
  autoIntercept: boolean;
  /** Local heuristic engine, or AI-powered analysis with the user's key. */
  analysisEngine: AnalysisEngine;
  aiProvider: AiProviderId;
  aiModel: string;
  /** Base URL for the Custom (OpenAI-compatible) provider, e.g. https://api.example.com/v1. */
  customBaseUrl: string;
  /** Delegate analysis to the Windows companion when it is installed and running. */
  useCompanion: boolean;
  /** Questions asked per round (1–6). */
  maxQuestions: number;
  /** Allow one adaptive follow-up round. */
  adaptiveFollowUp: boolean;
  /** Store refined prompts locally. Off by default. */
  historyEnabled: boolean;
  /** Hostnames where Second Thought never runs. */
  excludedSites: string[];
  /** Extra user-added hostnames served by the generic adapter. */
  customSites: string[];
  /** UI theme. */
  theme: 'system' | 'light' | 'dark';
  /** Completed first-run onboarding. */
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  autoIntercept: true,
  analysisEngine: 'ai',
  aiProvider: 'gemini',
  /** Empty = automatic: the best model available to the saved key is chosen at call time. */
  aiModel: '',
  customBaseUrl: '',
  useCompanion: false,
  maxQuestions: 4,
  adaptiveFollowUp: true,
  historyEnabled: false,
  excludedSites: [],
  customSites: [],
  theme: 'system',
  onboarded: false,
};

export interface StoredKey {
  key: string;
  /** When it was saved — shown in Settings so the user can spot a stale key. */
  savedAt: number;
  /** Last 4 characters, so the user can identify *which* key is stored. */
  hint: string;
}

const SETTINGS_KEY = 'settings';
const KEY_PREFIX = 'apiKey:';

// ── settings ────────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<Settings> {
  const stored = (await chrome.storage.sync.get(SETTINGS_KEY))[SETTINGS_KEY] as Partial<Settings> | undefined;
  return sanitiseSettings({ ...DEFAULT_SETTINGS, ...(stored ?? {}) });
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = sanitiseSettings({ ...current, ...patch });
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
  return next;
}

/** Clamp anything that could arrive corrupted from sync or a bad message. */
export function sanitiseSettings(input: Settings): Settings {
  return {
    enabled: Boolean(input.enabled),
    autoIntercept: Boolean(input.autoIntercept),
    analysisEngine: input.analysisEngine === 'ai' ? 'ai' : 'local',
    aiProvider: isAiProviderId(input.aiProvider) ? input.aiProvider : DEFAULT_SETTINGS.aiProvider,
    // Empty means automatic. A stored value equal to the old built-in default
    // is treated as "never chosen" so existing installs move to automatic too.
    aiModel: typeof input.aiModel === 'string' && input.aiModel.trim() !== '' && input.aiModel.trim() !== defaultModelFor(input.aiProvider)
      ? input.aiModel.trim().slice(0, 120)
      : '',
    customBaseUrl: normalizeBaseUrl(input.customBaseUrl) ?? '',
    useCompanion: input.useCompanion === true,
    maxQuestions: Math.max(1, Math.min(6, Math.round(Number(input.maxQuestions) || 4))),
    adaptiveFollowUp: input.adaptiveFollowUp !== false,
    historyEnabled: Boolean(input.historyEnabled),
    excludedSites: normaliseHostList(input.excludedSites),
    customSites: normaliseHostList(input.customSites),
    theme: input.theme === 'light' || input.theme === 'dark' ? input.theme : 'system',
    onboarded: Boolean(input.onboarded),
  };
}

function normaliseHostList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out = new Set<string>();
  for (const entry of list) {
    if (typeof entry !== 'string') continue;
    const clean = entry.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (clean === '') continue;
    if (clean !== 'localhost' && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) continue;
    out.add(clean);
  }
  return Array.from(out);
}

export function defaultModelFor(provider: AiProviderId): string {
  return allProviderMeta().find((p) => p.id === provider)?.defaultModel ?? DEFAULT_SETTINGS.aiModel;
}

// ── credentials ─────────────────────────────────────────────────────────────

function keyStorageKey(provider: AiProviderId): string {
  return `${KEY_PREFIX}${provider}`;
}

/** Returns '' when no key is stored — never throws. */
export async function getApiKey(provider: AiProviderId): Promise<string> {
  try {
    const stored = (await chrome.storage.local.get(keyStorageKey(provider)))[keyStorageKey(provider)] as
      | StoredKey
      | undefined;
    return typeof stored?.key === 'string' ? stored.key : '';
  } catch {
    return '';
  }
}

/** Metadata only — the key itself is never returned across a message boundary. */
export async function getKeyInfo(provider: AiProviderId): Promise<{ hasKey: boolean; savedAt: number; hint: string }> {
  try {
    const stored = (await chrome.storage.local.get(keyStorageKey(provider)))[keyStorageKey(provider)] as
      | StoredKey
      | undefined;
    return {
      hasKey: typeof stored?.key === 'string' && stored.key !== '',
      savedAt: stored?.savedAt ?? 0,
      hint: stored?.hint ?? '',
    };
  } catch {
    return { hasKey: false, savedAt: 0, hint: '' };
  }
}

export async function setApiKey(provider: AiProviderId, key: string): Promise<void> {
  const trimmed = key.trim();
  if (trimmed === '') {
    await clearApiKey(provider);
    return;
  }
  const record: StoredKey = {
    key: trimmed,
    savedAt: Date.now(),
    hint: trimmed.slice(-4),
  };
  await chrome.storage.local.set({ [keyStorageKey(provider)]: record });
}

export async function clearApiKey(provider: AiProviderId): Promise<void> {
  await chrome.storage.local.remove(keyStorageKey(provider));
}

/** Remove every stored key — used by "Remove all credentials". */
export async function clearAllKeys(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith(KEY_PREFIX));
  if (keys.length > 0) await chrome.storage.local.remove(keys);
}

// ── host helpers ────────────────────────────────────────────────────────────

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function matchesSite(list: string[], hostname: string): boolean {
  return list.some((entry) => hostname === entry || hostname.endsWith(`.${entry}`));
}
