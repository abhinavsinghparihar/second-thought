import { createAdapter, type AdapterSpec } from './base';

/**
 * ChatGPT (chatgpt.com / chat.openai.com).
 *
 * Verified structure: `#prompt-textarea` is a ProseMirror contenteditable;
 * the send control is `button[data-testid="send-button"]`. Enter sends,
 * Shift+Enter inserts a newline.
 *
 * Capability "supported": covered by the jsdom fixture in
 * extension/test/dom/adapters.test.ts, which reproduces this DOM and asserts
 * read, write, and submit.
 */
const spec: AdapterSpec = {
  id: 'chatgpt',
  name: 'ChatGPT',
  capability: 'supported',
  homepage: 'https://chatgpt.com',
  hosts: ['chatgpt.com', 'chat.openai.com'],
  inputSelectors: [
    '#prompt-textarea',
    'form div[contenteditable="true"]#prompt-textarea',
    'form div[contenteditable="true"][id*="prompt" i]',
    'form textarea[data-id]',
    'form textarea',
    // Layout-independent fallbacks if ChatGPT renames the composer id:
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    '[data-testid="prompt-textarea"]',
  ],
  sendSelectors: [
    'button[data-testid="send-button"]',
    'form button[data-testid="send-button"]',
    'button[aria-label*="Send prompt" i]',
    'button[aria-label*="send" i]',
    'form button[type="submit"]',
    'button[data-testid="composer-submit-button"]',
  ],
  verification: 'Input, text insertion and submit exercised in a DOM fixture.',
};

export const chatgptAdapter = createAdapter(spec);
