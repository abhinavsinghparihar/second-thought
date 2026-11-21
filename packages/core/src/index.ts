/**
 * @second-thought/core — the requirement-discovery engine.
 *
 * Pure, synchronous, dependency-free. Runs in the content script (prefilter)
 * and in the service worker (full analysis), and in unit tests without a DOM.
 */

export * from './types';
export { classifyTask, taskLabel, taskShortLabel, TASK_LABELS, TASK_SHORT_LABELS, TASK_TYPES } from './classify';
export {
  SCHEMAS,
  schemaFor,
  slotSpec,
  slotLabel,
  labelFromId,
  FUNCTIONAL_SLOTS,
  CONSTRAINT_SLOTS,
  AUDIENCE_SLOTS,
  OUTPUT_SLOTS,
  TECHNICAL_SLOTS,
} from './schema';
export {
  extractRequirements,
  extractSubject,
  extractTopic,
  detectAmbiguities,
  detectConflicts,
  promptKeywords,
} from './extract';
export { buildQuestion, buildConflictQuestion, interpolate, bankEntry, matchDomainPacks } from './questions';
export {
  scoreCompleteness,
  findGaps,
  decide,
  measureSpecificity,
  measureIntentClarity,
  remainingSlots,
  resolvedValue,
  GAP_THRESHOLD,
  CRITICAL_THRESHOLD,
  PASSTHROUGH_SCORE,
} from './scoring';
export { composePrompt, summariseRequirements, promptTitle } from './compose';
export {
  analyzeRequest,
  analyzeNext,
  composeFrom,
  scoreAnswers,
  type AnswerScore,
  refineRequest,
  evaluatePrompt,
  mergeAnswers,
  buildRound,
  isGreeting,
  isDirectQuestion,
} from './engine';
export {
  squash,
  wordCount,
  clip,
  capitalize,
  joinNatural,
  asList,
  asText,
  mentions,
  keywords,
  clamp,
  percent,
  nextId,
} from './text';

/** Engine version, surfaced in the UI so the user knows what is running. */
export const ENGINE_VERSION = '0.3.0';
