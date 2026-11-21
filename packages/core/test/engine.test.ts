/**
 * Phase 8 acceptance tests — intelligence engine.
 *
 * These assert behaviour the brief explicitly requires. They are written
 * against public API only (no internals), so they survive refactors.
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeRequest,
  analyzeNext,
  composeFrom,
  evaluatePrompt,
  classifyTask,
  slotLabel,
  type AnalysisResult,
} from '../src/index';

const ask = (text: string, maxQuestions = 4): AnalysisResult => analyzeRequest(text, { maxQuestions });

/** All option labels for a slot, lowercased. */
function optionsFor(result: AnalysisResult, slot: string): string[] {
  const q = result.questions.find((x) => x.slot === slot);
  return (q?.options ?? []).map((o) => o.label.toLowerCase());
}

describe('1. complete prompts pass through', () => {
  it('does not interrupt a fully specified build request', () => {
    const r = ask(
      'Build a React dashboard that shows monthly revenue by region, Postgres via Prisma, ' +
        'auth with Google sign-in, deploy to Vercel. Must be responsive and mobile-first. ' +
        'For our sales team of 12 people. Deliver a complete runnable project with unit tests.',
    );
    expect(r.decision.action).toBe('passthrough');
    expect(r.isRefinable).toBe(false);
    expect(r.questions).toHaveLength(0);
    expect(r.completeness.score).toBeGreaterThanOrEqual(70);
  });

  it('never interrupts factual questions', () => {
    for (const q of [
      'What is the capital of India?',
      'Who won the 2011 cricket world cup?',
      'How do I convert 10 km to miles?',
      'Calculate 17 * 43',
    ]) {
      const r = ask(q);
      expect(r.isRefinable, q).toBe(false);
      expect(r.decision.action).toBe('passthrough');
    }
  });

  it('never interrupts greetings or chit-chat', () => {
    for (const g of ['hi', 'hey there!', 'good morning', 'thanks!', 'namaste']) {
      expect(ask(g).isRefinable, g).toBe(false);
    }
  });

  it('passes through an already-detailed writing brief', () => {
    const r = ask(
      'Write a 1,200 word blog post about sourdough for absolute beginners. ' +
        'Friendly tone, short intro then four sections, in English, with a TL;DR at the top.',
    );
    expect(r.decision.action).toBe('passthrough');
  });
});

describe('2. incomplete prompts trigger clarification', () => {
  it('interrupts the brief’s own example', () => {
    const r = ask('Build me a really cool app.');
    expect(r.decision.action).toBe('clarify');
    expect(r.isRefinable).toBe(true);
    expect(r.questions.length).toBeGreaterThanOrEqual(3);
    expect(r.questions.length).toBeLessThanOrEqual(6);
  });

  it('explains why it interrupted, in plain language', () => {
    const r = ask('Build me a really cool app.');
    expect(r.decision.reasons.length).toBeGreaterThan(0);
    expect(r.decision.reasons.join(' ')).toMatch(/missing|vague|covered|conflict/i);
  });

  it('flags vague wording explicitly', () => {
    const r = ask('I want something for my business, not sure what.');
    expect(r.requirements.ambiguities.length).toBeGreaterThan(0);
    expect(r.isRefinable).toBe(true);
  });

  it('prefers 3–6 questions rather than a long form', () => {
    const r = ask('Build me an expense tracking app', 6);
    expect(r.questions.length).toBeGreaterThanOrEqual(3);
    expect(r.questions.length).toBeLessThanOrEqual(6);
  });
});

