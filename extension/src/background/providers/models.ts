/**
 * Automatic model selection.
 *
 * The user should never have to know which model id is "the good one". When the
 * Model field is empty (the default) we ask the provider which models THIS key
 * can use, rank them for our job (fast, cheap, reliable JSON, strong enough to
 * write good questions) and use the best. The pick is cached per provider and
 * cleared whenever a key is saved or removed.
 *
 * Nothing here ever throws: any failure falls back to the adapter's default.
 */

import { AI_ADAPTERS } from './registry';
import { fetchWithTimeout, normalizeBaseUrl, type AiProviderId } from './types';

export interface ModelInfo {
  id: string;
  /** OpenRouter: costs nothing per token. */
  free?: boolean;
  /** Prompt price per token, when the provider reports it. */
  price?: number;
  context?: number;
}

const CACHE_KEY = 'st_auto_model';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const LIST_TIMEOUT_MS = 8_000;

/** Models that are not general chat/completion models. */
const NOT_CHAT = /(embed|whisper|tts|speech|audio|realtime|transcribe|moderation|guard|safeguard|image|dall|imagen|veo|vision-only|robotics|computer-use|search|codex|davinci|babbage|aqa|learnlm|playai|orpheus|rerank|ocr|diffus)/i;

// ── ranking (pure, unit-testable) ───────────────────────────────────────────

function firstMatching(ids: string[], patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const hit = ids.find((id) => pattern.test(id));
    if (hit) return hit;
  }
  return undefined;
}

function versionOf(id: string): number {
  const m = /(\d+(?:\.\d+)?)/.exec(id);
  return m ? parseFloat(m[1]!) : 0;
}

function highest(ids: string[]): string | undefined {
  return [...ids].sort((a, b) => versionOf(b) - versionOf(a) || a.length - b.length)[0];
}

export function pickBestModel(provider: AiProviderId, models: ModelInfo[]): string | undefined {
  const usable = models.filter((m) => m.id !== '' && !NOT_CHAT.test(m.id));
  const ids = usable.map((m) => m.id);
  if (ids.length === 0) return undefined;

  switch (provider) {
    case 'openai': {
      // Non-reasoning "mini" models: quick, cheap and accept a temperature.
      const preferred = firstMatching(ids, [/^gpt-4\.1-mini$/, /^gpt-4o-mini$/, /^gpt-4\.1$/, /^gpt-4o$/]);
      if (preferred) return preferred;
      const minis = ids.filter((id) => /^gpt-[\d.]+-mini$/.test(id));
      return highest(minis) ?? ids.find((id) => /^gpt-/.test(id));
    }
    case 'anthropic': {
      // The API lists newest first.
      return ids.find((id) => /haiku/i.test(id)) ?? ids.find((id) => /sonnet/i.test(id)) ?? ids[0];
    }
    case 'gemini': {
      const stable = (re: RegExp) => ids.filter((id) => re.test(id) && !/(preview|exp|latest|thinking|tts|live|image|native|-\d{3}$)/i.test(id));
      return (
        highest(stable(/^gemini-[\d.]+-flash$/)) ??
        highest(stable(/^gemini-[\d.]+-flash-lite$/)) ??
        ids.find((id) => /flash/i.test(id)) ??
        ids.find((id) => /^gemini-/.test(id))
      );
    }
    case 'groq': {
      return (
        firstMatching(ids, [
          /^llama-3\.3-70b-versatile$/,
          /gpt-oss-120b/,
          /llama-3\.1-70b/,
          /qwen.*32b/,
          /llama-3\.1-8b-instant/,
        ]) ?? ids.find((id) => /llama|qwen|gpt-oss|mixtral/i.test(id)) ?? ids[0]
      );
    }
    case 'openrouter': {
      const decent = (m: ModelInfo) => (m.context ?? 0) >= 16_000 && !/(:extended|:thinking|-r1|reason|think)/i.test(m.id);
      const families = [
        /llama-3\.3-70b/, /gpt-oss-120b/, /qwen.*(72b|235b|32b)/, /deepseek-(chat|v3)/, /gemma-3-27b/, /mistral-(small|medium|large)/, /llama-3\.1-70b/,
      ];
      const free = usable.filter((m) => m.free && decent(m));
      const freePick = firstMatching(free.map((m) => m.id), families);
      if (freePick) return freePick;
      const bigFree = [...free].sort((a, b) => (b.context ?? 0) - (a.context ?? 0))[0];
      if (bigFree) return bigFree.id;
      const paid = usable.filter((m) => !m.free && decent(m));
      const cheap = paid
        .filter((m) => /(gpt-4o-mini|gpt-4\.1-mini|gemini-[\d.]+-flash|claude-.*haiku|llama-3\.3-70b)/i.test(m.id))
        .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
      return cheap?.id ?? paid[0]?.id ?? ids[0];
    }
    case 'custom': {
      return (
        firstMatching(ids, [/llama-3\.3-70b/, /gpt-4o-mini/, /gpt-4\.1-mini/, /qwen.*(72b|32b|14b|7b)/, /mistral/, /gemma/, /llama/]) ?? ids[0]
      );
    }
    case 'ollama': {
      return firstMatching(ids, [/llama3/, /qwen2\.5/, /qwen3/, /mistral/, /gemma/, /phi/]) ?? ids[0];
    }
    default:
      return ids[0];
  }
}

// ── fetching ────────────────────────────────────────────────────────────────

