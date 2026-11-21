/**
 * Service worker — policy and orchestration.
 *
 * Contract (the whole point of this file):
 *   1. The local engine ALWAYS runs. It decides nothing on its own; it provides
 *      the requirement model, the gaps and the fallback question set.
 *   2. In AI mode the model refines the *decision and the questions*; it never
 *      gets the final say on the prompt, which is always composed locally from
 *      structured answers. That keeps the output auditable and predictable.
 *   3. ANY provider failure degrades to the local engine with a visible badge.
 *      A user's prompt is never trapped.
 *   4. No secret is ever logged, echoed, or included in an error message.
 */

import {
  analyzeRequest,
  analyzeNext,
  composeFrom,
  type AnalysisResult,
  type AnswerSet,
  type TaskType,
} from '@second-thought/core';
import { analyzeWithAi, testConnection } from './ai/analyze';
import { composeWithAi } from './ai/compose';
import { clearAutoModel, listUsableModels } from './providers/models';
import { companionRequest, companionStatus } from './companion';
import { buildBuyPrompt, buildBuyQuestions, buyQuestionTexts, detectBuyRequest, generalDetection, type BuyDetection } from './local-buy';
import { AiError } from './providers/types';
import { providerMeta } from './providers/registry';
import {
  clearAllKeys,
  clearApiKey,
  getApiKey,
  getKeyInfo,
  loadSettings,
  saveSettings,
  setApiKey,
  defaultModelFor,
  type Settings,
} from '../shared/settings';
import { allProviderMeta, isAiProviderId } from './providers/registry';
import type {
  AnalyzeResponse,
  EngineStatus,
  FallbackInfo,
  HistoryItem,
  NextRoundResponse,
  RefineResponse,
  RuntimeMessage,
  SettingsResponse,
  TestConnectionResponse,
} from '../shared/types';

const HISTORY_KEY = 'history';
const HISTORY_LIMIT = 100;
const ANALYSIS_TTL_MS = 15 * 60 * 1000;
const ANALYSIS_CACHE_MAX = 50;
const AI_COMPOSE_TIMEOUT_MS = 10_000;

/**
 * Analysis cache.
 *
 * The original kept this in a plain `Map`, which MV3 destroys whenever the
 * idle worker is reclaimed (~30 s) — so `st/refine` frequently answered
 * "Analysis expired" and the user lost their answers. It is persisted in
 * `chrome.storage.session` (memory-only, cleared on browser exit) with the
 * in-memory map as a fast path.
 */
interface CachedAnalysis {
  result: AnalysisResult;
  createdAt: number;
  answeredSlots: string[];
  /** Language the user wrote in, as reported by the model (AI mode only). */
  language?: string;
  /** slot → the question text that was shown, in the user's language. */
  asked?: Record<string, string>;
  /** Set when the offline buying-guide questions were used (no AI). */
  buy?: BuyDetection;
  /** Set when the Windows companion produced this analysis. */
  companion?: boolean;
}

const memoryCache = new Map<string, CachedAnalysis>();

async function cacheSet(entry: CachedAnalysis): Promise<void> {
  memoryCache.set(entry.result.id, entry);
  try {
    const stored = (await chrome.storage.session.get('analyses'))['analyses'] as
      | Record<string, CachedAnalysis>
      | undefined;
    const now = Date.now();
    const next: Record<string, CachedAnalysis> = {};
    for (const [id, value] of Object.entries(stored ?? {})) {
      if (now - value.createdAt < ANALYSIS_TTL_MS) next[id] = value;
    }
    next[entry.result.id] = entry;
    const trimmed = Object.fromEntries(
      Object.entries(next)
        .sort((a, b) => b[1].createdAt - a[1].createdAt)
        .slice(0, ANALYSIS_CACHE_MAX),
    );
    await chrome.storage.session.set({ analyses: trimmed });
  } catch {
    // storage.session unavailable — the in-memory map still works for this lifetime
  }
}

