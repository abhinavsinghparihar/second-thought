import { createAdapter, type AdapterSpec } from './base';

/**
 * Google Gemini (gemini.google.com).
 *
 * Quill-based rich editor (`div.ql-editor`) inside a <rich-textarea>, with a
 * mat-icon send button exposed as `button.send-button`.
 *
 * Capability "partial": DOM-tested against a fixture; the live app is
 * Angular-rendered and not verified for this release.
 */
const spec: AdapterSpec = {
  id: 'gemini',
  name: 'Google Gemini',
  capability: 'partial',
  homepage: 'https://gemini.google.com',
  hosts: ['gemini.google.com'],
  inputSelectors: [
    'div.ql-editor[contenteditable="true"]',
    'rich-textarea div[contenteditable="true"]',
    'main div[contenteditable="true"][aria-label*="prompt" i]',
    'main div[contenteditable="true"][role="textbox"]',
  ],
  sendSelectors: [
    'button.send-button',
    'button[aria-label*="Send message" i]',
    'button[mattooltip*="Send" i]',
    'main button[data-test-id="send-button"]',
  ],
  verification: 'DOM fixture only; live gemini.google.com not verified for this release.',
};

export const geminiAdapter = createAdapter(spec);
