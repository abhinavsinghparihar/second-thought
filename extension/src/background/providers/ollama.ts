import {
  AiError,
  fetchWithTimeout,
  pick,
  readJson,
  type AiProviderAdapter,
} from './types';

const TIMEOUT_MS = 45_000;

/**
 * Ollama — a local model server. No API key, no data leaves the machine.
 * Kept from the original implementation because it is the only zero-egress
 * AI option and it already existed.
 */
export const ollamaAdapter: AiProviderAdapter = {
  meta: {
    id: 'ollama',
    name: 'Ollama (local)',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'llama3.2', 'qwen2.5', 'mistral', 'phi3'],
    needsKey: false,
    origin: 'http://127.0.0.1:11434/*',
    transport: 'Runs entirely on your machine. Nothing leaves your computer.',
  },

  async complete(_apiKey, model, request) {
    let res: Response;
    try {
      res = await fetchWithTimeout(
      'http://127.0.0.1:11434/api/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          ...(request.json ? { format: 'json' } : {}),
          options: { temperature: request.temperature ?? 0.2 },
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
        }),
        signal: request.signal,
      },
      TIMEOUT_MS,
      'Ollama',
      );
    } catch (err) {
      throw explainOllama(err);
    }

    let body: Record<string, unknown>;
    try {
      body = await readJson(res, 'Ollama');
    } catch (err) {
      throw explainOllama(err);
    }
    const content = pick(body, 'message', 'content');
    if (typeof content !== 'string' || content.trim() === '') {
      throw new AiError('bad-response', 'Ollama returned an empty response. Is the model pulled?');
    }
    return content;
  },
};

/**
 * Turn the two classic Ollama failures into instructions a person can act on.
 *
 *  - "network": Ollama is not running, or the extension has not been allowed to
 *    reach 127.0.0.1 yet (Settings → Test connection asks for that permission).
 *  - 403: Ollama only accepts browser requests from origins listed in
 *    OLLAMA_ORIGINS; a Chrome extension's origin is chrome-extension://<id>.
 */
export function explainOllama(err: unknown): AiError {
  if (err instanceof AiError) {
    if (err.status === 403) {
      return new AiError(
        'auth',
        'Ollama refused the request (403). Start Ollama with OLLAMA_ORIGINS=chrome-extension://* (then restart it) so it accepts this extension.',
        { status: 403 },
      );
    }
    if (err.kind === 'network') {
      return new AiError(
        'network',
        'Could not reach Ollama at 127.0.0.1:11434. Make sure it is running (ollama serve) and click "Test connection" once so the extension can ask for access.',
      );
    }
    if (err.kind === 'model-not-found' || err.status === 404) {
      return new AiError('model-not-found', 'Ollama does not have this model. Pick an installed one in Settings, or run: ollama pull <model>.', { status: 404 });
    }
    return err;
  }
  return new AiError('unknown', 'Ollama request failed unexpectedly.');
}