async function cacheGet(id: string): Promise<CachedAnalysis | undefined> {
  const inMemory = memoryCache.get(id);
  if (inMemory) return inMemory;
  try {
    const stored = (await chrome.storage.session.get('analyses'))['analyses'] as
      | Record<string, CachedAnalysis>
      | undefined;
    const found = stored?.[id];
    if (found && Date.now() - found.createdAt < ANALYSIS_TTL_MS) {
      memoryCache.set(id, found);
      return found;
    }
  } catch {
    // ignore
  }
  return undefined;
}

async function cacheDelete(id: string): Promise<void> {
  memoryCache.delete(id);
  try {
    const stored = (await chrome.storage.session.get('analyses'))['analyses'] as
      | Record<string, CachedAnalysis>
      | undefined;
    if (stored && stored[id]) {
      delete stored[id];
      await chrome.storage.session.set({ analyses: stored });
    }
  } catch {
    // ignore
  }
}

// ── message authorisation ───────────────────────────────────────────────────

/**
 * Messages a content script (code running on chatgpt.com, claude.ai, …) may
 * send. Everything else — keys, settings writes, history, connection tests —
 * is reserved for the extension's own pages (popup / options). A content script
 * shares a process with a third-party page, so it is given the least privilege
 * that still lets the panel work.
 */
const CONTENT_SCRIPT_MESSAGES = new Set([
  'st/ping',
  'st/analyze',
  'st/next-round',
  'st/refine',
  'st/cancel',
  'st/settings-get',
]);

function isContentScriptSender(sender: chrome.runtime.MessageSender | undefined): boolean {
  if (!sender || !sender.tab) return false; // popup, or a test harness
  const own = `chrome-extension://${chrome.runtime.id}/`;
  return !(typeof sender.url === 'string' && sender.url.startsWith(own));
}

// ── AI call budget ──────────────────────────────────────────────────────────

/**
 * Sliding-window limit on provider calls. Every call is billed to the user's
 * own key, so a runaway page script or a held-down Enter key must not be able
 * to burn through it. Over budget ⇒ the local engine answers instead.
 */
const AI_WINDOW_MS = 60_000;
const AI_MAX_CALLS_PER_WINDOW = 24;
const aiCallTimes: number[] = [];

function takeAiBudget(): boolean {
  const now = Date.now();
  while (aiCallTimes.length > 0 && now - aiCallTimes[0]! > AI_WINDOW_MS) aiCallTimes.shift();
  if (aiCallTimes.length >= AI_MAX_CALLS_PER_WINDOW) return false;
  aiCallTimes.push(now);
  return true;
}

function budgetError(): AiError {
  return new AiError('rate-limit', 'Too many AI requests in the last minute — using local analysis for now.', { retryable: false });
}

// ── lifecycle ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((msg: RuntimeMessage, sender, sendResponse) => {
  if (isContentScriptSender(sender) && !CONTENT_SCRIPT_MESSAGES.has((msg as { type?: string } | undefined)?.type ?? '')) {
    sendResponse({ decision: 'error', error: 'Not permitted from a web page.' });
    return false;
  }
  const fromPage = isContentScriptSender(sender);
  void handleMessage(msg, fromPage)
    .then((response) => sendResponse(response))
    .catch((err: unknown) => {
      sendResponse({ decision: 'error', error: safeError(err) });
    });
  return true; // async response
});

