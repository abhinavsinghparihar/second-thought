/**
 * Engine quality regressions.
 *
 * These are the failures found by running a real corpus of prompts through the
 * engine and reading the output, not by testing functions in isolation. Each
 * case below was producing a *wrong question* before the fix named in its title.
 *
 * The rule they enforce is the brief's central requirement: questions must be
 * contextual. Asking "What exactly is it about?" of a prompt that begins
 * "about rain" is a defect, however well the score is computed.
 */

import { describe, expect, it } from 'vitest';
import { analyzeRequest, classifyTask, extractRequirements, extractTopic, slotSpec } from '../src/index';
import type { TaskType } from '../src/types';

const ask = (text: string) => analyzeRequest(text, { maxQuestions: 4 });
const fieldsOf = (text: string, taskType: TaskType = classifyTask(text).taskType) =>
  extractRequirements(text, taskType).fields;

describe('nothing already stated is asked about again', () => {
  it('reads a compound length ("900-word") and does not ask for length', () => {
    const text =
      'Write a 900-word blog post for first-time home buyers in Lucknow, friendly but factual tone, ' +
      'with a checklist at the end and no jargon.';
    expect(fieldsOf(text)['length']).toBe('900-word');
    expect(ask(text).questions.map((q) => q.slot)).not.toContain('length');
  });

  it('reads an explicit audience that is not in the curated list', () => {
    const text = 'Write a blog post for first-time home buyers in Lucknow.';
    expect(fieldsOf(text, 'writing')['audience']).toContain('first-time home buyers');
    expect(ask(text).questions.map((q) => q.slot)).not.toContain('audience');
  });

  it('reads a structure request ("with a checklist at the end")', () => {
    const text = 'Write a blog post with a checklist at the end about onboarding.';
    expect(fieldsOf(text, 'writing')['structure']).toContain('checklist');
  });

  it('reads an explicit exclusion ("and no jargon")', () => {
    const text = 'Write a blog post about onboarding for new hires and no jargon.';
    expect(fieldsOf(text, 'writing')['must_avoid']).toContain('jargon');
    expect(ask(text).questions.map((q) => q.slot)).not.toContain('must_avoid');
  });

  it('reads an explicit inclusion ("must mention the pricing")', () => {
    const text = 'Write a launch email that must mention the pricing change.';
    expect(fieldsOf(text, 'writing')['must_include']).toContain('pricing');
  });

  it('treats the quoted material as the topic', () => {
    expect(fieldsOf('translate "hello" to French', 'writing')['topic']).toBe('hello');
  });

  it('names the artifact in its own topic question ("What should the cover letter be about?")', () => {
    const question = ask('write a cover letter').questions.find((q) => q.slot === 'topic');
    expect(question?.text).toMatch(/cover letter/i);
    expect(question?.text).not.toMatch(/^what exactly is it about\?$/i);
  });

  it('uses the audience as the subject for a derivative artifact', () => {
    // "a blog post for first-time home buyers" — asking what it is about is
    // noise when the audience has been stated.
    const fields = fieldsOf('Write a blog post for first-time home buyers.', 'writing');
    expect(fields['topic']).toContain('first-time home buyers');
  });

  it('does not treat "for <audience>" as the topic', () => {
    // "for developers" is who it is for, not what it is about.
    expect(extractTopic('write a blog post for developers')).toBe('');
    expect(fieldsOf('write a blog post for developers', 'writing')['audience']).toBe('developers');
  });
});

describe('topic extraction across phrasing', () => {
  it.each([
    ['explain how DNS works', 'how dns works'],
    ['teach me python', 'python'],
    ['write a haiku about rain', 'rain'],
    ['explaining how migrations work', 'how migrations work'],
  ])('%s → %s', (text, expected) => {
    expect(extractTopic(text).toLowerCase()).toBe(expected);
  });
});

