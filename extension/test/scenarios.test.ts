/**
 * The fourteen acceptance scenarios from the brief, run through the REAL
 * service worker (`src/background/worker.ts`) against a real in-memory
 * `chrome.*` fake.
 *
 * Nothing here is mocked at the level under test:
 *   - local mode runs the real rule-based engine;
 *   - AI mode runs the real provider adapter, which performs a real `fetch`,
 *     intercepted with `vi.stubGlobal('fetch', …)` so we can assert on the
 *     actual request body and return the shapes each provider really sends;
 *   - the worker's own message router responds, exactly as Chrome would.
 *
 * The scenarios:
 *   1  vague prompt in local mode
 *   2  vague prompt in AI mode
 *   3  fully specified prompt → pass-through, no interruption
 *   4  greeting → pass-through
 *   5  direct factual question → pass-through
 *   6  answers collected → follow-up round eliminates repeats
 *   7  final prompt keeps the user's own wording verbatim
 *   8  AI returns invalid JSON → local fallback, honest label
 *   9  AI auth failure (401) → local fallback, no key in the message
 *   10 AI rate limit (429) with retry
 *   11 request timeout → fallback, never a hang
 *   12 no API key configured in AI mode → fallback labelled as such
 *   13 history is opt-in and never written when disabled
 *   14 the user's original message is never lost on any failure path
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeChrome, type FakeChrome } from './helpers/fake-chrome';
import { analyzeRequest } from '@second-thought/core';
import type { AnalyzeResponse, NextRoundResponse, RefineResponse } from '../src/shared/types';

const KEY = 'AIzaTESTKEY_abcdefghijklmnopqrstuvwxyz012345';

interface Harness {
  chrome: FakeChrome;
  worker: typeof import('../src/background/worker');
  send: (message: unknown) => Promise<unknown>;
}

/** Import order matters: the worker registers its listener on import. */
async function bootWorker(): Promise<Harness> {
  const chrome = installFakeChrome();
  vi.resetModules();
  const worker = await import('../src/background/worker');
  const send = (message: unknown): Promise<unknown> => chrome.__control.emitMessage(message);
  return { chrome, worker, send };
}

/** What Gemini actually returns for a valid analysis. */
function geminiAnalysisBody(questions: Array<{ slot: string; text: string; kind?: string }>): unknown {
  const payload = {
    intent: 'build an expense tracking app',
    subject: 'expense tracking app',
    improved: true,
    confidence: 0.8,
    questions: questions.map((q) => ({
      slot: q.slot,
      text: q.text,
      kind: q.kind ?? 'single',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
      allowCustom: true,
      optional: false,
    })),
  };
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('scenario 1 — vague prompt, local mode', () => {
  it('interrupts with domain-specific questions and no network call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { chrome, send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { analysisEngine: 'local' } });

    const res = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;

    expect(res.decision).toBe('intercept');
    if (res.decision !== 'intercept') throw new Error('expected intercept');
    expect(res.engine).toBe('local');
    expect(res.result.taskType).toBe('software');
    expect(res.result.questions.length).toBeGreaterThanOrEqual(3);
    expect(res.result.questions.length).toBeLessThanOrEqual(6);
    // Questions are about this request, not a generic bank.
    expect(res.result.questions.some((q) => /expense/i.test(q.text))).toBe(true);
    expect(res.result.completeness.score).toBeLessThan(78);
    // Local mode must never touch the network.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(chrome.storage.local.get).toBeDefined();
  });
});

