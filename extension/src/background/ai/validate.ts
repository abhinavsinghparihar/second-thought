/**
 * Strict schema validation for model output.
 *
 * Every field is type-checked and clamped. The model is treated as an
 * untrusted input source exactly like user text: it can suggest a question,
 * it cannot inject markup, unbounded strings, or an unbounded question list.
 */

import type { QuestionKind } from './types';

export interface ValidatedOption {
  value: string;
  label: string;
  aggregate?: boolean;
}

export interface ValidatedQuestion {
  slot: string;
  text: string;
  kind: QuestionKind;
  options: ValidatedOption[];
  allowCustom: boolean;
  optional: boolean;
}

export interface ValidatedAnalysis {
  intent: string;
  subject: string;
  /** Language the user wrote in, as named by the model (display + prompt hint only). */
  language: string;
  improved: boolean;
  confidence: number;
  questions: ValidatedQuestion[];
}

const MAX_QUESTIONS = 6;
const MAX_OPTIONS = 7;
const MAX_SLOT = 48;
const MAX_TEXT = 220;
const MAX_LABEL = 90;

export class InvalidAiResponse extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAiResponse';
  }
}

/** Extract the first JSON object from a model response. */
export function extractJson(raw: string): unknown {
  const text = String(raw ?? '').trim();
  if (text === '') throw new InvalidAiResponse('The model returned an empty response.');

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced?.[1]?.trim() ?? text;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new InvalidAiResponse('The model response did not contain a JSON object.');
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new InvalidAiResponse('The model response was not valid JSON.');
  }
}

function str(value: unknown, max: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function normaliseSlot(value: unknown): string {
  const raw = str(value, MAX_SLOT + 20).toLowerCase();
  return raw.replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, MAX_SLOT);
}

/**
 * Validate and normalise. Throws `InvalidAiResponse` only when the payload is
 * unusable; individual bad questions are dropped instead of failing the call.
 */
export function validateAnalysis(payload: unknown): ValidatedAnalysis {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new InvalidAiResponse('The model response was not a JSON object.');
  }
  const root = payload as Record<string, unknown>;
  if (!Array.isArray(root.questions)) {
    throw new InvalidAiResponse('The model response had no questions array.');
  }

  const seen = new Set<string>();
  const questions: ValidatedQuestion[] = [];

  for (const entry of root.questions.slice(0, MAX_QUESTIONS * 2)) {
    if (questions.length >= MAX_QUESTIONS) break;
    if (entry === null || typeof entry !== 'object') continue;
    const q = entry as Record<string, unknown>;

    const slot = normaliseSlot(q.slot);
    const text = str(q.text, MAX_TEXT);
    if (slot === '' || text === '') continue;
    if (seen.has(slot)) continue;

    const rawKind = String(q.kind ?? 'single').toLowerCase();
    const kind: QuestionKind = rawKind === 'multi' ? 'multi' : rawKind === 'text' ? 'text' : 'single';

    const options: ValidatedOption[] = [];
    if (kind !== 'text' && Array.isArray(q.options)) {
      const optionSeen = new Set<string>();
      for (const raw of q.options.slice(0, MAX_OPTIONS * 2)) {
        if (options.length >= MAX_OPTIONS) break;
        if (raw === null || typeof raw !== 'object') continue;
        const o = raw as Record<string, unknown>;
        const label = str(o.label ?? o.value, MAX_LABEL);
        const value = str(o.value ?? o.label, MAX_LABEL);
        if (label === '' || value === '') continue;
        const key = value.toLowerCase();
        if (optionSeen.has(key)) continue;
        optionSeen.add(key);
        options.push({ value, label });
      }
    }

    // A multiple-choice question with fewer than two options cannot be answered.
    if (kind !== 'text' && options.length < 2) continue;

    seen.add(slot);
    questions.push({
      slot,
      text: text.endsWith('?') || text.endsWith('.') ? text : `${text}?`,
      kind,
      options,
      // Custom answers are always allowed: the option list is a suggestion.
      allowCustom: bool(q.allowCustom, true),
      optional: bool(q.optional, false),
    });
  }

  return {
    intent: str(root.intent, 240),
    subject: str(root.subject, 80),
    language: str(root.language, 40),
    improved: bool(root.improved, questions.length > 0),
    confidence: num(root.confidence, 0.7),
    questions,
  };
}

/** Full pipeline: raw text → validated analysis. */
export function parseAnalysisResponse(raw: string): ValidatedAnalysis {
  return validateAnalysis(extractJson(raw));
}
