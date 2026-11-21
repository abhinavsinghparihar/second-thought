/**
 * Requirement schemas — one per task category.
 *
 * A slot is a *dimension of the request that materially changes the answer*.
 * `weight` is the importance of knowing it (0–1) and is the primary input to
 * the decision gate, so a website request never gets image questions and an
 * image request never gets asked about authentication.
 *
 * Slots are deliberately *not* questions. `questions.ts` turns a missing slot,
 * the user's own wording and their previous answers into contextual,
 * option-bearing questions.
 */

import type { SlotSpec, TaskType } from './types';

/** Dimensions shared by most categories. */
const COMMON: SlotSpec[] = [
  // Constraints stated in the user's own words ("no jargon", "must be offline")
  // belong to every category, not just writing.
  { id: 'must_avoid', label: 'Explicitly excluded', weight: 0.3, kind: 'text', optional: true },
  // Low weight on purpose: output format is a *nicety* for most requests and a
  // requirement only for some. Asking it by default was noise — a haiku does
  // not need an "output format" question. Categories that genuinely care set a
  // higher weight locally (see WRITING / RESEARCH).
  { id: 'output_format', label: 'Output format', weight: 0.25, kind: 'single', optional: true },
  { id: 'deadline', label: 'Deadline', weight: 0.15, kind: 'single', optional: true },
];

const WEBSITE: SlotSpec[] = [
  { id: 'purpose', label: 'Website purpose', weight: 0.95, kind: 'single' },
  { id: 'site_type', label: 'Website type', weight: 0.7, kind: 'single' },
  { id: 'audience', label: 'Target audience', weight: 0.8, kind: 'single' },
  { id: 'pages', label: 'Required pages', weight: 0.75, kind: 'multi' },
  { id: 'design_direction', label: 'Design direction', weight: 0.6, kind: 'single' },
  { id: 'features', label: 'Features', weight: 0.85, kind: 'multi' },
  { id: 'tech_stack', label: 'Technology preference', weight: 0.55, kind: 'single' },
  { id: 'backend', label: 'Backend requirements', weight: 0.7, kind: 'single' },
  { id: 'auth', label: 'Authentication', weight: 0.55, kind: 'single', condition: { slot: 'backend', equals: ['dynamic', 'unsure'] } },
  { id: 'database', label: 'Database', weight: 0.5, kind: 'single', condition: { slot: 'backend', equals: ['dynamic', 'unsure'] } },
  { id: 'deployment', label: 'Deployment', weight: 0.4, kind: 'single', optional: true },
  { id: 'content', label: 'Content readiness', weight: 0.45, kind: 'single', optional: true },
  ...COMMON,
];

const SOFTWARE: SlotSpec[] = [
  { id: 'purpose', label: 'What it does', weight: 0.95, kind: 'text' },
  { id: 'platform', label: 'Runtime / platform', weight: 0.7, kind: 'single' },
  { id: 'features', label: 'Core functionality', weight: 0.9, kind: 'multi' },
  { id: 'language', label: 'Language', weight: 0.6, kind: 'single' },
  { id: 'framework', label: 'Framework / stack', weight: 0.5, kind: 'single' },
  { id: 'constraints', label: 'Constraints', weight: 0.6, kind: 'multi' },
  { id: 'interfaces', label: 'Interfaces', weight: 0.55, kind: 'multi', condition: { slot: 'platform', equals: ['server', 'backend', 'api'] } },
  { id: 'data_storage', label: 'Data storage', weight: 0.55, kind: 'single' },
  { id: 'scale', label: 'Scale expectations', weight: 0.4, kind: 'single', optional: true },
  { id: 'output_shape', label: 'Deliverable form', weight: 0.55, kind: 'single' },
  { id: 'testing', label: 'Tests expected', weight: 0.35, kind: 'single', optional: true },
  ...COMMON,
];

const MOBILE: SlotSpec[] = [
  { id: 'purpose', label: 'What the app does', weight: 0.95, kind: 'text' },
  { id: 'mobile_os', label: 'Mobile platform', weight: 0.85, kind: 'single' },
  { id: 'features', label: 'Core features', weight: 0.9, kind: 'multi' },
  { id: 'audience', label: 'Target users', weight: 0.7, kind: 'single' },
  { id: 'framework', label: 'Framework', weight: 0.55, kind: 'single' },
  { id: 'backend', label: 'Backend / sync', weight: 0.6, kind: 'single' },
  { id: 'auth', label: 'Authentication', weight: 0.5, kind: 'single', condition: { slot: 'backend', equals: ['dynamic', 'unsure'] } },
  { id: 'notifications', label: 'Notifications', weight: 0.35, kind: 'single', optional: true },
  { id: 'store', label: 'Distribution', weight: 0.35, kind: 'single', optional: true },
  { id: 'design_direction', label: 'Design direction', weight: 0.5, kind: 'single' },
  ...COMMON,
];

