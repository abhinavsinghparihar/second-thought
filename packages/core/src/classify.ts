/**
 * Task classifier.
 *
 * Robustness note (learned from the original engine): scores are **additive
 * weighted evidence**, never a single regex hit. A weak signal ("explain")
 * can never beat a strong one ("build a React dashboard"), and a prompt with
 * no evidence at all falls back to `general` instead of picking whichever
 * category happened to be checked first.
 */

import type { TaskClassification, TaskType } from './types';

interface Signal {
  id: string;
  re: RegExp;
  weight: number;
}

export const TASK_TYPES: TaskType[] = [
  'software',
  'website',
  'mobile',
  'coding',
  'writing',
  'research',
  'image',
  'business',
  'education',
  'general',
];

const SIGNALS: Record<Exclude<TaskType, 'general'>, Signal[]> = {
  website: [
    { id: 'site-build', re: /\b(build|create|make|design|develop|redesign|rework|launch)\b[^.?!]{0,40}\b(website|web ?site|landing page|homepage|web ?page|portfolio site|marketing site|blog site|store|shop|e-?commerce site|web ?app)\b/i, weight: 3.6 },
    { id: 'site-noun', re: /\b(landing page|homepage|webshop|web site|website|webapp|web app|saas site)\b/i, weight: 1.8 },
    { id: 'site-tech', re: /\b(next\.?js|nuxt|astro|gatsby|wordpress|shopify|webflow|framer|tailwind|html|css)\b/i, weight: 0.9 },
    { id: 'site-hindi', re: /\b(website|site|web ?page)\b[^.?!]{0,24}\b(banao|bana do|banana hai|banani hai|chahiye)\b/i, weight: 3.2 },
    { id: 'site-seo', re: /\b(seo|responsive|pages?|navigation|hero section|footer|cta|forms?)\b/i, weight: 0.7 },
  ],
  mobile: [
    { id: 'mobile-build', re: /\b(build|create|make|develop|design)\b[^.?!]{0,40}\b(android|ios|iphone|ipad|mobile ?app|mobile application|flutter|react native|swiftui|kotlin)\b/i, weight: 3.8 },
    { id: 'mobile-noun', re: /\b(android app|ios app|iphone app|mobile app|mobile application|react native|flutter app|swiftui|jetpack compose)\b/i, weight: 2.2 },
    { id: 'mobile-store', re: /\b(app store|play store|apk|testflight|push notifications?)\b/i, weight: 1.4 },
    { id: 'mobile-hindi', re: /\b(android|ios|mobile)\b[^.?!]{0,24}\b(app|application)\b[^.?!]{0,18}\b(banao|bana do|banana hai|chahiye)\b/i, weight: 3.2 },
  ],
  software: [
    { id: 'sw-app-build', re: /\b(?:build|make|create|develop|design|ship|launch)\b[^.?!]{0,40}\b(app|application|tool|platform|dashboard|system|product)\b/i, weight: 2.8 },
    { id: 'sw-build', re: /\b(build|develop|create|make|implement|architect|ship|write)\b[^.?!]{0,44}\b(api|backend|back-end|microservice|service|cli|library|sdk|plugin|extension|bot|daemon|pipeline|database|schema|system|platform|dashboard|tool)\b/i, weight: 3.2 },
    { id: 'sw-noun', re: /\b(backend|back-end|microservice|rest api|graphql|sdk|library|command[- ]line|cli tool|chrome extension|browser extension|bot|cron job|etl|webhook)\b/i, weight: 2.0 },
    { id: 'sw-arch', re: /\b(architecture|refactor|scalab\w+|concurren\w+|queue|worker|cache|deploy|docker|kubernetes|ci\/cd|unit tests?)\b/i, weight: 1.3 },
    { id: 'sw-automation', re: /\b(automate|automation|script|scraper|crawler|integration|sync)\b/i, weight: 1.0 },
  ],
  coding: [
    { id: 'code-debug', re: /\b(debug|fix|why (does|is|do)|not working|throws? (an? )?(error|exception)|stack ?trace|traceback|error message|fails?|crash\w*|broken)\b/i, weight: 3.0 },
    { id: 'code-language', re: /\b(python|javascript|typescript|java|kotlin|swift|golang|rust|c\+\+|c#|php|ruby|scala|dart|sql|bash|powershell|r)\b/i, weight: 1.6 },
    { id: 'code-explain', re: /\b(explain (this|the) (code|function|error|regex)|what does (this|the) (code|function)|time complexity|big[- ]o|refactor|optimi[sz]e|unit test|regex for|parse this)\b/i, weight: 2.6 },
    { id: 'code-snippet', re: /```|^\s*(import|const|let|function|def|class|public|private|#include|package)\b/m, weight: 2.4 },
    { id: 'code-leetcode', re: /\b(algorithm|data structure|leetcode|dynamic programming|recursion|sorting|binary search)\b/i, weight: 1.8 },
  ],
  writing: [
    { id: 'write-content', re: /\b(write|draft|compose|rewrite|edit|proofread|polish|summari[sz]e|paraphrase)\b[^.?!]{0,44}\b(article|blog|blog post|essay|story|poem|post|linkedin post|caption|copy|newsletter|script|speech|bio|review|guide|documentation|readme|thesis|paragraph|email|e-?mail|letter|cover letter|press release|case study|whitepaper|proposal|report)\b/i, weight: 3.4 },
    { id: 'write-noun', re: /\b(blog post|linkedin post|cover letter|press release|case study|whitepaper|newsletter|product description|landing copy|ad copy|tagline|readme|documentation|docstring|changelog)\b/i, weight: 2.0 },
    { id: 'write-hindi', re: /\b(blog|article|email|e-?mail|letter|essay|caption|poem|story|post)\b[^.?!]{0,24}\b(likho|likh do|likhna hai|banao|bana do|chahiye)\b/i, weight: 3.2 },
    { id: 'write-docs', re: /\b(api ?docs?|documentation|docstrings?|technical writing|style guide|release notes)\b/i, weight: 2.2 },
    { id: 'write-tone', re: /\b(tone|voice|audience|headline|hook|intro|outro)\b/i, weight: 0.5 },
    // Short creative forms are writing requests even without "write <noun>"
    // adjacency: "write a haiku about rain", "a limerick for my brother".
    { id: 'write-form', re: /\b(haiku|limerick|sonnet|ode|acrostic|taglines?|slogan|blurb|bios?|poem|poetry|verse|rhyme|jingle|pitch|toast|eulogy|vows?)\b/i, weight: 2.6 },
    // Translation is a writing task with its own constraints (source, target,
    // register); left as `general` it produced generic goal/context questions.
    { id: 'write-translate', re: /\b(translate|translation|localise|localize|transliterate)\b/i, weight: 3.0 },
  ],
  research: [
    { id: 'research-verbs', re: /\b(research|investigate|analy[sz]e|compare|evaluate|assess|benchmark|survey)\b[^.?!]{0,54}\b(options|tools|products|vendors|market|competitors|alternatives|trends|landscape|literature|papers|evidence|providers|platforms|solutions|services|frameworks|pricing)\b/i, weight: 3.4 },
    { id: 'research-compare', re: /\b(pros and cons|trade-?offs?|versus|vs\.?|comparison|which (one )?is better|recommend a|best \w+ for)\b/i, weight: 2.2 },
    { id: 'research-market', re: /\b(market (research|analysis|size|trends?)|state of|industry report|competitive analysis|due diligence)\b/i, weight: 2.6 },
    { id: 'research-sources', re: /\b(sources?|citations?|references|peer[- ]reviewed|studies|papers|data on)\b/i, weight: 1.6 },
  ],
  image: [
    { id: 'image-verbs', re: /\b(generate|create|draw|design|make|render|illustrate|paint|sketch)\b[^.?!]{0,32}\b(image|picture|photo|illustration|logo|icon|poster|banner|artwork|avatar|wallpaper|mockup|sketch|painting|thumbnail|scene|portrait|sticker|badge)\b/i, weight: 3.4 },
    { id: 'image-noun', re: /\b(logo|icon|poster|banner|avatar|wallpaper|thumbnail|illustration|photorealistic|watercolour|watercolor|pixel art|3d render|oil painting|line art|flat design|isometric|cinematic)\b/i, weight: 2.2 },
    { id: 'image-tool', re: /\b(midjourney|dall-?e|stable diffusion|flux|sdxl|imagen|nano banana)\b/i, weight: 1.8 },
    { id: 'image-camera', re: /\b(camera angle|shallow depth of field|bokeh|wide shot|close-?up|golden hour|aspect ratio|16:9|9:16|1:1)\b/i, weight: 1.4 },
  ],
  business: [
    { id: 'biz-plan', re: /\b(business plan|go[- ]to[- ]market|gtm|monetis\w+|monetiz\w+|pricing strategy|revenue model|business model|pitch deck|investor deck)\b/i, weight: 3.4 },
    { id: 'biz-strategy', re: /\b(strategy|strategic|launch plan|growth plan|roadmap|positioning|value proposition|target market|customer segment)\b/i, weight: 2.2 },
    { id: 'biz-finance', re: /\b(revenue|profit|margin|burn rate|runway|forecast|break[- ]even|arr|mrr|cac|ltv)\b/i, weight: 1.8 },
    { id: 'biz-startup', re: /\b(startup|saas business|company|venture|fundrais\w+|seed round|investors?)\b/i, weight: 1.2 },
  ],
  education: [
    // "explain X" and "teach me X" are teaching requests. Bare "what is X" /
    // "how does X work" stay low-weight: those are usually lookups and the
    // direct-question pass-through should win, not a clarification form.
    { id: 'edu-teach', re: /\b(explain|teach me|help me understand|walk me through|eli5|explain like i'?m|break down how)\b/i, weight: 2.4 },
    { id: 'edu-lookup', re: /\b(what is|what are|how does|how do|why does|why is|difference between|meaning of|define)\b/i, weight: 1.2 },
    { id: 'edu-plan', re: /\b(learn|study|master|practice|course|curriculum|tutorial|roadmap to learn|from scratch|beginner|syllabus|revision)\b/i, weight: 2.0 },
    { id: 'edu-exam', re: /\b(exam|test prep|interview prep|questions to practice|homework|assignment|lesson plan)\b/i, weight: 2.4 },
  ],
};

/** Generic "produce an artifact" verb — boosts an already-detected category. */
const BUILD_VERB = /\b(build|create|make|develop|design|write|generate|implement|draft|plan)\b/i;

export interface ClassifyOptions {
  /** The prompt is a follow-up inside a coding/product conversation. */
  prefersTechnical?: boolean;
}

export function classifyTask(text: string, options: ClassifyOptions = {}): TaskClassification {
  const t = squashForMatch(text);
  const scores = new Map<TaskType, number>();
  const signals: string[] = [];

  for (const [taskType, list] of Object.entries(SIGNALS) as Array<[TaskType, Signal[]]>) {
    let score = 0;
    for (const signal of list) {
      if (signal.re.test(t)) {
        score += signal.weight;
        signals.push(signal.id);
      }
    }
    if (score > 0) scores.set(taskType, score);
  }

  if (scores.size === 0) {
    return { taskType: 'general', confidence: 0.2, signals: [] as string[] };
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0]));
  const [winner, topScore] = ranked[0]!;
  const runnerUp = ranked[1]?.[1] ?? 0;

  // Disambiguation rules that preserve real-world meaning.
  let taskType = winner;
  const has = (id: string) => signals.includes(id);

  // "build an app with React Native" is mobile, not website, even though
  // generic build signals fire for both.
  if (taskType === 'website' && (has('mobile-build') || has('mobile-noun'))) taskType = 'mobile';
  if (taskType === 'software' && (has('site-build') || has('site-noun')) && !has('sw-noun')) taskType = 'website';
  if (taskType === 'software' && has('mobile-build')) taskType = 'mobile';
  // A website that needs a backend stays a website task: the website schema
  // already asks about backend/database/auth, which keeps questions relevant.
  if (taskType === 'coding' && (has('site-build') || has('mobile-build') || has('sw-build'))) {
    taskType = has('mobile-build') ? 'mobile' : has('site-build') ? 'website' : 'software';
  }
  if (taskType === 'general' && options.prefersTechnical) taskType = 'coding';

  // A build request for a generic "app"/"tool"/"platform" with no platform
  // evidence is a software request. Without this, the single most common
  // prompt of all ("build me an app") fell through to the generic schema.
  if (taskType === 'general' && has('sw-app-build') && !has('mobile-build') && !has('site-build')) {
    taskType = 'software';
  }

  const margin = topScore - runnerUp;
  const confidence = clamp01(0.35 + Math.min(1, topScore / 6) * 0.4 + Math.min(1, margin / 4) * 0.25);

  return {
    taskType,
    confidence: round2(confidence),
    signals: signals.filter((s) => s !== ''),
  };
}

export const TASK_LABELS: Record<TaskType, string> = {
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

export function taskLabel(taskType: TaskType): string {
  return TASK_LABELS[taskType] ?? TASK_LABELS.general;
}

/** Compact label for tight UI (the panel header chip). */
export const TASK_SHORT_LABELS: Record<TaskType, string> = {
  software: 'Software',
  website: 'Website',
  mobile: 'Mobile app',
  coding: 'Coding',
  writing: 'Writing',
  research: 'Research',
  image: 'Image',
  business: 'Business',
  education: 'Learning',
  general: 'General',
};

export function taskShortLabel(taskType: TaskType): string {
  return TASK_SHORT_LABELS[taskType] ?? TASK_SHORT_LABELS.general;
}

function squashForMatch(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function rank(taskType: TaskType): number {
  return TASK_TYPES.indexOf(taskType);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
