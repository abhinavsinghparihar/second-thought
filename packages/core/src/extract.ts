/**
 * Requirement extraction.
 *
 * Reads a prompt and returns the requirement values it *already* states, each
 * with the literal evidence span. The rest of the engine uses this to avoid
 * asking about information the user has given (a hard requirement of the
 * brief), and to write questions in the user's own vocabulary.
 *
 * Extraction is intentionally conservative: a low-confidence regex does not
 * count as "answered", because a wrong suppression is worse than one extra
 * question.
 */

import { schemaFor } from './schema';
import type { Ambiguity, Conflict, DetectedField, SubjectInfo, TaskType } from './types';
export type { SubjectInfo };
import { keywords, squash } from './text';

interface Extractor {
  slot: string;
  re: RegExp;
  group?: number;
  confidence: number;
  multi?: boolean;
  normalize?: (value: string) => string;
  /** Only extract when the current task type is one of these. */
  only?: TaskType[];
}

const LANGUAGE_NAMES =
  'english|hindi|spanish|french|german|japanese|chinese|mandarin|arabic|portuguese|russian|korean|italian|tamil|telugu|bengali|marathi|urdu|dutch|turkish|polish';

const lower = (v: string) => v.toLowerCase().trim();
const trim = (v: string) => v.trim();

