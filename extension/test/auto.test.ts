import { describe, expect, it } from 'vitest';
import { detectBuyRequest, buildBuyQuestions, buildBuyPrompt } from '../src/background/local-buy';
import { pickBestModel } from '../src/background/providers/models';
import { normalizeBaseUrl } from '../src/background/providers/types';

describe('offline buying questions', () => {
  it('detects English, Hinglish and Devanagari buying requests', () => {
    expect(detectBuyRequest('i want a laptop')).toMatchObject({ category: 'laptop', lang: 'en' });
    expect(detectBuyRequest('mujhe ek laptop chahiye')).toMatchObject({ category: 'laptop', lang: 'hl' });
    expect(detectBuyRequest('मुझे एक लैपटॉप चाहिए')).toMatchObject({ category: 'laptop', lang: 'hi' });
  });
  it('ignores repair and unrelated requests', () => {
    expect(detectBuyRequest('my laptop is slow, how to fix')).toBeNull();
    expect(detectBuyRequest('Build me an expense app')).toBeNull();
  });
  it('asks budget, RAM and storage as multiple choice and keeps the original words', () => {
    const d = detectBuyRequest('i want a laptop')!;
    const slots = buildBuyQuestions(d).map((q) => q.slot);
    expect(slots).toEqual(expect.arrayContaining(['budget_range', 'ram', 'storage']));
    const prompt = buildBuyPrompt(d, 'i want a laptop', { ram: '16 GB' });
    expect(prompt).toContain('i want a laptop');
    expect(prompt).toContain('RAM: 16 GB');
  });
});

describe('automatic model choice', () => {
  const ids = (list: string[]) => list.map((id) => ({ id }));
  it('skips non-chat models and picks a fast, reliable one', () => {
    expect(pickBestModel('openai', ids(['gpt-4o', 'gpt-4o-mini', 'text-embedding-3-small', 'whisper-1']))).toBe('gpt-4o-mini');
    expect(pickBestModel('groq', ids(['whisper-large-v3', 'llama-3.3-70b-versatile']))).toBe('llama-3.3-70b-versatile');
    expect(pickBestModel('gemini', ids(['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-preview-05-20']))).toBe('gemini-2.5-flash');
    expect(pickBestModel('anthropic', ids(['claude-opus-4-5', 'claude-haiku-4-5']))).toBe('claude-haiku-4-5');
  });
  it('prefers a capable free OpenRouter model', () => {
    const pick = pickBestModel('openrouter', [
      { id: 'openai/gpt-4o-mini', price: 1.5e-7, context: 128000 },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', free: true, context: 131072 },
    ]);
    expect(pick).toBe('meta-llama/llama-3.3-70b-instruct:free');
  });
});

describe('custom provider base URL', () => {
  it('accepts https and local http only, and strips junk', () => {
    expect(normalizeBaseUrl('https://api.together.xyz/v1/')).toBe('https://api.together.xyz/v1');
    expect(normalizeBaseUrl('http://localhost:1234/v1')).toBe('http://localhost:1234/v1');
    expect(normalizeBaseUrl('https://x.com/v1?key=1#a')).toBe('https://x.com/v1');
    expect(normalizeBaseUrl('http://example.com/v1')).toBeNull();
    expect(normalizeBaseUrl('https://user:pw@x.com/v1')).toBeNull();
    expect(normalizeBaseUrl('javascript:alert(1)')).toBeNull();
  });
});
