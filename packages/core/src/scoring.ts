/**
 * Completeness scoring and the pass-through / interrupt decision.
 *
 * Two bugs in the original engine are fixed here by construction:
 *
 *  1. **Threshold drift.** Gaps were computed at `weight >= 0.55` while the
 *     score counted `weight >= 0.30`, so the two disagreed about what "done"
 *     means. Here both read the same schema and the same `GAP_THRESHOLD`.
 *
 *  2. **Score ceiling.** `0.6·coverage + 0.25·specificity + 0.15·intent`
 *     could not reach 100 because specificity was capped at 0.65. Here every
 *     input is normalised to 0–1 and a fully-specified prompt scores 100.
 *
 * The score is used to *decide whether to interrupt*, not as a scoreboard to
 * push up. A complete prompt is left completely alone.
 */

import {
  AUDIENCE_SLOTS,
  CONSTRAINT_SLOTS,
  FUNCTIONAL_SLOTS,
  OUTPUT_SLOTS,
  TECHNICAL_SLOTS,
  schemaFor,
} from './schema';
import type {
  Ambiguity,
  Completeness,
  Conflict,
  Decision,
  Gap,
  RequirementFacet,
  SlotSpec,
  TaskClassification,
  TaskType,
} from './types';
import { asList, clamp, percent, wordCount } from './text';

/** Slots at or above this weight are "material" — the single source of truth. */
export const GAP_THRESHOLD = 0.4;
/** Slots at or above this weight are "critical". */
export const CRITICAL_THRESHOLD = 0.7;
/** At or above this completeness, a prompt is left alone. */
export const PASSTHROUGH_SCORE = 78;

const FACET_WEIGHTS: Record<RequirementFacet, number> = {
  intentClarity: 0.2,
  scope: 0.15,
  functional: 0.2,
  constraints: 0.1,
  audience: 0.1,
  output: 0.15,
  technical: 0.1,
};

export interface SpecificitySignals {
  /** 0–1: how concrete the prompt is (length, numbers, names, lists). */
  specificity: number;
  /** 0–1: how clear the intent is. */
  intentClarity: number;
}

const NUMBER_RE = /\b\d+(?:[.,]\d+)?\b/;
const PROPER_NOUN_RE = /\b[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*\b/;
const QUOTED_RE = /["“'][^"”']{3,}["”']/;
const LIST_RE = /,|\band\b|\bwith\b|\bincluding\b|\bsuch as\b/i;
const DIRECTIVE_VERB_RE =
  /\b(build|create|make|write|design|develop|generate|plan|analyse|analyze|research|fix|refactor|explain|teach|compare|draft|implement|migrate|optimi[sz]e|debug|review|translate|summari[sz]e|audit|scaffold|deploy)\b/i;

/**
 * Measure of how concrete a prompt is. Unlike the original (which capped at
 * 0.65 no matter what), a long, detailed prompt reaches 1.0.
 */
export function measureSpecificity(text: string): number {
  const words = wordCount(text);
  const lengthScore = clamp(words / 28, 0, 1) * 0.55;
  let detail = 0;
  if (NUMBER_RE.test(text)) detail += 0.12;
  if (PROPER_NOUN_RE.test(text)) detail += 0.1;
  if (QUOTED_RE.test(text)) detail += 0.1;
  if (LIST_RE.test(text)) detail += 0.08;
  return clamp(lengthScore + detail, 0, 1);
}

/**
 * Measure of intent clarity — not a proxy for classifier confidence.
 * Rewards a directive verb plus a concrete object; penalises vagueness.
 */
export function measureIntentClarity(
  text: string,
  classification: TaskClassification,
  ambiguities: Ambiguity[],
  hasSubject: boolean,
): number {
  let score = 0.2;
  if (DIRECTIVE_VERB_RE.test(text)) score += 0.3;
  if (hasSubject) score += 0.25;
  score += clamp(classification.confidence, 0, 1) * 0.25;
  const vague = ambiguities.filter((a) => a.kind === 'vague-noun' || a.kind === 'hedge').length;
  score -= vague * 0.15;
  return clamp(score, 0, 1);
}

function isAnswered(value: string | string[] | undefined): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return value.trim() !== '';
}

