import { q, readInputText, writeInputText, type ProviderAdapter } from './types';

/**
 * ChatGPT (chatgpt.com) — the flagship adapter.
 *
 * Known surface (validated selectors, with layered fallbacks):
 *  - Input:     div#prompt-textarea (ProseMirror contenteditable); older
 *               builds used a plain textarea[data-id].
 *  - Send:      button[data-testid="send-button"]; aria-label fallback.
 * Enter sends (Shift+Enter = newline).
 */
export const chatgptAdapter: ProviderAdapter = {
  id: 'chatgpt',
  name: 'ChatGPT',
  capability: 'supported',
  homepage: 'https://chatgpt.com',

  matches(hostname: string): boolean {
    return hostname === 'chatgpt.com' || hostname === 'chat.openai.com';
  },

  findInput(): HTMLElement | null {
    const el = q<HTMLElement>('#prompt-textarea, div[contenteditable="true"]#prompt-textarea, form div[contenteditable="true"][id*="prompt" i], form textarea[data-id], form textarea');
    return el;
  },

  findSendButton(): HTMLElement | null {
    return q<HTMLElement>(
      'button[data-testid="send-button"], form button[data-testid], button[aria-label*="send" i], form button[type="submit"]',
    );
  },

  getText(input: HTMLElement): string {
    return readInputText(input);
  },

  setText(input: HTMLElement, text: string): boolean {
    return writeInputText(input, text);
  },

  submit(): boolean {
    const btn = this.findSendButton();
    if (btn && !(btn as HTMLButtonElement).disabled) {
      (btn as HTMLButtonElement).click();
      return true;
    }
    // Fallback: synthesize Enter on the input.
    const input = this.findInput();
    if (input) {
      const evt = new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true,
      });
      input.dispatchEvent(evt);
      return true;
    }
    return false;
  },
};
