import type {
  AnalysisResult,
  AdaptiveRound,
  AnswerScore,
  AnswerSet,
  Question,
  RefinementOutcome,
  Gap,
} from '@second-thought/core';
import { taskLabel, taskShortLabel } from '@second-thought/core';
import { PANEL_CSS } from './panel.css';
import { markSvg, MARK_CSS } from '../ui/mark';
import { CSS_TOKENS, CSS_BASE } from '../ui/tokens';
import type { FallbackInfo, EngineUsed } from '../shared/types';

/**
 * The clarification panel.
 *
 * Stages: analyzing → clarify (1..n rounds) → summary → review, with error and
 * fallback paths at every transition. Safety rules:
 *
 *  - All dynamic text is written with textContent / value. Never innerHTML
 *    with model or user data. (The only innerHTML use is our own static SVG.)
 *  - The panel never sends anything on its own; every exit calls a callback and
 *    the controller decides what happens to the user's message.
 *  - Escape always returns control without sending.
 */

export interface PanelCallbacks {
  result: AnalysisResult;
  analysisId: string;
  engine: EngineUsed;
  fallback?: FallbackInfo;
  /** Request the next adaptive round. Resolves to an empty round when done. */
  onNextRound: (answers: AnswerSet, askedSlots: string[]) => Promise<AdaptiveRound>;
  /** Compose the final prompt from all answers. */
  onRefine: (answers: AnswerSet) => Promise<RefinementOutcome>;
  /**
   * Re-score the request with the current answers merged in, and project what
   * answering every visible question would reach. Optional: without it the
   * summary shows only the original score — the panel never invents a number.
   */
  onScore?: (answers: AnswerSet, questionSlots: string[]) => Promise<AnswerScore | null>;
  /** Put the (possibly edited) prompt into the composer and submit. */
  onUseRefined: (text: string) => void;
  /** Send the untouched original message. */
  onSendOriginal: () => void;
  /** Close and keep the draft exactly as it was. */
  onDismiss: () => void;
}

type Stage = 'analyzing' | 'clarify' | 'summary' | 'review' | 'error';

interface QuestionEls {
  slot: string;
  root: HTMLDivElement;
  question: Question;
  radios: HTMLInputElement[];
  customWrap: HTMLDivElement | null;
  customInput: HTMLInputElement | null;
  textInput: HTMLTextAreaElement | null;
}

const ANALYZE_STEPS = [
  'Reading your request…',
  'Detecting the task category…',
  'Finding missing requirements…',
  'Checking for ambiguity…',
  'Writing questions…',
];

export class ClarifyPanel {
  private host: HTMLElement;
  private root: ShadowRoot;
  private stage: Stage = 'analyzing';
  private stageEl: HTMLDivElement | null = null;
  private bodyEl!: HTMLDivElement;
  private footerEl!: HTMLDivElement;
  private questions: QuestionEls[] = [];
  private answers: AnswerSet = {};
  private askedSlots: string[] = [];
  private round = 0;
  private outcome: RefinementOutcome | null = null;
  private scoreFrameEl: HTMLElement | null = null;
  private missingNoteEl: HTMLElement | null = null;
  private lastScore: AnswerScore | null = null;
  private busy = false;
  private stepTimer: number | null = null;
  private theme: 'light' | 'dark' = 'light';

  constructor(private readonly cb: PanelCallbacks) {
    this.host = document.createElement('div');
    this.host.id = 'second-thought-panel';
    this.root = this.host.attachShadow({ mode: 'closed' });
    this.askedSlots = cb.result.questions.map((q) => q.slot);
  }

  get isOpen(): boolean {
    return this.host.isConnected;
  }

  isAttached(): boolean {
    return this.host.isConnected;
  }

  /** Nudge the panel when the user presses send again while it is open. */
  flash(): void {
    const overlay = this.root.querySelector('.overlay');
    if (!overlay) return;
    overlay.classList.remove('is-flash');
    void (overlay as HTMLElement).offsetWidth;
    overlay.classList.add('is-flash');
  }

