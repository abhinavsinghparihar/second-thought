import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { copilotAdapter } from './copilot';
import { createGenericAdapter } from './generic';
import { geminiAdapter } from './gemini';
import type { ProviderAdapter } from './types';

/** Built-in adapters, most battle-tested first. */
export const BUILTIN_ADAPTERS: ProviderAdapter[] = [
  chatgptAdapter,
  claudeAdapter,
  geminiAdapter,
  copilotAdapter,
];

export interface ProviderDetection {
  adapter: ProviderAdapter | null;
  /** True when detection came from user-added custom sites. */
  custom: boolean;
}

/**
 * Resolve the adapter for a hostname. Custom (user-added) sites always use
 * the generic heuristic adapter; unknown hostnames yield null and Second
 * Thought stays completely passive.
 */
export function detectProvider(hostname: string, customSites: string[] = []): ProviderDetection {
  for (const adapter of BUILTIN_ADAPTERS) {
    if (adapter.matches(hostname)) return { adapter, custom: false };
  }
  for (const site of customSites) {
    const clean = site.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (hostname === clean || hostname.endsWith(`.${clean}`)) {
      return { adapter: createGenericAdapter('custom', clean), custom: true };
    }
  }
  return { adapter: null, custom: false };
}

/** All hostnames covered by built-in content scripts (for the manifest). */
export const BUILTIN_HOSTS: string[] = [
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
];
