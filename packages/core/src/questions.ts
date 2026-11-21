/**
 * Contextual question synthesis.
 *
 * The original engine had a fixed bank of 34 questions with constant option
 * lists, so it could only ever ask "What should this run on? · web | android
 * | ios | desktop". This module replaces that: a question is composed at run
 * time from
 *
 *   1. the missing slot (and why it matters),
 *   2. the user's own subject and domain ("expense tracking app"),
 *   3. information already extracted, and
 *   4. the answers given so far this session.
 *
 * Every multiple-choice question gets concrete, domain-appropriate options plus
 * an aggregate "All of these" where that is meaningful, and always allows a
 * custom answer.
 */

import type { Question, QuestionOption, SlotSpec, SubjectInfo, TaskType } from './types';
import { slotLabel } from './schema';
import { bare, capitalize, joinNatural } from './text';

export interface QuestionContext {
  taskType: TaskType;
  subject: SubjectInfo;
  /** Already-known requirement values. */
  fields: Record<string, string | string[]>;
  /** Answers collected so far (earlier rounds). */
  answers: Record<string, string | string[]>;
  /** Resolved question values, so option lists can depend on them. */
  resolved: Record<string, string | string[]>;
}

interface BankEntry {
  /** Question text. `{subject}`/`{domain}`/`{category}`/`{topic}`/`{deliverable}` interpolate. */
  text: string;
  /** Override the schema kind (e.g. force a free-text answer). */
  kind?: SlotSpec['kind'];
  /** Force the question to be skippable. */
  optional?: boolean;
  options?: string[];
  /** Options that only make sense in certain contexts. */
  conditionalOptions?: (ctx: QuestionContext) => string[];
  hint?: string;
  rationale?: string;
  /** Skip this question entirely for the given context. */
  skip?: (ctx: QuestionContext) => boolean;
}

// ── domain packs: option lists that know what is being built ────────────────

interface DomainPack {
  id: string;
  match: RegExp;
  /** Feature options specific to the domain. */
  features?: string[];
  /** Purpose options. */
  purpose?: string[];
  /** Page options for websites. */
  pages?: string[];
  /** Audience options. */
  audience?: string[];
  /** Subject phrase cleaning. */
  label?: string;
  /**
   * Any other slot → suggested options. Kept open so a pack can supply chips
   * for a text slot without a new interface per slot.
   */
  [slot: string]: string | string[] | RegExp | undefined;
}

