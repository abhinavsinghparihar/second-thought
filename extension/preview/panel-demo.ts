/**
 * Panel demo harness (preview only — not part of the shipped bundle).
 *
 * Drives the REAL ClarifyPanel with the REAL requirement engine, so what you
 * see in the preview is exactly what a user sees in the page. The worker calls
 * are faked with the same engine calls the worker makes.
 */

import { analyzeRequest, analyzeNext, composeFrom, scoreAnswers } from '@second-thought/core';
import { ClarifyPanel } from '../src/content/panel';

const PROMPTS: Array<{ label: string; text: string }> = [
  { label: 'Vague app', text: 'Build me a really cool app.' },
  { label: 'Expense tracker', text: 'Build me an expense tracking app' },
  { label: 'Bakery site', text: 'I need a website for my bakery' },
  { label: 'Cat image', text: 'make me a picture of a cat' },
  { label: 'Fix my bug', text: 'my python script throws a TypeError when I read the csv' },
  { label: 'Blog post', text: 'write a blog post' },
  { label: 'Complete (passes through)', text: 'Build a React dashboard that shows monthly revenue by region, Postgres via Prisma, auth with Google sign-in, deploy to Vercel. Must be responsive and mobile-first. For our sales team of 12 people. Deliver a complete runnable project with unit tests.' },
];

const TASK_LABELS: Record<string, string> = {
  software: 'Software development',
  website: 'Website development',
  mobile: 'Mobile app development',
  coding: 'Coding & debugging',
  writing: 'Writing & documentation',
  research: 'Research & analysis',
  image: 'Image generation',
  business: 'Business planning',
  education: 'Education & learning',
  general: 'General request',
};

let active: ClarifyPanel | null = null;

function mount(promptText: string): void {
  active?.dispose();
  active = null;

  const result = analyzeRequest(promptText, { maxQuestions: 4 });
  const status = document.getElementById('demo-status')!;

  if (!result.isRefinable) {
    status.textContent = `${TASK_LABELS[result.taskType]} · completeness ${result.completeness.score}% · PASSED THROUGH — ${result.passthroughReason}`;
    status.className = 'demo-status demo-status--pass';
    return;
  }

  status.textContent = `${TASK_LABELS[result.taskType]} · completeness ${result.completeness.score}% · ${result.questions.length} questions · confidence ${result.decision.confidence}`;
  status.className = 'demo-status';

  const panel = new ClarifyPanel({
    result,
    analysisId: result.id,
    engine: 'local',
    onNextRound: async (answers, askedSlots) => {
      const merged = {
        ...result,
        requirements: { ...result.requirements, fields: { ...result.requirements.fields, ...answers } },
      };
      return analyzeNext(merged, answers, { maxQuestions: 4, askedSlots });
    },
    onRefine: async (answers) => composeFrom(result, answers),
    onScore: async (answers, slots) => scoreAnswers(result, answers, slots),
    onUseRefined: (text) => {
      const out = document.getElementById('demo-out')!;
      out.textContent = text;
      out.classList.add('is-visible');
      panel.dispose();
      active = null;
    },
    onSendOriginal: () => {
      status.textContent = 'You chose: send the original unchanged.';
      status.className = 'demo-status demo-status--pass';
      active = null;
    },
    onDismiss: () => {
      active = null;
    },
  });

  active = panel;
  panel.open();
}

function init(): void {
  const list = document.getElementById('demo-list')!;
  for (const prompt of PROMPTS) {
    const button = document.createElement('button');
    button.className = 'demo-chip';
    button.textContent = prompt.label;
    button.addEventListener('click', () => {
      for (const other of Array.from(list.querySelectorAll('.demo-chip'))) {
        other.classList.remove('is-active');
      }
      button.classList.add('is-active');
      document.getElementById('demo-out')!.classList.remove('is-visible');
      mount(prompt.text);
    });
    list.appendChild(button);
  }

  // Open the brief's own example on load.
  const first = list.querySelector<HTMLButtonElement>('.demo-chip');
  first?.classList.add('is-active');
  mount(PROMPTS[1]!.text);

  document.getElementById('demo-reset')?.addEventListener('click', () => {
    document.getElementById('demo-out')!.classList.remove('is-visible');
    const activeChip = list.querySelector<HTMLButtonElement>('.demo-chip.is-active');
    const index = Array.from(list.children).indexOf(activeChip as Element);
    mount(PROMPTS[index >= 0 ? index : 1]!.text);
  });
}

document.addEventListener('DOMContentLoaded', () => init());
export { mount };
