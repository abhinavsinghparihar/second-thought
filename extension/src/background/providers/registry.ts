import { anthropicAdapter } from './anthropic';
import { customAdapter } from './custom';
import { geminiAdapter } from './gemini';
import { ollamaAdapter } from './ollama';
import { groqAdapter, openaiAdapter, openrouterAdapter } from './openai';
import type { AiProviderAdapter, AiProviderMeta, AiProviderId } from './types';

/**
 * Modular AI provider registry.
 *
 * Adding a provider = one adapter file + one line here. The worker and the
 * options UI are both driven entirely by this registry, so a new provider is
 * immediately configurable and immediately covered by the connection test.
 */
export const AI_ADAPTERS: Record<AiProviderId, AiProviderAdapter> = {
  gemini: geminiAdapter,
  groq: groqAdapter,
  openai: openaiAdapter,
  openrouter: openrouterAdapter,
  anthropic: anthropicAdapter,
  ollama: ollamaAdapter,
  custom: customAdapter,
};

/** Preferred display order in Settings. */
export const AI_PROVIDER_ORDER: AiProviderId[] = [
  'gemini',
  'groq',
  'openai',
  'anthropic',
  'openrouter',
  'ollama',
  'custom',
];

export function adapterFor(id: AiProviderId): AiProviderAdapter | undefined {
  return AI_ADAPTERS[id];
}

export function providerMeta(id: AiProviderId): AiProviderMeta | undefined {
  return AI_ADAPTERS[id]?.meta;
}

export function allProviderMeta(): AiProviderMeta[] {
  return AI_PROVIDER_ORDER.map((id) => AI_ADAPTERS[id].meta);
}

/** Every host origin the extension may need for AI calls. */
export function providerOrigins(): string[] {
  return AI_PROVIDER_ORDER.map((id) => AI_ADAPTERS[id].meta.origin).filter((origin) => origin !== '');
}

export function isAiProviderId(value: unknown): value is AiProviderId {
  return typeof value === 'string' && value in AI_ADAPTERS;
}