const DOMAIN_PACKS: DomainPack[] = [
  {
    id: 'finance-tracking',
    match: /\b(expense|spending|budget|finance|financial|money|wallet|invoice|billing|accounting|tax|payroll|salary|savings?|investment)\b/i,
    label: 'finance',
    features: [
      'Monthly spending analytics',
      'Budget limits and alerts',
      'Receipt scanning',
      'Category-wise expense tracking',
      'Shared or family accounts',
      'Export to CSV or spreadsheets',
    ],
    purpose: [
      'Track where my money goes',
      'Stay inside a monthly budget',
      'Split costs with other people',
      'Prepare records for tax or accounts',
    ],
    pages: ['Dashboard', 'Transactions list', 'Add expense', 'Reports', 'Settings'],
    audience: ['Just me', 'My household or family', 'A small team', 'Freelance clients'],
  },
  {
    id: 'commerce',
    match: /\b(shop|store|storefront|e-?commerce|marketplace|checkout|cart|product catalogue|product catalog|retail|merch)\b/i,
    label: 'store',
    features: [
      'Product catalogue with search and filters',
      'Cart and checkout',
      'Payment gateway integration',
      'Order tracking for customers',
      'Admin panel for inventory',
      'Discount codes and coupons',
    ],
    purpose: ['Sell products online', 'Show a catalogue and take enquiries', 'Manage orders and inventory'],
    pages: ['Home', 'Product listing', 'Product detail', 'Cart', 'Checkout', 'Order confirmation'],
    audience: ['Direct consumers', 'Small businesses', 'Wholesale buyers'],
  },
  {
    id: 'content-blog',
    match: /\b(blog|magazine|news|publication|newsletter|articles?|cms|content site|docs site|documentation site|wiki)\b/i,
    label: 'publication',
    features: [
      'Article editor with drafts',
      'Categories and tags',
      'Search',
      'Email newsletter signup',
      'Comments',
      'Author profiles',
    ],
    purpose: ['Publish regular articles', 'Share documentation', 'Build an audience'],
    pages: ['Home', 'Article page', 'Category archive', 'About', 'Search results', 'Subscribe'],
    audience: ['General readers', 'Professionals in the field', 'Existing customers'],
  },
  {
    id: 'booking',
    match: /\b(booking|reservation|appointment|scheduling|hotel|restaurant table|salon|clinic|tickets?)\b/i,
    label: 'booking',
    features: [
      'Availability calendar',
      'Booking and cancellation flow',
      'Email or SMS confirmations',
      'Payment or deposit collection',
      'Staff or resource management',
      'Admin view of all bookings',
    ],
    purpose: ['Let customers book online', 'Reduce phone bookings', 'Manage staff schedules'],
    pages: ['Home', 'Availability / calendar', 'Booking form', 'Confirmation', 'My bookings', 'Admin'],
    audience: ['Customers booking online', 'Staff managing bookings'],
  },
  {
    id: 'productivity',
    match: /\b(todo|to-do|task|note|notes|habit|journal|productivity|reminder|planner|kanban|project management|time tracking)\b/i,
    label: 'tracker',
    features: [
      'Create and organise items',
      'Due dates and reminders',
      'Tags or categories',
      'Progress and streak tracking',
      'Search and filters',
      'Sync across devices',
    ],
    purpose: ['Keep myself organised', 'Share with a team', 'Build a daily habit'],
    pages: ['Today', 'All items', 'Item detail', 'Stats', 'Settings'],
    audience: ['Just me', 'A small team', 'Students'],
  },
  {
    id: 'social',
    match: /\b(social|feed|chat|messaging|community|forum|dating|friends|followers|posts? app|comments?)\b/i,
    label: 'social app',
    features: [
      'Profiles',
      'Posts and a feed',
      'Likes and comments',
      'Direct messages',
      'Follow / friend requests',
      'Notifications',
    ],
    purpose: ['Connect people around a topic', 'Let users share updates', 'Build a community'],
    pages: ['Feed', 'Profile', 'Post detail', 'Messages', 'Notifications'],
    audience: ['Early adopters', 'A specific community'],
  },
  {
    id: 'health-fitness',
    match: /\b(fitness|workout|gym|health|calorie|diet|nutrition|sleep|meditation|yoga|running|step)\b/i,
    label: 'fitness app',
    features: [
      'Workout logging',
      'Progress charts',
      'Goal setting',
      'Reminders',
      'Exercise library',
      'Apple Health / Google Fit sync',
    ],
    purpose: ['Track workouts consistently', 'Hit a specific fitness goal', 'Follow a plan'],
    audience: ['Beginners', 'Regular gym-goers', 'Personal trainers'],
  },
  {
    id: 'learning',
    match: /\b(learn|course|lms|study|quiz|flashcard|tutor|school|student|exam|language learning)\b/i,
    label: 'learning app',
    features: [
      'Lessons or course modules',
      'Quizzes and progress tracking',
      'Spaced-repetition review',
      'Streaks and achievements',
      'Instructor or admin content management',
      'Certificates',
    ],
    purpose: ['Teach a skill step by step', 'Help students revise', 'Deliver a course'],
    audience: ['Beginner learners', 'Students preparing for exams', 'Professionals upskilling'],
  },
  {
    id: 'ai-tools',
    match: /\b(ai|llm|gpt|chatbot|assistant|agent|prompt|rag|embedding|summari[sz]er)\b/i,
    label: 'AI tool',
    features: [
      'Prompt input and streaming output',
      'Saved history or sessions',
      'Custom system instructions',
      'File or document upload',
      'Multiple models to choose from',
      'Export results',
    ],
    purpose: ['Automate a repetitive task', 'Help users write better prompts', 'Answer questions over my documents'],
    audience: ['Just me', 'My team', 'Public users'],
  },
  {
    id: 'dashboard',
    match: /\b(dashboard|analytics|metrics|kpi|reporting|monitor|admin panel|crm|erp)\b/i,
    label: 'dashboard',
    features: [
      'Charts and KPI cards',
      'Filterable data table',
      'Date-range comparison',
      'CSV / Excel export',
      'Scheduled email reports',
      'Role-based access',
    ],
    purpose: ['See performance at a glance', 'Replace a manual spreadsheet', 'Share reports with stakeholders'],
    pages: ['Overview', 'Detail view', 'Filters', 'Export', 'Settings'],
    audience: ['My team', 'Management', 'External clients'],
  },
  {
    id: 'portfolio',
    match: /\b(portfolio|personal (?:site|website)|resume site|cv site|freelance site|agency site)\b/i,
    label: 'portfolio',
    features: [
      'Project gallery with case studies',
      'About page with bio',
      'Contact form',
      'Testimonials',
      'Blog or writing section',
      'Downloadable CV',
    ],
    purpose: ['Win freelance clients', 'Apply for jobs', 'Showcase my work'],
    pages: ['Home', 'Work / projects', 'About', 'Contact'],
    audience: ['Potential clients', 'Recruiters', 'Peers in my field'],
  },
];

export function matchDomainPacks(ctx: QuestionContext): DomainPack[] {
  const haystack = `${ctx.subject.subject} ${ctx.subject.domain} ${String(ctx.fields['purpose'] ?? '')} ${String(ctx.fields['topic'] ?? '')} ${String(ctx.fields['goal'] ?? '')}`;
  return DOMAIN_PACKS.filter((p) => p.match.test(haystack));
}

// ── question banks ──────────────────────────────────────────────────────────

const ALL_OF_THESE = 'All of these';
const ALL_VALUE = '__all__';

function withAggregate(options: string[], allowAggregate: boolean): QuestionOption[] {
  const cleaned = dedupe(options).filter((o) => o.trim() !== '');
  const opts: QuestionOption[] = cleaned.map((label) => ({ value: toValue(label), label }));
  // "All of these" is only meaningful for multi-select questions (features,
  // pages, sources...). Offering it on "What length?" or "Which platform?"
  // would be nonsense.
  if (allowAggregate && cleaned.length >= 3) {
    opts.push({ value: ALL_VALUE, label: ALL_OF_THESE, aggregate: true });
  }
  return opts;
}

