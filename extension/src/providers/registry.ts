import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { copilotAdapter } from './copilot';
import { createGenericAdapter } from './generic';
import { geminiAdapter } from './gemini';
import type { ProviderAdapter } from './types';

/**
 * Built-in adapters, most-verified first. The order matters: the first match
 * wins, and `supported` adapters must be tried before heuristic ones.
 */
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
 * Resolve the adapter for a hostname. Custom (user-added) sites always use the
 * generic heuristic adapter; unknown hostnames yield null and Second Thought
 * stays completely passive.
 */
export function detectProvider(hostname: string, customSites: string[] = []): ProviderDetection {
  const host = hostname.toLowerCase();
  for (const adapter of BUILTIN_ADAPTERS) {
    if (adapter.matches(host)) return { adapter, custom: false };
  }
  for (const site of customSites) {
    const clean = site.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (clean === '') continue;
    if (host === clean || host.endsWith(`.${clean}`)) {
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

/** Hostname patterns the manifest must declare, for the drift test. */
export function expectedContentScriptMatches(): string[] {
  return BUILTIN_HOSTS.map((host) => `https://${host}/*`);
}