async function handleMessage(msg: RuntimeMessage, fromPage = false): Promise<unknown> {
  if (!msg || typeof msg.type !== 'string') return { decision: 'error', error: 'Malformed message.' };
  switch (msg.type) {
    case 'st/ping':
      return { ok: true };
    case 'st/analyze':
      return handleAnalyze(msg.body);
    case 'st/next-round':
      return handleNextRound(msg.body.analysisId, msg.body.answers, msg.body.askedSlots ?? []);
    case 'st/refine':
      return handleRefine(msg.body.analysisId, msg.body.answers);
    case 'st/cancel':
      await cacheDelete(msg.analysisId);
      return { ok: true };
    case 'st/settings-get': {
      const full = await handleSettingsGet();
      // A web-page context needs the settings, never the key metadata.
      return fromPage ? { settings: full.settings, keys: {}, engineStatus: full.engineStatus } : full;
    }
    case 'st/settings-set':
      return { settings: await saveSettings(msg.settings) };
    case 'st/key-set': {
      if (!isAiProviderId(msg.provider)) return { ok: false, error: 'Unknown provider.' };
      await setApiKey(msg.provider, msg.apiKey);
      await clearAutoModel(msg.provider);
      return { ok: true, ...(await getKeyInfo(msg.provider)) };
    }
    case 'st/key-clear': {
      if (!isAiProviderId(msg.provider)) return { ok: false, error: 'Unknown provider.' };
      await clearApiKey(msg.provider);
      await clearAutoModel(msg.provider);
      return { ok: true, hasKey: false };
    }
    case 'st/key-clear-all':
      await clearAllKeys();
      return { ok: true };
    case 'st/test-connection': {
      if (!isAiProviderId(msg.provider)) return { ok: false, message: 'Unknown provider.' };
      const key = (msg.apiKey ?? '').trim() !== '' ? msg.apiKey! : await getApiKey(msg.provider);
      const cfg = await loadSettings();
      return testConnection(msg.provider, msg.model, key, cfg.customBaseUrl);
    }
    case 'st/companion-status':
      return companionStatus();
    case 'st/list-models': {
      if (!isAiProviderId(msg.provider)) return { ok: false, models: [], message: 'Unknown provider.' };
      const cfg = await loadSettings();
      const key = (msg.apiKey ?? '').trim() !== '' ? msg.apiKey! : await getApiKey(msg.provider);
      const meta = providerMeta(msg.provider);
      if (meta?.needsKey && key.trim() === '') return { ok: false, models: [], message: 'Add and save an API key to load its models.' };
      try {
        const { models, best } = await listUsableModels(msg.provider, key, cfg.customBaseUrl);
        if (models.length === 0) {
          return { ok: false, models: [], message: msg.provider === 'ollama' ? 'No models found. Is Ollama running, and have you pulled one (ollama pull llama3.1)?' : 'No models were returned for this key.' };
        }
        return { ok: true, models, best };
      } catch {
        return { ok: false, models: [], message: 'Could not load models for this key.' };
      }
    }
    case 'st/history-list': {
      const stored = await chrome.storage.local.get(HISTORY_KEY);
      return { history: (stored[HISTORY_KEY] as HistoryItem[] | undefined) ?? [] };
    }
    case 'st/history-clear':
      await chrome.storage.local.remove(HISTORY_KEY);
      return { ok: true };
    case 'st/engine-status':
      return await engineStatus(await loadSettings());
    case 'st/open-panel':
      // Handled by the content script, not the worker. Respond politely so a
      // stray call does not produce "receiving end does not exist".
      return { ok: false, error: 'Open the panel from the page, not the worker.' };
    default:
      return { decision: 'error', error: 'Unknown message type.' };
  }
}

// ── settings / status ───────────────────────────────────────────────────────

async function handleSettingsGet(): Promise<SettingsResponse> {
  const settings = await loadSettings();
  const keys: SettingsResponse['keys'] = {};
  for (const meta of allProviderMeta()) {
    keys[meta.id] = await getKeyInfo(meta.id);
  }
  return { settings, keys, engineStatus: await engineStatus(settings) };
}

async function engineStatus(settings: Settings): Promise<EngineStatus> {
  const meta = providerMeta(settings.aiProvider);
  const providerName = meta?.name ?? settings.aiProvider;
  const model = settings.aiModel || meta?.defaultModel || '';

  if (settings.analysisEngine !== 'ai') {
    return {
      engine: 'local',
      aiReady: false,
      providerName,
      model,
      reason: 'Local analysis is on-device and needs no API key.',
    };
  }
  if (!meta) {
    return { engine: 'local', aiReady: false, providerName, model, reason: 'Unknown provider — using local analysis.' };
  }
  const info = await getKeyInfo(settings.aiProvider);
  if (meta.needsKey && !info.hasKey) {
    return {
      engine: 'local',
      aiReady: false,
      providerName,
      model,
      reason: `No API key saved for ${providerName} — using local analysis.`,
    };
  }
  return { engine: 'ai', aiReady: true, providerName, model };
}