describe('3. task classification picks the right schema', () => {
  it('classifies website requests', () => {
    expect(classifyTask('Build a landing page for my SaaS product').taskType).toBe('website');
    expect(ask('I need a website for my bakery').taskType).toBe('website');
  });

  it('classifies mobile requests', () => {
    expect(classifyTask('Build an iOS app for tracking habits').taskType).toBe('mobile');
  });

  it('classifies software, coding, writing, research, image, business, education', () => {
    expect(classifyTask('Build a CLI tool that syncs files').taskType).toBe('software');
    expect(classifyTask('fix this python bug, my script throws a TypeError').taskType).toBe('coding');
    expect(classifyTask('write a blog post about coffee').taskType).toBe('writing');
    expect(classifyTask('compare the best CRMs for small business').taskType).toBe('research');
    expect(classifyTask('generate an image of a cat').taskType).toBe('image');
    expect(classifyTask('write a go-to-market plan for my startup').taskType).toBe('business');
    expect(classifyTask('teach me calculus from scratch').taskType).toBe('education');
  });

  it('routes a generic "build an app" to the software schema, not general', () => {
    expect(classifyTask('Build me a really cool app.').taskType).toBe('software');
  });
});

describe('4. website prompts generate website-specific questions', () => {
  const r = ask('I need a website for my bakery');

  it('asks about website dimensions', () => {
    const slots = r.questions.map((q) => q.slot);
    expect(slots).toEqual(expect.arrayContaining(['features', 'pages']));
  });

  it('never asks image or coding-only questions', () => {
    const slots = r.questions.map((q) => q.slot);
    for (const banned of ['aspect_ratio', 'lighting', 'style', 'mobile_os', 'error']) {
      expect(slots).not.toContain(banned);
    }
  });

  it('offers website-ish options for pages', () => {
    expect(optionsFor(r, 'pages')).toEqual(expect.arrayContaining(['home', 'contact']));
  });
});

describe('5. coding prompts generate coding-specific questions', () => {
  const r = ask('my python script throws a TypeError when I read the csv');

  it('asks what kind of help is needed', () => {
    expect(r.taskType).toBe('coding');
    expect(r.questions.map((q) => q.slot)).toContain('goal');
  });

  it('does not ask about authentication or pages', () => {
    const slots = r.questions.map((q) => q.slot);
    expect(slots).not.toContain('auth');
    expect(slots).not.toContain('pages');
  });
});

describe('6. image prompts generate image-specific questions', () => {
  const r = ask('make me a picture of a cat');

  it('recognises the subject', () => {
    expect(r.taskType).toBe('image');
    expect(r.requirements.subject).toBe('cat');
  });

  it('asks about style, composition and aspect ratio — not pages or auth', () => {
    const slots = r.questions.map((q) => q.slot);
    expect(slots).toContain('style');
    expect(slots).not.toContain('pages');
    expect(slots).not.toContain('auth');
    expect(slots).not.toContain('backend');
  });
});

describe('7. already-provided requirements are not asked again', () => {
  it('skips every slot the prompt already answers', () => {
    const r = ask(
      'Build a Next.js website for my bakery with a contact form, for local customers, ' +
        'minimal design, deployed on Vercel.',
    );
    const slots = r.questions.map((q) => q.slot);
    expect(slots).not.toContain('tech_stack');
    expect(slots).not.toContain('audience');
    expect(slots).not.toContain('design_direction');
    expect(slots).not.toContain('deployment');
  });

  it('does not ask for the language when a framework implies it', () => {
    const r = ask('build a Next.js app that tracks my reading list');
    expect(r.questions.map((q) => q.slot)).not.toContain('language');
  });

  it('records evidence for every detected field', () => {
    const r = ask('Write a 500 word blog post in Hindi with a formal tone');
    for (const field of r.requirements.detected) {
      expect(field.evidence.length).toBeGreaterThan(0);
    }
  });
});

