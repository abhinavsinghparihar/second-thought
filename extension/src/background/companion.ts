/**
 * Bridge to the Second Thought Windows Companion over Chrome Native Messaging.
 *
 * Contract (see docs/ARCHITECTURE.md):
 *   - Strictly optional. Nothing in the extension depends on it; every call
 *     resolves to `null` on ANY problem (permission missing, host not
 *     installed, companion closed, timeout, malformed reply) and the caller
 *     carries on with the built-in engine. The user's text is never held
 *     hostage and never dropped.
 *   - Every message is a small JSON envelope, validated on the way in.
 *   - After a failed connect we back off, so a missing host is not respawned
 *     on every keystroke.
 */

export const COMPANION_HOST = 'com.secondthought.companion';
const PROTOCOL = 1;
const BACKOFF_MS = 15_000;
const MAX_MESSAGE_BYTES = 512 * 1024;

export type CompanionRequestType = 'hello' | 'analyze' | 'next-round' | 'refine';

interface Pending {
  resolve: (value: unknown | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

let port: chrome.runtime.Port | null = null;
let blockedUntil = 0;
let lastError = '';
const pending = new Map<string, Pending>();

export interface CompanionStatus {
  state: 'no-permission' | 'unavailable' | 'connected';
  detail: string;
  version?: string;
}

async function hasPermission(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ permissions: ['nativeMessaging'] });
  } catch {
    return false;
  }
}

function failAll(): void {
  for (const [, entry] of pending) {
    clearTimeout(entry.timer);
    entry.resolve(null);
  }
  pending.clear();
}

function isEnvelope(value: unknown): value is { v: number; id: string; ok: boolean; payload?: unknown; error?: string } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v['v'] === PROTOCOL && typeof v['id'] === 'string' && typeof v['ok'] === 'boolean';
}

function connect(): chrome.runtime.Port | null {
  if (port) return port;
  if (Date.now() < blockedUntil) return null;
  try {
    const p = chrome.runtime.connectNative(COMPANION_HOST);
    p.onMessage.addListener((raw: unknown) => {
      if (!isEnvelope(raw)) return;
      const entry = pending.get(raw.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(raw.id);
      entry.resolve(raw.ok ? (raw.payload ?? {}) : null);
    });
    p.onDisconnect.addListener(() => {
      lastError = chrome.runtime.lastError?.message ?? 'Companion disconnected.';
      port = null;
      blockedUntil = Date.now() + BACKOFF_MS;
      failAll();
    });
    port = p;
    return p;
  } catch (err) {
    lastError = err instanceof Error ? err.message : 'Could not start the companion.';
    blockedUntil = Date.now() + BACKOFF_MS;
    return null;
  }
}

/** One request/response round trip. Resolves to the payload, or null on any failure. */
export async function companionRequest(
  type: CompanionRequestType,
  payload: Record<string, unknown>,
  timeoutMs = 6_000,
): Promise<Record<string, unknown> | null> {
  if (!(await hasPermission())) return null;
  const p = connect();
  if (!p) return null;

  const body = JSON.stringify({ v: PROTOCOL, id: '', type, payload });
  if (body.length > MAX_MESSAGE_BYTES) return null;

  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve(null);
    }, timeoutMs);
    pending.set(id, {
      timer,
      resolve: (value) => resolve(value && typeof value === 'object' ? (value as Record<string, unknown>) : null),
    });
    try {
      p.postMessage({ v: PROTOCOL, id, type, payload });
    } catch {
      clearTimeout(timer);
      pending.delete(id);
      resolve(null);
    }
  });
}

/** Used by Settings to show a truthful connection state. */
export async function companionStatus(): Promise<CompanionStatus> {
  if (!(await hasPermission())) {
    return { state: 'no-permission', detail: 'Not connected. Click “Connect to companion” to allow it.' };
  }
  blockedUntil = 0; // an explicit check always tries
  const reply = await companionRequest('hello', {}, 4_000);
  if (reply && typeof reply['version'] === 'string') {
    return { state: 'connected', detail: 'Connected to the Windows companion.', version: reply['version'] };
  }
  return {
    state: 'unavailable',
    detail:
      lastError !== ''
        ? `Companion not reachable (${lastError}). Is it running and registered for this browser?`
        : 'Companion not reachable. Is it running and registered for this browser?',
  };
}