// ── analysis ────────────────────────────────────────────────────────────────

async function handleAnalyze(body: {
  text: string;
  url: string;
  providerId: string;
}): Promise<AnalyzeResponse> {
  const settings = await loadSettings();
  if (!settings.enabled) {
    return { decision: 'passthrough', reason: 'Second Thought is switched off.' };
  }

  const text = typeof body?.text === 'string' ? body.text : '';
  if (text.trim() === '') return { decision: 'passthrough', reason: 'Nothing to analyse.' };

  const maxQuestions = settings.maxQuestions;

  // Windows companion (optional). Any failure falls straight through to the
  // built-in engine below, with the user's text untouched.
  if (settings.useCompanion) {
    const viaCompanion = await companionRequest('analyze', { text, maxQuestions }, 7_000);
    const decision = viaCompanion?.['decision'];
    if (decision === 'passthrough') {
      return { decision: 'passthrough', reason: String(viaCompanion?.['reason'] ?? 'No clarification needed.') };
    }
    const result = viaCompanion?.['result'] as AnalysisResult | undefined;
    if (decision === 'intercept' && result && typeof result.id === 'string' && Array.isArray(result.questions)) {
      await cacheSet({
        result,
        createdAt: Date.now(),
        answeredSlots: [],
        asked: Object.fromEntries(result.questions.map((q) => [q.slot, q.text])),
        companion: true,
      });
      return { decision: 'intercept', analysisId: result.id, result, engine: viaCompanion?.['engine'] === 'ai' ? 'ai' : 'local' };
    }
  }

  const local = analyzeRequest(text, { maxQuestions });
  const started = Date.now();

  // Fast exits from the local engine are authoritative — we do not spend a
  // provider round trip (or the user's money) on greetings, lookups, or a
  // request that is already fully specified.
  //
  // The original version of this guard treated "not refinable" as a *maybe*,
  // sending every complete prompt to the paid API anyway and then trusting the
  // model's opinion over the arithmetic. The local engine's pass-through verdict
  // is final: a complete brief is left alone, in every mode.
  if (!local.isRefinable) {
    return { decision: 'passthrough', reason: local.passthroughReason ?? 'No clarification needed.' };
  }

  if (settings.analysisEngine !== 'ai') {
    return finishLocal(local, maxQuestions);
  }

  const apiKey = await getApiKey(settings.aiProvider);
  try {
    if (!takeAiBudget()) throw budgetError();
    const ai = await analyzeWithAi(
      { aiProvider: settings.aiProvider, aiModel: settings.aiModel, customBaseUrl: settings.customBaseUrl },
      apiKey,
      {
        text,
        taskType: local.taskType,
        maxQuestions,
        known: local.requirements.fields,
        missingSlots: local.requirements.gaps.map((g) => ({ id: g.slot, label: g.label, weight: g.weight })),
        conflicts: local.requirements.conflicts.map((c) => ({ description: c.description, question: c.question })),
      },
    );

    // The model may now decide the prompt is already complete.
    if (!ai.improved || ai.questions.length === 0) {
      return {
        decision: 'passthrough',
        reason: ai.questions.length === 0 && ai.improved === false
          ? 'The model judged this request complete.'
          : 'The model found nothing material to clarify.',
        engine: 'ai',
      };
    }

    const result: AnalysisResult = {
      ...local,
      isRefinable: true,
      passthroughReason: undefined,
      intent: ai.intent || local.intent,
      completeness: local.completeness,
      requirements: {
        ...local.requirements,
        intent: ai.intent || local.requirements.intent,
        subject: local.requirements.subject || ai.subject,
      },
      questions: ai.questions.map((q) => ({
        id: q.slot,
        slot: q.slot,
        text: q.text,
        kind: q.kind,
        options: q.options,
        suggestions: (q.suggestions ?? []).filter((v) => typeof v === 'string' && v.trim() !== ''),
        allowCustom: q.allowCustom,
        optional: q.optional,
        priority: 1,
      })),
      decision: {
        action: 'clarify',
        confidence: ai.confidence,
        reasons: ai.intent ? [`Goal: ${ai.intent}`] : local.decision.reasons,
        estimatedGain: local.decision.estimatedGain,
      },
      engine: 'ai',
    };

    await cacheSet({
      result,
      createdAt: Date.now(),
      answeredSlots: [],
      language: ai.language,
      asked: Object.fromEntries(ai.questions.map((q) => [q.slot, q.text])),
    });
    return {
      decision: 'intercept',
      analysisId: result.id,
      result,
      engine: 'ai',
      via: { provider: ai.via.provider, model: ai.via.model, latencyMs: Date.now() - started },
    };
  } catch (err) {
    // Fallback: the user still gets a working clarification flow.
    const fallback = toFallback(err, settings);
    const localOutcome = finishLocal(local, maxQuestions);
    return { ...localOutcome, fallback } as AnalyzeResponse;
  }
}