const CODING: SlotSpec[] = [
  { id: 'goal', label: 'What you need', weight: 0.9, kind: 'single' },
  { id: 'problem', label: 'The problem / code', weight: 0.85, kind: 'text' },
  { id: 'language', label: 'Language / runtime', weight: 0.8, kind: 'single' },
  { id: 'context', label: 'Codebase context', weight: 0.6, kind: 'single' },
  { id: 'error', label: 'Error details', weight: 0.7, kind: 'text', condition: { slot: 'goal', equals: ['debug', 'fix', 'review'] } },
  { id: 'constraints', label: 'Constraints', weight: 0.5, kind: 'multi' },
  { id: 'output_shape', label: 'Answer form', weight: 0.5, kind: 'single' },
  { id: 'level', label: 'Explanation depth', weight: 0.4, kind: 'single', optional: true },
  ...COMMON,
];

const WRITING: SlotSpec[] = [
  // `content_type` *is* the output format for a writing request, which is why
  // the shared `output_format` slot stays at its low default weight here.
  { id: 'content_type', label: 'Content type', weight: 0.92, kind: 'single' },
  { id: 'topic', label: 'Topic', weight: 0.85, kind: 'text' },
  { id: 'audience', label: 'Target audience', weight: 0.85, kind: 'single' },
  { id: 'purpose', label: 'Purpose / goal', weight: 0.65, kind: 'single' },
  { id: 'tone', label: 'Tone', weight: 0.65, kind: 'single' },
  { id: 'length', label: 'Length', weight: 0.6, kind: 'single' },
  { id: 'structure', label: 'Structure', weight: 0.5, kind: 'single' },
  { id: 'must_include', label: 'Must include', weight: 0.55, kind: 'text', optional: true },
  // "no jargon", "avoid clichés" — an explicit exclusion is a requirement, and
  // asking "anything to avoid?" after the user already said it is a defect.
  { id: 'must_avoid', label: 'Must avoid', weight: 0.4, kind: 'text', optional: true },
  { id: 'language_out', label: 'Output language', weight: 0.45, kind: 'single', optional: true },
  // Translation only: which language the source is in, and the register the
  // result should read in. Gated so ordinary writing is never asked these.
  {
    id: 'source_language',
    label: 'Source language',
    weight: 0.6,
    kind: 'single',
    condition: { slot: 'intent_kind', equals: ['translate'] },
  },
  {
    id: 'register',
    label: 'Register',
    weight: 0.5,
    kind: 'single',
    condition: { slot: 'intent_kind', equals: ['translate'] },
  },
  ...COMMON,
];

const RESEARCH: SlotSpec[] = [
  { id: 'question', label: 'Research question', weight: 0.95, kind: 'text' },
  { id: 'scope', label: 'Scope', weight: 0.85, kind: 'single' },
  { id: 'decision', label: 'Decision it informs', weight: 0.7, kind: 'text' },
  { id: 'depth', label: 'Depth', weight: 0.6, kind: 'single' },
  { id: 'sources', label: 'Source expectations', weight: 0.6, kind: 'multi' },
  { id: 'recency', label: 'Recency', weight: 0.5, kind: 'single' },
  { id: 'geography', label: 'Geography / market', weight: 0.45, kind: 'single', optional: true },
  { id: 'output_format', label: 'Output format', weight: 0.5, kind: 'single' },
  ...COMMON,
];

const IMAGE: SlotSpec[] = [
  { id: 'subject', label: 'Main subject', weight: 0.95, kind: 'text' },
  { id: 'style', label: 'Visual style', weight: 0.85, kind: 'single' },
  { id: 'composition', label: 'Composition', weight: 0.6, kind: 'single' },
  { id: 'environment', label: 'Environment', weight: 0.6, kind: 'single' },
  { id: 'lighting', label: 'Lighting / mood', weight: 0.5, kind: 'single' },
  { id: 'aspect_ratio', label: 'Aspect ratio', weight: 0.55, kind: 'single' },
  { id: 'purpose', label: 'Intended use', weight: 0.5, kind: 'single' },
  { id: 'palette', label: 'Palette', weight: 0.4, kind: 'single', optional: true },
  { id: 'text_in_image', label: 'Text in the image', weight: 0.3, kind: 'text', optional: true },
];

