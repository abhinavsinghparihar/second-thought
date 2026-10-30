import type { AnswerSet, AnalysisResult, RefinementOutcome } from '@second-thought/core';
import { PANEL_CSS } from './panel.css';

/**
 * The clarification panel — a self-contained Shadow DOM component.
 *
 * Security: all dynamic content is inserted with textContent / value only.
 * No innerHTML, no untrusted markup, no inline event handlers.
 *
 * UX: the user sees (1) what was detected, (2) why we're asking, then
 * answers a few questions — conditioned follow-ups appear progressively —
 * and finally reviews an editable refined prompt before it is used.
 */

export interface PanelCallbacks {
  result: AnalysisResult;
  analysisId: string;
  engine: string;
  onRefine: (answers: AnswerSet) => Promise<RefinementOutcome>;
  onUseRefined: (refinedText: string) => void;
  /** "Send without refining" — proceed with the untouched original. */
  onCancel: () => void;
  /** Close without sending anything (user regains control). */
  onDismiss: () => void;
}

interface QuestionEls {
  slot: string;
  root: HTMLDivElement;
  inputs: HTMLInputElement[];
  otherInput: HTMLInputElement | null;
  otherRadio: HTMLInputElement | null;
  conditionSlot?: string;
  conditionEquals?: string[];
  required: boolean;
}

export class ClarifyPanel {
  private host: HTMLElement;
  private root: ShadowRoot;
  private els!: {
    overlay: HTMLDivElement;
    body: HTMLDivElement;
    footer: HTMLDivElement;
  };
  private questions: QuestionEls[] = [];
  private outcome: RefinementOutcome | null = null;
  private busy = false;

  constructor(private cb: PanelCallbacks) {
    this.host = document.createElement('div');
    this.host.id = 'second-thought-panel-host';
    this.root = this.host.attachShadow({ mode: 'closed' });
  }

  get isOpen(): boolean {
    return this.host.isConnected;
  }

  /** True while the panel element is in the document. */
  isAttached(): boolean {
    return this.host.isConnected;
  }

  flash(): void {
    const overlay = this.root.querySelector('.overlay');
    if (overlay) {
      overlay.classList.remove('flash');
      void (overlay as HTMLElement).offsetWidth;
      overlay.classList.add('flash');
    }
  }