type LocalOutcome =
  | Extract<AnalyzeResponse, { decision: 'intercept' }>
  | Extract<AnalyzeResponse, { decision: 'passthrough' }>;

function finishLocal(local: AnalysisResult, maxQuestions = 4): LocalOutcome {
  if (!local.isRefinable) {
    return { decision: 'passthrough', reason: local.passthroughReason ?? 'Nothing material to clarify.', engine: 'local' };
  }

  // Common "I want a laptop / phone / TV / headphones" requests get real,
  // request-specific multiple-choice questions even without an AI key.
  const buy = detectBuyRequest(local.original) ?? (local.taskType === 'general' ? generalDetection(local.original) : null);
  if (buy) {
    const all = buildBuyQuestions(buy);
    const first = all.slice(0, Math.max(1, maxQuestions));
    const result: AnalysisResult = { ...local, questions: first };
    void cacheSet({
      result,
      createdAt: Date.now(),
      answeredSlots: [],
      asked: buyQuestionTexts(buy),
      buy,
    });
    return { decision: 'intercept', analysisId: result.id, result, engine: 'local' };
  }

  // Every question is multiple choice: a free-text question that ships with
  // quick-pick suggestions becomes a choice list (the "Other" box stays).
  const asChoices: AnalysisResult = {
    ...local,
    questions: local.questions.map((q) =>
      q.kind === 'text' && q.suggestions.length >= 2
        ? { ...q, kind: 'single' as const, options: q.suggestions.map((v) => ({ value: v, label: v })), suggestions: [], allowCustom: true }
        : q,
    ),
  };
  void cacheSet({ result: asChoices, createdAt: Date.now(), answeredSlots: [] });
  return { decision: 'intercept', analysisId: asChoices.id, result: asChoices, engine: 'local' };
}

function toFallback(err: unknown, settings: Settings): FallbackInfo {
  if (err instanceof AiError) {
    if (err.kind === 'no-key') {
      return { kind: 'no-key', message: `${providerMeta(settings.aiProvider)?.name ?? 'Your provider'} has no API key saved — using built-in questions. Add a free key in Settings for questions on any topic.` };
    }
    return { kind: err.kind, message: err.message };
  }
  return { kind: 'unknown', message: 'AI analysis was unavailable — using local analysis.' };
}

// ── adaptive follow-up ──────────────────────────────────────────────────────

