/** Message protocol between content script, popup, options and worker. */

import type { AnalysisResult, AnswerSet, RefinementOutcome } from '@second-thought/core';

export type ProviderCapability = 'supported' | 'partial' | 'unknown';

export interface AnalyzeRequestBody {
  text: string;
  url: string;
  providerId: string;
}

export type AnalyzeResponse =
  | { decision: 'intercept'; analysisId: string; result: AnalysisResult; engine: string }
  | { decision: 'passthrough'; reason: string }
  | { decision: 'error'; error: string };

export interface RefineRequestBody {
  analysisId: string;
  answers: AnswerSet;
}

export type RefineResponse =
  | { ok: true; outcome: RefinementOutcome }
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
}

export interface TestConnectionResponse {
  ok: boolean;
  message: string;
}

export type RuntimeMessage =
  | { type: 'st/ping' }
  | { type: 'st/analyze'; body: AnalyzeRequestBody }
  | { type: 'st/refine'; body: RefineRequestBody }
  | { type: 'st/cancel'; analysisId: string }
  | { type: 'st/settings-get' }
  | { type: 'st/settings-set'; settings: Partial<import('./settings').Settings> }
  | { type: 'st/apikey-get' }
  | { type: 'st/apikey-set'; apiKey: string }
  | { type: 'st/history-list' }
  | { type: 'st/history-clear' }
  | { type: 'st/test-connection'; provider: import('./settings').AiProviderId; model: string; apiKey: string }
  | { type: 'st/open-panel' };

export interface SettingsResponse {
  settings: import('./settings').Settings;
  hasApiKey: boolean;
}

export interface TabInfoResponse {
  isAiSite: boolean;
  providerId?: string;
  providerName?: string;
  capability?: ProviderCapability;
}
