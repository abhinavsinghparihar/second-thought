/**
 * Message protocol between content script, popup, options and worker.
 *
 * Every response is a discriminated union so a missing field is a type error
 * rather than a runtime surprise (the original used `engine: string`).
 */

import type {
  AnalysisResult,
  AdaptiveRound,
  AnswerSet,
  RefinementOutcome,
} from '@second-thought/core';
import type { AiProviderId, AiErrorKind } from '../background/providers/types';
import type { Settings } from './settings';

export type ProviderCapability = 'supported' | 'partial' | 'unknown';

export type EngineUsed = 'local' | 'ai';

/** Why an AI call fell back to local mode. Never contains a key. */
export interface FallbackInfo {
  kind: AiErrorKind | 'disabled' | 'no-key';
  message: string;
}

export interface AnalyzeRequestBody {
  text: string;
  url: string;
  providerId: string;
  /** Which engine the content script expects (mirrors settings at send time). */
  engine?: EngineUsed;
}

export type AnalyzeResponse =
  | {
      decision: 'intercept';
      analysisId: string;
      result: AnalysisResult;
      engine: EngineUsed;
      fallback?: FallbackInfo;
      /** Model/provider actually used, when engine === 'ai'. */
      via?: { provider: string; model: string; latencyMs: number };
    }
  | { decision: 'passthrough'; reason: string; engine?: EngineUsed; fallback?: FallbackInfo }
  | { decision: 'error'; error: string };

export interface NextRoundRequestBody {
  analysisId: string;
  answers: AnswerSet;
  /** Slots already shown to the user this session. */
  askedSlots: string[];
}

export type NextRoundResponse =
  | { ok: true; round: AdaptiveRound; engine: EngineUsed; fallback?: FallbackInfo }
  | { ok: false; error: string; fallback?: FallbackInfo };

export interface RefineRequestBody {
  analysisId: string;
  answers: AnswerSet;
}

export type RefineResponse =
  | {
      ok: true;
      outcome: RefinementOutcome;
      engine: EngineUsed;
      fallback?: FallbackInfo;
    }
  | { ok: false; error: string };

export interface HistoryItem {
  id: string;
  createdAt: number;
  providerId: string;
  original: string;
  refinedPrompt: string;
  scoreBefore: number;
  scoreAfter: number;
  taskType: string;
  engine: EngineUsed;
}

export interface TestConnectionResponse {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface SettingsResponse {
  settings: Settings;
  keys: Record<string, { hasKey: boolean; savedAt: number; hint: string }>;
  engineStatus: EngineStatus;
}

export interface EngineStatus {
  engine: EngineUsed;
  /** True when AI is configured *and* a key exists. */
  aiReady: boolean;
  providerName: string;
  model: string;
  reason?: string;
}

export interface TabInfoResponse {
  isAiSite: boolean;
  providerId?: string;
  providerName?: string;
  capability?: ProviderCapability;
  /** True when the content script is live in this tab. */
  active?: boolean;
}

export type RuntimeMessage =
  | { type: 'st/ping' }
  | { type: 'st/analyze'; body: AnalyzeRequestBody }
  | { type: 'st/next-round'; body: NextRoundRequestBody }
  | { type: 'st/refine'; body: RefineRequestBody }
  | { type: 'st/cancel'; analysisId: string }
  | { type: 'st/settings-get' }
  | { type: 'st/settings-set'; settings: Partial<Settings> }
  | { type: 'st/key-set'; provider: AiProviderId; apiKey: string }
  | { type: 'st/key-clear'; provider: AiProviderId }
  | { type: 'st/key-clear-all' }
  | { type: 'st/test-connection'; provider: AiProviderId; model: string; apiKey?: string }
  | { type: 'st/list-models'; provider: AiProviderId; apiKey?: string }
  | { type: 'st/companion-status' }
  | { type: 'st/history-list' }
  | { type: 'st/history-clear' }
  | { type: 'st/open-panel' }
  | { type: 'st/engine-status' };

export interface ListModelsResponse {
  ok: boolean;
  /** Models this key can use, best first. */
  models: string[];
  best?: string;
  message?: string;
}
