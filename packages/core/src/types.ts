/**
 * Public contract of the Second Thought requirement engine.
 *
 * The engine is **pure and synchronous** — no network, no DOM, no storage.
 * That is deliberate: the same code runs (a) inside the content script as a
 * ~1 ms prefilter before the user's send is touched, and (b) inside the
 * service worker for the full analysis. It is therefore fully unit-testable.
 *
 * Reference compatibility: `analyzeRequest`, `refineRequest`, `AnalysisResult`,
 * `AnswerSet` and `RefinementOutcome` keep the shape the extension already
 * consumes. Everything else is additive.
 */

// ── task classification ─────────────────────────────────────────────────────

export type TaskType =
  | 'software'      // software development (apps, systems, services)
  | 'website'       // websites, landing pages, web apps
  | 'mobile'        // mobile app development
  | 'coding'        // coding help, debugging, refactoring, explanation
  | 'writing'       // writing & documentation
  | 'research'      // research & analysis
  | 'image'         // image generation
  | 'business'      // business planning, strategy, go-to-market
  | 'education'     // education & learning
  | 'general';      // anything else

export interface TaskClassification {
  taskType: TaskType;
  confidence: number;
  /** Matched classifier signal ids, for auditability in tests and logs. */
  signals: string[];
}

// ── requirement slots ───────────────────────────────────────────────────────

export type SlotKind = 'single' | 'multi' | 'text';

export interface SlotOption {
  value: string;
  label: string;
}

/** A requirement dimension for one task type. */
export interface SlotSpec {
  id: string;
  label: string;
  /** Importance to the quality of the final answer (0–1). Drives prioritisation. */
  weight: number;
  kind: SlotKind;
  /** Asked as a follow-up only when `condition` holds. */
  condition?: { slot: string; equals: string[] };
  /** Shown as an optional, skippable question. */
  optional?: boolean;
}

/** What the request is about, in the user's own vocabulary. */
export interface SubjectInfo {
  /** e.g. "expense tracking app" or "app". */
  subject: string;
  /** e.g. "expense tracking" — empty when nothing beyond the category noun. */
  domain: string;
  /** The bare category noun, e.g. "app". */
  category: string;
  /**
   * What kind of request this is *within* its category — "translate", "debug",
   * "illustrate". Optional: it only exists to gate niche questions (a
   * translation needs a source language; a blog post does not).
   */
  intent?: string;
}

export interface DetectedField {
  slot: string;
  value: string | string[];
  confidence: number;
  /** The literal span in the prompt that justified this field. */
  evidence: string;
}

// ── requirement analysis ────────────────────────────────────────────────────

export type RequirementFacet =
  | 'intentClarity'
  | 'scope'
  | 'functional'
  | 'constraints'
  | 'audience'
  | 'output'
  | 'technical';

export interface Completeness {
  /** 0–100. Meaningful and monotonic: answers always raise it. */
  score: number;
  detected: string[];
  missing: string[];
  specificity: number;
  intentClarity: number;
  /** Per-facet detail, shown in the UI and used by the decision gate. */
  facets: Record<RequirementFacet, { score: number; weight: number; note: string }>;
}

export interface Gap {
  slot: string;
  label: string;
  weight: number;
  /** Why this gap matters, phrased for a human. */
  reason: string;
  /** Multiplier from ambiguity/conflict signals — makes the gap *urgent*. */
  urgency: number;
  /** Ordering key: weight × urgency. */
  priority: number;
}

export type AmbiguityKind = 'vague-noun' | 'vague-adjective' | 'hedge' | 'unbounded';

export interface Ambiguity {
  kind: AmbiguityKind;
  evidence: string;
  /** Slot this ambiguity points at, when it is specific. */
  targetSlot?: string;
  severity: number;
}

export interface Conflict {
  id: string;
  description: string;
  evidence: [string, string];
  /** Question text that resolves it, injected ahead of slot questions. */
  question: string;
}

