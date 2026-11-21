import { createAdapter, type AdapterSpec } from './base';

/**
 * Claude (claude.ai).
 *
 * ProseMirror contenteditable inside a fieldset; the send control carries an
 * aria-label. Labels change more often than ChatGPT's test ids, so the selector
 * list is layered.
 *
 * Capability "partial": the adapter is DOM-tested against a fixture, but the
 * live app changes frequently and has not been verified against this build.
 */
const spec: AdapterSpec = {
  id: 'claude',
  name: 'Claude',
  capability: 'partial',
  homepage: 'https://claude.ai',
  hosts: ['claude.ai'],
  inputSelectors: [
    'div[contenteditable="true"].ProseMirror',
    'div.ProseMirror[contenteditable="true"]',
    'fieldset div[contenteditable="true"]',
    'div[aria-label*="Write your prompt" i][contenteditable="true"]',
    'form div[contenteditable="true"]',
    'main div[contenteditable="true"]',
  ],
  sendSelectors: [
    'button[aria-label*="Send message" i]',
    'button[aria-label*="Send" i]',
    'fieldset button[type="submit"]',
    'form button[type="submit"]',
  ],
  verification: 'DOM fixture only; live claude.ai not verified for this release.',
};

export const claudeAdapter = createAdapter(spec);
