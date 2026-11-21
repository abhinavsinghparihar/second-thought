export type QuestionKind = 'single' | 'multi' | 'text';

export interface AiAnalysisRequest {
  text: string;
  taskType: import('@second-thought/core').TaskType;
  maxQuestions: number;
  known?: Record<string, string | string[]>;
  previousAnswers?: Array<{ slot: string; question: string; answer: string }>;
  missingSlots?: Array<{ id: string; label: string; weight: number }>;
  conflicts?: Array<{ description: string; question: string }>;
  signal?: AbortSignal;
}

export interface AiAnalysisResult {
  intent: string;
  subject: string;
  /** Language the user wrote in (as named by the model). */
  language: string;
  improved: boolean;
  confidence: number;
  questions: Array<{
    slot: string;
    text: string;
    kind: QuestionKind;
    options: Array<{ value: string; label: string; aggregate?: boolean }>;
    /** One-tap chips for a free-text question (optional in model output). */
    suggestions?: string[];
    allowCustom: boolean;
    optional: boolean;
  }>;
  /** Which provider/model produced this, for the UI badge. */
  via: { provider: string; model: string };
  /** Round-trip latency in ms. */
  latencyMs: number;
}
