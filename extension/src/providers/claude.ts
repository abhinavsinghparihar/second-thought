import { q, readInputText, writeInputText, type ProviderAdapter } from './types';

/**
 * Claude (claude.ai) — partial adapter.
 * ProseMirror-based contenteditable; DOM labels change fairly often, so
 * this adapter uses layered selectors. Capability is reported honestly as
 * "partial" until QA signs off on a specific build.
 */
export const claudeAdapter: ProviderAdapter = {
  id: 'claude',
  name: 'Claude',
  capability: 'partial',
  homepage: 'https://claude.ai',

  matches(hostname: string): boolean {
    return hostname === 'claude.ai';
  },

  findInput(): HTMLElement | null {
    return q<HTMLElement>(
      'div[contenteditable="true"].ProseMirror, div.ProseMirror[contenteditable="true"], fieldset div[contenteditable="true"], div[aria-label*="write" i][contenteditable="true"], form div[contenteditable="true"]',
    );
  },

  findSendButton(): HTMLElement | null {
    return q<HTMLElement>(
      'button[aria-label*="send message" i], button[aria-label*="send" i], fieldset button[type="submit"], form button[type="submit"]',
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