describe('8. questions are contextual, not generic', () => {
  it('names the user’s own subject in the question text', () => {
    const r = ask('Build me an expense tracking app');
    const features = r.questions.find((q) => q.slot === 'features');
    expect(features?.text.toLowerCase()).toContain('expense tracking app');
  });

  it('offers domain-appropriate options instead of fixed ones', () => {
    const r = ask('Build me an expense tracking app');
    const options = optionsFor(r, 'features');
    expect(options).toEqual(
      expect.arrayContaining(['monthly spending analytics', 'budget limits and alerts', 'receipt scanning']),
    );
  });

  it('offers an aggregate option only where it makes sense', () => {
    const multi = ask('Build me an expense tracking app');
    expect(optionsFor(multi, 'features')).toContain('all of these');
    const single = ask('make me a picture of a cat');
    // "All of these" on a single-choice visual style would be nonsense.
    expect(optionsFor(single, 'style')).not.toContain('all of these');
  });

  it('always allows a custom answer on multiple choice', () => {
    const r = ask('Build me an expense tracking app');
    for (const q of r.questions.filter((x) => x.kind !== 'text')) {
      expect(q.allowCustom, q.slot).toBe(true);
    }
  });

  it('marks optional questions as skippable', () => {
    const r = ask('write a blog post about coffee', 6);
    expect(r.questions.some((q) => q.optional)).toBe(true);
  });

  it('gives every question a human label', () => {
    const r = ask('Build me an expense tracking app');
    for (const q of r.questions) {
      expect(slotLabel(r.taskType, q.slot).length).toBeGreaterThan(2);
      expect(q.text.endsWith('?')).toBe(true);
    }
  });
});

describe('9. answers adapt subsequent questions', () => {
  it('stops asking what the answers resolved, and moves on', () => {
    const first = ask('Build me an expense tracking app');
    const firstSlots = first.questions.map((q) => q.slot);

    const answers = {
      features: ['Monthly spending analytics', 'Budget limits and alerts'],
      platform: 'web browser',
      language: 'typescript',
    };
    const second = analyzeNext(first, answers);
    const secondSlots = second.questions.map((q) => q.slot);

    // Answered slots must not come back.
    for (const slot of Object.keys(answers)) {
      expect(secondSlots).not.toContain(slot);
    }
    // And the round must contain new ground to cover.
    expect(secondSlots.some((s) => !firstSlots.includes(s)) || secondSlots.length === 0).toBe(true);
  });

  it('raises completeness monotonically as answers arrive', () => {
    const r = ask('Build me an expense tracking app');
    const before = r.completeness.score;
    const after = composeFrom(r, {
      features: ['Monthly spending analytics'],
      platform: 'web browser',
      language: 'typescript',
      constraints: ['Must run offline'],
    }).completeness.score;
    expect(after).toBeGreaterThan(before);
  });

  it('asks a conditioned follow-up only once its trigger is answered', () => {
    const r = ask('Build me a website for my bakery');
    expect(r.questions.map((q) => q.slot)).not.toContain('auth');

    const next = analyzeNext(r, { backend: 'yes — dynamic data and a database' });
    const slots = next.questions.map((q) => q.slot);
    expect(slots.includes('auth') || slots.includes('database')).toBe(true);
  });

  it('never repeats a question id within a round', () => {
    const r = ask('Build me a really cool app.', 6);
    const slots = r.questions.map((q) => q.slot);
    expect(new Set(slots).size).toBe(slots.length);
  });
});

describe('10. final prompt contains the collected requirements', () => {
  it('carries every answer into the prompt', () => {
    const r = ask('Build me an expense tracking app');
    const answers = {
      features: ['Monthly spending analytics', 'Budget limits and alerts', 'Receipt scanning'],
      platform: 'web browser',
      audience: 'my household or family',
      constraints: ['Must run offline'],
    };
    const out = composeFrom(r, answers);

    expect(out.prompt).toContain('Monthly spending analytics');
    expect(out.prompt).toContain('Budget limits and alerts');
    expect(out.prompt).toContain('Receipt scanning');
    expect(out.prompt).toContain('web browser');
    expect(out.prompt).toContain('Must run offline');
  });

  it('preserves the user’s original wording verbatim', () => {
    const original = 'Build me an expense tracking app';
    const out = composeFrom(ask(original), { platform: 'web browser' });
    expect(out.prompt).toContain(`“${original}”`);
  });

  it('states a precedence rule so the original always wins', () => {
    const out = composeFrom(ask('Build me an app'), { platform: 'web browser' });
    expect(out.prompt.toLowerCase()).toContain('original request wins');
  });

  it('reports residual gaps so the review screen can warn', () => {
    const out = composeFrom(ask('Build me an app'), { platform: 'web browser' });
    expect(Array.isArray(out.residualGaps)).toBe(true);
    expect(out.residualGaps.every((g) => typeof g.slot === 'string')).toBe(true);
  });

  it('describes what changed in human terms', () => {
    const out = composeFrom(ask('Build me an app'), { platform: 'web browser' });
    expect(out.changes.length).toBeGreaterThan(0);
    expect(out.changes[0]).toMatch(/platform/i);
  });
});

