import {
  analyzeRequest,
  refineRequest,
  type AnalysisResult,
  type AnswerSet,
  type Question,
} from '@second-thought/core';
import { generateQuestionsWithAi } from './ai-client';
import {
  AI_PROVIDERS,
  getApiKey,
  loadSettings,
  saveSettings,
  setApiKey,
  type Settings,
} from '../shared/settings';
import type {
  AnalyzeResponse,
  HistoryItem,
  RefineResponse,
  RuntimeMessage,
  TestConnectionResponse,
} from '../shared/types';

/**
 * Service worker: policy + orchestration. Holds no secrets in memory beyond
 * the lifetime of a single analysis; the API key is fetched from
 * chrome.storage.local only when AI mode runs.
 */

const HISTORY_KEY = 'history';
const HISTORY_LIMIT = 100;
const ANALYSIS_TTL_MS = 15 * 60 * 1000;
const ANALYSIS_CACHE_MAX = 50;

interface CachedAnalysis {
  result: AnalysisResult;
  createdAt: number;
}

const analysisCache = new Map<string, CachedAnalysis>();

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((msg: RuntimeMessage, _sender, sendResponse) => {
  void handleMessage(msg)
    .then((response) => sendResponse(response))
    .catch((err: unknown) => {
      sendResponse({ decision: 'error', error: errorMessage(err) });
    });
  return true; // async response
});

async function handleMessage(msg: RuntimeMessage): Promise<unknown> {
  if (!msg || typeof msg.type !== 'string') return { decision: 'error', error: 'Bad message' };
  switch (msg.type) {
    case 'st/ping':
      return { ok: true };
    case 'st/analyze':
      return handleAnalyze(msg.body);
    case 'st/refine':
      return handleRefine(msg.body.analysisId, msg.body.answers);
    case 'st/cancel': {
      analysisCache.delete(msg.analysisId);
      return { ok: true };
    }
    case 'st/settings-get': {
      const settings = await loadSettings();
      const apiKey = await getApiKey();
      return { settings, hasApiKey: apiKey !== '' };
    }
    case 'st/settings-set': {
      const settings = await saveSettings(msg.settings);
      return { settings };
    }
    case 'st/apikey-get': {
      const apiKey = await getApiKey();
      return { hasApiKey: apiKey !== '' };
    }
    case 'st/apikey-set':
      await setApiKey(msg.apiKey);
      return { ok: true };
    case 'st/history-list': {
      const history = await chrome.storage.local.get(HISTORY_KEY);
      return { history: (history[HISTORY_KEY] as HistoryItem[] | undefined) ?? [] };
    }
    case 'st/history-clear':
      await chrome.storage.local.remove(HISTORY_KEY);
      return { ok: true };
    case 'st/test-connection':
      return handleTestConnection(msg.provider, msg.model, msg.apiKey);
    default:
      return { decision: 'error', error: 'Unknown message' };
  }
}

// ── analysis ────────────────────────────────────────────────────────────────

async function handleAnalyze(body: { text: string; url: string; providerId: string }): Promise<AnalyzeResponse> {
  const settings = await loadSettings();
  if (!settings.enabled) return { decision: 'passthrough', reason: 'Extension disabled' };

  const local = analyzeRequest(body.text, { maxQuestions: settings.maxQuestions });
  if (local.isRefinable === false && local.passthroughReason === 'Too short to analyze') {
    return { decision: 'passthrough', reason: local.passthroughReason };
  }

  if (settings.analysisEngine === 'ai') {
    try {
      const aiResult = await runAiAnalysis(settings, body.text);
      if (aiResult) {
        const id = cacheAnalysis(aiResult);
        return { decision: 'intercept', analysisId: id, result: aiResult, engine: 'ai' };
      }
    } catch {
      // fall through to local engine — never trap the user on AI failure
    }
  }

  if (!local.isRefinable) {
    return { decision: 'passthrough', reason: local.passthroughReason ?? 'Nothing to clarify' };
  }
  const id = cacheAnalysis(local);
  return { decision: 'intercept', analysisId: id, result: local, engine: 'local' };
}

async function runAiAnalysis(settings: Settings, text: string): Promise<AnalysisResult | null> {
  const apiKey = await getApiKey();
  const providerSpec = AI_PROVIDERS.find((p) => p.id === settings.aiProvider);
  if (providerSpec?.needsKey !== false && apiKey === '') return null;

  const base = analyzeRequest(text, { maxQuestions: settings.maxQuestions });
  if (!base.isRefinable) return null;

  const ai = await generateQuestionsWithAi(settings.aiProvider, settings.aiModel, apiKey, text);
  if (ai.questions.length === 0) return null;

  const questions: Question[] = ai.questions.map((q, i) => ({
    id: `${q.slot}-${i}`,
    slot: q.slot,
    text: q.text,
    kind: q.kind,
    options: q.options,
    allowCustom: q.allowCustom ?? true,
  }));

  return {
    ...base,
    intent: ai.intent ?? base.intent,
    questions,
  };
}

function cacheAnalysis(result: AnalysisResult): string {
  const now = Date.now();
  for (const [key, value] of analysisCache) {
    if (now - value.createdAt > ANALYSIS_TTL_MS) analysisCache.delete(key);
  }
  while (analysisCache.size >= ANALYSIS_CACHE_MAX) {
    const oldest = [...analysisCache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (!oldest) break;
    analysisCache.delete(oldest[0]);
  }
  analysisCache.set(result.id, { result, createdAt: now });
  return result.id;
}

// ── refinement ───────────────────────────────────────────────────────────────

async function handleRefine(analysisId: string, answers: AnswerSet): Promise<RefineResponse> {
  const cached = analysisCache.get(analysisId);
  if (!cached) return { ok: false, error: 'Analysis expired — please try again.' };
  analysisCache.delete(analysisId);

  try {
    const outcome = refineRequest(cached.result, answers);
    const settings = await loadSettings();
    if (settings.historyEnabled) {
      await appendHistory({
        id: analysisId,
        createdAt: Date.now(),
        providerId: 'unknown',
        original: truncateText(cached.result.original, 400),
        refinedPrompt: truncateText(outcome.prompt, 8000),
        scoreBefore: cached.result.completeness.score,
        scoreAfter: outcome.completeness.score,
        taskType: cached.result.taskType,
      });
    }
    return { ok: true, outcome };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

async function appendHistory(item: HistoryItem): Promise<void> {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  const history = (stored[HISTORY_KEY] as HistoryItem[] | undefined) ?? [];
  history.unshift(item);
  await chrome.storage.local.set({ [HISTORY_KEY]: history.slice(0, HISTORY_LIMIT) });
}

// ── connection test ───────────────────────────────────────────────────────────

async function handleTestConnection(
  provider: import('../shared/settings').AiProviderId,
  model: string,
  apiKey: string,
): Promise<TestConnectionResponse> {
  try {
    const key = apiKey !== '' ? apiKey : await getApiKey();
    const ai = await generateQuestionsWithAi(provider, model, key, 'Write a blog post about coffee.');
    const count = ai.questions.length;
    if (count === 0) return { ok: false, message: 'Connected, but the model returned no questions.' };
    return { ok: true, message: `Connected — model proposed ${count} question${count === 1 ? '' : 's'}.` };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  // Never echo potential secrets into UI surfaces.
  return text.replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]').slice(0, 300);
}

function truncateText(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
