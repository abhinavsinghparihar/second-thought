/**
 * AI analysis provider contract.
 *
 * Every adapter is a pure function of (key, model, request) → text, with the
 * same failure vocabulary. That is what lets the worker fall back to the local
 * engine on *any* provider problem instead of trapping the user's prompt.
 */

export type AiProviderId = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'custom';

/** Structured failure reasons — never contains the API key. */
export type AiErrorKind =
  | 'no-key'
  | 'auth'
  | 'rate-limit'
  | 'quota'
  | 'model-not-found'
  | 'timeout'
  | 'network'
  | 'bad-response'
  | 'server'
  | 'aborted'
  | 'unknown';

export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(kind: AiErrorKind, message: string, options: { retryable?: boolean; status?: number } = {}) {
    super(message);
    this.name = 'AiError';
    this.kind = kind;
    this.retryable = options.retryable ?? (kind === 'rate-limit' || kind === 'network' || kind === 'server' || kind === 'timeout');
    this.status = options.status;
  }
}

export interface AiRequest {
  /** System prompt / instructions. */
  system: string;
  /** User content. */
  user: string;
  /** Ask the provider for strict JSON where it supports it. */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  /** Custom provider only: the user's OpenAI-compatible base URL. */
  baseUrl?: string;
}

export interface AiProviderMeta {
  id: AiProviderId;
  name: string;
  defaultModel: string;
  models: string[];
  /** Where the user creates a key. */
  keyUrl?: string;
  needsKey: boolean;
  /** A key may be saved but is not required (local OpenAI-compatible servers). */
  keyOptional?: boolean;
  /** Origin the extension must be allowed to reach. Empty when it is user-defined (custom). */
  origin: string;
  /** Human note about how the request travels. */
  transport: string;
}

export interface AiProviderAdapter {
  readonly meta: AiProviderMeta;
  /** Perform one completion. Throws AiError on any failure. */
  complete(apiKey: string, model: string, request: AiRequest): Promise<string>;
}

/** Redact anything that looks like a credential, at the boundary. */
export function redactSecrets(text: string, apiKey?: string): string {
  let out = text;
  if (apiKey && apiKey.length >= 8) {
    out = out.split(apiKey).join('[redacted]');
  }
  return out
    .replace(/\b(sk|pk|rk|api|key|token)[-_][A-Za-z0-9_-]{8,}/gi, '[redacted]')
    .replace(/\bAIza[A-Za-z0-9_-]{20,}/g, '[redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{10,}/g, '[redacted]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted]');
}

/** Map an HTTP status to a structured, user-safe error. */
export function httpStatusError(status: number, providerName: string, bodyText: string, apiKey?: string): AiError {
  const detail = redactSecrets(extractMessage(bodyText), apiKey).slice(0, 200);
  if (status === 401 || status === 403) {
    return new AiError('auth', `${providerName} rejected the API key. Check the key in Settings.${detail ? ` (${detail})` : ''}`, { status });
  }
  if (status === 404) {
    return new AiError('model-not-found', `The model was not found on ${providerName}. Pick a different model in Settings.${detail ? ` (${detail})` : ''}`, { status });
  }
  if (status === 429) {
    const quota = /quota|billing|credit/i.test(bodyText);
    return new AiError(quota ? 'quota' : 'rate-limit', quota ? `${providerName} reports no remaining quota for this key.` : `${providerName} is rate limiting — try again in a moment.`, { status, retryable: !quota });
  }
  if (status >= 500) {
    return new AiError('server', `${providerName} had a server error (${status}). Try again shortly.`, { status });
  }
  return new AiError('unknown', `${providerName} returned an error (${status}).${detail ? ` ${detail}` : ''}`, { status });
}

function extractMessage(bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const err = parsed.error;
    if (typeof err === 'string') return err;
    if (err?.message) return err.message;
    if (parsed.message) return parsed.message;
  } catch {
    // not JSON — fall through to the raw text
  }
  return bodyText.replace(/\s+/g, ' ').trim().slice(0, 160);
}

/** fetch with a hard timeout that actually aborts the request. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  providerName: string,
): Promise<Response> {
  const controller = new AbortController();
  const callerSignal = init.signal ?? undefined;
  const onAbort = () => controller.abort();
  callerSignal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      if (callerSignal?.aborted) throw new AiError('aborted', 'Request cancelled.');
      throw new AiError('timeout', `${providerName} took longer than ${Math.round(timeoutMs / 1000)}s to respond.`);
    }
    throw new AiError('network', `Could not reach ${providerName}. Check your connection, then retry.`);
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onAbort);
  }
}

/** Read JSON safely, converting a parse failure into a typed error. */
export async function readJson(res: Response, providerName: string): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => '');
  if (!res.ok) throw httpStatusError(res.status, providerName, text);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new AiError('bad-response', `${providerName} returned a response that was not valid JSON.`);
  }
}

/** Narrow helper for safe nested reads. */
export function pick(obj: unknown, ...path: Array<string | number>): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof key === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[key];
    } else {
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }
  }
  return current;
}

/**
 * Validate and normalise a user-supplied OpenAI-compatible base URL
 * (e.g. https://api.together.xyz/v1). https only; plain http is accepted solely
 * for a server running on this machine. No credentials, query or fragment.
 */
export function normalizeBaseUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (text === '' || text.length > 300) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
  if (url.username !== '' || url.password !== '') return null;
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${url.host}${path}`;
}