describe('11. the user’s original message is never lost', () => {
  it('keeps the original on the result object', () => {
    const text = 'Build me a  really   cool app.';
    const r = ask(text);
    expect(r.original).toBe('Build me a really cool app.');
  });

  it('keeps the original even when no answers are given', () => {
    const r = ask('Build me a really cool app.');
    const out = composeFrom(r, {});
    expect(out.prompt).toContain('Build me a really cool app.');
    expect(out.changes[0]).toMatch(/original/i);
  });

  it('survives very long input without truncating the brief', () => {
    const long = `Build a tool. ${'It must be reliable. '.repeat(120)}`;
    const r = ask(long);
    expect(r.original.length).toBeGreaterThan(2000);
  });
});

describe('12. conflicts and ambiguity', () => {
  it('detects contradictory instructions and asks one question to resolve them', () => {
    const r = ask('Write a short, concise summary that is also a comprehensive in-depth report.');
    expect(r.requirements.conflicts.length).toBeGreaterThan(0);
    if (r.isRefinable) {
      expect(r.questions[0]?.slot).toMatch(/^conflict_/);
    }
  });

  it('detects backend/auth contradiction', () => {
    const r = ask('Build a website with no backend but users can log in and save data.');
    expect(r.requirements.conflicts.some((c) => c.id === 'no-backend-vs-login')).toBe(true);
  });
});

describe('13. completeness scoring is meaningful', () => {
  it('scores vague and specific prompts differently', () => {
    const vague = evaluatePrompt('Build me a really cool app.').completeness.score;
    const specific = evaluatePrompt(
      'Build a Next.js expense tracker for a family of four. ' +
        'Features: monthly analytics, budget alerts, receipt scanning. ' +
        'Postgres via Prisma, Google sign-in, deploy to Vercel. ' +
        'Deliver a complete runnable project with unit tests.',
    ).completeness.score;
    expect(specific).toBeGreaterThan(vague + 30);
  });

  it('exposes per-facet detail with notes', () => {
    const c = evaluatePrompt('Build me an expense tracking app').completeness;
    expect(Object.keys(c.facets).sort()).toEqual(
      ['audience', 'constraints', 'functional', 'intentClarity', 'output', 'scope', 'technical'].sort(),
    );
    for (const facet of Object.values(c.facets)) {
      expect(facet.score).toBeGreaterThanOrEqual(0);
      expect(facet.score).toBeLessThanOrEqual(100);
      expect(typeof facet.note).toBe('string');
    }
  });

  it('keeps score inside 0–100 for pathological input', () => {
    for (const text of ['a', '???', 'build '.repeat(400), 'BUILD AN APP NOW WITH EVERYTHING']) {
      const c = evaluatePrompt(text).completeness;
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });
});

describe('14. robustness', () => {
  it('never throws on empty or junk input', () => {
    for (const text of ['', ' ', '\n\n', '????', '🚀🚀🚀', 'a'.repeat(5000)]) {
      expect(() => analyzeRequest(text)).not.toThrow();
    }
  });

  it('produces a stable, serialisable result', () => {
    const r = analyzeRequest('Build me an expense tracking app', { id: 'fixed-id' });
    expect(r.id).toBe('fixed-id');
    expect(() => JSON.stringify(r)).not.toThrow();
  });

  it('is deterministic for the same input', () => {
    const a = analyzeRequest('write a blog post about coffee', { id: 'x' });
    const b = analyzeRequest('write a blog post about coffee', { id: 'x' });
    expect(JSON.stringify(a.questions)).toBe(JSON.stringify(b.questions));
  });

  it('handles non-English input without crashing', () => {
    for (const text of ['मुझे एक वेबसाइट बनाओ', '给我做一个网站', 'اعطني موقع']) {
      expect(() => analyzeRequest(text)).not.toThrow();
    }
  });
});