const EXTRACTORS: Extractor[] = [
  // ── universal ────────────────────────────────────────────────────────────
  {
    slot: 'output_format',
    re: /\b(?:as|in|into|using)\s+(?:a\s+)?(bullet points?|bullets|a table|table|markdown|json|csv|yaml|a list|list|plain text|paragraphs?|an essay|a report|slides?|deck|a spreadsheet|pdf|docx|html|code)\b/i,
    group: 1,
    confidence: 0.8,
    normalize: lower,
  },
  {
    slot: 'deadline',
    re: /\b(?:by|before|within|in|due)\s+(tomorrow|today|tonight|next week|next month|this week|this month|the weekend|\d+\s*(?:days?|weeks?|months?|hours?))/i,
    group: 1,
    confidence: 0.8,
    normalize: lower,
  },
  {
    slot: 'budget',
    re: /(?:[$£€₹]|rs\.?|inr|usd|eur|gbp)\s?\d[\d,.]*\s?(?:k|thousand|million|lakh|crore)?|\b\d[\d,.]*\s?(?:dollars|rupees|euros|usd|inr)\b/i,
    group: 0,
    confidence: 0.85,
    normalize: trim,
  },
  {
    slot: 'audience',
    // Two passes. The curated noun list first (high confidence), then a generic
    // "for <noun phrase>" pass so an audience the list has never heard of —
    // "for first-time home buyers", "for our warehouse staff" — is still read
    // instead of being asked about again.
    re: /\b(?:for|aimed at|targeting|target(?:ed)? (?:at|audience:?)|used by|written for|meant for|audience:?)\s+(?:(?:my|our|the|a|an)\s+)?((?:[a-z0-9'-]+\s+){0,2}(?:beginners?|newbies|students?|kids|children|teens|teenagers|adults|professionals|developers?|engineers?|designers?|founders?|executives?|managers?|investors?|recruiters?|customers?|clients?|users?|readers?|general public|small business(?:es)?|enterprises?|internal teams?|team))\b/i,
    group: 1,
    confidence: 0.8,
    normalize: lower,
  },
  {
    slot: 'audience',
    // Fallback for audiences the curated list does not know. Deliberately
    // conservative: two to three lowercase words after "for", with no verb-ish
    // or question-ish material, so "for a moment" or "for the win" do not count.
    re: /\b(?:written\s+)?for\s+((?:(?:first[- ]time|new|existing|prospective|potential|aspiring|small|large|senior|junior|non[- ]technical)\s+)?(?:home\s+|prospective\s+)?[a-z][a-z0-9'-]*(?:\s+(?!in\b|at\b|with\b|that\b|who\b|about\b|on\b|by\b|from\b)[a-z][a-z0-9'-]*){0,3})\s*(?:[,;:.]|\s+(?:in|at|with|that|who|about|on|by|from)\b|$)/i,
    group: 1,
    confidence: 0.55,
    normalize: lower,
  },
  {
    slot: 'language_out',
    re: new RegExp(`\\b(?:in|into|to)\\s+(${LANGUAGE_NAMES})\\b`, 'i'),
    group: 1,
    confidence: 0.85,
    normalize: lower,
  },
  {
    slot: 'level',
    re: /\b(beginner|intermediate|advanced|expert|newbie|no (?:prior )?experience|from scratch|eli5|five[- ]year[- ]old|just starting)\b/i,
    group: 1,
    confidence: 0.8,
    normalize: lower,
  },
  {
    slot: 'depth',
    re: /\b(brief|quick|short|concise|detailed|in-?depth|comprehensive|exhaustive|thorough|deep dive)\b(?:\s+(?:overview|analysis|summary|report|answer|guide|explanation))?/i,
    group: 1,
    confidence: 0.65,
    normalize: lower,
  },
  {
    slot: 'tone',
    re: /\b(formal|informal|casual|friendly|professional|playful|witty|serious|empathetic|confident|humble|persuasive|neutral|enthusiastic|sarcastic|humorous|warm|direct|bold)\b(?:\s+tone)?/i,
    group: 1,
    confidence: 0.75,
    normalize: lower,
  },
  {
    slot: 'length',
    // "900-word", "500 word", "20-paragraph" and bare "1200 words" all count.
    // The unit often appears *after* the number in a compound ("900-word post"),
    // which the old pattern missed entirely.
    re: /\b((?:\d[\d,]*\s*-?\s*(?:words?|pages?|slides?|paragraphs?|sentences?|lines?|characters?))|one[- ]page|single[- ]page|two[- ]pages?|short|long)\b/i,
    group: 1,
    confidence: 0.7,
    normalize: lower,
  },
  {
    slot: 'geography',
    re: /\b(?:in|for|across|targeting)\s+(india|the us|the usa|usa|us|america|europe|asia|africa|uk|britain|canada|australia|germany|france|japan|china|singapore|dubai|uae|mumbai|delhi|bangalore|bengaluru|hyderabad|pune|new york|london|global|worldwide)\b/i,
    group: 1,
    confidence: 0.75,
    normalize: lower,
  },
  {
    slot: 'recency',
    re: /\b(last|past|recent)\s+(week|month|quarter|year|five years|decade|\d+ (?:days|weeks|months|years))|\b(?:20\d\d)\b|\blatest\b|\bcurrent\b/i,
    group: 0,
    confidence: 0.6,
    normalize: trim,
  },
  {
    slot: 'timeframe',
    re: /\b(\d+\s*(?:days?|weeks?|months?|years?)|a (?:day|week|month|year)|weekend|this (?:week|month|quarter|year)|next quarter|q[1-4])\b/i,
    group: 1,
    confidence: 0.7,
    normalize: lower,
  },
  {
    slot: 'constraints',
    re: /\b(no (?:backend|database|login|auth\w*|javascript|js|framework|dependencies)|must (?:be|run|work|not)\b[^.,;]{0,40}|offline(?:[- ]first)?|without (?:a )?(?:backend|database|login|auth\w*)|single[- ]file|vanilla|lightweight|mobile[- ]first|accessible|a11y|seo[- ]friendly|gdpr|hipaa)\b/i,
    group: 0,
    confidence: 0.7,
    multi: true,
    normalize: lower,
  },

  {
    slot: 'output_shape',
    re: /\b(complete (?:runnable |working )?(?:project|app|application|codebase|website|site)|full (?:project|codebase|implementation)|whole (?:project|thing)|single file|one file|just the code|code only|snippet|architecture|design only|plan only|production[- ]ready|working example|boilerplate|scaffold|end[- ]to[- ]end)\b/i,
    group: 0,
    confidence: 0.8,
    normalize: lower,
  },
  {
    slot: 'testing',
    re: /\b(unit tests?|integration tests?|e2e|end[- ]to[- ]end tests?|test suite|with tests|no tests)\b/i,
    group: 0,
    confidence: 0.8,
    normalize: lower,
  },

  // ── website ──────────────────────────────────────────────────────────────
  {
    slot: 'site_type',
    re: /\b(landing page|marketing site|portfolio|blog|e-?commerce|online store|shop|saas|dashboard|web app|webapp|documentation site|docs site|wiki|forum|community site|booking site|news site|personal site|brochure site|admin panel|marketplace)\b/i,
    group: 1,
    confidence: 0.8,
    normalize: lower,
  },
  {
    slot: 'pages',
    re: /\b(home|homepage|about|about us|services?|products?|pricing|contact|blog|faq|careers|testimonials?|gallery|portfolio|checkout|cart|signup|sign[- ]up|login|terms|privacy|dashboard|settings) pages?\b|\b(?:pages?|screens?):\s*([^.]+)/i,
    group: 0,
    confidence: 0.7,
    multi: true,
    normalize: lower,
  },
  {
    slot: 'design_direction',
    re: /\b(minimal(?:ist)?|brutalist|swiss|editorial|corporate|playful|bold|clean|modern|elegant|luxur\w+|premium|dark mode|light mode|glassmorph\w+|material|flat design|bento|retro|maximalist|monochrome|neubrutalism|immersive|3d)\b(?:\s+(?:design|look|style|aesthetic|theme))?/i,
    group: 1,
    confidence: 0.7,
    normalize: lower,
  },
  {
    slot: 'features',
    re: /\b(auth\w*|login|sign[- ]in|sign[- ]up|payments?|stripe|razorpay|checkout|cart|search|filters?|notifications?|chat|comments?|likes?|reviews?|ratings?|analytics|dashboard|admin panel|cms|blog|newsletter|subscriptions?|multi[- ]?language|i18n|dark mode|upload|file (?:upload|storage)|booking|calendar|map|geolocation|export|csv export|api|webhooks?|integrations?|referrals?|coupons?|invoices?|onboarding)\b/i,
    group: 1,
    confidence: 0.7,
    multi: true,
    normalize: lower,
  },
  {
    slot: 'tech_stack',
    re: /\b(next\.?js|nuxt|sveltekit|astro|gatsby|remix|react|vue|angular|svelte|solidjs|wordpress|shopify|webflow|framer|html|css|tailwind|bootstrap|django|flask|fastapi|rails|laravel|express|node\.?js|php|astro)\b/i,
    group: 1,
    confidence: 0.85,
    normalize: lower,
  },
  {
    slot: 'backend',
    re: /\b(no backend|static site|static|serverless|supabase|firebase|node backend|python backend|django|flask|fastapi|lambdas?|cloudflare workers?|appwrite|pocketbase|hasura)\b/i,
    group: 0,
    confidence: 0.7,
    normalize: lower,
  },
  {
    slot: 'auth',
    re: /\b(no (?:login|auth\w*|accounts?)|google (?:sign[- ]in|oauth)|github (?:sign[- ]in|oauth)|magic link|otp|jwt|email\/password|email and password|sso|oauth|passwordless|2fa)\b/i,
    group: 0,
    confidence: 0.75,
    normalize: lower,
  },
  {
    slot: 'database',
    re: /\b(postgres(?:ql)?|mysql|sqlite|mongo(db)?|redis|supabase|firebase|dynamodb|planet ?scale|neon|prisma|drizzle)\b/i,
    group: 0,
    confidence: 0.8,
    normalize: lower,
  },
  {
    slot: 'deployment',
    re: /\b(vercel|netlify|cloudflare|aws|gcp|azure|heroku|railway|render|digitalocean|fly\.io|github pages|self[- ]host\w*|docker)\b/i,
    group: 0,
    confidence: 0.75,
    normalize: lower,
  },

  // ── software / coding ────────────────────────────────────────────────────
  {
    slot: 'platform',
    re: /\b(web|browser|cli|command[- ]line|desktop|server|backend|api|mobile|android|ios|macos|windows|linux|browser extension|chrome extension|vscode extension|slack bot|discord bot|telegram bot|whatsapp bot)\b/i,
    group: 1,
    confidence: 0.75,
    normalize: lower,
    multi: true,
  },
  {
    slot: 'language',
    re: /\b(python|javascript|typescript|java|kotlin|swift|golang|go|rust|c\+\+|c#|csharp|php|ruby|scala|dart|sql|bash|shell|powershell|haskell|elixir|erlang|clojure|lua|r)\b/i,
    group: 1,
    confidence: 0.85,
    normalize: lower,
    multi: true,
    only: ['software', 'coding', 'website', 'mobile', 'general'],
  },
  {
    slot: 'framework',
    re: /\b(react|next\.?js|vue|nuxt|svelte|angular|django|flask|fastapi|spring|laravel|rails|express|nest\.?js|node\.?js|flutter|react native|jetpack compose|swiftui|tailwind|bootstrap|dotnet|\.net|pandas|numpy|polars|pytorch|tensorflow|scikit-?learn|electron|tauri|expo)\b/i,
    group: 1,
    confidence: 0.85,
    normalize: lower,
    only: ['software', 'coding', 'website', 'mobile'],
  },
  {
    slot: 'data_storage',
    re: /\b(postgres(?:ql)?|mysql|sqlite|mongo(db)?|redis|dynamodb|firestore|supabase|json file|csv file|in[- ]memory|localstorage|no (?:database|storage|persistence))\b/i,
    group: 0,
    confidence: 0.75,
    normalize: lower,
    only: ['software'],
  },
  {
    slot: 'interfaces',
    re: /\b(rest api|graphql|grpc|webhook\w*|websocket\w*|cli|http api|openapi|swagger|message queue|kafka|rabbitmq|sdk)\b/i,
    group: 0,
    confidence: 0.8,
    normalize: lower,
    multi: true,
    only: ['software'],
  },
  {
    slot: 'mobile_os',
    re: /\b(android|ios|iphone|ipad|both platforms|cross[- ]platform)\b/i,
    group: 1,
    confidence: 0.85,
    normalize: lower,
    only: ['mobile'],
  },
  {
    slot: 'context',
    re: /\b(in my (?:existing )?(?:codebase|project|repo)|existing (?:app|code|project)|legacy|monorepo|typescript project|next\.?js app|django project|already have)\b/i,
    group: 0,
    confidence: 0.7,
    normalize: trim,
    only: ['coding'],
  },
  {
    slot: 'error',
    re: /\b(error|exception|traceback|stack ?trace|typeerror|valueerror|nullpointer|segfault|500|404|crash(?:es|ing)?|fails? (?:with|when))\b/i,
    group: 0,
    confidence: 0.7,
    normalize: trim,
    only: ['coding'],
  },

  // ── writing / research ───────────────────────────────────────────────────
  {
    slot: 'content_type',
    re: /\b(blog post|article|essay|story|poem|email|e-?mail|letter|cover letter|speech|newsletter|caption|thread|press release|whitepaper|case study|product description|resume|cv|bio|landing copy|ad copy|tagline|readme|documentation|docstring|changelog|proposal|report|guide|tutorial)\b/i,
    group: 1,
    confidence: 0.85,
    normalize: lower,
    only: ['writing'],
  },
  {
    slot: 'purpose',
    re: /\b(?:to|in order to|so (?:that|it can))\s+(apply|apologi[sz]e|request|inform|announce|invite|thank|follow up|pitch|sell|promote|introduce|remind|congratulate|resign|negotiate|convert|educate|persuade|rank|launch|sell|generate leads?|build trust)\b/i,
    group: 1,
    confidence: 0.7,
    normalize: lower,
    only: ['writing', 'research'],
  },
  {
    slot: 'must_avoid',
    // "no jargon", "avoid buzzwords", "don't use clichés".
    re: /\b(?:no|avoid|without|don't use|do not use|never use)\s+((?:[a-z-]+\s+){0,2}(?:jargon|buzzwords?|clich[eé]s?|slang|emojis?|technical terms?|fluff|filler))\b/i,
    group: 1,
    confidence: 0.7,
    normalize: lower,
  },
  {
    slot: 'must_include',
    // "must mention the rate", "include a screenshot", "make sure to cover …".
    re: /\b(?:must|should|needs? to|has to|make sure to|be sure to)\s+(?:include|mention|cover|contain|address|explain)\s+([^.,;]{3,60})/i,
    group: 1,
    confidence: 0.6,
    normalize: trim,
  },
  {
    slot: 'structure',
    // "with a checklist at the end", "four sections", "TL;DR at the top",
    // "ends with a call to action" — the shapes writers actually ask for.
    re: /\b(?:with\s+(?:an?\s+)?)?((?:intro\w*|introduction|checklist|sections?|headings?|subheadings?|bullet points?|numbered list|tl;?dr|summary|conclusion|call to action|cta|table|steps?)(?:\s+(?:at|in)\s+the\s+(?:top|end|beginning))?)/i,
    group: 1,
    confidence: 0.65,
    normalize: lower,
    only: ['writing'],
  },
  {
    slot: 'sources',
    re: /\b(peer[- ]reviewed|academic|scholarly|citations?|cite|references|research papers|studies|official docs|documentation|news articles|primary sources|recent studies)\b/i,
    group: 0,
    confidence: 0.75,
    normalize: lower,
    multi: true,
    only: ['research'],
  },
  {
    slot: 'scope',
    re: /\b(pricing|features?|alternatives|competitors?|market (?:size|share|trends?)|adoption|performance|security|reliability|cost of ownership|total cost|integration|ecosystem|developer experience|community|roadmap)\b/i,
    group: 0,
    confidence: 0.65,
    normalize: lower,
    multi: true,
    only: ['research'],
  },

  // ── image ────────────────────────────────────────────────────────────────
  {
    slot: 'style',
    re: /\b(photorealistic|photo ?real|realistic|cartoon|anime|watercolou?r|oil painting|pixel art|3d render|render|line art|flat design|flat illustration|minimal(?:ist)?|modern|vintage|retro|cyberpunk|steampunk|isometric|cinematic|abstract|art deco|bauhaus|low poly|vector|claymation|ukiyo-?e|comic|sketch|concept art)\b(?:\s+(?:style|look|aesthetic))?/i,
    group: 1,
    confidence: 0.8,
    normalize: lower,
    only: ['image'],
  },
  {
    slot: 'lighting',
    re: /\b(studio lighting|golden hour|natural light|low light|neon|backlit|soft light|dramatic lighting|harsh shadows|moody|bright|blue hour|rim light|candle ?light|sunset|sunrise|overcast)\b/i,
    group: 1,
    confidence: 0.75,
    normalize: lower,
    only: ['image'],
  },
  {
    slot: 'aspect_ratio',
    re: /\b(\d+:\d+|\d+x\d+|square|portrait|landscape|widescreen|vertical|horizontal)\b/i,
    group: 1,
    confidence: 0.8,
    normalize: lower,
    only: ['image'],
  },
  {
    slot: 'environment',
    re: /\b(?:in|on|at|inside)\s+(?:a|an|the)\s+([a-z][a-z \-]{2,28})/i,
    group: 1,
    confidence: 0.55,
    normalize: lower,
    only: ['image'],
  },
  {
    slot: 'composition',
    re: /\b(close[- ]up|wide shot|full body|portrait|headshot|top[- ]down|bird'?s[- ]eye|low angle|high angle|centered|symmetrical|rule of thirds|macro|panorama)\b/i,
    group: 1,
    confidence: 0.75,
    normalize: lower,
    only: ['image'],
  },
  {
    slot: 'palette',
    re: /\b(pastel|monochrome|black and white|sepia|vibrant|muted|earthy|neon colors?|warm tones?|cool tones?|duotone)\b/i,
    group: 1,
    confidence: 0.7,
    normalize: lower,
    only: ['image'],
  },

  // ── business ─────────────────────────────────────────────────────────────
  {
    slot: 'stage',
    re: /\b(idea stage|idea|mvp|prototype|pre[- ]launch|launched|early stage|growth stage|scaling|established|series [a-c]|seed)\b/i,
    group: 1,
    confidence: 0.7,
    normalize: lower,
    only: ['business'],
  },
  {
    slot: 'market',
    re: /\b(?:for|targeting|serving)\s+(small business(?:es)?|smbs?|enterprises?|consumers?|b2b|b2c|developers?|students?|freelancers?|agencies|creators?|restaurants?|retailers?|healthcare|education|fintech)\b/i,
    group: 1,
    confidence: 0.75,
    normalize: lower,
    only: ['business'],
  },

  // ── education ────────────────────────────────────────────────────────────
  {
    slot: 'style',
    re: /\b(with examples?|analogy|analogies|step[- ]by[- ]step|visual|hands[- ]on|exercises?|quiz|flashcards?|diagram)\b/i,
    group: 0,
    confidence: 0.6,
    normalize: lower,
    only: ['education'],
  },
];

// ── subject & domain ────────────────────────────────────────────────────────

const VAGUE_ADJECTIVES =
  /\b(really|cool|nice|good|great|amazing|awesome|better|best|modern|professional|attractive|simple|clean|beautiful|pretty|fancy|slick|powerful|robust|scalable|efficient|smart|seamless|intuitive|user[- ]friendly|top[- ]notch|world[- ]class|cutting[- ]edge|next[- ]gen|innovative|ultimate|perfect)\b/gi;

const CATEGORY_NOUNS =
  'app|application|website|web app|webapp|site|landing page|dashboard|tool|platform|bot|extension|plugin|system|service|api|tracker|store|shop|game|portal|marketplace|portfolio|blog|chatbot|assistant|agent|crm|erp|saas|clone';

const SUBJECT_RE = new RegExp(
  `([a-z][a-z0-9'\\-]*(?:\\s+[a-z][a-z0-9'\\-]*){0,3})\\s+(${CATEGORY_NOUNS})\\b`,
  'i',
);

/**
 * Derivative nouns: when the *object* of the request is itself the artifact
 * ("cover letter", "blog post"), the thing being written is the one the user
 * already named, so it is not something to ask about.
 */
const DERIVATIVE_NOUN_RE = /\b(blog post|post|letter|cover letter|essay|article|email|e-?mail|story|poem|guide|report|proposal|plan|script|speech|newsletter|caption|documentation|readme|blog)\b/i;

/**
 * Leading noise that must never become part of the subject. Applied
 * repeatedly, and allows a bare noise word (so "a" alone disappears).
 */
const LEADING_NOISE = new RegExp(
  '^(?:' +
    [
      'i\\s+(?:really\\s+)?(?:want|need|would\\s+like|\'d\\s+like|am\\s+looking\\s+for)',
      'we\\s+(?:want|need|are\\s+looking\\s+for)',
      'can\\s+you|could\\s+you|would\\s+you|please|pls|help\\s+me|for\\s+me',
      'build|make|create|develop|design|write|draft|compose|generate|implement|launch|ship|add',
      'me|us|a|an|the|our|my|your|their|some|any',
      'really|very|super|just|also|new|simple|nice|cool|good|great|amazing|awesome|best|small|big|quick|modern|professional|clean|beautiful|fancy|slick',
    ].join('|') +
  ')(?:\\s+|$)',
  'i',
);

const IMAGE_OF_RE = /\b(?:image|picture|photo|photograph|illustration|drawing|artwork|render|logo|icon|poster|banner|wallpaper|avatar|sketch|painting)\s+(?:of|for|showing|with|featuring)\s+(?:a|an|the|my|our)?\s*([a-z0-9][a-z0-9 '\-]{1,42})/i;

export function extractSubject(text: string): SubjectInfo {
  const clean = squash(text);

  // Image prompts name their subject after the noun ("a picture of a cat").
  const imageMatch = IMAGE_OF_RE.exec(clean);
  if (imageMatch?.[1]) {
    const raw = imageMatch[1]
      .replace(/\b(in|with|on|at|for|that|which|using|and then|style|photorealistic|cartoon)\b.*$/i, '')
      .replace(/[.,;!?]+$/, '')
      .trim();
    if (raw !== '' && raw.split(' ').length <= 6) {
      return { subject: raw, domain: raw, category: 'image' };
    }
  }

  const match = SUBJECT_RE.exec(clean);
  if (!match) return { subject: '', domain: '', category: '' };
  let descriptor = (match[1] ?? '').trim();
  const category = (match[2] ?? '').trim().toLowerCase();

  // Peel leading noise repeatedly ("I need a really cool expense tracking" → "expense tracking").
  for (let i = 0; i < 6; i += 1) {
    const next = descriptor.replace(LEADING_NOISE, '');
    if (next === descriptor) break;
    descriptor = next;
  }
  const domain = descriptor
    .replace(VAGUE_ADJECTIVES, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // A single leftover noise word is not a domain.
  if (domain.split(' ').filter(Boolean).length === 0) {
    return { subject: category, domain: '', category };
  }
  const subject = domain === '' ? category : `${domain} ${category}`;
  return { subject, domain, category };
}

/**
 * Extract the human topic from "about X" / "on X" / "explaining X".
 *
 * "for" is deliberately excluded from the cue list: "a blog post for
 * developers" is an *audience*, and treating it as the topic produced
 * "What exactly is it about?" for a request that had already said.
 */
export function extractTopic(text: string): string {
  const clean = squash(text);
  const cue = /\b(?:about|on|regarding|covering|explaining|discussing|understanding|learn|study|teach(?:\s+me)?)\s+([A-Za-z][A-Za-z0-9 &'’\-]{2,44})/i.exec(clean);
  if (cue?.[1]) {
    return cue[1].replace(/\b(in|with|that|which|using|and then)\b.*$/i, '').trim();
  }
  // "explain how DNS works", "teach me python", "explain recursion" — the topic
  // is everything after the teaching verb, with the leading "how/why/what" kept
  // because it is part of the question ("how DNS works" ≠ "DNS").
  const bare = /^\W*(?:please\s+)?(?:explain|describe|teach me|help me understand|walk me through)\s+(.{3,60})$/i.exec(clean);
  if (!bare?.[1]) return '';
  return bare[1]
    .replace(/[.?!]+$/, '')
    .replace(/\b(in|with|that|which|using|and then|for me)\b.*$/i, '')
    .trim();
}

// ── ambiguity ───────────────────────────────────────────────────────────────

const AMBIGUITY_RULES: Array<{ kind: Ambiguity['kind']; re: RegExp; severity: number; slot?: string }> = [
  { kind: 'vague-noun', re: /\b(something|anything|stuff|things|whatever|some kind of|a thing|etc\.?|and so on|you know)\b/i, severity: 0.9 },
  { kind: 'vague-adjective', re: VAGUE_ADJECTIVES, severity: 0.55 },
  { kind: 'hedge', re: /\b(maybe|kind of|sort of|idk|i don'?t know|not sure|probably|perhaps|or whatever)\b/i, severity: 0.6 },
  { kind: 'unbounded', re: /\b(as (?:much|many|long|detailed) as possible|no limit|unlimited|as needed|sky'?s the limit)\b/i, severity: 0.5 },
];

export function detectAmbiguities(text: string): Ambiguity[] {
  const out: Ambiguity[] = [];
  for (const rule of AMBIGUITY_RULES) {
    const global = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : `${rule.re.flags}g`);
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = global.exec(text)) !== null && guard < 8) {
      guard += 1;
      out.push({ kind: rule.kind, evidence: m[0].trim(), severity: rule.severity });
      if (m.index === global.lastIndex) global.lastIndex += 1;
    }
  }
  // Severity is the strongest single signal, but volume matters a little.
  if (out.length > 3) for (const a of out) a.severity = Math.min(1, a.severity + 0.05);
  return out;
}

// ── conflicts ───────────────────────────────────────────────────────────────

interface ConflictRule {
  id: string;
  a: RegExp;
  b: RegExp;
  description: string;
  question: string;
}

const CONFLICT_RULES: ConflictRule[] = [
  {
    id: 'short-vs-detailed',
    a: /\b(short|brief|concise|one[- ]page|tl;?dr|quick|minimal)\b/i,
    b: /\b(detailed|comprehensive|in-?depth|thorough|exhaustive|everything|complete guide)\b/i,
    description: 'The request asks for a short result and a comprehensive one at the same time.',
    question: 'You asked for something short and something comprehensive — which should win?',
  },
  {
    id: 'simple-vs-rich',
    a: /\b(simple|minimal|bare[- ]bones|mvp|basic|lightweight)\b/i,
    b: /\b(full[- ]featured|rich|advanced|everything|enterprise|complete)\b/i,
    description: 'The request asks for a minimal build and a feature-rich one at the same time.',
    question: 'Should this stay minimal, or include the full feature set?',
  },
  {
    id: 'cheap-vs-premium',
    a: /\b(cheap|budget|low[- ]cost|free|inexpensive|affordable)\b/i,
    b: /\b(premium|luxur\w+|high[- ]end|enterprise|best[- ]in[- ]class|expensive)\b/i,
    description: 'The request asks for both a low-cost and a premium outcome.',
    question: 'Budget or premium quality — which matters more here?',
  },
  {
    id: 'no-backend-vs-login',
    a: /\b(no|without) (?:a )?(backend|database|server)\b/i,
    b: /\b(login|sign[- ]?in|sign[- ]?up|accounts?|users? can (?:save|log ?in)|authentication)\b/i,
    description: 'Login and saved data were requested, but no backend or database was allowed.',
    question: 'You ruled out a backend but asked for logins — how should accounts work?',
  },
  {
    id: 'static-vs-dynamic',
    a: /\b(static site|static|plain html|no javascript|vanilla html)\b/i,
    b: /\b(react|next\.?js|vue|angular|svelte|dynamic|real[- ]time|dashboard)\b/i,
    description: 'A static/no-JavaScript constraint conflicts with the requested framework or behaviour.',
    question: 'Static HTML or a JavaScript framework — which constraint is firm?',
  },
  {
    id: 'dark-vs-light',
    a: /\b(dark (?:mode|theme)|black background)\b/i,
    b: /\b(light (?:mode|theme)|white background|bright)\b/i,
    description: 'Both a dark and a light visual direction were requested.',
    question: 'Dark or light as the primary theme?',
  },
  {
    id: 'free-vs-paid',
    a: /\b(free|no cost|open source)\b/i,
    b: /\b(paid|subscription|monetis\w+|monetiz\w+|charge|pricing tiers?)\b/i,
    description: 'The request asks for both a free and a paid/monetised product.',
    question: 'Is this free, or does it need a paid tier?',
  },
];

export function detectConflicts(text: string): Conflict[] {
  const out: Conflict[] = [];
  for (const rule of CONFLICT_RULES) {
    const a = rule.a.exec(text);
    const b = rule.b.exec(text);
    if (a && b) {
      out.push({
        id: rule.id,
        description: rule.description,
        evidence: [a[0].trim(), b[0].trim()],
        question: rule.question,
      });
    }
  }
  return out;
}

// ── main extraction ─────────────────────────────────────────────────────────

export interface ExtractResult {
  fields: Record<string, string | string[]>;
  detected: DetectedField[];
  subject: SubjectInfo;
}

export function extractRequirements(text: string, taskType: TaskType): ExtractResult {
  const clean = squash(text);
  const allowed = new Set(schemaFor(taskType).map((s) => s.id));
  // Slots that exist across schemas and are always worth reading.
  const universal = new Set([
    'output_format', 'deadline', 'budget', 'audience', 'language_out', 'level',
    'depth', 'tone', 'length', 'geography', 'recency', 'timeframe', 'constraints',
    'output_shape', 'must_include', 'must_avoid', 'topic',
  ]);

  const detected: DetectedField[] = [];
  const fields: Record<string, string | string[]> = {};

  for (const ex of EXTRACTORS) {
    if (ex.only && !ex.only.includes(taskType)) continue;
    if (!allowed.has(ex.slot) && !universal.has(ex.slot)) continue;

    const values: Array<{ value: string; evidence: string }> = [];
    if (ex.multi) {
      const global = new RegExp(ex.re.source, ex.re.flags.includes('g') ? ex.re.flags : `${ex.re.flags}g`);
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = global.exec(clean)) !== null && guard < 12) {
        guard += 1;
        const raw = m[ex.group ?? 0] ?? m[0] ?? '';
        const value = (ex.normalize ?? trim)(raw);
        if (value !== '') values.push({ value, evidence: m[0].trim() });
        if (m.index === global.lastIndex) global.lastIndex += 1;
      }
    } else {
      const m = ex.re.exec(clean);
      if (m) {
        const raw = m[ex.group ?? 0] ?? m[0] ?? '';
        const value = (ex.normalize ?? trim)(raw);
        if (value !== '') values.push({ value, evidence: m[0].trim() });
      }
    }
    if (values.length === 0) continue;

    const existing = fields[ex.slot];
    if (ex.multi) {
      const merged = new Set<string>([
        ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
        ...values.map((v) => v.value),
      ]);
      fields[ex.slot] = Array.from(merged);
    } else if (existing === undefined) {
      fields[ex.slot] = values[0]!.value;
    }
    detected.push({
      slot: ex.slot,
      value: ex.multi ? values.map((v) => v.value) : values[0]!.value,
      confidence: ex.confidence,
      evidence: values.map((v) => v.evidence).join(' · ').slice(0, 160),
    });
  }

  const subject = extractSubject(clean);

  // A narrow intent gates the niche questions that would be noise elsewhere.
  const intent = /\b(translate|translation|localise|localize|transliterate)\b/i.exec(clean)
    ? 'translate'
    : /\b(fix|debug|repair|traceback|exception|typeerror|stack ?trace)\b/i.test(clean)
      ? 'debug'
      : /\b(draw|illustrate|render|paint|sketch|photo|image of|picture of)\b/i.test(clean)
        ? 'illustrate'
        : '';
  subject.intent = intent;

  // "build me a <noun phrase>" without an explicit purpose is still a request
  // for a specific thing; record it so the engine does not ask what to build.
  //
  // Two corrections over the first implementation:
  //   1. the derivation never invents a verb the user did not type
  //      ("my script throws a TypeError" is not a request to "build" anything);
  //   2. it never runs for a debugging/coding request, where the subject is
  //      usually the symptom, not the deliverable.
  const userVerb = /\b(build|make|create|develop|design|launch|need|want|plan|write|draft|research)\b/i.exec(clean);
  const derivable = taskType !== 'coding' && userVerb !== null && subject.subject !== '';
  if (fields['purpose'] === undefined && derivable) {
    const allowedPurpose = schemaFor(taskType).find((sl) => sl.id === 'purpose' || sl.id === 'goal');
    if (allowedPurpose && fields[allowedPurpose.id] === undefined) {
      const value = userVerb[1]!.toLowerCase() === 'want' || userVerb[1]!.toLowerCase() === 'need'
        ? subject.subject
        : `${userVerb[1]!.toLowerCase()} ${subject.subject}`;
      fields[allowedPurpose.id] = value;
      detected.push({ slot: allowedPurpose.id, value, confidence: 0.6, evidence: subject.subject });
    }
  }

  // "explaining how DNS works", "about rain", "on the EV market" — the topic
  // is stated explicitly, so it must never be asked for again.
  if (fields['topic'] === undefined && allowed.has('topic')) {
    const topic = extractTopic(clean);
    if (topic !== '' && topic.split(' ').length <= 6) {
      fields['topic'] = topic.toLowerCase();
      detected.push({ slot: 'topic', value: topic.toLowerCase(), confidence: 0.65, evidence: topic });
    } else if (subject.subject !== '' && !DERIVATIVE_NOUN_RE.test(subject.subject)) {
      // No "about X" cue, but the classifier still found a real subject
      // ("build me an expense tracker app" is about expense tracking).
      //
      // A *derivative* noun is excluded: "write a cover letter" is not about a
      // cover letter in a useful sense, and filling `topic` from it produced the
      // exact generic question this test suite bans.
      const value = subject.subject.toLowerCase();
      if (!fields['topic']) {
        fields['topic'] = value;
        detected.push({ slot: 'topic', value, confidence: 0.5, evidence: subject.subject });
      }
    } else if (subject.subject !== '' && fields['audience'] !== undefined) {
      // "a blog post for first-time home buyers" — the *thing being written*
      // is a blog post, but the subject matter is the audience. Using it here
      // is the only reading that does not ask "what is it about?" of a request
      // that plainly says so.
      const audience = fields['audience'];
      const value = (Array.isArray(audience) ? audience[0] : audience) ?? '';
      if (value !== '' && !fields['topic']) {
        fields['topic'] = value;
        detected.push({ slot: 'topic', value, confidence: 0.5, evidence: `audience: ${value}` });
      }
    }
  }

  // Topic-ish slots for free-text-heavy categories.
  if (allowed.has('topic') && fields['topic'] === undefined) {
    const topic = extractTopic(clean);
    if (topic !== '') {
      fields['topic'] = topic;
      detected.push({ slot: 'topic', value: topic, confidence: 0.6, evidence: topic });
    }
  }
  if (allowed.has('subject') && fields['subject'] === undefined && subject.domain !== '') {
    fields['subject'] = subject.subject;
    detected.push({ slot: 'subject', value: subject.subject, confidence: 0.6, evidence: subject.domain });
  }

  // A quoted fragment is almost always the *material* of the request
  // ("translate "hello" to French", "fix the message "undefined is not a
  // function""). If no topic was extracted, the quote is the topic.
  if (fields['topic'] === undefined || fields['topic'] === '') {
    const quoted = /["“'']([^"”'']{2,80})["”'']/.exec(clean);
    if (quoted?.[1] && allowed.has('topic')) {
      const value = quoted[1].trim();
      fields['topic'] = value;
      detected.push({ slot: 'topic', value, confidence: 0.6, evidence: clean.slice(0, 40) });
    }
  }

  // `intent_kind` is not a requirement slot; it is the value conditional slots
  // test against ("only ask a translation for its source language"). Seeding it
  // here keeps the gating machinery in one place.
  if (intent !== '') fields['intent_kind'] = intent;

  // ── slot bridging ────────────────────────────────────────────────────────
  // Different schemas name the same idea differently. Asking "What exactly is
  // it about?" right after the user wrote "about rain" is the defect this
  // engine exists to avoid, so a detected value is copied into every equivalent
  // slot the category uses.
  const EQUIVALENT_SLOTS: string[][] = [
    ['topic', 'subject', 'question', 'problem'],
    ['purpose', 'goal', 'objective'],
  ];
  for (const group of EQUIVALENT_SLOTS) {
    const known = group.find((slot) => fields[slot] !== undefined && fields[slot] !== '');
    if (known === undefined) continue;
    const value = fields[known]!;
    const rendered = Array.isArray(value) ? value.join(', ') : value;
    // A purpose slot is prose; a bare topic label is still a valid answer to
    // "what is this about", so the copy is one-directional only when the target
    // is a text slot of equal or lower weight.
    for (const slot of group) {
      if (slot === known) continue;
      if (!allowed.has(slot) && !universal.has(slot)) continue;
      if (fields[slot] !== undefined && fields[slot] !== '') continue;
      const spec = schemaFor(taskType).find((sl) => sl.id === slot);
      if (spec?.kind !== 'text') continue;
      fields[slot] = rendered;
      detected.push({ slot, value: rendered, confidence: 0.55, evidence: `derived from ${known}` });
    }
  }

  // ── coding: "Fix this …", "why does …", "review my …" ───────────────────
  // The `goal` slot is a closed set (fix / debug / explain / write / refactor /
  // review / test), so it is read from the verb the user already used rather
  // than asked about. Its value also gates the conditional `error` slot.
  if (allowed.has('goal') && (fields['goal'] === undefined || fields['goal'] === '')) {
    const verb = /\b(fix(?:ing)?|debug(?:ging)?|repair|why (?:does|is|do)|explain|refactor|optimi[sz]e|review|write tests?|add tests?|test|build|write|implement|port|migrate)\b/i.exec(clean);
    const mapped: Record<string, string> = {
      fix: 'fix', fixing: 'fix', repair: 'fix',
      debug: 'debug', debugging: 'debug',
      'why does': 'debug', 'why is': 'debug', 'why do': 'debug',
      explain: 'explain',
      refactor: 'refactor', optimize: 'refactor', optimise: 'refactor',
      review: 'review',
      'write tests': 'test', 'add tests': 'test', test: 'test',
      build: 'write', write: 'write', implement: 'write', port: 'write', migrate: 'write',
    };
    const key = verb?.[1]?.toLowerCase();
    const value = key ? mapped[key] : undefined;
    if (value) {
      fields['goal'] = value;
      detected.push({ slot: 'goal', value, confidence: 0.7, evidence: verb![0] });
    }
  }

  // The error slot stores the *symptom*. Matching the whole clause keeps the
  // actual exception, which is the useful part.
  if (allowed.has('error') && (fields['error'] === undefined || fields['error'] === '' || fields['error'] === 'error')) {
    const symptom = /((?:type|value|name|key|index|attribute|import|syntax|runtime)?error|[A-Z][a-zA-Z]*(?:Error|Exception))\s*:?\s*([^.]{0,80})|\b(?:traceback|stack ?trace)\b/i.exec(clean);
    if (symptom) {
      const value = squash(symptom[0]).slice(0, 120);
      fields['error'] = value;
      detected.push({ slot: 'error', value, confidence: 0.7, evidence: value });
    }
  }

  // The pasted problem *is* the problem slot.
  if (allowed.has('problem') && (fields['problem'] === undefined || fields['problem'] === '')) {
    const hasCode = /```|\b(def |class |function |import |const |let |>\s*\d|\$ )/.test(text);
    const hasError = fields['error'] !== undefined;
    if (hasCode || hasError) {
      const value = squash(text).slice(0, 280);
      fields['problem'] = value;
      detected.push({ slot: 'problem', value, confidence: hasCode ? 0.75 : 0.6, evidence: value.slice(0, 80) });
    }
  }

  // A named framework implies a language; do not ask for what is implied.
  const FRAMEWORK_LANGUAGE: Record<string, string> = {
    react: 'typescript', next: 'typescript', nuxt: 'typescript', vue: 'typescript',
    svelte: 'typescript', angular: 'typescript', express: 'typescript', nest: 'typescript',
    'node.js': 'typescript', nodejs: 'typescript', tailwind: 'typescript',
    django: 'python', flask: 'python', fastapi: 'python', pandas: 'python',
    laravel: 'php', rails: 'ruby', spring: 'java', flutter: 'dart',
    'react native': 'typescript', expo: 'typescript', swiftui: 'swift',
  };
  if (fields['language'] === undefined && typeof fields['framework'] === 'string') {
    const implied = FRAMEWORK_LANGUAGE[String(fields['framework']).toLowerCase()];
    if (implied) {
      fields['language'] = implied;
      detected.push({ slot: 'language', value: implied, confidence: 0.6, evidence: `implied by ${String(fields['framework'])}` });
    }
  }

  return { fields, detected, subject };
}

/** Keywords of the prompt, used to write contextual questions. */
export function promptKeywords(text: string, limit = 4): string[] {
  return keywords(text, limit);
}
