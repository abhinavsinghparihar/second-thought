/**
 * A functional fake of the `chrome.*` surface this extension actually uses.
 *
 * Not a mock framework: it is an in-memory implementation with the same
 * asynchronous shape as the real API (every method returns a promise), so the
 * code under test runs its real logic — including storage reads and writes —
 * rather than receiving canned answers.
 *
 * Scopes are separated exactly as Chrome separates them:
 *   - `sync`    : settings (never credentials)
 *   - `local`   : credentials + history
 *   - `session` : analysis cache (memory only, dies with the browser)
 */

type Area = 'sync' | 'local' | 'session';

type ChangeListener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void;
type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response?: unknown) => void,
) => boolean | undefined | void;

export interface FakeChrome {
  storage: Record<Area, StorageArea>;
  runtime: {
    onMessage: { addListener: (fn: MessageListener) => void; removeListener: (fn: MessageListener) => void };
    onInstalled: { addListener: (fn: (details: { reason: string }) => void) => void };
    lastError: undefined;
    sendMessage: (message: unknown) => Promise<unknown>;
    openOptionsPage: () => Promise<void>;
  };
  scripting: {
    registerContentScripts: (scripts: unknown[]) => Promise<void>;
    unregisterContentScripts: (filter?: { ids?: string[] }) => Promise<void>;
    getRegisteredContentScripts: () => Promise<unknown[]>;
    executeScript: (opts: unknown) => Promise<unknown[]>;
  };
  permissions: {
    request: (opts: { origins?: string[]; permissions?: string[] }) => Promise<boolean>;
    contains: (opts: { origins?: string[]; permissions?: string[] }) => Promise<boolean>;
    remove: (opts: { origins?: string[] }) => Promise<boolean>;
  };
  tabs: { query: (q: unknown) => Promise<unknown[]>; sendMessage: (tabId: number, m: unknown) => Promise<unknown> };
  action: { setBadgeText: (o: { text: string }) => Promise<void>; setBadgeBackgroundColor: (o: unknown) => Promise<void> };
  /** Test controls — not part of the Chrome API. */
  __control: {
    emitMessage: (message: unknown, sender?: unknown) => Promise<unknown>;
    grantPermissions: (origins: string[]) => void;
    openOptionsPageCalls: () => number;
    executeScriptCalls: () => unknown[];
    /** Every fetch the extension attempted, in order. */
    reset: () => void;
  };
}

export interface StorageArea {
  get: (keys?: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
  clear: () => Promise<void>;
}

function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function createArea(area: Area, state: Map<string, unknown>, listeners: Set<ChangeListener>): StorageArea {
  const notify = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>): void => {
    for (const listener of listeners) listener(changes, area);
  };

  return {
    async get(keys) {
      const out: Record<string, unknown> = {};
      const wanted =
        keys === undefined || keys === null
          ? Array.from(state.keys())
          : Array.isArray(keys)
            ? keys
            : [keys];
      for (const key of wanted) {
        if (state.has(key)) out[key] = clone(state.get(key));
      }
      return out;
    },
    async set(items) {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const [key, value] of Object.entries(items)) {
        changes[key] = { oldValue: clone(state.get(key)), newValue: clone(value) };
        state.set(key, clone(value));
      }
      notify(changes);
    },
    async remove(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const key of list) {
        if (!state.has(key)) continue;
        changes[key] = { oldValue: clone(state.get(key)), newValue: undefined };
        state.delete(key);
      }
      notify(changes);
    },
    async clear() {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const [key, value] of state) changes[key] = { oldValue: clone(value), newValue: undefined };
      state.clear();
      notify(changes);
    },
  };
}

