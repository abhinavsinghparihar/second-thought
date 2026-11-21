import {
  AiError,
  fetchWithTimeout,
  pick,
  readJson,
  type AiProviderAdapter,
} from './types';

const TIMEOUT_MS = 30_000;

/**
 * OpenAI (and OpenRouter and Groq, which are API-compatible).
 *
 * `response_format: json_object` is requested but not relied upon: some models
 * and proxies ignore it, so the caller still parses defensively.
 */
export function createOpenAiCompatibleAdapter(options: {
  id: 'openai' | 'openrouter' | 'groq';
  name: string;
  endpoint: string;
  defaultModel: string;
  models: string[];
  keyUrl: string;
  origin: string;
  extraHeaders?: Record<string, string>;
}): AiProviderAdapter {
  return {
    meta: {
      id: options.id,
      name: options.name,
      defaultModel: options.defaultModel,
      models: options.models,
      keyUrl: options.keyUrl,
      needsKey: true,
      origin: options.origin,
      transport: `Your request text is sent from this browser directly to ${options.name}, never to us.`,
    },

    async complete(apiKey, model, request) {
      if (apiKey.trim() === '') {
        throw new AiError('no-key', `${options.name} needs an API key. Add one in Settings.`);
      }
      const res = await fetchWithTimeout(
        options.endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            ...(options.extraHeaders ?? {}),
            ...(options.id === 'openrouter' ? { 'X-Title': 'Second Thought' } : {}),
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
        options.name,
      );

      const body = await readJson(res, options.name);
      const content = pick(body, 'choices', 0, 'message', 'content');
      const refusal = pick(body, 'choices', 0, 'message', 'refusal');
      if (typeof refusal === 'string' && refusal !== '') {
        throw new AiError('bad-response', `${options.name} declined to answer this request.`);
      }
      if (typeof content !== 'string' || content.trim() === '') {
        throw new AiError('bad-response', `${options.name} returned an empty response.`);
      }
      return content;
    },
  };
}

export const openaiAdapter = createOpenAiCompatibleAdapter({
  id: 'openai',
  name: 'OpenAI',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  defaultModel: 'gpt-4o-mini',
  models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
  keyUrl: 'https://platform.openai.com/api-keys',
  origin: 'https://api.openai.com/*',
});

export const openrouterAdapter = createOpenAiCompatibleAdapter({
  id: 'openrouter',
  name: 'OpenRouter',
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  defaultModel: 'openai/gpt-4o-mini',
  models: [
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-haiku',
    'google/gemini-2.0-flash-001',
    'meta-llama/llama-3.1-8b-instruct',
    'qwen/qwen-2.5-72b-instruct',
  ],
  keyUrl: 'https://openrouter.ai/keys',
  origin: 'https://openrouter.ai/*',
});

/**
 * Groq — OpenAI-compatible, very low latency, which suits the "pause before
 * send" moment well. Model ids change over time; any id can be typed into
 * Settings, these are just the suggestions.
 */
export const groqAdapter = createOpenAiCompatibleAdapter({
  id: 'groq',
  name: 'Groq',
  endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  defaultModel: 'llama-3.3-70b-versatile',
  models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  keyUrl: 'https://console.groq.com/keys',
  origin: 'https://api.groq.com/*',
});
