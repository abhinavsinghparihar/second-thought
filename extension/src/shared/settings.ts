/**
 * Extension settings.
 *
 * Privacy rules:
 *  - Non-sensitive settings live in chrome.storage.sync (they contain no
 *    prompts or keys).
 *  - The API key lives ONLY in chrome.storage.local — never synced, never
 *    logged, never included in analytics.
 *  - Prompt history lives in chrome.storage.local and is OFF by default.
 */

export type AiProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama';
export type AnalysisEngine = 'local' | 'ai';

export interface Settings {
  /** Master switch. When off, the extension never intercepts anything. */
  enabled: boolean;
  /** Intercept sends automatically (OFF = manual refine via toolbar only). */
  autoIntercept: boolean;
  /** Local heuristic engine (free, offline) or AI-powered analysis. */
  analysisEngine: AnalysisEngine;
  aiProvider: AiProviderId;
  aiModel: string;
  /** Max questions asked per refinement (1–5). */
  maxQuestions: number;
  /** Store refined prompts locally. OFF by default. */
  historyEnabled: boolean;
  /** Aggregate, prompt-free analytics. OFF by default. */
  analyticsEnabled: boolean;
  /** Hostnames where Second Thought never runs. */
  excludedSites: string[];
  /** Extra user-added hostnames served by the generic adapter. */
  customSites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  autoIntercept: true,
  analysisEngine: 'local',
  aiProvider: 'openai',
  aiModel: 'gpt-4o-mini',
  maxQuestions: 3,
  historyEnabled: false,
  analyticsEnabled: false,
  excludedSites: [],
  customSites: [],
};

export const AI_PROVIDERS: Array<{
  id: AiProviderId;
  name: string;
  defaultModel: string;
  models: string[];
  keyUrl?: string;
  needsKey: boolean;
}> = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
    keyUrl: 'https://platform.openai.com/api-keys',
    needsKey: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-5-haiku-latest',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'],
    keyUrl: 'https://console.anthropic.com/settings/keys',
    needsKey: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    keyUrl: 'https://aistudio.google.com/app/apikey',
    needsKey: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultModel: 'openai/gpt-4o-mini',
    models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku', 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-8b-instruct'],
    keyUrl: 'https://openrouter.ai/keys',
    needsKey: true,
  },
  {
    id: 'ollama',
    name: 'Ollama (local)',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'llama3.2', 'qwen2.5', 'mistral'],
    needsKey: false,
  },
];

const SETTINGS_KEY = 'settings';
const API_KEY_KEY = 'apiKey';

export async function loadSettings(): Promise<Settings> {
  const stored = (await chrome.storage.sync.get(SETTINGS_KEY))[SETTINGS_KEY] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
  return next;
}

/** The API key never leaves chrome.storage.local. */
export async function getApiKey(): Promise<string> {
  const stored = (await chrome.storage.local.get(API_KEY_KEY))[API_KEY_KEY];
  return typeof stored === 'string' ? stored : '';
}

export async function setApiKey(key: string): Promise<void> {
  if (key.trim() === '') {
    await chrome.storage.local.remove(API_KEY_KEY);
  } else {
    await chrome.storage.local.set({ [API_KEY_KEY]: key });
  }
}

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