async function handleNextRound(
  analysisId: string,
  answers: AnswerSet,
  askedSlots: string[],
): Promise<NextRoundResponse> {
  const cached = await cacheGet(analysisId);
  if (!cached) return { ok: false, error: 'This analysis expired. Send your request again to restart.' };

  const settings = await loadSettings();
  const result = cached.result;
  const answered = Object.keys(answers);
  const allAsked = Array.from(new Set([...askedSlots, ...cached.answeredSlots, ...result.questions.map((q) => q.slot)]));

  // Merge what we now know so the local engine re-scores from the truth.
  const mergedResult: AnalysisResult = {
    ...result,
    requirements: {
      ...result.requirements,
      fields: { ...result.requirements.fields, ...answers },
    },
  };

  if (cached.companion) {
    const reply = await companionRequest('next-round', { result: mergedResult, answers, askedSlots: allAsked, maxQuestions: settings.maxQuestions }, 7_000);
    const round = reply?.['round'] as { questions?: unknown; hasMore?: unknown; nextSlots?: unknown; completeness?: unknown } | undefined;
    if (round && Array.isArray(round.questions) && typeof round.hasMore === 'boolean' && round.completeness) {
      await cacheSet({ ...cached, answeredSlots: allAsked });
      return { ok: true, engine: reply?.['engine'] === 'ai' ? 'ai' : 'local', round: round as never };
    }
    // companion gone: continue below with the built-in engine
  }

  // Offline buying-guide flow: serve the rest of its own questions.
  if (cached.buy) {
    const remaining = buildBuyQuestions(cached.buy).filter((q) => !allAsked.includes(q.slot));
    const questions = remaining.slice(0, settings.maxQuestions);
    const prev = await analyzeNext(mergedResult, answers, { maxQuestions: settings.maxQuestions, askedSlots: allAsked });
    await cacheSet({ ...cached, answeredSlots: allAsked });
    return {
      ok: true,
      engine: 'local',
      round: {
        questions,
        hasMore: remaining.length > questions.length,
        nextSlots: remaining.slice(questions.length).map((q) => q.slot),
        completeness: prev.completeness,
      },
    };
  }

  if (settings.analysisEngine === 'ai') {
    const apiKey = await getApiKey(settings.aiProvider);
    try {
      if (!takeAiBudget()) throw budgetError();
      const ai = await analyzeWithAi(
        { aiProvider: settings.aiProvider, aiModel: settings.aiModel, customBaseUrl: settings.customBaseUrl },
        apiKey,
        {
          text: mergedResult.original,
          taskType: mergedResult.taskType,
          maxQuestions: settings.maxQuestions,
          known: mergedResult.requirements.fields,
          missingSlots: mergedResult.requirements.gaps
            .filter((g) => !allAsked.includes(g.slot))
            .map((g) => ({ id: g.slot, label: g.label, weight: g.weight })),
          previousAnswers: answered.map((slot) => ({
            slot,
            question: result.questions.find((q) => q.slot === slot)?.text ?? slot,
            answer: Array.isArray(answers[slot]) ? (answers[slot] as string[]).join(', ') : String(answers[slot]),
          })),
        },
      );

      const prev = await analyzeNext(mergedResult, answers, {
        maxQuestions: settings.maxQuestions,
        askedSlots: allAsked,
      });

      const questions = ai.questions
        .filter((q) => !allAsked.includes(q.slot))
        .map((q) => ({
          id: q.slot,
          slot: q.slot,
          text: q.text,
          kind: q.kind,
          options: q.options,
          suggestions: (q.suggestions ?? []).filter((v) => typeof v === 'string' && v.trim() !== ''),
          allowCustom: q.allowCustom,
          optional: q.optional,
          priority: 1,
        }))
        .slice(0, settings.maxQuestions);

      await cacheSet({
        ...cached,
        answeredSlots: allAsked,
        language: cached.language || ai.language,
        asked: { ...(cached.asked ?? {}), ...Object.fromEntries(questions.map((q) => [q.slot, q.text])) },
      });

      if (questions.length === 0) {
        return { ok: true, round: { ...prev, questions: [], hasMore: false, nextSlots: [] }, engine: 'ai' };
      }
      return {
        ok: true,
        engine: 'ai',
        round: { questions, hasMore: prev.hasMore, nextSlots: prev.nextSlots, completeness: prev.completeness },
      };
    } catch (err) {
      const round = await analyzeNext(mergedResult, answers, {
        maxQuestions: settings.maxQuestions,
        askedSlots: allAsked,
      });
      await cacheSet({ ...cached, answeredSlots: allAsked });
      return { ok: true, round, engine: 'local', fallback: toFallback(err, settings) };
    }
  }

  const round = await analyzeNext(mergedResult, answers, {
    maxQuestions: settings.maxQuestions,
    askedSlots: allAsked,
  });
  await cacheSet({ ...cached, answeredSlots: allAsked });
  return { ok: true, round, engine: 'local' };
}

// ── refinement ──────────────────────────────────────────────────────────────