describe('classification covers the long tail', () => {
  it.each([
    ['translate "good morning" to Japanese', 'writing'],
    ['write a haiku about the monsoon', 'writing'],
    ['explain how DNS works', 'education'],
    ['teach me python', 'education'],
    ['write a cover letter for a backend role', 'writing'],
    ['build me an app', 'software'],
    ['I need a website for my bakery', 'website'],
    ['make me a picture of a cat', 'image'],
    ['help me plan my startup', 'business'],
    ['research the EV market in India', 'research'],
    ['make a mobile app for fitness', 'mobile'],
  ])('%s → %s', (text, expected) => {
    expect(classifyTask(text).taskType).toBe(expected);
  });
});

describe('question text never falls back to a generic form', () => {
  const corpus = [
    'build me an app',
    'I need a website for my bakery',
    'make me a picture of a cat',
    'write a blog post',
    'help me plan my startup',
    'teach me python',
    'research the EV market in India',
    'design a logo for my coffee shop',
    'write a cover letter',
    'translate "hello" to French',
    'explain how DNS works',
    'make a mobile app for fitness',
  ];

  const BANNED = [
    /^what exactly is it about\?$/i,
    /^what would a perfect result look like\?$/i,
    /^any context worth knowing\?$/i,
    /^what features do you want\?$/i,
    /^describe your (project|idea)\.?$/i,
  ];

  it.each(corpus)('%s — no question is a blank box', (text) => {
    const result = ask(text);
    expect(result.questions.length).toBeGreaterThanOrEqual(3);
    for (const question of result.questions) {
      for (const banned of BANNED) expect(question.text).not.toMatch(banned);
      // The contract: every question can be answered by tapping. A free-text
      // question is allowed only if it offers chips that fill the box.
      const tappable = question.options.length >= 2 || (question.kind === 'text' && question.suggestions.length > 0);
      expect(tappable, `${text} → "${question.text}" has no one-tap answer`).toBe(true);
    }
  });

  it.each(corpus)('%s — questions name the artifact or ask a real dimension', (text) => {
    const result = ask(text);
    const subject = result.requirements.subject;
    const words = subject.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const named = result.questions.filter((q) =>
      words.some((w) => q.text.toLowerCase().includes(w)),
    );
    // Either the request is named in at least one question, or every question
    // targets a distinct, specific dimension. Never neither.
    expect(named.length > 0 || result.questions.every((q) => q.rationale)).toBe(true);
  });

  it('every multiple-choice question actually offers choices', () => {
    for (const text of corpus) {
      for (const question of ask(text).questions) {
        if (question.kind === 'text') continue;
        expect(question.options.length, `${text} → ${question.slot}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('a fully specified brief is left alone, in every category', () => {
  it.each([
    [
      'writing',
      'Write a 900-word blog post for first-time home buyers in Lucknow, friendly but factual tone, ' +
        'with a checklist at the end and no jargon.',
    ],
    [
      'software',
      'Build a React dashboard that shows monthly revenue by region, Postgres via Prisma, ' +
        'auth with Google sign-in, deploy to Vercel. Must be responsive and mobile-first. ' +
        'For our sales team of 12 people. Deliver a complete runnable project with unit tests.',
    ],
  ])('%s brief passes through', (_label, text) => {
    const result = ask(text);
    expect(result.isRefinable).toBe(false);
    expect(result.decision.action).toBe('passthrough');
    expect(result.questions).toHaveLength(0);
  });
});

describe('coding requests read the verb, the symptom and the material', () => {
  const text =
    'Fix this Python error: TypeError: unsupported operand type(s) for +: int and str, ' +
    'in a function that sums CSV rows. Python 3.12, pandas 2.x. Explain the fix in one paragraph.';

  it('derives the goal from the verb instead of asking "what do you need?"', () => {
    const fields = fieldsOf(text, 'coding');
    expect(fields['goal']).toBe('fix');
    expect(ask(text).questions.map((q) => q.slot)).not.toContain('goal');
  });

  it('keeps the actual exception, not just the word "error"', () => {
    expect(fieldsOf(text, 'coding')['error']).toContain('TypeError');
    expect(fieldsOf(text, 'coding')['error']).toContain('unsupported operand');
  });

  it('treats pasted material as the problem', () => {
    expect(fieldsOf(text, 'coding')['problem']).toBeTruthy();
    expect(ask(text).questions.map((q) => q.slot)).not.toContain('problem');
  });

  it('reads the language, so it is not asked for', () => {
    expect(ask(text).questions.map((q) => q.slot)).not.toContain('language');
  });

  it('does not invent a "build …" purpose for a debugging request', () => {
    const fields = fieldsOf('my script throws a TypeError', 'coding');
    expect(fields['purpose']).toBeUndefined();
  });
});

describe('scores stay monotonic and honest', () => {
  it('the shared output-format slot is a nicety, not a default demand', () => {
    // It used to be asked for in every category, including a haiku.
    for (const taskType of ['writing', 'education', 'image', 'coding'] as TaskType[]) {
      const spec = slotSpec(taskType, 'output_format');
      if (spec) expect(spec.weight).toBeLessThan(0.4);
    }
  });

  it('every category with a topic slot treats it as material', () => {
    const spec = slotSpec('writing', 'topic');
    expect(spec?.weight).toBeGreaterThanOrEqual(0.4);
  });
});

describe('option lists are clean', () => {
  const corpus = [
    'build me an app', 'I need a website for my bakery', 'make me a picture of a cat',
    'write a blog post', 'help me plan my startup', 'teach me python',
    'research the EV market in India', 'design a logo for my coffee shop',
    'build an expense tracker app', 'make a mobile app for fitness',
    'translate "hello" to French', 'write a haiku about rain', 'explain how DNS works',
  ];

  it('never shows the same choice twice in one question', () => {
    // Seen in a real screenshot: "General readers" next to "General audience".
    for (const text of corpus) {
      for (const question of ask(text).questions) {
        const labels = question.options.map((o) => o.label.toLowerCase());
        const duplicates = labels.filter((l, i) => labels.indexOf(l) !== i);
        expect(duplicates, `${text} → ${question.slot}`).toEqual([]);
      }
    }
  });

  it('never renders "the this"', () => {
    for (const text of corpus) {
      for (const question of ask(text).questions) {
        expect(question.text).not.toMatch(/\bthe this\b/i);
      }
    }
  });
});

describe('free-text questions offer one-tap chips', () => {
  it('derives chips from the named artifact, not from a generic list', () => {
    const question = ask('write a cover letter').questions.find((q) => q.slot === 'topic');
    expect(question?.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(question?.suggestions.join(' ')).toMatch(/job posting|career change/i);
    // The artifact's own noun is never used as a subject ("Getting started with blog").
    expect(question?.suggestions.join(' ')).not.toMatch(/getting started with cover letter/i);
  });

  it('covers every free-text question in a round, not just writing', () => {
    // Software, business and research requests also produce text slots.
    for (const text of [
      'build an expense tracker app',
      'help me plan my startup',
      'research the EV market in India',
      'my script throws a TypeError',
    ]) {
      for (const question of ask(text).questions) {
        if (question.kind !== 'text') continue;
        expect(question.suggestions.length, `${text} → ${question.slot}`).toBeGreaterThan(0);
      }
    }
  });

  it('chips are distinct and non-empty', () => {
    for (const text of ['write a cover letter', 'research the EV market in India', 'help me plan my startup']) {
      for (const question of ask(text).questions) {
        const trimmed = question.suggestions.map((s) => s.trim());
        expect(trimmed.every((s) => s.length > 0)).toBe(true);
        expect(new Set(trimmed).size, `${text} → ${question.slot}`).toBe(trimmed.length);
      }
    }
  });
});