  open(): void {
    const style = document.createElement('style');
    style.textContent = PANEL_CSS;
    this.root.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Second Thought — complete your request');

    overlay.appendChild(this.buildHeader());

    const body = document.createElement('div');
    body.className = 'body';
    overlay.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'footer';
    overlay.appendChild(footer);

    this.root.appendChild(overlay);
    this.els = { overlay, body, footer };

    this.renderQuestionsState();
    document.documentElement.appendChild(this.host);

    document.addEventListener('keydown', this.onKeydown, true);
    const first = body.querySelector<HTMLInputElement>('input, textarea');
    first?.focus();
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeydown, true);
    this.host.remove();
  }

  private onKeydown = (evt: KeyboardEvent): void => {
    if (evt.key === 'Escape') {
      evt.stopPropagation();
      this.cb.onDismiss();
      this.dispose();
    }
  };

  private buildHeader(): HTMLElement {
    const header = document.createElement('header');
    const brand = document.createElement('div');
    brand.className = 'brand';
    const dot = document.createElement('span');
    dot.className = 'dot';
    brand.appendChild(dot);
    brand.appendChild(document.createTextNode('Second Thought'));
    const chip = document.createElement('span');
    chip.className = 'engine-chip';
    chip.textContent = this.cb.engine === 'ai' ? 'AI analysis' : 'Local analysis';
    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    const close = document.createElement('button');
    close.className = 'icon';
    close.setAttribute('aria-label', 'Close — keep my draft as it is');
    close.textContent = '×';
    close.addEventListener('click', () => {
      this.cb.onDismiss();
      this.dispose();
    });
    header.append(brand, chip, spacer, close);
    return header;
  }

  // ── state 1: questions ────────────────────────────────────────────────────

  private renderQuestionsState(): void {
    const { body, footer } = this.els;
    body.textContent = '';

    const context = document.createElement('div');
    context.className = 'context';
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = 'Let’s complete your request. ';
    context.appendChild(lbl);
    context.appendChild(
      document.createTextNode('A few details will materially improve the answer.'),
    );

    const original = document.createElement('div');
    original.className = 'original';
    const oLbl = document.createElement('span');
    oLbl.className = 'lbl';
    oLbl.textContent = 'Your request: ';
    original.appendChild(oLbl);
    original.appendChild(document.createTextNode(truncate(this.cb.result.original, 160)));

    body.append(context, original);

    this.questions = [];
    for (const q of this.cb.result.questions) {
      body.appendChild(this.buildQuestion(q));
    }
    this.refreshVisibility();

    footer.textContent = '';
    const skip = document.createElement('button');
    skip.className = 'ghost';
    skip.textContent = 'Send without refining';
    skip.addEventListener('click', () => {
      this.dispose();
      this.cb.onCancel();
    });

    const refine = document.createElement('button');
    refine.className = 'primary';
    refine.textContent = 'Refine request';
    refine.disabled = false;
    refine.addEventListener('click', () => void this.handleRefine(refine));

    const muted = document.createElement('span');
    muted.className = 'muted';
    muted.textContent = `${countVisiblePrimary(this.questions)} questions`;
    footer.append(muted, document.createElement('div'), skip, refine);
    footer.lastElementChild!.className = 'spacer';
    footer.style.display = 'flex';
    footer.style.gap = '8px';
    (footer.children[1] as HTMLElement).style.flex = '1';
  }

  private buildQuestion(q: AnalysisResult['questions'][number]): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.className = 'q';
    wrap.dataset.slot = q.slot;

    const title = document.createElement('div');
    title.className = 'qt';
    title.textContent = q.text;
    if (q.optional) {
      const tag = document.createElement('span');
      tag.className = 'opt-tag';
      tag.textContent = ' (optional)';
      title.appendChild(tag);
    }
    wrap.appendChild(title);

    const opts = document.createElement('div');
    opts.className = 'opts';
    const inputs: HTMLInputElement[] = [];
    let otherRadio: HTMLInputElement | null = null;
    let otherInput: HTMLInputElement | null = null;

    if (q.kind === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = q.hint ?? 'Type your answer…';
      input.dataset.slot = q.slot;
      inputs.push(input);
      opts.appendChild(input);
      if (q.hint) {
        const hint = document.createElement('div');
        hint.className = 'hint';
        hint.textContent = q.hint;
        wrap.appendChild(hint);
      }
    } else {
      for (const opt of q.options) {
        const label = document.createElement('label');
        label.className = 'opt';
        const input = document.createElement('input');
        input.type = q.kind === 'multi' ? 'checkbox' : 'radio';
        input.name = `st-${this.cb.analysisId}-${q.slot}`;
        input.value = opt.value;
        input.dataset.slot = q.slot;
        input.addEventListener('change', () => {
          syncCheckedStyles(wrap);
          refreshVisibilityWrapper(this.questions);
          this.updateFooterHint();
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(opt.label));
        opts.appendChild(label);
        inputs.push(input);
      }
      if (q.allowCustom) {
        const label = document.createElement('label');
        label.className = 'opt';
        const input = document.createElement('input');
        input.type = q.kind === 'multi' ? 'checkbox' : 'radio';
        input.name = `st-${this.cb.analysisId}-${q.slot}`;
        input.value = '__other__';
        input.dataset.slot = q.slot;
        input.addEventListener('change', () => {
          syncCheckedStyles(wrap);
          refreshVisibilityWrapper(this.questions);
          if (otherInput && input.checked) otherInput.focus();
          this.updateFooterHint();
        });
        otherRadio = input;
        label.appendChild(input);
        label.appendChild(document.createTextNode('Other…'));
        opts.appendChild(label);

        const otherWrap = document.createElement('div');
        otherWrap.className = 'other-wrap';
        otherInput = document.createElement('input');
        otherInput.type = 'text';
        otherInput.placeholder = 'Specify…';
        otherInput.setAttribute('aria-label', `Custom answer for: ${q.text}`);
        otherWrap.appendChild(otherInput);
        opts.appendChild(otherWrap);
      }
    }

    wrap.appendChild(opts);
    this.questions.push({
      slot: q.slot,
      root: wrap,
      inputs,
      otherInput,
      otherRadio,
      conditionSlot: q.condition?.slot,
      conditionEquals: q.condition?.equals,
      required: !q.optional && q.kind !== 'text',
    });
    return wrap;
  }

  private updateFooterHint(): void {
    // placeholder for future progressive-hint UX
  }

  /** Show/hide conditioned questions based on current answers. */
  private refreshVisibility(): void {
    refreshVisibilityWrapper(this.questions);
  }

  private collectAnswers(): AnswerSet {
    const answers: AnswerSet = {};
    for (const q of this.questions) {
      if (q.root.dataset.hidden === 'true') continue;
      const text = q.inputs.find((i) => i.type === 'text');
      if (text) {
        const v = text.value.trim();
        if (v !== '') answers[q.slot] = v;
        continue;
      }
      const checked = q.inputs.filter((i) => i.type === 'checkbox' && i.checked).map((i) => i.value);
      if (checked.length > 0) {
        const resolved = checked.map((v) => (v === '__other__' ? q.otherInput?.value.trim() ?? '' : v)).filter((v) => v !== '');
        if (resolved.length > 0) answers[q.slot] = resolved;
        continue;
      }
      const radio = q.inputs.find((i) => i.type === 'radio' && i.checked);
      if (radio) {
        if (radio.value === '__other__') {
          const v = q.otherInput?.value.trim() ?? '';
          if (v !== '') answers[q.slot] = v;
        } else {
          answers[q.slot] = radio.value;
        }
      }
    }
    return answers;
  }

  private async handleRefine(button: HTMLButtonElement): Promise<void> {
    if (this.busy) return;
    const answers = this.collectAnswers();
    if (Object.keys(answers).length === 0) {
      this.dispose();
      this.cb.onCancel();
      return;
    }
    this.busy = true;
    button.disabled = true;
    button.textContent = 'Composing…';
    try {
      const outcome = await this.cb.onRefine(answers);
      this.outcome = outcome;
      this.renderReviewState(outcome);
    } catch {
      this.renderErrorState();
    } finally {
      this.busy = false;
      button.disabled = false;
    }
  }

  // ── state 2: review ───────────────────────────────────────────────────────

  private renderReviewState(outcome: RefinementOutcome): void {
    const { body, footer } = this.els;
    body.textContent = '';

    const scorebar = document.createElement('div');
    scorebar.className = 'scorebar';
    const track = document.createElement('div');
    track.className = 'track';
    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.style.width = `${outcome.completeness.score}%`;
    track.appendChild(fill);
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = `Completeness ${outcome.completeness.score}%`;
    scorebar.append(track, num);
    body.appendChild(scorebar);

    const ctx = document.createElement('div');
    ctx.className = 'context';
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = 'What changed: ';
    ctx.appendChild(lbl);
    ctx.appendChild(document.createTextNode('Review and edit before it is sent.'));
    body.appendChild(ctx);

    const changes = document.createElement('ul');
    changes.className = 'changes';
    for (const change of outcome.changes.slice(0, 6)) {
      const li = document.createElement('li');
      li.textContent = truncate(change, 90);
      changes.appendChild(li);
    }
    body.appendChild(changes);

    const textarea = document.createElement('textarea');
    textarea.className = 'refined';
    textarea.value = outcome.prompt;
    textarea.setAttribute('aria-label', 'Refined prompt (editable)');
    body.appendChild(textarea);

    footer.textContent = '';
    const back = document.createElement('button');
    back.className = 'ghost';
    back.textContent = 'Back';
    back.addEventListener('click', () => this.renderQuestionsState());

    const use = document.createElement('button');
    use.className = 'primary';
    use.textContent = 'Use refined prompt';
    use.addEventListener('click', () => {
      const finalText = textarea.value.trim() === '' ? outcome.prompt : textarea.value;
      this.dispose();
      this.cb.onUseRefined(finalText);
    });
    footer.append(back, document.createElement('div'), use);
    (footer.children[1] as HTMLElement).style.flex = '1';
  }

  // ── state 3: error ────────────────────────────────────────────────────────

  private renderErrorState(): void {
    const { body, footer } = this.els;
    body.textContent = '';
    const err = document.createElement('div');
    err.className = 'err';
    err.textContent = 'Second Thought couldn’t compose the refined request right now. Your original request is untouched.';
    body.appendChild(err);

    footer.textContent = '';
    const retry = document.createElement('button');
    retry.className = 'ghost';
    retry.textContent = 'Back to questions';
    retry.addEventListener('click', () => this.renderQuestionsState());

    const sendAnyway = document.createElement('button');
    sendAnyway.className = 'primary';
    sendAnyway.textContent = 'Send original';
    sendAnyway.addEventListener('click', () => {
      this.dispose();
      this.cb.onCancel();
    });
    footer.append(retry, document.createElement('div'), sendAnyway);
    (footer.children[1] as HTMLElement).style.flex = '1';
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

function conditionSatisfied(q: QuestionEls, all: QuestionEls[]): boolean {
  if (!q.conditionSlot || !q.conditionEquals) return true;
  const trigger = all.find((c) => c.slot === q.conditionSlot);
  if (!trigger) return true;
  const checked = trigger.inputs.filter((i) => i.type !== 'text' && i.checked).map((i) => i.value);
  const text = trigger.inputs.find((i) => i.type === 'text')?.value.trim() ?? '';
  if (text !== '') return q.conditionEquals.some((e) => text.toLowerCase().includes(e.toLowerCase()));
  return checked.some((v) => q.conditionEquals!.includes(v));
}

function refreshVisibilityWrapper(questions: QuestionEls[]): void {
  for (const q of questions) {
    const visible = conditionSatisfied(q, questions);
    q.root.dataset.hidden = visible ? 'false' : 'true';
  }
}

function syncCheckedStyles(wrap: HTMLDivElement): void {
  for (const label of Array.from(wrap.querySelectorAll('label.opt'))) {
    const input = label.querySelector('input');
    label.classList.toggle('checked', input?.checked ?? false);
  }
}

function countVisiblePrimary(questions: QuestionEls[]): number {
  return questions.filter((q) => conditionSatisfied(q, questions) && !q.conditionSlot).length;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}