async function handleRefine(analysisId: string, answers: AnswerSet): Promise<RefineResponse> {
  const cached = await cacheGet(analysisId);
  if (!cached) {
    return { ok: false, error: 'This analysis expired. Send your request again to restart.' };
  }

  try {
    const settings = await loadSettings();
    // The final prompt is ALWAYS composed locally from structured answers —
    // deterministic, auditable, and never hallucinated.
    const labels: Record<string, string> = {};
    for (const [slot, text] of Object.entries(cached.asked ?? {})) labels[slot] = truncate(text.replace(/\?+$/, ''), 80);
    const outcome = composeFrom(cached.result, answers, { labels });
    if (cached.buy) outcome.prompt = buildBuyPrompt(cached.buy, cached.result.original, answers);
    if (cached.companion) {
      const reply = await companionRequest('refine', { result: cached.result, answers }, 12_000);
      const prompt = reply?.['prompt'];
      if (typeof prompt === 'string' && prompt.trim().length >= 20 && prompt.length <= 8000) outcome.prompt = prompt;
    }

    // AI mode: let the model write one detailed prompt in the user's language
    // from the original request + the chosen answers. Any failure keeps the
    // locally composed brief, so "Use this prompt" can never come back empty.
    let composedBy: 'ai' | 'local' = 'local';
    if (settings.analysisEngine === 'ai' && cached.result.engine === 'ai' && Object.keys(answers).length > 0) {
      try {
        const apiKey = await getApiKey(settings.aiProvider);
        if (apiKey !== '' && takeAiBudget()) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), AI_COMPOSE_TIMEOUT_MS);
          try {
            const qa = Object.entries(answers).map(([slot, value]) => ({
              question: cached.asked?.[slot] ?? slot.replace(/_/g, ' '),
              answer: Array.isArray(value) ? value.join(', ') : String(value),
            }));
            const prompt = await composeWithAi(
              { aiProvider: settings.aiProvider, aiModel: settings.aiModel, customBaseUrl: settings.customBaseUrl },
              apiKey,
              {
                original: cached.result.original,
                language: cached.language ?? '',
                intent: cached.result.intent,
                subject: cached.result.requirements.subject,
                answers: qa,
              },
              controller.signal,
            );
            outcome.prompt = prompt;
            composedBy = 'ai';
          } finally {
            clearTimeout(timer);
          }
        }
      } catch {
        // keep the local brief
      }
    }

    if (settings.historyEnabled) {
      await appendHistory({
        id: analysisId,
        createdAt: Date.now(),
        providerId: cached.result.requirements.taskType,
        original: truncate(cached.result.original, 400),
        refinedPrompt: truncate(outcome.prompt, 8000),
        scoreBefore: cached.result.completeness.score,
        scoreAfter: outcome.completeness.score,
        taskType: cached.result.taskType,
        engine: cached.result.engine,
      });
    }

    await cacheDelete(analysisId);
    void composedBy;
    return { ok: true, outcome, engine: cached.result.engine };
  } catch (err) {
    return { ok: false, error: safeError(err) };
  }
}

async function appendHistory(item: HistoryItem): Promise<void> {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  const history = (stored[HISTORY_KEY] as HistoryItem[] | undefined) ?? [];
  history.unshift(item);
  await chrome.storage.local.set({ [HISTORY_KEY]: history.slice(0, HISTORY_LIMIT) });
}

// ── helpers ─────────────────────────────────────────────────────────────────

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{10,}/g,
  /\bAIza[A-Za-z0-9_-]{20,}/g,
  /\b(sk|pk|rk|api|key|token)[-_][A-Za-z0-9_-]{8,}/gi,
  /\b[A-Za-z0-9_-]{32,}\b/g,
];

/** Never let a credential reach a UI surface or a log line. */
export function redact(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, '[redacted]');
  return out;
}

function safeError(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return redact(text).slice(0, 300);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Exported for tests. */
export const __test = {
  redact,
  safeError,
  analysisDefaults: { provider: defaultModelFor('gemini') },
  clearCacheForTests: () => memoryCache.clear(),
  taskTypes: ['website', 'software', 'mobile', 'coding', 'writing', 'research', 'image', 'business', 'education', 'general'] as TaskType[],
};
