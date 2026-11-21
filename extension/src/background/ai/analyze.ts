/**
 * AI-powered analysis, with the local engine as the floor.
 *
 * Public contract:
 *   analyzeWithAi(settings, request) → AiAnalysisResult | throws AiError
 *
 * The caller (worker) catches *everything* and falls back to the local engine,
 * because a user's prompt must never be trapped by a provider outage.
 */

import { taskLabel } from '@second-thought/core';
import { clearAutoModel, resolveModel } from '../providers/models';
import { AI_ADAPTERS } from '../providers/registry';
import { AiError } from '../providers/types';
import { buildAnalysisPrompt } from './prompt';
import { parseAnalysisResponse, InvalidAiResponse } from './validate';
import type { AiAnalysisRequest, AiAnalysisResult } from './types';
import type { AiProviderId } from '../providers/types';

export interface AiSettings {
  aiProvider: AiProviderId;
  aiModel: string;
  /** Custom provider only. */
  customBaseUrl?: string;
}

/** One retry for transient failures; never for auth/model errors. */
const MAX_ATTEMPTS = 2;

export async function analyzeWithAi(
  settings: AiSettings,
  apiKey: string,
  request: AiAnalysisRequest,
): Promise<AiAnalysisResult> {
  const adapter = AI_ADAPTERS[settings.aiProvider];
  if (!adapter) {
    throw new AiError('unknown', `Unknown AI provider: ${String(settings.aiProvider)}`);
  }
  if (adapter.meta.needsKey && apiKey.trim() === '') {
    throw new AiError('no-key', `${adapter.meta.name} needs an API key. Add one in Settings, or switch to local analysis.`);
  }

  const { system, user } = buildAnalysisPrompt({
    text: request.text,
    taskType: request.taskType,
    taskLabel: taskLabel(request.taskType),
    missingSlots: request.missingSlots ?? [],
    known: request.known ?? {},
    previousAnswers: request.previousAnswers ?? [],
    conflicts: request.conflicts ?? [],
    maxQuestions: request.maxQuestions,
  });

  const model = await resolveModel(settings.aiProvider, settings.aiModel, apiKey, settings.customBaseUrl ?? '');
  const started = Date.now();

  let lastError: AiError | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const raw = await adapter.complete(apiKey, model, {
        system,
        user,
        json: true,
        maxTokens: 1400,
        temperature: 0.2,
        signal: request.signal,
        baseUrl: settings.customBaseUrl,
      });

      const parsed = parseAnalysisResponse(raw);
      return {
        ...parsed,
        via: { provider: adapter.meta.name, model },
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      const error = toAiError(err, adapter.meta.name);
      lastError = error;
      const isInvalidJson = err instanceof InvalidAiResponse;
      const retryable = isInvalidJson || error.retryable;
      if (!retryable || attempt === MAX_ATTEMPTS) throw error;
      // Small backoff before the single retry.
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  throw lastError ?? new AiError('unknown', 'AI analysis failed.');
}

/**
 * Prove a configuration works with a tiny, cheap round trip.
 * Returns a human message — never includes the key.
 */
export async function testConnection(
  provider: AiProviderId,
  model: string,
  apiKey: string,
  baseUrl = '',
): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const adapter = AI_ADAPTERS[provider];
  if (!adapter) return { ok: false, message: 'Unknown provider.', latencyMs: 0 };
  if (adapter.meta.needsKey && apiKey.trim() === '') {
    return { ok: false, message: 'Add an API key first.', latencyMs: 0 };
  }

  const started = Date.now();
  let chosen = model;
  try {
    // "Test" always re-picks, so a stale automatic choice cannot linger.
    if (model.trim() === '') await clearAutoModel(provider);
    chosen = await resolveModel(provider, model, apiKey, baseUrl);
    const raw = await adapter.complete(apiKey, chosen, {
      system: 'You convert requests into strict JSON. Respond with JSON only.',
      user: 'Return exactly: {"ok": true}',
      json: true,
      maxTokens: 32,
      temperature: 0,
      baseUrl,
    });
    const latencyMs = Date.now() - started;
    // A provider that answers at all is a successful connection. We do not
    // require valid JSON here: some small models add prose around it, and that
    // is a quality signal, not a connectivity failure.
    const trimmed = raw.trim();
    if (trimmed === '') {
      return { ok: false, message: 'Connected, but the model returned an empty response.', latencyMs };
    }
    return {
      ok: true,
      message: `Connected to ${adapter.meta.name} (${chosen}${model.trim() === '' ? ', auto-selected' : ''}) in ${latencyMs} ms.`,
      latencyMs,
    };
  } catch (err) {
    const error = toAiError(err, adapter.meta.name);
    return { ok: false, message: error.message, latencyMs: Date.now() - started };
  }
}

function toAiError(err: unknown, providerName: string): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof InvalidAiResponse) {
    return new AiError('bad-response', `${providerName} returned a response that could not be understood.`);
  }
  const message = err instanceof Error ? err.message : String(err);
  return new AiError('unknown', `${providerName} failed: ${message.slice(0, 160)}`);
}