function toValue(label: string): string {
  return label
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

/** Interpolate the user's own vocabulary into question text. */
export function interpolate(template: string, ctx: QuestionContext): string {
  const subject = ctx.subject.subject || ctx.subject.category || 'this';
  const domain = ctx.subject.domain || ctx.subject.subject;
  const topic = textOf(ctx.resolved['topic']) || textOf(ctx.resolved['goal']) || domain;
  // "deliverable" means the artifact the user asked for. `content_type`
  // ("blog post") and the extracted subject are better sources than the
  // output-format slot, which is usually empty at question time.
  const deliverable =
    textOf(ctx.resolved['content_type']) ||
    textOf(ctx.resolved['output_shape']) ||
    textOf(ctx.resolved['output_format']) ||
    ctx.subject.subject;
  return template
    .replace(/\{subject\}/g, subject)
    .replace(/\{domain\}/g, domain || 'this')
    .replace(/\{category\}/g, ctx.subject.category || 'project')
    .replace(/\{topic\}/g, topic || 'this topic')
    .replace(/\{deliverable\}/g, deliverable || 'output')
    // "the this" is the one grammatical hole the fallback subject can open.
    .replace(/\bthe this\b/gi, 'this')
    .replace(/\bthis this\b/gi, 'this')
    .replace(/\s+/g, ' ')
    .trim();
}

function textOf(value: string | string[] | undefined): string {
  if (value === undefined) return '';
  return Array.isArray(value) ? value[0] ?? '' : value;
}

/**
 * Per-slot question definitions. Keyed `taskType.slot` first, then `slot`.
 * `{subject}` is the strongest personalisation hook available.
 */
const BANKS: Record<string, BankEntry> = {
  // ── website ───────────────────────────────────────────────────────────────
  'website.purpose': {
    text: 'What is the {subject} mainly for?',
    options: [
      'Generate leads or enquiries',
      'Sell products or services',
      'Showcase work or a portfolio',
      'Publish content regularly',
      'Provide a tool or app to users',
    ],
    rationale: 'Purpose decides structure, copy and calls to action.',
  },
  'website.site_type': {
    text: 'What kind of site should this be?',
    options: [
      'Single-page landing page',
      'Multi-page marketing site',
      'Blog or content site',
      'Online store',
      'Web app with user accounts',
      'Documentation site',
    ],
    skip: (ctx) => Boolean(ctx.resolved['purpose']),
    rationale: 'The shape of the site follows from its type.',
  },
  'website.audience': {
    text: 'Who is the {subject} for?',
    options: ['General consumers', 'Small businesses', 'Enterprise buyers', 'Other developers', 'A niche community'],
    rationale: 'Audience sets vocabulary, pricing framing and depth.',
  },
  'website.pages': {
    text: 'Which pages should the {subject} include?',
    options: ['Home', 'About', 'Services or features', 'Pricing', 'Contact', 'Blog'],
    rationale: 'Page list fixes the scope of the build.',
  },
  'website.design_direction': {
    text: 'What design direction fits?',
    options: [
      'Minimal and typographic',
      'Bold and editorial',
      'Corporate and trustworthy',
      'Playful and colourful',
      'Dark, premium and quiet',
    ],
    rationale: 'Design direction changes layout, type scale and imagery.',
  },
  'website.features': {
    text: 'Which features should the {subject} include?',
    options: [
      'Contact form or enquiry capture',
      'Blog or content publishing',
      'Search and filtering',
      'User accounts and login',
      'Payments or checkout',
      'Admin dashboard',
      'Image gallery',
      'Testimonials',
      'Newsletter signup',
      'Multi-language support',
    ],
    rationale: 'Features are the largest driver of build effort.',
  },
  'website.tech_stack': {
    text: 'Any technology preference?',
    options: ['Next.js + React', 'Plain HTML/CSS/JS', 'Astro', 'WordPress', 'No preference — you choose'],
    rationale: 'The stack decides what code you actually receive.',
  },
  'website.backend': {
    text: 'Does the {subject} need a backend?',
    options: [
      'No — static site is fine',
      'Yes — dynamic data and a database',
      'Only a form endpoint / email',
      'Not sure — recommend one',
    ],
    rationale: 'Backend or not changes the entire architecture.',
  },
  'website.auth': {
    text: 'How should users sign in?',
    options: ['Email and password', 'Google sign-in', 'Magic link / OTP', 'No login needed'],
    rationale: 'Authentication choice affects both backend and UI work.',
  },
  'website.database': {
    text: 'Any database preference?',
    options: ['Postgres', 'Supabase', 'Firebase', 'SQLite', 'No preference'],
    rationale: 'Data model and hosting follow from this.',
  },
  'website.deployment': {
    text: 'Where should it be deployed?',
    options: ['Vercel', 'Netlify', 'Cloudflare Pages', 'AWS', 'Not decided yet'],
    optional: true,
  },
  'website.content': {
    text: 'Do you already have the content?',
    options: ['Yes — text and images are ready', 'Partly — text only', 'No — write placeholder copy', 'No — write real copy for me'],
    optional: true,
    rationale: 'Content readiness changes whether copywriting is in scope.',
  },

  // ── software ──────────────────────────────────────────────────────────────
  'software.purpose': {
    text: 'What should {subject} actually do?',
    kind: 'text',
    hint: 'One or two sentences is enough — the key behaviour, not the whole spec.',
    rationale: 'The core behaviour defines everything else.',
  },
  'software.platform': {
    text: 'Where should it run?',
    options: ['Command line', 'Web browser', 'Server / backend service', 'Desktop app', 'As a library / SDK'],
    rationale: 'Runtime decides language, packaging and testing strategy.',
  },
  'software.features': {
    text: 'Which features should the {subject} include?',
    options: ['Core create / read / update / delete', 'Search and filtering', 'Authentication', 'Scheduled jobs', 'Third-party integration', 'Logging and monitoring'],
    rationale: 'Feature scope is the main cost driver.',
  },
  'software.language': {
    text: 'Any language preference?',
    options: ['TypeScript / Node', 'Python', 'Go', 'Rust', 'Java / Kotlin', 'No preference'],
    rationale: 'Language determines the code you will receive.',
  },
  'software.framework': {
    text: 'Any framework or library preference?',
    options: ['Express / Fastify', 'Next.js API routes', 'FastAPI', 'Django / DRF', 'NestJS', 'No preference'],
  },
  'software.constraints': {
    text: 'Any constraints to respect?',
    options: ['No external dependencies', 'Must run offline', 'Must be production-ready', 'Keep it minimal (prototype)', 'Strict performance budget'],
    rationale: 'Constraints rule out whole classes of solution.',
  },
  'software.interfaces': {
    text: 'How should it be accessed?',
    options: ['REST API', 'GraphQL', 'CLI commands', 'Webhooks', 'Library imports'],
    rationale: 'The interface contract shapes the design.',
  },
  'software.data_storage': {
    text: 'How should data be stored?',
    options: ['Postgres', 'SQLite', 'MongoDB', 'Files on disk', 'No persistence needed'],
    rationale: 'Persistence decides schema and migration work.',
  },
  'software.scale': {
    text: 'Roughly what scale should this handle?',
    options: ['Personal use', 'A small team', 'Thousands of users', 'High traffic, needs to scale'],
    optional: true,
  },
  'software.output_shape': {
    text: 'What should the AI deliver?',
    options: ['Complete runnable project', 'A single file', 'Function-level snippets', 'Architecture and plan only'],
    rationale: 'Deliverable form prevents a plan when you wanted code.',
  },
  'software.testing': {
    text: 'Should tests be included?',
    options: ['Yes — unit tests', 'Yes — unit and integration', 'No tests', 'Just a quick check'],
    optional: true,
  },

  // ── mobile ────────────────────────────────────────────────────────────────
  'mobile.purpose': {
    text: 'What should the {subject} do for its users?',
    kind: 'text',
    hint: 'The single job the app must do well.',
    rationale: 'The core job drives screens and data model.',
  },
  'mobile.mobile_os': {
    text: 'Which platform(s)?',
    options: ['iOS only', 'Android only', 'Both — cross-platform', 'Both — native separately'],
    rationale: 'Platform choice decides the framework and store process.',
  },
  'mobile.features': {
    text: 'Which features should the app include?',
    options: ['Accounts and sync', 'Push notifications', 'Offline support', 'In-app purchases', 'Camera or photo upload', 'Location features'],
    rationale: 'Each feature pulls in permissions and platform APIs.',
  },
  'mobile.audience': {
    text: 'Who are the users?',
    options: ['General consumers', 'A specific professional niche', 'Internal team', 'Students'],
    rationale: 'Audience shapes onboarding and pricing.',
  },
  'mobile.framework': {
    text: 'Any framework preference?',
    options: ['React Native / Expo', 'Flutter', 'Native SwiftUI', 'Native Kotlin / Compose', 'No preference'],
    rationale: 'Framework choice decides the language, tooling and hiring pool.',
  },
  'mobile.backend': {
    text: 'Does it need a backend?',
    options: ['No — local storage only', 'Yes — accounts and cloud sync', 'Firebase / Supabase', 'Not sure'],
    rationale: 'Cloud sync vs local decides cost and complexity.',
  },
  'mobile.auth': {
    text: 'How should users sign in?',
    options: ['Email and password', 'Apple / Google sign-in', 'Phone OTP', 'No login needed'],
  },
  'mobile.notifications': {
    text: 'Are push notifications needed?',
    options: ['Yes — reminders', 'Yes — marketing', 'No'],
    optional: true,
  },
  'mobile.store': {
    text: 'Where will it be distributed?',
    options: ['App Store', 'Play Store', 'Both stores', 'Internal / test only'],
    optional: true,
  },
  'mobile.design_direction': {
    text: 'What should it feel like?',
    options: ['Clean and minimal', 'Playful and friendly', 'Dense and professional', 'Dark and premium'],
  },

  // ── coding ────────────────────────────────────────────────────────────────
  'coding.goal': {
    text: 'What do you need help with?',
    options: ['Fix a bug', 'Explain the code', 'Write new code', 'Refactor or improve it', 'Review for problems', 'Write tests'],
    rationale: 'The kind of help needed changes the whole answer.',
  },
  'coding.problem': {
    text: 'What is the code or problem you are working on?',
    kind: 'text',
    hint: 'Paste the relevant code or describe the behaviour and what you expected.',
    rationale: 'Without the code, any answer is a guess.',
  },
  'coding.language': {
    text: 'Which language or runtime?',
    options: ['TypeScript / JavaScript', 'Python', 'Java / Kotlin', 'Go', 'Rust', 'C#', 'PHP / Ruby'],
    rationale: 'The answer must be in the language you actually use.',
  },
  'coding.context': {
    text: 'What is the surrounding setup?',
    options: ['Small script', 'Framework app (React/Next/Django)', 'Existing production codebase', 'Just learning / exploring'],
    rationale: 'Context decides how defensive and idiomatic the answer should be.',
  },
  'coding.error': {
    text: 'What happens when it fails?',
    kind: 'text',
    hint: 'Error message, stack trace, or "expected X, got Y".',
    rationale: 'The exact error is the fastest route to the fix.',
  },
  'coding.constraints': {
    text: 'Any constraints on the solution?',
    options: ['No new dependencies', 'Keep the current API', 'Performance matters', 'Readability over cleverness'],
  },
  'coding.output_shape': {
    text: 'How should the answer be shaped?',
    options: ['Corrected code with a short explanation', 'Explanation first, code after', 'Just the code', 'Step-by-step walkthrough'],
    rationale: 'Answer shape prevents an essay when you wanted a patch.',
  },
  'coding.level': {
    text: 'How deep should the explanation go?',
    options: ['Just fix it', 'Explain briefly why', 'Teach me the concept properly'],
    optional: true,
  },

  // ── writing ───────────────────────────────────────────────────────────────
  'writing.content_type': {
    text: 'What form should this take?',
    options: ['Blog post', 'Email', 'LinkedIn post', 'Article', 'Landing page copy', 'Documentation', 'Report'],
    rationale: 'Format decides structure and length expectations.',
  },
  'writing.source_language': {
    text: 'Which language is the text in now?',
    options: ['English', 'Hindi', 'Spanish', 'French', 'German', 'Other'],
    rationale: 'Ambiguous source text is the most common translation failure.',
  },
  'writing.register': {
    text: 'How formal should the translation read?',
    options: ['Neutral', 'Formal', 'Conversational', 'Legal / official', 'Marketing'],
    rationale: 'Register changes word choice more than syntax.',
  },
  'writing.topic': {
    // Names the artifact so the question is never the generic
    // "What exactly is it about?" — it reads as if a person asked it.
    text: 'What should the {deliverable} be about?',
    kind: 'text',
    hint: 'One line naming the subject, or the angle you want taken.',
    rationale: 'The subject is the substance of the piece.',
  },
  'writing.audience': {
    text: 'Who is the reader?',
    options: ['General readers', 'Professionals in the field', 'Beginners', 'Senior decision-makers', 'Existing customers'],
    rationale: 'Reading level and assumed knowledge depend on this.',
  },
  'writing.purpose': {
    text: 'What should it achieve?',
    options: ['Inform or explain', 'Persuade', 'Rank on search', 'Announce news', 'Build trust', 'Get a reply'],
    rationale: 'Purpose determines the call to action and framing.',
  },
  'writing.tone': {
    text: 'What tone?',
    options: ['Professional', 'Friendly and warm', 'Direct and punchy', 'Formal', 'Playful'],
    rationale: 'Tone sets every sentence.',
  },
  'writing.length': {
    text: 'Roughly how long?',
    options: ['Under 300 words', '300–600 words', '600–1,200 words', '1,200+ words'],
    rationale: 'Length determines depth and structure.',
  },
  'writing.structure': {
    text: 'Any structural requirements?',
    options: ['Short intro + sections', 'Bullet points', 'Numbered list', 'TL;DR at the top', 'No headings, flowing prose'],
  },
  'writing.must_include': {
    text: 'Anything that must be included or avoided?',
    kind: 'text',
    hint: 'Facts, names, numbers, or things to avoid saying.',
    optional: true,
  },
  'writing.language_out': {
    text: 'What language should it be written in?',
    options: ['English', 'Hindi', 'Spanish', 'French', 'German'],
    optional: true,
  },

  // ── research ──────────────────────────────────────────────────────────────
  'research.question': {
    text: 'What question should the research answer?',
    kind: 'text',
    hint: 'State it as a question or a decision you need to make.',
    rationale: 'A precise question is the difference between research and a listicle.',
  },
  'research.scope': {
    text: 'What should the comparison focus on?',
    options: ['Pricing and total cost', 'Features and capability', 'Ease of use', 'Performance and reliability', 'Ecosystem and integrations', 'Security and compliance'],
    rationale: 'Criteria decide what gets compared.',
  },
  'research.decision': {
    text: 'What decision does this feed?',
    kind: 'text',
    hint: 'e.g. "picking a vendor this week", "writing an internal recommendation".',
    rationale: 'The decision determines the depth and format required.',
  },
  'research.depth': {
    text: 'How deep should it go?',
    options: ['Quick overview', 'Solid working analysis', 'Exhaustive deep dive'],
    rationale: 'Depth sets effort and length.',
  },
  'research.sources': {
    text: 'Which sources should be prioritised?',
    options: ['Official documentation', 'Hands-on reviews', 'Academic or peer-reviewed', 'Community discussion', 'Recent news and announcements'],
    rationale: 'Source preference changes what the answer can be trusted for.',
  },
  'research.recency': {
    text: 'How recent must the information be?',
    options: ['Last 3 months', 'Last year', 'Last 2–3 years', 'No restriction'],
  },
  'research.geography': {
    text: 'Any market or region to focus on?',
    options: ['Global', 'India', 'United States', 'Europe', 'Asia-Pacific'],
    optional: true,
  },
  'research.output_format': {
    text: 'What shape should the output take?',
    options: ['Comparison table', 'Written analysis', 'Pros and cons per option', 'Recommendation with reasoning', 'Slide-ready summary'],
    rationale: 'Output shape decides structure.',
  },

  // ── image ─────────────────────────────────────────────────────────────────
  'image.subject': {
    text: 'What is the main subject of the image?',
    kind: 'text',
    hint: 'The single most important thing that must be recognisable — e.g. "a red vintage motorcycle".',
    rationale: 'Without a clear subject, generation is a lottery.',
  },
  'image.style': {
    text: 'What visual style should it have?',
    options: ['Photorealistic', 'Cinematic still', 'Flat vector illustration', '3D render', 'Watercolour', 'Minimal line art', 'Anime / manga'],
    rationale: 'Style drives palette, detail level and rendering.',
  },
  'image.composition': {
    text: 'How should it be framed?',
    options: ['Centred subject, wide background', 'Close-up', 'Full body / full object', 'Top-down flat lay', 'Wide panoramic scene'],
    rationale: 'Framing changes what fits in the frame.',
  },
  'image.environment': {
    text: 'Where is the scene set?',
    options: ['Studio, plain background', 'Outdoors, natural setting', 'Urban street', 'Interior room', 'Abstract or surreal'],
    rationale: 'Setting determines context and props.',
  },
  'image.lighting': {
    text: 'What lighting or mood?',
    options: ['Soft natural light', 'Golden hour warmth', 'Dramatic studio lighting', 'Moody low light', 'Bright and airy'],
    rationale: 'Lighting is the fastest way to change mood.',
  },
  'image.aspect_ratio': {
    text: 'What shape and use?',
    options: ['1:1 — social post', '16:9 — wide header or slide', '9:16 — phone or story', '4:5 — feed portrait', 'A2/A3 — print poster'],
    rationale: 'Aspect ratio must match where the image will be used.',
  },
  'image.purpose': {
    text: 'Where will this image be used?',
    options: ['Social media post', 'Website hero image', 'Logo or brand mark', 'Print or poster', 'Presentation slide', 'App or product mockup'],
    rationale: 'Intended use constrains cropping and text legibility.',
  },
  'image.palette': {
    text: 'Any colour direction?',
    options: ['Muted and earthy', 'Vibrant and saturated', 'Pastel', 'Monochrome', 'Brand colours'],
    optional: true,
  },
  'image.text_in_image': {
    text: 'Does the image need text in it?',
    kind: 'text',
    hint: 'Exact wording, or leave blank for none.',
    optional: true,
  },

  // ── business ──────────────────────────────────────────────────────────────
  'business.goal': {
    text: 'What business outcome are you after?',
    options: ['Get first customers', 'Grow revenue', 'Raise funding', 'Launch a new product', 'Enter a new market', 'Reduce costs'],
    rationale: 'The outcome determines which plan is useful.',
  },
  'business.offering': {
    text: 'What exactly are you offering?',
    kind: 'text',
    hint: 'Product or service, and who pays for it.',
    rationale: 'The offer is the unit everything else is built around.',
  },
  'business.market': {
    text: 'Who is the target market?',
    options: ['Small businesses (SMB)', 'Enterprise', 'Individual consumers', 'Developers or technical buyers', 'A specific industry niche'],
    rationale: 'Market choice changes pricing, channel and messaging.',
  },
  'business.stage': {
    text: 'What stage are you at?',
    options: ['Idea only', 'Validating', 'MVP built', 'Launched, early revenue', 'Scaling'],
    rationale: 'Stage decides whether plan or execution is the bottleneck.',
  },
  'business.timeframe': {
    text: 'Over what timeframe?',
    options: ['Next 30 days', 'Next quarter', 'Next 6 months', 'This year'],
    rationale: 'A plan without a horizon is not actionable.',
  },
  'business.budget': {
    text: 'What budget or resources exist?',
    options: ['Bootstrapped, near zero', 'A few hundred a month', 'A meaningful budget', 'Funded'],
    optional: true,
  },
  'business.constraints': {
    text: 'Any hard constraints?',
    options: ['Solo founder, limited time', 'No paid ads', 'Must be compliant (regulated)', 'Must not require hiring'],
    optional: true,
  },
  'business.output_shape': {
    text: 'What should the deliverable be?',
    options: ['One-page strategy', 'Detailed plan with milestones', 'Pitch deck outline', 'Positioning and messaging', 'Financial model sketch'],
    rationale: 'Deliverable form prevents a vague essay.',
  },

  // ── education ─────────────────────────────────────────────────────────────
  'education.topic': {
    text: 'What do you want to learn or teach?',
    kind: 'text',
    hint: 'A topic, a subject area, or a specific question.',
    rationale: 'The topic is the substance of the lesson.',
  },
  'education.level': {
    text: 'Where are you starting from?',
    options: ['Complete beginner', 'Some basics', 'Comfortable, filling gaps', 'Advanced, want depth'],
    rationale: 'Starting level decides vocabulary and pace.',
  },
  'education.goal': {
    text: 'What do you want to be able to do afterwards?',
    options: ['Understand it conceptually', 'Pass an exam or interview', 'Use it at work', 'Teach it to someone else'],
    rationale: 'The goal decides how practice is structured.',
  },
  'education.depth': {
    text: 'How deep should it go?',
    options: ['Quick intuitive explanation', 'Solid working understanding', 'Full syllabus-level depth'],
    rationale: 'Depth decides how much detail is appropriate.',
  },
  'education.style': {
    text: 'How do you learn best?',
    options: ['Simple analogies', 'Step-by-step with examples', 'Visual diagrams', 'Exercises and quizzes', 'Real-world case studies'],
    rationale: 'Explanation style changes what a good answer looks like.',
  },
  'education.timeframe': {
    text: 'How much time do you have?',
    options: ['An hour', 'A few days', 'A few weeks', 'No deadline'],
    optional: true,
    rationale: 'Time budget decides whether this is a lesson or a syllabus.',
  },
  'education.language_out': {
    text: 'What language should the explanation be in?',
    options: ['English', 'Hindi', 'Spanish', 'French'],
    optional: true,
  },

  // ── general ───────────────────────────────────────────────────────────────
  'general.goal': {
    text: 'What would a perfect result look like?',
    kind: 'text',
    hint: 'One line on what you need, and what you would do with it.',
    rationale: 'A concrete objective is the single biggest improvement available.',
  },
  'general.context': {
    text: 'Any context worth knowing?',
    kind: 'text',
    hint: 'Constraints, background, or who will read or use this.',
    optional: true,
  },
  'general.output_format': {
    text: 'How should the answer be delivered?',
    options: ['Short prose answer', 'Step-by-step', 'Bullet points', 'Table', 'Code', 'Detailed report'],
    rationale: 'Output shape prevents the wrong kind of answer.',
  },
  'general.audience': {
    text: 'Who is this for?',
    options: ['Just me', 'My team', 'A client', 'Public audience', 'A beginner'],
    optional: true,
  },
  'general.depth': {
    text: 'How deep should it go?',
    options: ['Quick answer', 'Balanced', 'Thorough'],
    optional: true,
  },

  // ── shared ────────────────────────────────────────────────────────────────
  'output_format': {
    text: 'How should the result be formatted?',
    options: ['Markdown', 'Plain prose', 'Bullet points', 'Table', 'Code block', 'Document'],
    rationale: 'Format decides the shape of the output.',
  },
  'output_shape': {
    text: 'What should be delivered?',
    options: ['A complete working artifact', 'A plan or outline', 'A draft to iterate on', 'Direct answer only'],
    rationale: 'Deliverable form prevents the wrong level of output.',
  },
  'deadline': {
    text: 'Is there a deadline?',
    options: ['Today', 'This week', 'This month', 'No deadline'],
    optional: true,
  },
};

/** Resolve the definition for a slot, most-specific first. */
export function bankEntry(taskType: TaskType, slot: string): BankEntry | undefined {
  return BANKS[`${taskType}.${slot}`] ?? BANKS[slot];
}

/** Options for a slot, personalised by domain pack where one matches. */
function synthesiseOptions(spec: SlotSpec, ctx: QuestionContext): QuestionOption[] {
  const allowAggregate = spec.kind === 'multi';
  const packs = matchDomainPacks(ctx);
  const fromPacks = (key: keyof DomainPack): string[] => {
    const out: string[] = [];
    for (const pack of packs) {
      const value = pack[key];
      if (Array.isArray(value)) out.push(...value);
    }
    return out;
  };

  const entry = bankEntry(ctx.taskType, spec.id);
  const base = entry?.options ?? [];
  const conditional = entry?.conditionalOptions ? entry.conditionalOptions(ctx) : [];

  switch (spec.id) {
    case 'features': {
      const domain = fromPacks('features');
      // Domain-specific options win outright: they are the ones that make the
      // question feel intelligent. Generic options only fill a thin list.
      if (domain.length >= 3) {
        return withAggregate([...domain.slice(0, 5), ...conditional], allowAggregate);
      }
      return withAggregate([...domain, ...base.slice(0, 6), ...conditional], allowAggregate);
    }
    case 'pages':
    case 'screens': {
      const domain = fromPacks('pages');
      return withAggregate(domain.length > 0 ? [...domain, ...base.slice(0, 2)] : base, allowAggregate);
    }
    case 'audience':
    case 'market': {
      const domain = fromPacks('audience');
      return withAggregate(domain.length > 0 ? [...domain, ...base.slice(0, 3)] : base, allowAggregate);
    }
    case 'purpose': {
      const domain = fromPacks('purpose');
      return withAggregate(domain.length > 0 ? [...domain, ...base.slice(0, 3)] : base, allowAggregate);
    }
    default:
      return withAggregate([...base, ...conditional], allowAggregate);
  }
}

function kindFor(spec: SlotSpec, entry?: BankEntry): SlotSpec['kind'] {
  // Free-text slots stay free text.
  if (spec.kind === 'text') return 'text';
  // A multi-select slot is never downgraded to a single choice (the user may
  // legitimately pick several), but it may be rendered as free text when the
  // answers are too contextual for a fixed option list.
  if (spec.kind === 'multi') return 'multi';
  if (entry?.kind === 'text') return 'text';
  return spec.kind;
}

/**
 * Build a single question for a slot, or null when it cannot be asked well.
 */
export function buildQuestion(spec: SlotSpec, ctx: QuestionContext): Question | null {
  const entry = bankEntry(ctx.taskType, spec.id);
  if (entry?.skip?.(ctx)) return null;

  const kind = kindFor(spec, entry);
  const optional = entry?.optional ?? spec.optional;
  const text = interpolate(entry?.text ?? defaultQuestionText(spec, ctx), ctx);

  if (kind === 'text') {
    return {
      id: spec.id,
      slot: spec.id,
      text,
      kind: 'text',
      options: [],
      suggestions: textSuggestions(spec, ctx),
      allowCustom: false,
      optional,
      hint: entry?.hint,
      priority: spec.weight,
      rationale: entry?.rationale,
    };
  }

  const options = synthesiseOptions(spec, ctx);
  if (options.length < 2) return null;

  // Drop options the user already answered explicitly.
  const known = ctx.resolved[spec.id];
  const filtered = Array.isArray(known)
    ? options.filter((o) => !known.some((k) => o.value.includes(toValue(String(k)))))
    : options;

  return {
    id: spec.id,
    slot: spec.id,
    text,
    kind,
    options: filtered.length >= 2 ? filtered : options,
    suggestions: [],
    allowCustom: true,
    optional,
    hint: entry?.hint,
    condition: spec.condition,
    priority: spec.weight,
    rationale: entry?.rationale,
  };
}

/**
 * One-tap suggestions for a free-text question.
 *
 * A text box with no chips is the failure the brief calls out: "each question
 * answerable by MCQ with an Other free-text path". These are *domain-derived* —
 * they come from the matched domain pack and the extracted subject, so
 * "What should the blog post be about?" offers angles for an onboarding
 * article, not generic strings.
 */
/** How people actually decide what a short-form artifact should say. */
const ARTIFACT_FRAMINGS: Record<string, string[]> = {
  'cover letter': [
    'A specific job posting',
    'A career change with no direct experience',
    'A promotion I want internally',
    'A first job or internship',
  ],
  'blog post': [
    'A problem my readers keep hitting',
    'A walkthrough of how something works',
    'An opinion backed by examples',
    'A beginner introduction to the topic',
  ],
  email: ['Cold outreach', 'A follow-up', 'An apology or service recovery', 'An announcement'],
  report: ['Progress against a plan', 'A recommendation with options', 'An incident write-up', 'A comparison of options'],
  essay: ['An argument I want to make', 'A personal experience', 'An analysis of a text or event', 'A comparison'],
  story: ['A character-driven scene', 'A twist ending', 'A childhood memory', 'A speculative idea'],
  poem: ['A single image or moment', 'A feeling I cannot name', 'A place', 'A person'],
  'landing page': ['A single clear offer', 'A product feature', 'A waitlist sign-up', 'A free trial'],
};

const ARTIFACT_RE = new RegExp(`\\b(${Object.keys(ARTIFACT_FRAMINGS).join('|').replace(/ /g, '\\s+')})\\b`, 'i');

/** The named artifact in the request, if it is one we have framings for. */
export function artifactOf(ctx: QuestionContext): string | undefined {
  const haystack = [
    String(ctx.resolved['content_type'] ?? ''),
    String(ctx.fields['content_type'] ?? ''),
    ctx.subject.subject,
    ctx.subject.domain,
  ].join(' ');
  const match = ARTIFACT_RE.exec(haystack);
  if (!match) return undefined;
  const found = match[1]!.toLowerCase().replace(/\s+/g, ' ');
  return ARTIFACT_FRAMINGS[found] ? found : undefined;
}

export function textSuggestions(spec: SlotSpec, ctx: QuestionContext): string[] {
  const out: string[] = [];
  const subject = ctx.subject.subject || ctx.subject.domain || '';
  const domain = ctx.subject.domain || '';

  // A *derivative* artifact ("cover letter", "blog post") is about whatever the
  // reader has to say, so framing it by its own noun produces nonsense
  // ("Getting started with blog"). Offer framings of the artifact instead.
  const artifact = artifactOf(ctx);
  const framings = artifact ? ARTIFACT_FRAMINGS[artifact] : undefined;
  if (framings && (spec.id === 'topic' || spec.id === 'purpose')) out.push(...framings);

  if (!framings && spec.id === 'topic') {
    // "Leave it to me — you decide the angle"
    // for a real domain: concrete framings of the same subject, which is what
    // people struggle to phrase. Never a restatement of the subject itself.
    if (domain) {
      out.push(`A practical introduction to ${domain}`, `${capitalise(domain)} for beginners`, `Common mistakes with ${domain}`);
    } else if (subject) {
      out.push(`Getting started with ${subject}`, `${capitalise(subject)}: what to know first`);
    }
  }

  if (spec.id === 'offering') {
    out.push('A product I sell', 'A service I deliver', 'Software I am building', 'Content or expertise I share');
  }
  if (spec.id === 'question') {
    // The research question is the whole point, so offer the shapes research
    // questions actually take for this subject.
    const about = domain || subject || 'this market';
    out.push(`How big is ${about} and how fast is it growing?`, `Who are the main players in ${about}?`, `What is changing in ${about} right now?`, `Should we enter ${about}?`);
  }
  if (spec.id === 'decision') {
    out.push('Whether to invest at all', 'How much to spend', 'Which option to pick', 'When to move', 'Nothing yet — just understanding');
  }
  if (spec.id === 'purpose' && out.length === 0) {
    out.push('Make it work correctly', 'Make it faster', 'Make it easier to maintain', 'Explain what is going wrong');
  }
  if (spec.id === 'must_include') {
    out.push('A concrete example', 'A step-by-step walkthrough', 'Numbers or data', 'A short checklist', 'Common pitfalls');
  }
  if (spec.id === 'must_avoid') {
    out.push('No jargon', 'No hype or superlatives', 'No pricing details', 'No competitor names');
  }
  if (spec.id === 'problem' || spec.id === 'error') {
    out.push('It crashes only in production', 'It works locally but not after deploy', 'The output is wrong, not missing');
  }
  if (spec.id === 'topic') {
    out.push('Leave it to me — you decide the angle');
  }

  // Domain packs carry their own vocabulary; use it when it fits the slot.
  for (const pack of matchDomainPacks(ctx)) {
    const fromPack = pack[spec.id];
    if (Array.isArray(fromPack)) out.push(...fromPack.filter((v) => typeof v === 'string'));
  }

  return dedupe(out.filter((o) => o.trim() !== '')).slice(0, 4);
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function defaultQuestionText(spec: SlotSpec, ctx: QuestionContext): string {
  const label = slotLabel(ctx.taskType, spec.id).toLowerCase();
  const subject = ctx.subject.subject || 'this';
  return `What about ${label} for ${subject}?`;
}

/** A question that resolves one detected conflict, ahead of slot questions. */
export function buildConflictQuestion(
  conflicts: Array<{ id: string; question: string }>,
  ctx: QuestionContext,
): Question | null {
  const first = conflicts[0];
  if (!first) return null;
  const options: QuestionOption[] = [
    { value: 'prioritise-first', label: 'Prefer the first one I mentioned' },
    { value: 'prioritise-second', label: 'Prefer the second one I mentioned' },
    { value: 'balance', label: 'Balance both — note the tension in the answer' },
  ];
  return {
    id: `conflict-${first.id}`,
    slot: `conflict_${first.id}`,
    text: interpolate(first.question, ctx),
    kind: 'single',
    options,
    suggestions: [],
    allowCustom: true,
    priority: 1,
    rationale: 'Two instructions in the request pull in opposite directions.',
  };
}

/** Compose a one-line rationale for a gap that has no bank entry. */
export function rationaleFor(spec: SlotSpec): string {
  return `${capitalize(bare(slotLabel('general', spec.id)).toLowerCase())} materially changes the answer.`;
}

export function summariseOptions(options: QuestionOption[]): string {
  return joinNatural(options.filter((o) => !o.aggregate).map((o) => o.label).slice(0, 4).map((l) => `“${l}”`));
}

export const AGGREGATE_VALUE = ALL_VALUE;
