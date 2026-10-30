import { q, readInputText, writeInputText, type ProviderAdapter } from './types';

/**
 * Google Gemini (gemini.google.com) — partial adapter.
 * Quill-based rich editor (div.ql-editor) with a mat-icon send button.
 */
export const geminiAdapter: ProviderAdapter = {
  id: 'gemini',
  name: 'Google Gemini',
  capability: 'partial',
  homepage: 'https://gemini.google.com',

  matches(hostname: string): boolean {
    return hostname === 'gemini.google.com';
  },

  findInput(): HTMLElement | null {
    return q<HTMLElement>(
      'div.ql-editor[contenteditable="true"], rich-textarea div[contenteditable="true"], main div[contenteditable="true"][aria-label*="prompt" i], main div[contenteditable="true"]',
    );
  },

  findSendButton(): HTMLElement | null {
    return q<HTMLElement>(
      'button.send-button, button[aria-label*="send" i], button[mattooltip*="send" i], main button[data-test-id="send-button"]',
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
    const input = this.findInput();
    if (input) {
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true,
      }));
      return true;
    }
    return false;
  },
};
