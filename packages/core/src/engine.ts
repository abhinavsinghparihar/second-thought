/**
 * The adaptive requirement-discovery engine.
 *
 * Flow
 *   analyzeRequest(text)  → classification, extraction, ambiguity/conflict
 *                           detection, gaps, decision, first question round
 *   analyzeNext(result, answers)
 *                         → merges answers, re-scores, and asks *only* what
 *                           is still missing (this is what makes it adaptive)
 *   composeFrom(result, answers)
 *                         → structured prompt + residual completeness check
 *
 * Everything is pure and synchronous.
 */

import { classifyTask } from './classify';
import { extractRequirements, detectAmbiguities, detectConflicts } from './extract';
import { composePrompt } from './compose';
import { buildConflictQuestion, buildQuestion } from './questions';
import {
  decide,
  findGaps,
  measureIntentClarity,
  measureSpecificity,
  resolvedValue,
  scoreCompleteness,
  GAP_THRESHOLD,
} from './scoring';
import { schemaFor, slotLabel } from './schema';
import type {
  AdaptiveRound,
  SlotSpec,
  AnalysisResult,
  AnalyzeOptions,
  AnswerSet,
  ComposeOptions,
  Gap,
  Question,
  RefinementOutcome,
  RequirementModel,
  TaskType,
} from './types';
import { asList, clip, nextId, squash, wordCount } from './text';

// ── pass-through detection ─────────────────────────────────────────────────

const GREETING_RE = [
  /^(hi+|hello+|hey+|yo|sup|good (morning|afternoon|evening)|namaste|hola|namaskar)\b[\s!.,]*(there|again|all|folks|friend)?[\s!.,]*$/i,
  /^(thanks?|thank you|ty|great|awesome|perfect|ok(ay)?|cool|nice|got it|sure)\b[\s!.,]*$/i,
  /^(who (are|am) (you|i)|what (can|are) you|what do you do|your name)\b/i,
];

