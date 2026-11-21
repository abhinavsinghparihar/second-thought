/** Small, dependency-free text helpers shared by the whole engine. */

export function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Scripts written without spaces between words (Chinese, Japanese, Thai, Lao, Khmer, Burmese). */
const UNSPACED_SCRIPT = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0eff\u1000-\u109f\u1780-\u17ff]/;

/**
 * Word count that does not collapse an entire Chinese/Japanese/Thai sentence
 * into "1 word". Unspaced scripts count roughly one word per two characters,
 * which is close enough for length gating.
 */
export function wordCount(text: string): number {
  const t = text.trim();
  if (t === '') return 0;
  let total = 0;
  for (const token of t.split(/\s+/)) {
    if (UNSPACED_SCRIPT.test(token)) {
      total += Math.max(1, Math.ceil(Array.from(token).length / 2));
    } else {
      total += 1;
    }
  }
  return total;
}

export function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function capitalize(text: string): string {
  const t = text.trim();
  return t === '' ? t : t.charAt(0).toUpperCase() + t.slice(1);
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/** "a, b and c" */
export function joinNatural(items: string[], conjunction = 'and'): string {
  const list = items.filter((i) => i !== '');
  if (list.length === 0) return '';
  if (list.length === 1) return list[0]!;
  if (list.length === 2) return `${list[0]} ${conjunction} ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} ${conjunction} ${list[list.length - 1]}`;
}

export function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function asText(value: string | string[] | undefined): string {
  return asList(value).join(', ');
}

/** Strip trailing punctuation so values compose cleanly into sentences. */
export function bare(text: string): string {
  return text.trim().replace(/[.;,]+$/, '');
}

/** Does `haystack` already contain `needle` as a word-ish sequence? */
export function mentions(haystack: string, needle: string): boolean {
  const h = squash(haystack).toLowerCase();
  const n = squash(needle).toLowerCase();
  if (n === '') return false;
  if (h.includes(n)) return true;
  // Singular/plural tolerance for single words.
  if (!n.includes(' ')) {
    const stem = n.replace(/(?:s|es)$/, '');
    if (stem.length >= 4 && h.includes(stem)) return true;
  }
  return false;
}

/** Deterministic, monotonic id generator (no Math.random — test friendly). */
let counter = 0;
export function nextId(prefix = 'a'): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to an integer percentage and keep it inside 0–100. */
export function percent(value: number): number {
  return clamp(Math.round(value), 0, 100);
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'without', 'to', 'in', 'on', 'of',
  'my', 'our', 'your', 'me', 'us', 'i', 'we', 'you', 'it', 'its', 'this', 'that', 'these',
  'those', 'some', 'any', 'please', 'can', 'could', 'would', 'should', 'will', 'want',
  'need', 'make', 'build', 'create', 'write', 'design', 'help', 'give', 'get', 'using',
  'use', 'about', 'from', 'as', 'at', 'by', 'be', 'is', 'are', 'was', 'were', 'really',
  'very', 'super', 'just', 'also', 'into', 'like', 'so', 'then', 'than', 'there', 'here',
  'what', 'which', 'who', 'how', 'why', 'where', 'when', 'do', 'does', 'did', 'has',
  'have', 'had', 'not', 'no', 'yes', 'all', 'more', 'most', 'other', 'new', 'one', 'two',
  'app', 'application', 'website', 'site', 'tool', 'thing', 'something',
]);

/** Content words from a phrase, used to build a short subject/domain name. */
export function keywords(text: string, limit = 3): string[] {
  const words = squash(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return unique(words).slice(0, limit);
}