async function getJson(url: string, headers: Record<string, string>, name: string): Promise<Record<string, unknown> | undefined> {
  const res = await fetchWithTimeout(url, { method: 'GET', headers }, LIST_TIMEOUT_MS, name);
  if (!res.ok) return undefined;
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function arr(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

export async function listModels(provider: AiProviderId, apiKey: string, baseUrl = ''): Promise<ModelInfo[]> {
  switch (provider) {
    case 'openai': {
      const j = await getJson('https://api.openai.com/v1/models', { Authorization: `Bearer ${apiKey}` }, 'OpenAI');
      return arr(j?.['data']).map((m) => ({ id: String(m['id'] ?? '') }));
    }
    case 'groq': {
      const j = await getJson('https://api.groq.com/openai/v1/models', { Authorization: `Bearer ${apiKey}` }, 'Groq');
      return arr(j?.['data']).filter((m) => m['active'] !== false).map((m) => ({ id: String(m['id'] ?? ''), context: Number(m['context_window']) || undefined }));
    }
    case 'anthropic': {
      const j = await getJson(
        'https://api.anthropic.com/v1/models?limit=100',
        { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        'Anthropic',
      );
      return arr(j?.['data']).map((m) => ({ id: String(m['id'] ?? '') }));
    }
    case 'gemini': {
      const j = await getJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { 'x-goog-api-key': apiKey }, 'Gemini');
      return arr(j?.['models'])
        .filter((m) => Array.isArray(m['supportedGenerationMethods']) && (m['supportedGenerationMethods'] as unknown[]).includes('generateContent'))
        .map((m) => ({ id: String(m['name'] ?? '').replace(/^models\//, '') }));
    }
    case 'openrouter': {
      const j = await getJson('https://openrouter.ai/api/v1/models', apiKey ? { Authorization: `Bearer ${apiKey}` } : {}, 'OpenRouter');
      return arr(j?.['data']).map((m) => {
        const pricing = (m['pricing'] ?? {}) as Record<string, unknown>;
        const prompt = Number(pricing['prompt']);
        const completion = Number(pricing['completion']);
        const id = String(m['id'] ?? '');
        return {
          id,
          free: id.endsWith(':free') || (prompt === 0 && completion === 0),
          price: Number.isFinite(prompt) ? prompt : undefined,
          context: Number(m['context_length']) || undefined,
        };
      });
    }
    case 'ollama': {
      const j = await getJson('http://127.0.0.1:11434/api/tags', {}, 'Ollama');
      return arr(j?.['models']).map((m) => ({ id: String(m['name'] ?? '') }));
    }
    case 'custom': {
      const base = normalizeBaseUrl(baseUrl);
      if (!base) return [];
      const j = await getJson(`${base}/models`, apiKey.trim() !== '' ? { Authorization: `Bearer ${apiKey}` } : {}, 'Custom provider');
      return arr(j?.['data'] ?? j?.['models']).map((m) => ({ id: String(m['id'] ?? m['name'] ?? '') }));
    }
    default:
      return [];
  }
}

// ── cache + resolution ──────────────────────────────────────────────────────

type CacheShape = Partial<Record<AiProviderId, { model: string; at: number; base?: string }>>;

async function readCache(): Promise<CacheShape> {
  try {
    const stored = await chrome.storage.local.get(CACHE_KEY);
    return (stored[CACHE_KEY] as CacheShape | undefined) ?? {};
  } catch {
    return {};
  }
}

export async function clearAutoModel(provider?: AiProviderId): Promise<void> {
  try {
    if (!provider) {
      await chrome.storage.local.remove(CACHE_KEY);
      return;
    }
    const cache = await readCache();
    delete cache[provider];
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  } catch {
    // best effort
  }
}

/**
 * The model to call. A model the user typed always wins; otherwise the best one
 * available to this key, falling back to the adapter's built-in default.
 */
export async function resolveModel(provider: AiProviderId, configured: string, apiKey: string, baseUrl = ''): Promise<string> {
  const typed = configured.trim();
  if (typed !== '') return typed;

  const fallback = AI_ADAPTERS[provider]?.meta.defaultModel ?? '';
  try {
    const cache = await readCache();
    const hit = cache[provider];
    if (hit && Date.now() - hit.at < CACHE_TTL_MS && hit.model !== '' && (hit.base ?? '') === baseUrl) return hit.model;

    const models = await listModels(provider, apiKey, baseUrl);
    const best = pickBestModel(provider, models);
    if (!best) return fallback;

    cache[provider] = { model: best, at: Date.now(), base: baseUrl };
    try {
      await chrome.storage.local.set({ [CACHE_KEY]: cache });
    } catch {
      // cache is an optimisation only
    }
    return best;
  } catch {
    return fallback;
  }
}

/** Models this key can actually use, best first — what the Settings dropdown shows. */
export async function listUsableModels(
  provider: AiProviderId,
  apiKey: string,
  baseUrl = '',
): Promise<{ models: string[]; best?: string }> {
  const all = await listModels(provider, apiKey, baseUrl);
  const usable = all.filter((m) => m.id !== '' && !NOT_CHAT.test(m.id));
  const best = pickBestModel(provider, usable);
  const ids = Array.from(new Set(usable.map((m) => m.id))).sort((a, b) => a.localeCompare(b));
  const ordered = best ? [best, ...ids.filter((id) => id !== best)] : ids;
  return { models: ordered, best };
}