export function createFakeChrome(): FakeChrome {
  const stores: Record<Area, Map<string, unknown>> = {
    sync: new Map(),
    local: new Map(),
    session: new Map(),
  };
  const changeListeners = new Set<ChangeListener>();
  const messageListeners = new Set<MessageListener>();
  const installedListeners: Array<(details: { reason: string }) => void> = [];
  const registeredScripts: Array<{ id: string; matches: string[] }> = [];
  const granted = new Set<string>(['storage']);
  const executeScriptCalls: unknown[] = [];
  let openOptionsPageCount = 0;

  const storage = {
    sync: createArea('sync', stores.sync, changeListeners),
    local: createArea('local', stores.local, changeListeners),
    session: createArea('session', stores.session, changeListeners),
    onChanged: { addListener: (fn: ChangeListener) => void changeListeners.add(fn) },
  };

  const chrome: FakeChrome = {
    storage: storage as unknown as FakeChrome['storage'],
    runtime: {
      onMessage: {
        addListener: (fn: MessageListener) => void messageListeners.add(fn),
        removeListener: (fn: MessageListener) => void messageListeners.delete(fn),
      },
      onInstalled: {
        addListener: (fn: (details: { reason: string }) => void) => {
          installedListeners.push(fn);
        },
      },
      lastError: undefined,
      // In the real MV3 world this would reach the service worker. Here the
      // worker's own listener is invoked directly, exactly as Chrome would.
      sendMessage: async (message: unknown) => {
        for (const listener of messageListeners) {
          const response = await new Promise<unknown>((resolve) => {
            let settled = false;
            const sendResponse = (value?: unknown): void => {
              if (settled) return;
              settled = true;
              resolve(value);
            };
            const async = listener(message, {}, sendResponse);
            if (async !== true && !settled) resolve(undefined);
          });
          if (response !== undefined) return response;
        }
        return undefined;
      },
      openOptionsPage: async () => {
        openOptionsPageCount += 1;
      },
    },
    scripting: {
      registerContentScripts: async (scripts) => {
        for (const script of scripts as Array<{ id: string; matches: string[] }>) {
          const existing = registeredScripts.findIndex((s) => s.id === script.id);
          if (existing >= 0) registeredScripts.splice(existing, 1);
          registeredScripts.push({ id: script.id, matches: script.matches });
        }
      },
      unregisterContentScripts: async (filter) => {
        const ids = filter?.ids;
        for (let i = registeredScripts.length - 1; i >= 0; i -= 1) {
          if (!ids || ids.includes(registeredScripts[i]!.id)) registeredScripts.splice(i, 1);
        }
      },
      getRegisteredContentScripts: async () => registeredScripts.map((s) => ({ ...s })),
      executeScript: async (opts) => {
        executeScriptCalls.push(opts);
        return [{ result: true }];
      },
    },
    permissions: {
      request: async (opts) => {
        for (const origin of opts.origins ?? []) granted.add(origin);
        for (const permission of opts.permissions ?? []) granted.add(permission);
        return true;
      },
      contains: async (opts) => {
        const wanted = [...(opts.origins ?? []), ...(opts.permissions ?? [])];
        return wanted.every((item) => granted.has(item));
      },
      remove: async (opts) => {
        for (const origin of opts.origins ?? []) granted.delete(origin);
        return true;
      },
    },
    tabs: {
      query: async () => [{ id: 1, url: 'https://chatgpt.com/c/1' }],
      sendMessage: async () => ({ ok: true }),
    },
    action: {
      setBadgeText: async () => undefined,
      setBadgeBackgroundColor: async () => undefined,
    },
    __control: {
      emitMessage: async (message, sender = {}) => {
        for (const listener of messageListeners) {
          const response = await new Promise<unknown>((resolve) => {
            let settled = false;
            const sendResponse = (value?: unknown): void => {
              if (settled) return;
              settled = true;
              resolve(value);
            };
            const async = listener(message, sender, sendResponse);
            if (async !== true && !settled) resolve(undefined);
          });
          if (response !== undefined) return response;
        }
        return undefined;
      },
      grantPermissions: (origins) => {
        for (const origin of origins) granted.add(origin);
      },
      openOptionsPageCalls: () => openOptionsPageCount,
      executeScriptCalls: () => [...executeScriptCalls],
      reset: () => {
        stores.sync.clear();
        stores.local.clear();
        stores.session.clear();
        changeListeners.clear();
        messageListeners.clear();
        registeredScripts.length = 0;
        executeScriptCalls.length = 0;
        openOptionsPageCount = 0;
      },
    },
  };

  // onInstalled listeners are kept on the object so tests can fire them.
  (chrome.runtime.onInstalled as unknown as { fire: (reason: string) => void }).fire = (reason: string) => {
    for (const fn of installedListeners) fn({ reason });
  };

  return chrome;
}

/** Install a fresh fake on globalThis and return it. */
export function installFakeChrome(): FakeChrome {
  const chrome = createFakeChrome();
  (globalThis as unknown as { chrome: FakeChrome }).chrome = chrome;
  return chrome;
}
