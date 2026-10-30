import type { AiProviderId } from '../shared/settings';

/**
 * AI-powered analysis client. Talks DIRECTLY from the browser to the
 * user's chosen provider — no Second Thought server in between, no key
 * ever leaves the machine except to the provider itself.
 *
 * The model is used ONLY to generate clarification questions; requirement
 * merging and prompt construction stay deterministic (core engine), so the
 * final prompt is predictable and auditable.
 */

export interface AiQuestion {
  slot: string;
  text: string;
  kind: 'single' | 'multi' | 'text';
  options: Array<{ value: string; label: string }>;
  allowCustom?: boolean;
}

export interface AiAnalysis {
  intent?: string;
  questions: AiQuestion[];
}

const INSTRUCTIONS = `You are the question engine inside "Second Thought", a requirement-discovery layer.
Given a user's AI request, identify the 2-3 most important MISSING details whose absence would materially change the quality of the AI's answer.
Rules:
- Never ask about details the user already provided.
- Prefer multiple-choice questions with 4-6 short options.
- At most 3 questions. Skip questions whose answers would not change the result.
- Be concrete and neutral; never imply the request is bad.
Respond with STRICT JSON only, no markdown fences, matching:
{"intent": "<one-line reading of the user's goal>",
 "questions": [{"slot": "<snake_case_slot>", "text": "<question>", "kind": "single|multi|text",
                "options": [{"value": "<v>", "label": "<label>"}], "allowCustom": true}]}`;

export async function generateQuestionsWithAi(
  provider: AiProviderId,
  model: string,
  apiKey: string,
  userText: string,
): Promise<AiAnalysis> {
  const raw = await callProvider(provider, model, apiKey, userText);
  return parseAiJson(raw);
}

/** Exported for unit tests — hardens the boundary against model output drift. */
export function parseAiJson(raw: string): AiAnalysis {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI response did not contain JSON');
  const parsed = JSON.parse(text.slice(start, end + 1)) as AiAnalysis;
  if (!Array.isArray(parsed.questions)) throw new Error('AI response missing questions');
  parsed.questions = parsed.questions
    .filter((q) => typeof q?.slot === 'string' && typeof q?.text === 'string')
    .slice(0, 3)
    .map((q) => ({
      slot: q.slot,
      text: String(q.text).slice(0, 200),
      kind: q.kind === 'multi' || q.kind === 'text' ? q.kind : 'single',
      options: Array.isArray(q.options)
        ? q.options
            .filter((o) => o && typeof o.value === 'string')
            .slice(0, 6)
            .map((o) => ({ value: String(o.value).slice(0, 80), label: String(o.label ?? o.value).slice(0, 80) }))
        : [],
      allowCustom: q.allowCustom !== false,
    }));
  return parsed;
}

async function callProvider(
  provider: AiProviderId,
  model: string,
  apiKey: string,
  userText: string,
): Promise<string> {
  const userContent = `User request:\n"""${userText.slice(0, 2000)}"""`;
  switch (provider) {
    case 'openai':
    case 'openrouter': {
      const url = provider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };
      if (provider === 'openrouter') headers['X-Title'] = 'Second Thought';
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 500,
          messages: [
            { role: 'system', content: INSTRUCTIONS },
            { role: 'user', content: userContent },
          ],
        }),
      });
      return extractOpenAi(res);
    }
    case 'anthropic': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          // Required to call the Messages API directly from a browser extension.
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 500,
          system: INSTRUCTIONS,
          messages: [{ role: 'user', content: userContent }],
        }),
      });
      return extractAnthropic(res);
    }
    case 'gemini': {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
        }),
      });
      return extractGemini(res);
    }
    case 'ollama': {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          options: { temperature: 0.2 },
          messages: [
            { role: 'system', content: INSTRUCTIONS },
            { role: 'user', content: userContent },
          ],
        }),
      });
      const body = await res.json().catch(() => { throw httpError(res); });
      if (!res.ok) throw new Error(`Ollama error ${res.status}`);
      const content = body?.message?.content;
      if (typeof content !== 'string') throw new Error('Ollama returned no content');
      return content;
    }
    default:
      throw new Error(`Unknown provider: ${provider as string}`);
  }
}

function httpError(res: Response): Error {
  return new Error(`Provider error ${res.status}`);
}

async function extractOpenAi(res: Response): Promise<string> {
  const body = await res.json().catch(() => { throw httpError(res); });
  if (!res.ok) throw new Error(body?.error?.message ?? `OpenAI error ${res.status}`);
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('OpenAI returned no content');
  return content;
}

async function extractAnthropic(res: Response): Promise<string> {
  const body = await res.json().catch(() => { throw httpError(res); });
  if (!res.ok) throw new Error(body?.error?.message ?? `Anthropic error ${res.status}`);
  const block = body?.content?.[0]?.text;
  if (typeof block !== 'string') throw new Error('Anthropic returned no content');
  return block;
}

async function extractGemini(res: Response): Promise<string> {
  const body = await res.json().catch(() => { throw httpError(res); });
  if (!res.ok) throw new Error(body?.error?.message ?? `Gemini error ${res.status}`);
  const parts = body?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p: { text?: string }) => p?.text ?? '').join('') : '';
  if (typeof text !== 'string' || text === '') throw new Error('Gemini returned no content');
  return text;
}