  open(): void {
    const style = document.createElement('style');
    style.textContent = `${CSS_TOKENS}\n${CSS_BASE}\n${MARK_CSS}\n${PANEL_CSS}`;
    this.root.appendChild(style);

    // Cinematic dark card everywhere. Tokens key off the host element
    // (:host([data-theme="dark"])), which never received the attribute before,
    // so the panel stayed white on dark chat pages.
    this.theme = 'dark';
    this.host.setAttribute('data-theme', 'dark');

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.dataset['theme'] = this.theme;
    if (this.theme === 'dark') overlay.setAttribute('data-theme', 'dark');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Second Thought — complete your request');
    overlay.setAttribute('aria-modal', 'false');

    overlay.appendChild(this.buildHeader());

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'body';
    overlay.appendChild(this.bodyEl);

    this.footerEl = document.createElement('div');
    this.footerEl.className = 'footer';
    overlay.appendChild(this.footerEl);

    this.root.appendChild(overlay);
    document.documentElement.appendChild(this.host);

    document.addEventListener('keydown', this.onKeydown, true);

    // Show the analysis animation first, then the questions. The worker has
    // already produced them by the time we open, so this is a brief, honest
    // indication rather than a fake delay.
    this.renderAnalyzing();
    void this.advanceFromAnalyzing();
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeydown, true);
    if (this.stepTimer !== null) window.clearInterval(this.stepTimer);
    this.stepTimer = null;
    this.host.remove();
  }

  private onKeydown = (evt: KeyboardEvent): void => {
    if (evt.key !== 'Escape') return;
    evt.stopPropagation();
    evt.preventDefault();
    this.handleDismiss();
  };

  // ── header ───────────────────────────────────────────────────────────────

  private buildHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'header';

    const brand = document.createElement('div');
    brand.className = 'header__brand';
    const markHost = document.createElement('span');
    markHost.style.display = 'flex';
    markHost.innerHTML = markSvg({ size: 17, animated: true });
    const name = document.createElement('span');
    name.className = 'header__name';
    name.textContent = 'Second Thought';
    brand.append(markHost, name);

    const task = document.createElement('span');
    task.className = 'header__task';
    task.textContent = taskShortLabel(this.cb.result.taskType);
    task.title = taskLabel(this.cb.result.taskType);

    const chip = document.createElement('span');
    const isAi = this.cb.engine === 'ai';
    chip.className = `engine-chip${isAi ? '' : ' engine-chip--local'}`;
    chip.textContent = isAi ? 'AI' : 'Local';
    chip.title = isAi
      ? 'Questions generated with your configured AI provider'
      : 'Questions generated on-device by the local requirement engine';

    const spacer = document.createElement('div');
    spacer.className = 'header__spacer';

    const close = document.createElement('button');
    close.className = 'icon-btn';
    close.setAttribute('aria-label', 'Close and keep my draft unchanged');
    close.textContent = '✕';
    close.addEventListener('click', () => this.handleDismiss());

    header.append(brand, task, chip, spacer, close);
    return header;
  }

  // ── stage: analyzing ─────────────────────────────────────────────────────

  private renderAnalyzing(): void {
    this.stage = 'analyzing';
    this.bodyEl.textContent = '';
    this.footerEl.textContent = '';

    const wrap = document.createElement('div');
    wrap.className = 'analyzing stage';

    const visual = document.createElement('div');
    visual.className = 'analyzing__visual';
    const scan = document.createElement('div');
    scan.className = 'analyzing__scan';
    const lines = document.createElement('div');
    lines.className = 'analyzing__lines';
    for (let i = 0; i < 3; i += 1) {
      const line = document.createElement('div');
      line.className = 'analyzing__line';
      lines.appendChild(line);
    }
    visual.append(scan, lines);

    const title = document.createElement('div');
    title.className = 'analyzing__title';
    title.textContent = 'Taking a second thought';

    const step = document.createElement('div');
    step.className = 'analyzing__step';
    step.textContent = ANALYZE_STEPS[0];

    wrap.append(visual, title, step);
    this.bodyEl.appendChild(wrap);

    let index = 0;
    this.stepTimer = window.setInterval(() => {
      index = (index + 1) % ANALYZE_STEPS.length;
      step.textContent = ANALYZE_STEPS[index] ?? ANALYZE_STEPS[0]!;
    }, 620);

    const skip = document.createElement('button');
    skip.className = 'btn btn--ghost';
    skip.textContent = 'Skip';
    skip.addEventListener('click', () => {
      if (this.stepTimer !== null) window.clearInterval(this.stepTimer);
      this.stepTimer = null;
      this.startClarify();
    });

    const info = document.createElement('span');
    info.className = 'footer__info';
    info.textContent = this.cb.engine === 'ai' ? 'AI analysis' : 'On-device';
    this.footerEl.append(info, spacerEl(), skip);
  }

  private async advanceFromAnalyzing(): Promise<void> {
    // Let the animation breathe for one beat (≈420ms), then show questions.
    await new Promise((resolve) => setTimeout(resolve, 420));
    if (!this.host.isConnected) return;
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.stage !== 'analyzing') return;
    this.startClarify();
  }

  // ── stage: clarify ───────────────────────────────────────────────────────

  private startClarify(): void {
    if (this.cb.fallback) this.renderFallbackNote();
    this.renderClarify(this.cb.result.questions, false);
  }

  private renderFallbackNote(): void {
    const fallback = this.cb.fallback;
    if (!fallback || fallback.message === '') return;
    const note = document.createElement('div');
    note.className = 'conflict';
    const strong = document.createElement('b');
    strong.textContent = 'Local analysis. ';
    note.append(strong, document.createTextNode(fallback.message));
    this.bodyEl.appendChild(note);
  }

  private renderClarify(questions: Question[], isFollowUp: boolean): void {
    this.stage = 'clarify';
    this.bodyEl.textContent = '';
    this.footerEl.textContent = '';
    this.questions = [];

    if (this.cb.fallback && !isFollowUp) this.renderFallbackNote();

    this.bodyEl.appendChild(this.buildContext());
    // The bar shows what the user's own wording scores. On a follow-up round it
    // would otherwise *drop* (the round-2 questions live in higher-weight
    // slots), which reads as "my answers made it worse". The note states that
    // the first-round answers are counted and the new questions are not yet.
    this.bodyEl.appendChild(
      this.buildMeter(
        this.cb.result.completeness.score,
        isFollowUp
          ? 'First-round answers counted. These second-round questions are not yet included.'
          : undefined,
      ),
    );
    this.bodyEl.appendChild(this.buildRoundLabel(isFollowUp, questions.length));

    for (const question of questions) {
      const el = this.buildQuestion(question);
      this.questions.push(el);
      this.bodyEl.appendChild(el.root);
    }

    this.syncConditionalVisibility();
    this.renderQuestionFooter();
  }

  private buildContext(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'context';
    const label = document.createElement('span');
    label.className = 'context__label';
    label.textContent = 'Your request';
    const quote = document.createElement('div');
    quote.className = 'context__quote';
    quote.textContent = truncate(this.cb.result.original, 180);
    wrap.append(label, quote);
    return wrap;
  }

  private buildMeter(score: number, note?: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'meter';

    const head = document.createElement('div');
    head.className = 'meter__head';
    const label = document.createElement('span');
    label.className = 'meter__label';
    label.textContent = 'Requirement completeness';
    const value = document.createElement('span');
    value.className = 'meter__value';
    value.textContent = `${score}%`;
    head.append(label, value);

    const track = document.createElement('div');
    track.className = 'meter__track';
    const fill = document.createElement('div');
    fill.className = 'meter__fill';
    fill.style.width = `${score}%`;
    track.appendChild(fill);

    wrap.append(head, track);

    // Show the strongest facet signals — this is what makes the score legible.
    const facets = this.cb.result.completeness.facets;
    const shown: Array<[string, number]> = [
      ['Intent', facets.intentClarity.score],
      ['Scope', facets.scope.score],
      ['Function', facets.functional.score],
      ['Output', facets.output.score],
    ];
    const row = document.createElement('div');
    row.className = 'meter__facets';
    for (const [name, facetScore] of shown) {
      const item = document.createElement('span');
      item.className = 'meter__facet';
      const b = document.createElement('b');
      b.textContent = `${facetScore}`;
      item.append(document.createTextNode(`${name} `), b);
      row.appendChild(item);
    }
    wrap.appendChild(row);

    if (note) {
      const noteEl = document.createElement('div');
      noteEl.className = 'meter__note';
      noteEl.textContent = note;
      wrap.appendChild(noteEl);
    }
    return wrap;
  }

  private buildRoundLabel(isFollowUp: boolean, count: number): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'round-label';
    const text = document.createElement('span');
    text.className = 'round-label__text';
    text.textContent = isFollowUp
      ? `Follow-up · ${count} question${count === 1 ? '' : 's'}`
      : `${count} question${count === 1 ? '' : 's'} · answer what you can`;
    const rule = document.createElement('span');
    rule.className = 'round-label__rule';
    wrap.append(text, rule);
    return wrap;
  }

  private buildQuestion(question: Question): QuestionEls {
    const root = document.createElement('div');
    root.className = 'q';
    root.dataset['slot'] = question.slot;
    root.dataset['hidden'] = 'false';

    const head = document.createElement('div');
    head.className = 'q__head';
    const title = document.createElement('div');
    title.className = 'q__title';
    title.id = `st-q-${question.slot}`;
    title.textContent = question.text;
    head.appendChild(title);
    if (question.optional) {
      const tag = document.createElement('span');
      tag.className = 'q__optional';
      tag.textContent = 'Optional';
      head.appendChild(tag);
    }
    root.appendChild(head);

    const why = document.createElement('div');
    why.className = 'q__why';
    why.textContent = question.rationale ?? '';
    root.appendChild(why);

    const radios: HTMLInputElement[] = [];
    let customWrap: HTMLDivElement | null = null;
    let customInput: HTMLInputElement | null = null;
    let textInput: HTMLTextAreaElement | null = null;

    if (question.kind === 'text') {
      // Quick-pick chips first. A free-text question with no one-tap answer is
      // a dead end for anyone who does not want to compose prose; the chips
      // *fill* the box rather than submitting, so the answer stays editable.
      const suggestions = question.suggestions ?? [];
      if (suggestions.length > 0) {
        const chips = document.createElement('div');
        chips.className = 'chips';
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', 'Suggested answers — tap to use');
        for (const suggestion of suggestions) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'chip';
          chip.textContent = suggestion;
          chip.addEventListener('click', (event) => {
            event.preventDefault();
            if (textInput) {
              textInput.value = suggestion;
              textInput.focus();
              textInput.setSelectionRange(suggestion.length, suggestion.length);
              this.updateFooterState();
            }
          });
          chips.appendChild(chip);
        }
        root.appendChild(chips);
      }

      textInput = document.createElement('textarea');
      textInput.className = 'q__text';
      textInput.rows = 2;
      textInput.placeholder = question.hint ?? 'Type your answer…';
      textInput.setAttribute('aria-labelledby', title.id);
      textInput.addEventListener('input', () => this.updateFooterState());
      root.appendChild(textInput);
      if (question.hint) {
        const hint = document.createElement('div');
        hint.className = 'q__hint';
        hint.textContent = question.hint;
        root.appendChild(hint);
      }
    } else {
      const opts = document.createElement('div');
      opts.className = 'opts';
      opts.setAttribute('role', question.kind === 'multi' ? 'group' : 'radiogroup');
      opts.setAttribute('aria-labelledby', title.id);

      const name = `st-${this.cb.analysisId}-${question.slot}`;
      for (const option of question.options) {
        const { label, input } = this.buildOption({
          question,
          name,
          value: option.value,
          text: option.label,
          tag: option.aggregate ? 'all' : undefined,
        });
        input.addEventListener('change', () => {
          root.tabIndex = -1;
          root.focus({ preventScroll: true });
          this.syncCheckedStyles(root);
          this.closeCustom(customWrap, customInput);
          this.syncConditionalVisibility();
          this.updateFooterState();
        });
        radios.push(input);
        opts.appendChild(label);
      }

      if (question.allowCustom) {
        const other = this.buildOption({
          question,
          name,
          value: '__other__',
          text: 'Other — type my own',
          other: true,
        });
        other.input.addEventListener('change', () => {
          this.syncCheckedStyles(root);
          if (customWrap && customInput) {
            const open = other.input.checked;
            customWrap.classList.toggle('is-open', open);
            if (open) customInput.focus();
            else customInput.value = '';
          }
          this.updateFooterState();
        });
        radios.push(other.input);
        opts.appendChild(other.label);

        customWrap = document.createElement('div');
        customWrap.className = 'q__custom';
        customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.placeholder = 'Your answer…';
        customInput.setAttribute('aria-label', `Custom answer for: ${question.text}`);
        customInput.addEventListener('input', () => this.updateFooterState());
        customWrap.appendChild(customInput);
      }

      root.appendChild(opts);
      if (customWrap) root.appendChild(customWrap);
    }

    return { slot: question.slot, root, question, radios, customWrap, customInput, textInput };
  }

  private buildOption(args: {
    question: Question;
    name: string;
    value: string;
    text: string;
    tag?: string;
    other?: boolean;
  }): { label: HTMLLabelElement; input: HTMLInputElement } {
    const label = document.createElement('label');
    label.className = `opt${args.other ? ' opt--other' : ''}`;

    const input = document.createElement('input');
    input.type = args.question.kind === 'multi' ? 'checkbox' : 'radio';
    input.name = args.name;
    input.value = args.value;
    input.className = 'st-sr';
    // Keep DOM focus in the shadow root where it belongs: a focused native
    // radio makes the *host page's* scroll container jump, which slid the
    // panel out of its own body. Keyboard users reach the options with Tab +
    // Space because the input stays in the tab order.
    input.tabIndex = -1;
    if (args.question.kind === 'multi') input.dataset['multi'] = 'true';

    const mark = document.createElement('span');
    mark.className = `opt__mark${args.question.kind === 'multi' ? ' opt__mark--multi' : ''}`;

    const text = document.createElement('span');
    text.className = 'opt__label';
    text.textContent = args.text;

    label.append(input, mark, text);

    if (args.tag) {
      const tag = document.createElement('span');
      tag.className = 'opt__tag';
      tag.textContent = args.tag;
      label.appendChild(tag);
    }
    return { label, input };
  }

  private closeCustom(wrap: HTMLDivElement | null, input: HTMLInputElement | null): void {
    if (!wrap || !input) return;
    wrap.classList.remove('is-open');
    input.value = '';
  }

  private syncCheckedStyles(root: HTMLElement): void {
    for (const label of Array.from(root.querySelectorAll<HTMLLabelElement>('.opt'))) {
      const input = label.querySelector('input');
      const checked = Boolean(input?.checked);
      label.classList.toggle('is-checked', checked);
      // Selecting an option used to grow the row (taller border, extra tag)
      // and shove the options below it under the user's pointer. That shift is
      // now captured as a layout shift instead: highlight only the mark.
      label.classList.toggle('is-selected', checked);
    }
  }

  /** Show questions whose `condition` is satisfied by the current answers. */
  private syncConditionalVisibility(): void {
    const current = this.collectAnswers();
    for (const q of this.questions) {
      const condition = q.question.condition;
      if (!condition) {
        q.root.dataset['hidden'] = 'false';
        continue;
      }
      const trigger = current[condition.slot];
      const values = trigger === undefined ? [] : Array.isArray(trigger) ? trigger : [trigger];
      const satisfied = values.some((v) =>
        condition.equals.some((expected) => String(v).toLowerCase().includes(expected.toLowerCase())),
      );
      q.root.dataset['hidden'] = String(!satisfied);
      if (!satisfied) {
        // Clear hidden answers so they never leak into the prompt.
        for (const input of q.radios) input.checked = false;
        if (q.textInput) q.textInput.value = '';
        if (q.customInput) q.customInput.value = '';
        this.syncCheckedStyles(q.root);
      }
    }
  }

  private visibleQuestions(): QuestionEls[] {
    return this.questions.filter((q) => q.root.dataset['hidden'] !== 'true');
  }

  private collectAnswers(): AnswerSet {
    const answers: AnswerSet = {};
    for (const q of this.visibleQuestions()) {
      if (q.textInput) {
        const value = q.textInput.value.trim();
        if (value !== '') answers[q.slot] = value;
        continue;
      }
      const checked = q.radios.filter((input) => input.checked);
      if (checked.length === 0) continue;

      const values: string[] = [];
      for (const input of checked) {
        if (input.value === '__other__') {
          const custom = q.customInput?.value.trim() ?? '';
          if (custom !== '') values.push(custom);
        } else {
          values.push(input.value);
        }
      }
      if (values.length === 0) continue;
      answers[q.slot] = q.question.kind === 'multi' ? values : values[0]!;
    }
    return answers;
  }

  private updateFooterState(): void {
    const next = this.footerEl.querySelector<HTMLButtonElement>('[data-action="next"]');
    const count = Object.keys(this.collectAnswers()).length;
    if (next) next.disabled = this.busy || count === 0;

    // Live progress. The label used to be a static "4 to answer" that never
    // changed no matter how many questions were answered.
    const info = this.footerEl.querySelector<HTMLElement>('[data-role="progress"]');
    if (!info) return;
    const total = this.visibleQuestions().length;
    info.textContent = count === 0 ? `${total} to answer` : `${count} of ${total} answered`;
  }

  private renderQuestionFooter(): void {
    this.footerEl.textContent = '';

    const info = document.createElement('span');
    info.className = 'footer__info';
    info.dataset['role'] = 'progress';
    this.updateFooterState();

    const skipAll = document.createElement('button');
    skipAll.className = 'btn btn--ghost';
    skipAll.textContent = 'Send original';
    skipAll.title = 'Send your message exactly as you typed it';
    skipAll.addEventListener('click', () => this.handleSendOriginal());

    const next = document.createElement('button');
    next.className = 'btn btn--primary';
    next.dataset['action'] = 'next';
    next.textContent = this.round === 0 ? 'Continue' : 'Build prompt';
    next.disabled = true;
    next.addEventListener('click', () => void this.handleContinue(next));

    this.footerEl.append(info, spacerEl(), skipAll, next);
    this.updateFooterState();
  }

  // ── continue: adaptive round or summary ──────────────────────────────────

  private async handleContinue(button: HTMLButtonElement): Promise<void> {
    if (this.busy) return;
    const answers = this.collectAnswers();
    if (Object.keys(answers).length === 0) return;

    this.busy = true;
    button.disabled = true;
    button.textContent = 'Thinking…';
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    button.prepend(spinner);

    // Merge answers collected across rounds.
    this.answers = { ...this.answers, ...answers };

    try {
      const roundResult = await this.cb.onNextRound(answers, this.askedSlots);

      // A follow-up round is only worth showing when it has real questions.
      if (roundResult.questions.length > 0 && this.round < 1) {
        this.round += 1;
        this.askedSlots = Array.from(
          new Set([...this.askedSlots, ...roundResult.questions.map((q) => q.slot)]),
        );
        this.busy = false;
        this.renderClarify(roundResult.questions, true);
        if (roundResult.fallback) {
          this.cb.fallback = roundResult.fallback as FallbackInfo;
        }
        return;
      }
    } catch {
      // A failed follow-up must not block the user: go straight to the summary.
    } finally {
      this.busy = false;
    }

    this.renderSummary();
  }

  // ── stage: summary ───────────────────────────────────────────────────────

  private renderSummary(): void {
    this.stage = 'summary';
    this.bodyEl.textContent = '';
    this.footerEl.textContent = '';

    const wrap = document.createElement('div');
    wrap.className = 'stage summary';

    const head = document.createElement('div');
    head.className = 'summary__head';
    const title = document.createElement('div');
    title.className = 'summary__title';
    title.textContent = 'What we understood';
    const sub = document.createElement('div');
    sub.className = 'summary__sub';
    sub.textContent = 'These are the requirements that will be added to your message. You can edit the final prompt next.';
    head.append(title, sub);
    wrap.appendChild(head);

    const list = document.createElement('div');
    list.className = 'summary__list';

    const entries = this.summaryEntries();
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'summary__row';
      const value = document.createElement('div');
      value.className = 'summary__val summary__empty';
      value.textContent = 'No new requirements — your original wording will be sent as-is.';
      empty.appendChild(value);
      list.appendChild(empty);
    } else {
      for (const [key, value] of entries) {
        const row = document.createElement('div');
        row.className = 'summary__row';
        const keyEl = document.createElement('div');
        keyEl.className = 'summary__key';
        keyEl.textContent = key;
        const valEl = document.createElement('div');
        valEl.className = 'summary__val';
        valEl.textContent = value;
        row.append(keyEl, valEl);
        list.appendChild(row);
      }
    }
    wrap.appendChild(list);

    // Three honest numbers, in order: original wording, current answers, and
    // the ceiling still on offer. The summary used to show the *original* score
    // above a list of answers, which read as "my answers changed nothing", and
    // it listed slots the user had just filled.
    wrap.appendChild(this.buildScoreFraming());

    // The meter tracks the live score. Showing the frozen original here, right
    // next to "Answered 58%", produced two contradictory numbers on one screen.
    const meter = this.buildMeter(this.cb.result.completeness.score);
    meter.style.marginBottom = '4px';
    meter.dataset['role'] = 'summary-meter';
    wrap.appendChild(meter);

    const missing = document.createElement('div');
    missing.className = 'summary__missing';
    missing.dataset['role'] = 'missing';
    wrap.appendChild(missing);
    this.missingNoteEl = missing;

    this.bodyEl.appendChild(wrap);
    void this.refreshScore();

    const back = document.createElement('button');
    back.className = 'btn btn--ghost';
    back.textContent = 'Back';
    back.addEventListener('click', () => this.renderClarify(this.cb.result.questions, this.round > 0));

    const sendOriginal = document.createElement('button');
    sendOriginal.className = 'btn';
    sendOriginal.textContent = 'Send original';
    sendOriginal.addEventListener('click', () => this.handleSendOriginal());

    const build = document.createElement('button');
    build.className = 'btn btn--primary';
    build.textContent = 'Build prompt';
    build.addEventListener('click', () => void this.handleBuild(build));

    this.footerEl.append(back, spacerEl(), sendOriginal, build);
  }

  /**
   * Three honest numbers on one line: what the user's wording scored, what the
   * merged answers score now, and what answering everything still on screen
   * would reach. The last one is explicitly labelled as a projection.
   */
  private buildScoreFraming(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'score-frame';
    row.dataset['role'] = 'score-frame';

    const make = (text: string, role: string, extra = ''): HTMLElement => {
      const el = document.createElement('span');
      el.className = `score-frame__item${extra}`;
      el.dataset['role'] = role;
      el.textContent = text;
      return el;
    };

    row.append(
      make(`Your wording ${this.cb.result.completeness.score}%`, 'score-original'),
      make('→', 'score-arrow', ' score-frame__arrow'),
      make('Answered —', 'score-now', ' score-frame__item--now'),
      make('', 'score-projected', ' score-frame__item--projected'),
    );
    this.scoreFrameEl = row;
    return row;
  }

  /** Fill / replace the answered + projected numbers once answers exist. */
  private async refreshScore(): Promise<void> {
    const row = this.scoreFrameEl;
    const score = await this.requestScore();
    if (!row || !row.isConnected) return;

    const nowEl = row.querySelector<HTMLElement>('[data-role="score-now"]');
    const projEl = row.querySelector<HTMLElement>('[data-role="score-projected"]');
    if (!score) {
      // No engine hook: say nothing rather than show an unsupported number.
      nowEl?.remove();
      projEl?.remove();
      return;
    }

    if (nowEl) nowEl.textContent = `Answered ${score.current.score}%`;
    this.applyScoreToMeter(score);

    if (projEl) {
      // Only shown when it means something: a projection equal to the current
      // score is noise dressed up as information.
      const delta = score.projected - score.current.score;
      projEl.textContent = delta >= 3 ? `Answering all ${score.projected}%` : '';
      projEl.title = 'Projection: what answering every question still on screen would reach.';
    }
    this.lastScore = score;
    this.refreshMissingNote(score.missingLabels);
  }

  /** Push the live score into the summary meter and its facet row. */
  private applyScoreToMeter(score: AnswerScore): void {
    const meter = this.bodyEl.querySelector<HTMLElement>('[data-role="summary-meter"]');
    if (!meter) return;
    const value = meter.querySelector<HTMLElement>('.meter__value');
    const fill = meter.querySelector<HTMLElement>('.meter__fill');
    if (value) value.textContent = `${score.current.score}%`;
    if (fill) fill.style.width = `${score.current.score}%`;

    const facets = score.current.facets;
    const shown: Array<[string, number]> = [
      ['Intent', facets.intentClarity.score],
      ['Scope', facets.scope.score],
      ['Function', facets.functional.score],
      ['Output', facets.output.score],
    ];
    const row = meter.querySelector<HTMLElement>('.meter__facets');
    if (!row) return;
    const items = Array.from(row.querySelectorAll<HTMLElement>('.meter__facet'));
    shown.forEach(([, facetScore], index) => {
      const b = items[index]?.querySelector('b');
      if (b) b.textContent = `${facetScore}`;
    });
  }

  private async requestScore(): Promise<AnswerScore | null> {
    if (!this.cb.onScore) return null;
    try {
      return await this.cb.onScore(this.answers, this.questions.map((q) => q.slot));
    } catch {
      return null;
    }
  }

  /** Slots the brief still does not cover — state them, never inflate the score. */
  private refreshMissingNote(labels: string[]): void {
    const box = this.missingNoteEl;
    if (!box) return;
    box.textContent = '';

    if (labels.length === 0) {
      const done = document.createElement('span');
      done.textContent = 'Everything material about this request is now specified.';
      box.appendChild(done);
      return;
    }

    const label = document.createElement('span');
    label.className = 'summary__missing-label';
    label.textContent = 'Still unspecified';
    const list = document.createElement('span');
    list.textContent = labels.slice(0, 5).join(' · ').toLowerCase();
    box.append(label, list);
  }

  private summaryEntries(): Array<[string, string]> {
    return Object.entries(this.answers)
      .map(([slot, value]): [string, string] => {
        const question = this.findQuestion(slot);
        const label = question?.slot ?? slot;
        const rendered = Array.isArray(value) ? value.join(', ') : value;
        return [humanise(label), truncate(rendered, 120)];
      })
      .filter(([, value]) => value.trim() !== '');
  }

  private findQuestion(slot: string): Question | undefined {
    return this.questions.find((q) => q.slot === slot)?.question ?? this.cb.result.questions.find((q) => q.slot === slot);
  }

  // ── stage: review ────────────────────────────────────────────────────────

  private async handleBuild(button: HTMLButtonElement): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    button.disabled = true;
    button.textContent = 'Composing…';
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    button.prepend(spinner);

    try {
      const outcome = await this.cb.onRefine(this.answers);
      this.outcome = outcome;
      this.renderReview(outcome);
    } catch (err) {
      this.renderError('Second Thought could not compose the prompt.', err);
    } finally {
      this.busy = false;
    }
  }

  private renderReview(outcome: RefinementOutcome): void {
    this.stage = 'review';
    this.bodyEl.textContent = '';
    this.footerEl.textContent = '';

    const wrap = document.createElement('div');
    wrap.className = 'stage review';

    wrap.appendChild(this.buildMeter(outcome.completeness.score));

    if (outcome.changes.length > 0) {
      const list = document.createElement('ul');
      list.className = 'review__changes';
      for (const change of outcome.changes.slice(0, 7)) {
        const li = document.createElement('li');
        li.textContent = truncate(change, 96);
        list.appendChild(li);
      }
      wrap.appendChild(list);
    }

    const box = document.createElement('div');
    box.className = 'prompt-box';

    const head = document.createElement('div');
    head.className = 'prompt-box__head';
    const label = document.createElement('span');
    label.className = 'prompt-box__label';
    label.textContent = 'Final prompt — editable';
    const copy = document.createElement('button');
    copy.className = 'btn btn--sm btn--ghost';
    copy.textContent = 'Copy';
    copy.addEventListener('click', () => {
      void navigator.clipboard
        .writeText(textarea.value)
        .then(() => {
          copy.textContent = 'Copied';
          window.setTimeout(() => {
            copy.textContent = 'Copy';
          }, 1400);
        })
        .catch(() => {
          textarea.select();
        });
    });
    head.append(label, copy);

    const textarea = document.createElement('textarea');
    textarea.value = outcome.prompt;
    textarea.setAttribute('aria-label', 'Final prompt (editable)');
    textarea.spellcheck = false;

    box.append(head, textarea);
    wrap.appendChild(box);
    wrap.appendChild(this.buildResidual(outcome.residualGaps));

    this.bodyEl.appendChild(wrap);

    const back = document.createElement('button');
    back.className = 'btn btn--ghost';
    back.textContent = 'Back';
    back.addEventListener('click', () => {
      this.outcome = null;
      this.renderSummary();
    });

    const regen = document.createElement('button');
    regen.className = 'btn';
    regen.textContent = 'Regenerate';
    regen.title = 'Discard edits and rebuild from your answers';
    regen.addEventListener('click', () => {
      if (!this.outcome) return;
      textarea.value = this.outcome.prompt;
    });

    const use = document.createElement('button');
    use.className = 'btn btn--primary';
    use.textContent = 'Use this prompt';
    use.addEventListener('click', () => {
      const final = textarea.value.trim() === '' ? outcome.prompt : textarea.value;
      this.dispose();
      this.cb.onUseRefined(final);
    });

    this.footerEl.append(back, regen, spacerEl(), use);
  }

  private buildResidual(gaps: Gap[]): HTMLElement {
    const box = document.createElement('div');
    const dot = document.createElement('span');
    dot.className = 'residual__dot';
    box.appendChild(dot);

    const text = document.createElement('span');
    if (gaps.length === 0) {
      box.className = 'residual residual--ok';
      text.textContent = 'Everything material is covered.';
    } else {
      box.className = 'residual';
      const names = gaps.slice(0, 3).map((gap) => gap.label.toLowerCase());
      text.textContent =
        names.length === 1
          ? `Still unspecified: ${names[0]}. You can add it above, or send as-is.`
          : `Still unspecified: ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}. You can add it above, or send as-is.`;
    }
    box.appendChild(text);
    return box;
  }

  // ── stage: error ─────────────────────────────────────────────────────────

  private renderError(title: string, err?: unknown): void {
    this.stage = 'error';
    this.bodyEl.textContent = '';
    this.footerEl.textContent = '';

    const wrap = document.createElement('div');
    wrap.className = 'stage';

    const box = document.createElement('div');
    box.className = 'err-box';
    const titleEl = document.createElement('div');
    titleEl.className = 'err-box__title';
    titleEl.textContent = title;
    const body = document.createElement('div');
    body.className = 'err-box__body';
    body.textContent =
      err instanceof Error && err.message !== ''
        ? err.message
        : 'Your original message is untouched and can still be sent.';
    box.append(titleEl, body);
    wrap.appendChild(box);

    if (this.outcome) {
      const pre = document.createElement('div');
      pre.className = 'prompt-box';
      const textarea = document.createElement('textarea');
      textarea.value = this.outcome.prompt;
      textarea.setAttribute('aria-label', 'Last generated prompt');
      pre.appendChild(textarea);
      wrap.appendChild(pre);
    }

    this.bodyEl.appendChild(wrap);

    const retry = document.createElement('button');
    retry.className = 'btn';
    retry.textContent = 'Try again';
    retry.addEventListener('click', () => {
      if (this.outcome) this.renderReview(this.outcome);
      else this.renderSummary();
    });

    const send = document.createElement('button');
    send.className = 'btn btn--primary';
    send.textContent = 'Send original';
    send.addEventListener('click', () => this.handleSendOriginal());

    this.footerEl.append(retry, spacerEl(), send);
  }

  // ── exits ────────────────────────────────────────────────────────────────

  private handleSendOriginal(): void {
    this.dispose();
    this.cb.onSendOriginal();
  }

  private handleDismiss(): void {
    this.dispose();
    this.cb.onDismiss();
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

function spacerEl(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'footer__spacer';
  return el;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function humanise(slot: string): string {
  return slot
    .replace(/[_.]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