export interface RequirementModel {
  taskType: TaskType;
  /** A one-line reading of what the user is trying to achieve. */
  intent: string;
  /** A short noun phrase naming the thing being built/produced, when known. */
  subject: string;
  /** Domain hint, e.g. "expense tracking", "recruitment", "photo". */
  domain: string;
  fields: Record<string, string | string[]>;
  detected: DetectedField[];
  gaps: Gap[];
  ambiguities: Ambiguity[];
  conflicts: Conflict[];
  classification: TaskClassification;
}

// ── questions ───────────────────────────────────────────────────────────────

export interface QuestionOption extends SlotOption {
  /** Marks the "All of these" aggregate option. */
  aggregate?: boolean;
  /** Short rationale shown under the option when helpful. */
  hint?: string;
}

export interface Question {
  id: string;
  slot: string;
  /** Contextual prompt text — must reference the user's actual subject. */
  text: string;
  kind: SlotKind;
  options: QuestionOption[];
  /**
   * Quick-pick chips for a free-text question. They fill the textarea rather
   * than answering it, so a `text` question is still never a dead end: there is
   * always at least one one-tap answer *and* the box.
   */
  suggestions: string[];
  allowCustom: boolean;
  optional?: boolean;
  hint?: string;
  /** Only show when the answer to `slot` is one of `equals`. */
  condition?: { slot: string; equals: string[] };
  /** Higher = ask first. */
  priority: number;
  /** Why we are asking (shown as a quiet line under the question). */
  rationale?: string;
}

export type AnswerValue = string | string[];
/** Map of slot → answer. */
export type AnswerSet = Record<string, AnswerValue>;

export interface AdaptiveRound {
  /** Questions for this round, already contextual and deduplicated. */
  questions: Question[];
  /** True when another round would still be worth the user's attention. */
  hasMore: boolean;
  /** Slots that would be asked next (for the "2 more available" affordance). */
  nextSlots: string[];
  /** Completeness if the user stopped now. */
  completeness: Completeness;
  /**
   * Set by the worker when AI mode failed and this round came from the local
   * engine instead. Never set by the engine itself.
   */
  fallback?: { kind: string; message: string };
}

// ── analysis result (consumed by worker + controller + panel) ───────────────

export interface AnalysisResult {
  id: string;
  original: string;
  taskType: TaskType;
  intent: string;
  /** False ⇒ the caller must let the prompt through untouched. */
  isRefinable: boolean;
  passthroughReason?: string;
  completeness: Completeness;
  requirements: RequirementModel;
  questions: Question[];
  /** Human-readable account of the decision, for the UI and for tests. */
  decision: Decision;
  engine: 'local' | 'ai';
}

export interface Decision {
  action: 'clarify' | 'passthrough';
  /** 0–1 confidence that clarifying materially improves the answer. */
  confidence: number;
  reasons: string[];
  /** Estimated benefit, used in tests and debugging. */
  estimatedGain: number;
}

export interface RefinementOutcome {
  prompt: string;
  completeness: Completeness;
  requirements: RequirementModel;
  changes: string[];
  /** What the final-prompt completeness check still finds missing. */
  residualGaps: Gap[];
}

export interface AnalyzeOptions {
  maxQuestions?: number;
  /** Force a task type (used by tests and by AI mode). */
  taskType?: TaskType;
  /** Slots already answered — never asked again. */
  ignoreSlots?: string[];
  /** Id factory override, for deterministic tests. */
  id?: string;
}

export interface ComposeOptions {
  /** Keep the user's own wording as the head of the prompt (default true). */
  preserveOriginal?: boolean;
  /**
   * Display labels for slots that are not in the built-in schema (e.g. AI-made
   * questions). Lets a Hindi/Spanish/Chinese question label its own answer in
   * the user's language instead of an English slot id.
   */
  labels?: Record<string, string>;
}