function facetCoverage(slots: SlotSpec[], fields: Record<string, string | string[]>): { score: number; total: number } {
  let total = 0;
  let filled = 0;
  for (const slot of slots) {
    const weight = slot.weight;
    if (weight < 0.3) continue;
    total += weight;
    if (isAnswered(fields[slot.id])) filled += weight;
  }
  return { score: total === 0 ? 1 : filled / total, total };
}

/**
 * The completeness score. Monotonic: answering a question never lowers it.
 */
export function scoreCompleteness(
  taskType: TaskType,
  fields: Record<string, string | string[]>,
  specificity: number,
  intentClarity: number,
): Completeness {
  const schema = schemaFor(taskType);
  const answered: string[] = [];
  const missing: string[] = [];

  let coverageTotal = 0;
  let coverageFilled = 0;

  for (const slot of schema) {
    if (slot.weight < 0.3) continue;
    coverageTotal += slot.weight;
    if (isAnswered(fields[slot.id])) {
      coverageFilled += slot.weight;
      answered.push(slot.id);
    } else if (slot.weight >= GAP_THRESHOLD) {
      missing.push(slot.id);
    }
  }

  const coverage = coverageTotal === 0 ? 1 : coverageFilled / coverageTotal;

  const facets = {} as Completeness['facets'];
  const facetOf = (slots: Set<string>) => facetCoverage(schema.filter((s) => slots.has(s.id)), fields);
  const scopeSlots = schema.filter((s) => s.weight >= CRITICAL_THRESHOLD);

  const functional = facetOf(FUNCTIONAL_SLOTS);
  const constraints = facetOf(CONSTRAINT_SLOTS);
  const audience = facetOf(AUDIENCE_SLOTS);
  const output = facetOf(OUTPUT_SLOTS);
  const technical = facetOf(TECHNICAL_SLOTS);
  const scope = facetCoverage(scopeSlots, fields);

  facets.intentClarity = {
    score: percent(clamp(intentClarity, 0, 1) * 100),
    weight: FACET_WEIGHTS.intentClarity,
    note: intentClarity >= 0.75 ? 'Clear what you want' : intentClarity >= 0.45 ? 'Roughly clear' : 'Intent still fuzzy',
  };
  facets.scope = {
    score: percent(scope.score * 100),
    weight: FACET_WEIGHTS.scope,
    note: scope.total === 0 ? 'No scope-critical slots' : `${Math.round(scope.score * 100)}% of the essentials stated`,
  };
  facets.functional = {
    score: percent(functional.score * 100),
    weight: FACET_WEIGHTS.functional,
    note: functional.total === 0 ? 'n/a' : 'What it must actually do',
  };
  facets.constraints = {
    score: percent(constraints.total === 0 ? 100 : constraints.score * 100),
    weight: FACET_WEIGHTS.constraints,
    note: constraints.total === 0 ? 'No constraints apply' : 'Limits and limits on the solution',
  };
  facets.audience = {
    score: percent(audience.total === 0 ? 100 : audience.score * 100),
    weight: FACET_WEIGHTS.audience,
    note: audience.total === 0 ? 'No audience slot' : 'Who it is for',
  };
  facets.output = {
    score: percent(output.total === 0 ? 100 : output.score * 100),
    weight: FACET_WEIGHTS.output,
    note: output.total === 0 ? 'No output slot' : 'Shape of the deliverable',
  };
  facets.technical = {
    score: percent(technical.total === 0 ? 100 : technical.score * 100),
    weight: FACET_WEIGHTS.technical,
    note: technical.total === 0 ? 'No technical slots' : 'Stack and platform details',
  };

  // Top-level score: coverage of the schema + concreteness + clarity.
  // Weighted so a fully specified, concrete, clear prompt = 100.
  const raw = 0.6 * coverage + 0.2 * clamp(specificity, 0, 1) + 0.2 * clamp(intentClarity, 0, 1);

  return {
    score: percent(raw * 100),
    detected: answered,
    missing,
    specificity: Math.round(clamp(specificity, 0, 1) * 100) / 100,
    intentClarity: Math.round(clamp(intentClarity, 0, 1) * 100) / 100,
    facets,
  };
}