const BUSINESS: SlotSpec[] = [
  { id: 'goal', label: 'Business goal', weight: 0.95, kind: 'single' },
  { id: 'offering', label: 'Product / offering', weight: 0.85, kind: 'text' },
  { id: 'market', label: 'Market / audience', weight: 0.8, kind: 'single' },
  { id: 'stage', label: 'Stage', weight: 0.6, kind: 'single' },
  { id: 'timeframe', label: 'Timeframe', weight: 0.6, kind: 'single' },
  { id: 'budget', label: 'Budget / resources', weight: 0.5, kind: 'single', optional: true },
  { id: 'constraints', label: 'Constraints', weight: 0.5, kind: 'multi' },
  { id: 'output_shape', label: 'Deliverable', weight: 0.6, kind: 'single' },
  ...COMMON,
];

const EDUCATION: SlotSpec[] = [
  { id: 'topic', label: 'Topic', weight: 0.95, kind: 'text' },
  { id: 'level', label: 'Current level', weight: 0.85, kind: 'single' },
  { id: 'goal', label: 'Learning goal', weight: 0.75, kind: 'single' },
  { id: 'depth', label: 'Depth', weight: 0.55, kind: 'single' },
  { id: 'style', label: 'Explanation style', weight: 0.5, kind: 'single' },
  { id: 'timeframe', label: 'Time available', weight: 0.45, kind: 'single', optional: true },
  { id: 'language_out', label: 'Output language', weight: 0.4, kind: 'single', optional: true },
  ...COMMON,
];

const GENERAL: SlotSpec[] = [
  { id: 'goal', label: 'Objective', weight: 0.85, kind: 'text' },
  { id: 'context', label: 'Context', weight: 0.6, kind: 'text', optional: true },
  { id: 'output_format', label: 'Expected output', weight: 0.6, kind: 'single' },
  { id: 'audience', label: 'Audience', weight: 0.45, kind: 'single', optional: true },
  { id: 'depth', label: 'Depth', weight: 0.45, kind: 'single', optional: true },
  ...COMMON,
];

export const SCHEMAS: Record<TaskType, SlotSpec[]> = {
  website: WEBSITE,
  software: SOFTWARE,
  mobile: MOBILE,
  coding: CODING,
  writing: WRITING,
  research: RESEARCH,
  image: IMAGE,
  business: BUSINESS,
  education: EDUCATION,
  general: GENERAL,
};

const DEDUPED = new Map<TaskType, SlotSpec[]>();

/**
 * Schema for a task type, de-duplicated by slot id. Slots appear once and the
 * first (most specific) definition wins — COMMON overlaps GENERAL, and a
 * duplicated slot previously produced the same question twice.
 */
export function schemaFor(taskType: TaskType): SlotSpec[] {
  const cached = DEDUPED.get(taskType);
  if (cached) return cached;
  const seen = new Set<string>();
  const out: SlotSpec[] = [];
  for (const slot of SCHEMAS[taskType] ?? SCHEMAS.general) {
    if (seen.has(slot.id)) continue;
    seen.add(slot.id);
    out.push(slot);
  }
  DEDUPED.set(taskType, out);
  return out;
}

export function slotSpec(taskType: TaskType, slotId: string): SlotSpec | undefined {
  return schemaFor(taskType).find((s) => s.id === slotId);
}

export function slotLabel(taskType: TaskType, slotId: string): string {
  return slotSpec(taskType, slotId)?.label ?? labelFromId(slotId);
}

/** Fallback label for AI-supplied slots that are not in the schema. */
export function labelFromId(slotId: string): string {
  const words = slotId.replace(/[_.-]+/g, ' ').trim();
  return words === '' ? slotId : words.charAt(0).toUpperCase() + words.slice(1);
}

/** Slots that carry the request's functional intent (used for facet scoring). */
export const FUNCTIONAL_SLOTS = new Set([
  'features', 'feature', 'purpose', 'goal', 'problem', 'question', 'subject',
  'topic', 'content_type', 'offering', 'scope', 'output_shape', 'interfaces',
]);

export const CONSTRAINT_SLOTS = new Set([
  'constraints', 'deadline', 'budget', 'tech_stack', 'framework', 'language',
  'deployment', 'scale', 'timeframe', 'recency', 'palette',
]);

export const AUDIENCE_SLOTS = new Set(['audience', 'market', 'recipient', 'level']);

export const OUTPUT_SLOTS = new Set([
  'output_format', 'output_shape', 'format', 'length', 'structure', 'depth',
  'style', 'deliverable', 'store', 'aspect_ratio',
]);

export const TECHNICAL_SLOTS = new Set([
  'platform', 'language', 'framework', 'tech_stack', 'backend', 'database',
  'auth', 'data_storage', 'mobile_os', 'deployment', 'testing', 'interfaces',
  'notifications', 'context', 'error',
]);
