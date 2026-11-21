import {
  AiError,
  fetchWithTimeout,
  normalizeBaseUrl,
  pick,
  readJson,
  type AiProviderAdapter,
} from './types';

const TIMEOUT_MS = 45_000;

/**
 * Custom provider — any OpenAI-compatible endpoint (Together, Fireworks,
 * DeepSeek, Mistral, LM Studio, vLLM, a company gateway, …). The user supplies
 * the base URL (…/v1); we call `<base>/chat/completions` and `<base>/models`.
 */
export const customAdapter: AiProviderAdapter = {
  meta: {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    defaultModel: '',
    models: [],
    needsKey: false,
    keyOptional: true,
    origin: '',
    transport: 'Your request text is sent from this browser directly to the base URL you entered, never to us.',
  },

  async complete(apiKey, model, request) {
    const base = normalizeBaseUrl(request.baseUrl);
    if (!base) {
      throw new AiError('unknown', 'Custom provider needs a valid Base URL (https://…/v1) in Settings.');
    }
    if (model.trim() === '') {
      throw new AiError('model-not-found', 'Custom provider has no model selected. Open Settings and pick one.');
    }
    const res = await fetchWithTimeout(
      `${base}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey.trim() !== '' ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 1400,
          ...(request.json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
        }),
        signal: request.signal,
      },
      TIMEOUT_MS,
      'Custom provider',
    );
    const body = await readJson(res, 'Custom provider');
    const content = pick(body, 'choices', 0, 'message', 'content');
    if (typeof content !== 'string' || content.trim() === '') {
      throw new AiError('bad-response', 'The custom provider returned an empty response.');
    }
    return content;
  },
};