describe('scenario 2 — vague prompt, AI mode', () => {
  it('uses the provider, reports the model, and labels the engine as ai', async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse(geminiAnalysisBody([{ slot: 'features', text: 'Which expense features?' }])),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const { send } = await bootWorker();

    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai', aiProvider: 'gemini' } });
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });

    const res = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;

    expect(res.decision).toBe('intercept');
    if (res.decision !== 'intercept') throw new Error('expected intercept');
    expect(res.engine).toBe('ai');
    expect(res.via?.provider).toBe('Google Gemini');
    expect(res.via?.model).toBe('gemini-2.0-flash');
    expect(res.fallback).toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('generativelanguage.googleapis.com');
    // The key travels in a header, never in the URL.
    expect(url).not.toContain(KEY);
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    // The prompt carries the user's own text.
    expect(String(init.body)).toContain('expense tracking app');
  });
});

describe('scenario 3 — fully specified prompt', () => {
  const complete =
    'Build a React dashboard that shows monthly revenue by region, Postgres via Prisma, auth with Google sign-in, ' +
    'deploy to Vercel. Must be responsive and mobile-first. For our sales team of 12 people. ' +
    'Deliver a complete runnable project with unit tests.';

  it('passes through without a round trip even in AI mode', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { send } = await bootWorker();

    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });

    const res = (await send({
      type: 'st/analyze',
      body: { text: complete, url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;

    expect(res.decision).toBe('passthrough');
    // A complete prompt must not cost the user an API call.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('agrees with the local engine about the decision', () => {
    const local = analyzeRequest(complete, { maxQuestions: 4 });
    expect(local.isRefinable).toBe(false);
    expect(local.completeness.score).toBeGreaterThanOrEqual(78);
  });
});

describe('scenario 4 — greeting', () => {
  it('passes a greeting straight through', async () => {
    const { send } = await bootWorker();
    const res = (await send({
      type: 'st/analyze',
      body: { text: 'hey there!', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    expect(res.decision).toBe('passthrough');
  });
});

describe('scenario 5 — direct factual question', () => {
  it('passes a factual question straight through, in both engines', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { send } = await bootWorker();

    const local = (await send({
      type: 'st/analyze',
      body: { text: 'What is the capital of India?', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    expect(local.decision).toBe('passthrough');

    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });
    const ai = (await send({
      type: 'st/analyze',
      body: { text: 'What is the capital of India?', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    expect(ai.decision).toBe('passthrough');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('scenario 6 — answers produce follow-ups that do not repeat', () => {
  it('never re-asks a slot the user has already seen', async () => {
    const { send } = await bootWorker();
    const first = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    if (first.decision !== 'intercept') throw new Error('expected intercept');

    const asked = first.result.questions.map((q) => q.slot);
    const answers = { [asked[0]!]: 'receipt scanning' };

    const next = (await send({
      type: 'st/next-round',
      body: { analysisId: first.analysisId, answers, askedSlots: asked },
    })) as NextRoundResponse;

    expect(next.ok).toBe(true);
    if (!next.ok) throw new Error('expected ok');
    const newSlots = next.round.questions.map((q) => q.slot);
    for (const slot of newSlots) expect(asked).not.toContain(slot);
    expect(next.round.questions.length).toBeGreaterThan(0);
  });

  it('raises the completeness score when answers arrive', async () => {
    const { send } = await bootWorker();
    const first = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    if (first.decision !== 'intercept') throw new Error('expected intercept');

    const answers = {
      features: ['receipt scanning', 'budget alerts'],
      platform: 'Web browser',
      language: 'TypeScript',
      constraints: ['must run offline'],
    };
    const next = (await send({
      type: 'st/next-round',
      body: { analysisId: first.analysisId, answers, askedSlots: first.result.questions.map((q) => q.slot) },
    })) as NextRoundResponse;
    if (!next.ok) throw new Error('expected ok');
    expect(next.round.completeness.score).toBeGreaterThan(first.result.completeness.score);
  });
});

describe('scenario 7 — the final prompt preserves the user wording', () => {
  it('quotes the original verbatim and states the collected requirements', async () => {
    const { send } = await bootWorker();
    const original = 'Build me an expense tracking app';
    const first = (await send({
      type: 'st/analyze',
      body: { text: original, url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    if (first.decision !== 'intercept') throw new Error('expected intercept');

    const refine = (await send({
      type: 'st/refine',
      body: {
        analysisId: first.analysisId,
        answers: { features: ['receipt scanning'], platform: 'Web browser' },
      },
    })) as RefineResponse;
    expect(refine.ok).toBe(true);
    if (!refine.ok) throw new Error('expected ok');

    expect(refine.outcome.prompt).toContain(original);
    expect(refine.outcome.prompt).toContain('receipt scanning');
    // The precedence rule that makes the original authoritative is present.
    expect(refine.outcome.prompt.toLowerCase()).toContain('original request wins');
    expect(refine.outcome.completeness.score).toBeGreaterThan(first.result.completeness.score);
  });
});

describe('scenario 8 — AI returns unusable JSON', () => {
  it('falls back to local analysis and says so without leaking anything', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'I cannot help with that.' }] } }] }),
      ),
    );
    const { send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });

    const res = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;

    expect(res.decision).toBe('intercept');
    if (res.decision !== 'intercept') throw new Error('expected intercept');
    // Honest labelling: the user is told the local engine produced this.
    expect(res.engine).toBe('local');
    expect(res.fallback).toBeTruthy();
    expect(res.fallback?.message).not.toContain(KEY);
    expect(res.result.questions.length).toBeGreaterThan(0);
  });
});

describe('scenario 9 — AI rejects the key', () => {
  it('degrades to local and never echoes the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: { message: `API key not valid: ${KEY}` } }, 401)),
    );
    const { send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });

    const res = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    if (res.decision !== 'intercept') throw new Error('expected intercept');

    expect(res.engine).toBe('local');
    expect(res.fallback?.kind).toBe('auth');
    const serialised = JSON.stringify(res);
    expect(serialised).not.toContain(KEY);
    expect(serialised).not.toContain('AIza');
  });
});

describe('scenario 10 — rate limiting', () => {
  it('retries once, then degrades honestly', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ error: { message: 'rate limit exceeded' } }, 429));
    vi.stubGlobal('fetch', fetchSpy);
    const { send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });

    const res = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    if (res.decision !== 'intercept') throw new Error('expected intercept');

    expect(fetchSpy).toHaveBeenCalledTimes(2); // one retry, never more
    expect(res.engine).toBe('local');
    expect(['rate-limit', 'quota']).toContain(res.fallback?.kind);
  });

  it('recovers when the retry succeeds', async () => {
    let call = 0;
    const fetchSpy = vi.fn(async () => {
      call += 1;
      if (call === 1) return jsonResponse({ error: { message: 'rate limit' } }, 429);
      return jsonResponse(geminiAnalysisBody([{ slot: 'features', text: 'Which features?' }]));
    });
    vi.stubGlobal('fetch', fetchSpy);
    const { send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });

    const res = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    if (res.decision !== 'intercept') throw new Error('expected intercept');
    expect(res.engine).toBe('ai');
    expect(res.fallback).toBeUndefined();
  });
});