const DIRECT_QUESTION_RE = [
  /^(what|who|where|when|which)\s+(is|are|was|were)\b/i,
  /^(who|what)\s+(did|does|do)\b/i,
  /^(when|where)\s+(did|does|do|is|was)\b/i,
  /^(define|meaning of|synonyms? of|antonyms? of)\b/i,
  /^(how (do|does|can|should) (i|you|we)\b)/i,
  /^(is|are|can|could|should|will|would|does|do|did)\s+\w[^.?!]{0,70}\?$/i,
  /^(calculate|convert|solve|translate|what'?s)\s+[-\d(]/i,
  /^(who|what|when|where|which|why|how)\s+\S/i,
  /^(capital of|population of|height of|distance (from|between)|weather in)\b/i,
];

/** A question that is really a build request ("can you build me an app?") is not a lookup. */
const BUILD_INTENT_RE = /\b(build|create|make|design|develop|write|generate|plan|implement|draft|compose|refactor|debug|fix)\b/i;

export function isGreeting(text: string): boolean {
  const t = squash(text);
  return GREETING_RE.some((re) => re.test(t));
}

export function isDirectQuestion(text: string): boolean {
  const t = squash(text);
  if (!t.endsWith('?') && !DIRECT_QUESTION_RE.some((re) => re.test(t))) return false;
  // Long prompts and clear build requests are never treated as lookups.
  if (wordCount(t) > 18) return false;
  if (BUILD_INTENT_RE.test(t)) return false;
  return DIRECT_QUESTION_RE.some((re) => re.test(t));
}

// ── question round selection ────────────────────────────────────────────────

export interface RoundOptions {
  maxQuestions?: number;
  ignoreSlots?: string[];
  /** Round index — round 0 may include a conflict question. */
  round?: number;
}

/**
 * Build one round of questions from the gaps. Conditioned slots are only
 * considered when their trigger is already answered.
 */
export function buildRound(
  model: RequirementModel,
  completeness: ReturnType<typeof scoreCompleteness>,
  gaps: Gap[],
  answers: AnswerSet,
  options: RoundOptions = {},
): AdaptiveRound {
  const max = Math.max(1, Math.min(6, Math.round(options.maxQuestions ?? 4)));
  const ignore = new Set(options.ignoreSlots ?? []);
  const round = options.round ?? 0;

  const ctx = {
    taskType: model.taskType,
    subject: { subject: model.subject, domain: model.domain, category: model.subject },
    fields: model.fields,
    answers,
    resolved: mergeResolved(model.fields, answers),
  };

  const questions: Question[] = [];

  // Conflicts come first: they are the highest-value question that exists.
  if (round === 0 && model.conflicts.length > 0) {
    const conflictQ = buildConflictQuestion(model.conflicts, ctx);
    if (conflictQ) questions.push(conflictQ);
  }

  const ranked = gaps.filter((g) => !ignore.has(g.slot));

  // Conditioned slots are only askable once their trigger has been answered.
  // They compete with ordinary gaps on weight (not "leftovers at the end"),
  // so a high-value follow-up is never starved by low-value generic slots.
  const schema = schemaFor(model.taskType);
  const conditionalCandidates: Array<{ spec: SlotSpec; weight: number }> = [];
  for (const spec of schema) {
    if (!spec.condition) continue;
    if (ignore.has(spec.id)) continue;
    if (spec.weight < GAP_THRESHOLD) continue;
    if (resolvedValue(model.fields, answers, spec.id) !== undefined) continue;
    const trigger = resolvedValue(model.fields, answers, spec.condition.slot);
    if (trigger === undefined) continue;
    const triggerValues = asList(trigger).map((v) => v.toLowerCase());
    const fires = triggerValues.some((v) => spec.condition!.equals.some((e) => v.includes(e)));
    if (!fires) continue;
    conditionalCandidates.push({ spec, weight: spec.weight });
  }

  const ordered: Array<{ slot: string; weight: number }> = [
    ...ranked.map((g) => ({ slot: g.slot, weight: g.priority })),
    ...conditionalCandidates.map((c) => ({ slot: c.spec.id, weight: c.weight })),
  ].sort((a, b) => b.weight - a.weight);

  for (const candidate of ordered) {
    if (questions.length >= max) break;
    if (questions.some((q) => q.slot === candidate.slot)) continue;
    const spec = schema.find((s) => s.id === candidate.slot);
    if (!spec) continue;
    const q = buildQuestion(spec, ctx);
    if (q) questions.push(q);
  }

  const askedSlots = new Set(questions.map((q) => q.slot));
  const nextSlots = ranked
    .filter((g) => !askedSlots.has(g.slot))
    .slice(0, 4)
    .map((g) => g.slot);

  return {
    questions,
    hasMore: nextSlots.length > 0,
    nextSlots,
    completeness,
  };
}

/** Answers win over extracted fields; used to write contextual options. */
function mergeResolved(
  fields: Record<string, string | string[]>,
  answers: AnswerSet,
): Record<string, string | string[]> {
  return { ...fields, ...answers };
}

// ── main entry points ───────────────────────────────────────────────────────

export function analyzeRequest(text: string, options: AnalyzeOptions = {}): AnalysisResult {
  const original = squash(text);
  const id = options.id ?? nextId('a');
  const maxQuestions = Math.max(1, Math.min(6, Math.round(options.maxQuestions ?? 4)));

  const classification = options.taskType
    ? { taskType: options.taskType, confidence: 0.95, signals: ['forced'] }
    : classifyTask(original);

  const taskType = classification.taskType;
  const extracted = extractRequirements(original, taskType);
  const ambiguities = detectAmbiguities(original);
  const conflicts = detectConflicts(original);

  const specificity = measureSpecificity(original);
  const intentClarity = measureIntentClarity(
    original,
    classification,
    ambiguities,
    extracted.subject.subject !== '',
  );

  const fields = { ...extracted.fields };
  const completeness = scoreCompleteness(taskType, fields, specificity, intentClarity);
  const gaps = findGaps(taskType, fields, ambiguities, conflicts, options.ignoreSlots ?? []);

  const model: RequirementModel = {
    taskType,
    intent: clip(original, 200),
    subject: extracted.subject.subject,
    domain: extracted.subject.domain,
    fields,
    detected: extracted.detected,
    gaps,
    ambiguities,
    conflicts,
    classification,
  };

  const round = buildRound(model, completeness, gaps, {}, { maxQuestions, ignoreSlots: options.ignoreSlots });

  const decision = decide({
    taskType,
    completeness,
    gaps,
    ambiguities,
    conflicts,
    classification,
    text: original,
    isQuestion: isDirectQuestion(original),
    isGreeting: isGreeting(original),
    questionCount: round.questions.length,
  });

  const isRefinable = decision.action === 'clarify';

  return {
    id,
    original,
    taskType,
    intent: model.intent,
    isRefinable,
    passthroughReason: isRefinable ? undefined : decision.reasons[0] ?? 'Nothing material to clarify',
    completeness,
    requirements: model,
    questions: isRefinable ? round.questions : [],
    decision,
    engine: 'local',
  };
}

/** Merge answers into the model's fields. Shared by analyzeNext and compose. */
export function mergeAnswers(
  fields: Record<string, string | string[]>,
  answers: AnswerSet,
): { fields: Record<string, string | string[]>; applied: Array<{ slot: string; value: string | string[] }> } {
  const merged: Record<string, string | string[]> = { ...fields };
  const applied: Array<{ slot: string; value: string | string[] }> = [];

  for (const [slot, raw] of Object.entries(answers)) {
    const list = asList(raw).map((v) => squash(String(v))).filter((v) => v !== '');
    if (list.length === 0) continue;
    // "No preference" style answers are informative but should not become text.
    if (list.length === 1 && /^(no preference|doesn'?t matter|any|not sure|skip)$/i.test(list[0]!)) {
      continue;
    }
    const value: string | string[] = list.length === 1 ? list[0]! : list;
    merged[slot] = value;
    applied.push({ slot, value });
  }
  return { fields: merged, applied };
}

/**
 * Adaptive follow-up. Re-scores with the new answers and returns the next
 * round — which is derived from what is *still* missing, so it cannot repeat.
 */
export function analyzeNext(
  result: AnalysisResult,
  answers: AnswerSet,
  options: { maxQuestions?: number; round?: number; askedSlots?: string[] } = {},
): AdaptiveRound {
  const { fields } = mergeAnswers(result.requirements.fields, answers);
  const taskType = result.taskType;

  const specificity = measureSpecificity(result.original);
  const intentClarity = Math.min(
    1,
    result.completeness.intentClarity + 0.05 * Object.keys(answers).length,
  );
  const completeness = scoreCompleteness(taskType, fields, specificity, intentClarity);
  const ambiguities = detectAmbiguities(result.original).filter((a) => a.kind !== 'vague-adjective');
  const conflicts = result.requirements.conflicts.filter((c) => !(c.id in answers));
  const gaps = findGaps(taskType, fields, ambiguities, conflicts);

  const model: RequirementModel = { ...result.requirements, fields, gaps };
  const max = options.maxQuestions ?? Math.max(1, result.questions.length);

  // Never re-ask a question the user has already seen this session. Questions
  // they skipped are still gaps, but repeating them verbatim is exactly the
  // behaviour the brief calls out as a defect.
  const alreadyAsked = options.askedSlots ?? result.questions.map((q) => q.slot);

  return buildRound(model, completeness, gaps, answers, {
    maxQuestions: max,
    round: options.round ?? 1,
    ignoreSlots: alreadyAsked,
  });
}

/**
 * Completeness of the request *with the answers merged in*, plus what it would
 * reach if every question still on screen were answered.
 *
 * The panel needs three honest numbers and used to have one: the immutable
 * score of the original wording. Showing that number above a list of answers
 * made it look as though answering changed nothing, and the gap list kept
 * naming slots the user had already filled.
 *
 * `current` is a real score. `projected` is an explicit projection, labelled
 * as such in the UI, and is never persisted or reported as a result.
 */
export interface AnswerScore {
  /** Completeness after merging `answers`. A real score. */
  current: ReturnType<typeof scoreCompleteness>;
  /** Completeness of the untouched original wording. */
  original: number;
  /** What answering every question in `questionSlots` would reach. */
  projected: number;
  /** Human labels for the slots still unspecified *after* these answers. */
  missingLabels: string[];
}

export function scoreAnswers(
  result: AnalysisResult,
  answers: AnswerSet,
  questionSlots: string[] = [],
): AnswerScore {
  const { fields } = mergeAnswers(result.requirements.fields, answers);
  const taskType = result.taskType;
  const specificity = measureSpecificity(result.original);
  const baseIntent = result.completeness.intentClarity;

  const ambiguities = detectAmbiguities(result.original).filter((a) => a.kind !== 'vague-adjective');
  const conflicts = result.requirements.conflicts;

  const currentIntent = Math.min(1, baseIntent + 0.04 * Object.keys(answers).length);
  const current = scoreCompleteness(taskType, fields, specificity, currentIntent);

  const assumed: Record<string, string | string[]> = { ...fields };
  let assumedCount = 0;
  for (const slot of questionSlots) {
    const value = assumed[slot];
    const filled = Array.isArray(value) ? value.length > 0 : (value ?? '').trim() !== '';
    if (!filled) {
      assumed[slot] = 'answered';
      assumedCount += 1;
    }
  }
  const projected = scoreCompleteness(
    taskType,
    assumed,
    specificity,
    Math.min(1, baseIntent + 0.04 * (Object.keys(answers).length + assumedCount)),
  ).score;

  // Gaps recomputed against the merged fields — never the stale original list.
  const gaps = findGaps(taskType, fields, ambiguities, conflicts);
  return {
    current,
    original: result.completeness.score,
    projected: Math.max(projected, current.score),
    missingLabels: gaps.filter((g) => g.weight >= GAP_THRESHOLD).map((g) => g.label),
  };
}

/** Build the final prompt and check it once more for completeness. */
export function composeFrom(
  result: AnalysisResult,
  answers: AnswerSet,
  options: ComposeOptions = {},
): RefinementOutcome {
  const { fields, applied } = mergeAnswers(result.requirements.fields, answers);
  const taskType = result.taskType;

  const specificity = measureSpecificity(result.original);
  const intentClarity = Math.min(1, result.completeness.intentClarity + 0.04 * applied.length);
  const completeness = scoreCompleteness(taskType, fields, specificity, intentClarity);

  const ambiguities = detectAmbiguities(result.original).filter((a) => a.kind !== 'vague-adjective');
  const conflicts = result.requirements.conflicts.filter(
    (c) => !Object.keys(answers).some((slot) => slot.includes(c.id)),
  );
  const residualGaps = findGaps(taskType, fields, ambiguities, conflicts);

  const prompt = composePrompt({
    original: result.original,
    taskType,
    fields,
    intent: result.intent,
    preserveOriginal: options.preserveOriginal !== false,
    labels: options.labels,
  });

  const changes = applied.map(({ slot, value }) => {
    const label = slotLabel(taskType, slot);
    const rendered = Array.isArray(value) ? value.join(', ') : value;
    return `${label}: ${clip(rendered, 70)}`;
  });

  if (changes.length === 0) {
    changes.push('No new details were provided — your original wording was kept as-is.');
  }

  return {
    prompt,
    completeness,
    requirements: { ...result.requirements, fields, gaps: residualGaps, conflicts },
    changes,
    residualGaps,
  };
}

/**
 * Reference-compatible one-shot refinement (the extension calls this today).
 * Equivalent to compose + a fresh completeness check.
 */
export function refineRequest(result: AnalysisResult, answers: AnswerSet): RefinementOutcome {
  return composeFrom(result, answers);
}

/**
 * Evaluate an arbitrary prompt (including one the user has hand-edited) for
 * completeness. Used by the review screen's live "still missing" indicator.
 */
export function evaluatePrompt(text: string, taskType?: TaskType): {
  taskType: TaskType;
  completeness: ReturnType<typeof scoreCompleteness>;
  gaps: Gap[];
} {
  const classification = taskType
    ? { taskType, confidence: 0.95, signals: ['forced'] }
    : classifyTask(text);
  const type = classification.taskType;
  const extracted = extractRequirements(text, type);
  const ambiguities = detectAmbiguities(text);
  const conflicts = detectConflicts(text);
  const specificity = measureSpecificity(text);
  const intentClarity = measureIntentClarity(text, classification, ambiguities, extracted.subject.subject !== '');
  const completeness = scoreCompleteness(type, extracted.fields, specificity, intentClarity);
  const gaps = findGaps(type, extracted.fields, ambiguities, conflicts);
  return { taskType: type, completeness, gaps };
}

function humaniseSlot(slot: string): string {
  return slot.replace(/[_.]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
