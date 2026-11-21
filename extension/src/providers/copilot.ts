import { createAdapter, type AdapterSpec } from './base';

/**
 * Microsoft Copilot (copilot.microsoft.com).
 *
 * The surface is rewritten often and has no stable test ids, so detection here
 * is heuristic: the largest visible textarea or contenteditable in <main>.
 *
 * Capability "unknown" — deliberately honest. It is registered so the user can
 * try it, and every failure path releases their original send untouched.
 */
const spec: AdapterSpec = {
  id: 'copilot',
  name: 'Microsoft Copilot',
  capability: 'unknown',
  homepage: 'https://copilot.microsoft.com',
  hosts: ['copilot.microsoft.com'],
  matchSubdomains: true,
  inputSelectors: [
    'main textarea',
    'form textarea',
    'main div[contenteditable="true"][role="textbox"]',
    'main div[contenteditable="true"]',
  ],
  sendSelectors: [
    'button[aria-label*="Submit" i]',
    'button[aria-label*="Send" i]',
    'main button[data-testid="send-button"]',
    'form button[type="submit"]',
  ],
  verification: 'Not tested against the live site. Heuristic selectors.',
};

export const copilotAdapter = createAdapter(spec);