describe('scenario 11 — the provider never answers', () => {
  // The adapters use a 30 s hard timeout by design. Faking the clock lets this
  // scenario prove the deadline really fires without a 30-second test run.
  it('times out and falls back instead of hanging', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
          }),
      ),
    );
    const { send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });

    const pending = send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    }) as Promise<AnalyzeResponse>;

    // Let both attempts hit their 30 s deadline (plus the 400 ms backoff).
    await vi.advanceTimersByTimeAsync(65_000);
    const res = await pending;
    vi.useRealTimers();

    if (res.decision !== 'intercept') throw new Error('expected intercept');
    expect(res.engine).toBe('local');
    expect(res.fallback?.kind).toBe('timeout');
    // The user still gets a working clarification flow out of a dead provider.
    expect(res.result.questions.length).toBeGreaterThan(0);
  }, 20_000);
});

describe('scenario 12 — AI mode with no key saved', () => {
  it('falls back immediately, labelled no-key, and still helps', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });

    const res = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    if (res.decision !== 'intercept') throw new Error('expected intercept');
    expect(res.engine).toBe('local');
    expect(res.fallback?.kind).toBe('no-key');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('the engine status strip admits AI is not ready', async () => {
    const { send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });
    const status = (await send({ type: 'st/engine-status' })) as {
      engine: string;
      aiReady: boolean;
      reason?: string;
    };
    expect(status.aiReady).toBe(false);
    expect(status.engine).toBe('local');
    expect(status.reason).toMatch(/no api key/i);
  });
});