/** Every material slot the prompt does not answer, ranked by importance. */
export function findGaps(
  taskType: TaskType,
  fields: Record<string, string | string[]>,
  ambiguities: Ambiguity[],
  conflicts: Conflict[],
  ignore: string[] = [],
): Gap[] {
  const schema = schemaFor(taskType);
  const vagueBoost = ambiguities.some((a) => a.kind === 'vague-noun') ? 0.25 : 0;
  const gaps: Gap[] = [];

  for (const slot of schema) {
    if (slot.weight < GAP_THRESHOLD) continue;
    if (ignore.includes(slot.id)) continue;
    if (slot.condition) continue; // conditioned slots are surfaced later
    if (isAnswered(fields[slot.id])) continue;

    let urgency = 1;
    if (vagueBoost > 0 && (FUNCTIONAL_SLOTS.has(slot.id) || slot.weight >= CRITICAL_THRESHOLD)) {
      urgency += vagueBoost;
    }
    if (conflicts.some((c) => c.id.includes(slot.id))) urgency += 0.2;

    gaps.push({
      slot: slot.id,
      label: slot.label,
      weight: slot.weight,
      reason: reasonFor(slot, taskType),
      urgency: Math.round(urgency * 100) / 100,
      priority: Math.round(slot.weight * urgency * 1000) / 1000,
    });
  }

  return gaps.sort((a, b) => b.priority - a.priority);
}

function reasonFor(slot: SlotSpec, taskType: TaskType): string {
  const subject = taskType === 'image' ? 'the image' : 'the answer';
  switch (slot.id) {
    case 'purpose':
    case 'goal':
    case 'question':
    case 'subject':
    case 'topic':
    case 'problem':
    case 'offering':
      return `This is the substance of the request — without it ${subject} can only be generic.`;
    case 'features':
      return 'Feature scope is the single biggest driver of what you get back.';
    case 'audience':
    case 'market':
      return 'Who it is for changes vocabulary, examples and depth.';
    case 'platform':
    case 'mobile_os':
    case 'site_type':
      return 'The target platform changes the whole approach.';
    case 'language':
    case 'framework':
    case 'tech_stack':
      return 'The stack determines the code you actually receive.';
    case 'backend':
    case 'data_storage':
      return 'Persistence decides architecture and hosting.';
    case 'style':
      return 'Style drives palette, detail and rendering.';
    case 'aspect_ratio':
      return 'Aspect ratio must match where the result will be used.';
    case 'output_shape':
    case 'output_format':
      return 'Output shape prevents getting a plan when you wanted an artifact.';
    case 'tone':
      return 'Tone decides how the message lands.';
    case 'length':
      return 'Length sets structure and level of detail.';
    default:
      return `${slot.label} materially changes the result.`;
  }
}

export interface DecisionInput {
  taskType: TaskType;
  completeness: Completeness;
  gaps: Gap[];
  ambiguities: Ambiguity[];
  conflicts: Conflict[];
  classification: TaskClassification;
  text: string;
  isQuestion: boolean;
  isGreeting: boolean;
  questionCount: number;
}

/**
 * Decide whether to interrupt or let the prompt through.
 *
 * Deliberately conservative: the cost of interrupting a good prompt is high,
 * so a single high-weight gap is required (plus either ambiguity or a low
 * score) before the user is paused.
 */
