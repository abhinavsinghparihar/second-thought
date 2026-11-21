import {
  AiError,
  fetchWithTimeout,
  pick,
  readJson,
  type AiProviderAdapter,
} from './types';

const TIMEOUT_MS = 30_000;

/**
 * Google Gemini (generativelanguage v1beta).
 *
 * The key travels in the `x-goog-api-key` header, not in the query string, so
 * it never lands in a URL that could be logged by an intermediary.
 */
export const geminiAdapter: AiProviderAdapter = {
  meta: {
    id: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    keyUrl: 'https://aistudio.google.com/app/apikey',
    needsKey: true,
    origin: 'https://generativelanguage.googleapis.com/*',
    transport: 'Your request text is sent from this browser directly to Google, never to us.',
  },

  async complete(apiKey, model, request) {
    if (apiKey.trim() === '') {
      throw new AiError('no-key', 'Google Gemini needs an API key. Add one in Settings.');
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent`;

    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: 'user', parts: [{ text: request.user }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            maxOutputTokens: request.maxTokens ?? 1400,
            ...(request.json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
        signal: request.signal,
      },
      TIMEOUT_MS,
      'Google Gemini',
    );

    const body = await readJson(res, 'Google Gemini');
    const candidate = pick(body, 'candidates', 0);
    if (!candidate) {
      const blocked = pick(body, 'promptFeedback', 'blockReason');
      throw new AiError(
        'bad-response',
        typeof blocked === 'string'
          ? `Gemini blocked this request (${blocked}).`
          : 'Gemini returned no candidates.',
      );
    }
    const parts = pick(candidate, 'content', 'parts');
    const text = Array.isArray(parts)
      ? parts.map((p) => (typeof pick(p, 'text') === 'string' ? String(pick(p, 'text')) : '')).join('')
      : '';
    if (text.trim() === '') {
      throw new AiError('bad-response', 'Gemini returned an empty response.');
    }
    return text;
  },
};