describe('scenario 13 — history is opt-in', () => {
  it('writes nothing while history is disabled', async () => {
    const { chrome, send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { historyEnabled: false } });
    const first = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;
    if (first.decision !== 'intercept') throw new Error('expected intercept');
    await send({
      type: 'st/refine',
      body: { analysisId: first.analysisId, answers: { features: ['receipt scanning'] } },
    });

    const stored = await chrome.storage.local.get('history');
    expect(stored['history']).toBeUndefined();
    const list = (await send({ type: 'st/history-list' })) as { history: unknown[] };
    expect(list.history).toEqual([]);
  });
});

describe('scenario 14 — the original message can never be lost', () => {
  it('every analysis failure still yields a usable local result or a pass-through', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    const { send } = await bootWorker();
    await send({ type: 'st/settings-set', settings: { analysisEngine: 'ai' } });
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });

    const res = (await send({
      type: 'st/analyze',
      body: { text: 'Build me an expense tracking app', url: 'https://chatgpt.com/', providerId: 'chatgpt' },
    })) as AnalyzeResponse;

    // Never `error`: the user always gets either questions or a pass-through,
    // and the controller releases the original send for anything else.
    expect(['intercept', 'passthrough']).toContain(res.decision);
    if (res.decision === 'intercept') {
      expect(res.result.original).toBe('Build me an expense tracking app');
    }
  });

  it('a malformed message is rejected without throwing', async () => {
    const { send } = await bootWorker();
    const res = (await send({ type: 'nonsense' })) as { decision?: string; error?: string };
    expect(res.decision).toBe('error');
    expect(typeof res.error).toBe('string');
  });

  it('an unknown analysis id returns a soft failure, not an exception', async () => {
    const { send } = await bootWorker();
    const res = (await send({
      type: 'st/refine',
      body: { analysisId: 'does-not-exist', answers: {} },
    })) as RefineResponse;
    expect(res.ok).toBe(false);
  });
});

describe('credential handling', () => {
  it('stores keys only in storage.local, never in sync', async () => {
    const { chrome, send } = await bootWorker();
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });

    const local = await chrome.storage.local.get(null);
    const sync = await chrome.storage.sync.get(null);
    expect(JSON.stringify(local)).toContain(KEY);
    expect(JSON.stringify(sync)).not.toContain(KEY);
  });

  it('exposes only a 4-character hint to any UI surface', async () => {
    const { send } = await bootWorker();
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });
    const settings = (await send({ type: 'st/settings-get' })) as {
      keys: Record<string, { hasKey: boolean; hint: string }>;
    };
    expect(settings.keys['gemini']?.hasKey).toBe(true);
    expect(settings.keys['gemini']?.hint).toBe(KEY.slice(-4));
    expect(JSON.stringify(settings)).not.toContain(KEY);
  });

  it('clears a key on request', async () => {
    const { send } = await bootWorker();
    await send({ type: 'st/key-set', provider: 'gemini', apiKey: KEY });
    await send({ type: 'st/key-clear', provider: 'gemini' });
    const settings = (await send({ type: 'st/settings-get' })) as {
      keys: Record<string, { hasKey: boolean }>;
    };
    expect(settings.keys['gemini']?.hasKey).toBe(false);
  });
});