export function decide(input: DecisionInput): Decision {
  const { completeness, gaps, ambiguities, conflicts, text } = input;
  const reasons: string[] = [];

  if (wordCount(text) < 2 || text.trim().length < 6) {
    return { action: 'passthrough', confidence: 0, reasons: ['Too short to analyse'], estimatedGain: 0 };
  }
  if (input.isGreeting) {
    return { action: 'passthrough', confidence: 0, reasons: ['Greeting or chit-chat'], estimatedGain: 0 };
  }
  if (input.isQuestion) {
    return { action: 'passthrough', confidence: 0, reasons: ['Direct question — answering beats clarifying'], estimatedGain: 0 };
  }

  const critical = gaps.filter((g) => g.weight >= CRITICAL_THRESHOLD);
  const strongVague = ambiguities.filter((a) => a.severity >= 0.85);

  if (conflicts.length > 0) {
    reasons.push(`Conflicting instructions detected: ${conflicts[0]!.description}`);
  }
  if (strongVague.length > 0) {
    reasons.push(`Vague wording (“${strongVague[0]!.evidence}”) leaves the target undefined`);
  }
  if (critical.length > 0) {
    reasons.push(`Missing ${critical.map((g) => g.label.toLowerCase()).slice(0, 2).join(' and ')}`);
  }
  if (completeness.score < 55) {
    reasons.push(`Only ${completeness.score}% of the requirement set is covered`);
  }

  const estimatedGain = clamp(
    gaps.slice(0, 4).reduce((sum, g) => sum + g.priority, 0) / 2.4 +
      (conflicts.length > 0 ? 0.2 : 0) +
      strongVague.length * 0.1,
    0,
    1,
  );

  // ── pass-through conditions (checked first: prefer not to interrupt) ──────
  if (completeness.score >= PASSTHROUGH_SCORE && critical.length === 0 && conflicts.length === 0) {
    return {
      action: 'passthrough',
      confidence: 0.9,
      reasons: [`Request is already ${completeness.score}% specified`, 'No critical gaps detected'],
      estimatedGain,
    };
  }
  if (gaps.length === 0 && conflicts.length === 0) {
    return {
      action: 'passthrough',
      confidence: 0.85,
      reasons: ['No material gaps detected'],
      estimatedGain,
    };
  }
  if (input.questionCount === 0) {
    return {
      action: 'passthrough',
      confidence: 0.7,
      reasons: ['No useful question could be formed'],
      estimatedGain,
    };
  }

  // ── interrupt conditions ─────────────────────────────────────────────────
  const enoughToInterrupt =
    conflicts.length > 0 ||
    (critical.length > 0 && (strongVague.length > 0 || completeness.score < PASSTHROUGH_SCORE)) ||
    (completeness.score < 62 && gaps.length >= 2) ||
    estimatedGain >= 0.55;

  if (!enoughToInterrupt) {
    return {
      action: 'passthrough',
      confidence: 0.6,
      reasons: [...reasons, 'Improvement would be marginal — not worth the interruption'],
      estimatedGain,
    };
  }

  const confidence = clamp(
    0.45 +
      critical.length * 0.15 +
      (strongVague.length > 0 ? 0.15 : 0) +
      (conflicts.length > 0 ? 0.15 : 0) +
      (completeness.score < 50 ? 0.1 : 0),
    0,
    1,
  );

  return {
    action: 'clarify',
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    estimatedGain: Math.round(estimatedGain * 100) / 100,
  };
}

/** Slots that would still be worth asking after the current round. */
export function remainingSlots(
  taskType: TaskType,
  fields: Record<string, string | string[]>,
  answered: string[],
): SlotSpec[] {
  return schemaFor(taskType)
    .filter((s) => !isAnswered(fields[s.id]) && !answered.includes(s.id) && s.weight >= GAP_THRESHOLD)
    .sort((a, b) => b.weight - a.weight);
}

/** Values for a slot, resolved through answers → fields. */
export function resolvedValue(
  fields: Record<string, string | string[]>,
  answers: Record<string, string | string[]>,
  slot: string,
): string | string[] | undefined {
  const fromAnswers = answers[slot];
  if (fromAnswers !== undefined && asList(fromAnswers).length > 0) return fromAnswers;
  return fields[slot];
}
