import {
  AiError,
  fetchWithTimeout,
  pick,
  readJson,
  type AiProviderAdapter,
} from './types';

const TIMEOUT_MS = 30_000;

/**
 * Anthropic Messages API.
 *
 * `anthropic-dangerous-direct-browser-access` is required for direct calls
 * from an extension. This is the documented, Anthropic-sanctioned header for
 * browser clients — we are not bypassing a control, we are opting in to the
 * supported path for BYOK browser apps.
 */
export const anthropicAdapter: AiProviderAdapter = {
  meta: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-5-haiku-latest',
    models: [
      'claude-3-5-haiku-latest',
      'claude-3-5-sonnet-latest',
      'claude-sonnet-4-20250514',
      'claude-3-7-sonnet-latest',
    ],
    keyUrl: 'https://console.anthropic.com/settings/keys',
    needsKey: true,
    origin: 'https://api.anthropic.com/*',
    transport: 'Your request text is sent from this browser directly to Anthropic, never to us.',
  },

  async complete(apiKey, model, request) {
    if (apiKey.trim() === '') {
      throw new AiError('no-key', 'Anthropic needs an API key. Add one in Settings.');
    }
    const res = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: request.maxTokens ?? 1400,
          temperature: request.temperature ?? 0.2,
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
        }),
        signal: request.signal,
      },
      TIMEOUT_MS,
      'Anthropic',
    );

    const body = await readJson(res, 'Anthropic');
    const stopReason = pick(body, 'stop_reason');
    const blocks = pick(body, 'content');
    if (!Array.isArray(blocks)) {
      throw new AiError('bad-response', 'Anthropic returned an unexpected response shape.');
    }
    const text = blocks
      .map((block) => (typeof pick(block, 'text') === 'string' ? String(pick(block, 'text')) : ''))
      .join('');
    if (text.trim() === '') {
      throw new AiError('bad-response', 'Anthropic returned an empty response.');
    }
    if (stopReason === 'max_tokens') {
      // Truncated JSON is a real failure mode; surface it rather than
      // half-parsing and silently dropping questions.
      throw new AiError('bad-response', 'Anthropic hit the token limit before finishing. Try a smaller request or another model.');
    }
    return text;
  },
};
