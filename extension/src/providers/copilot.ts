import { isVisible, q, readInputText, writeInputText, type ProviderAdapter } from './types';

/**
 * Microsoft Copilot (copilot.microsoft.com) — adapter with unknown maturity.
 * The surface changes frequently; selectors are heuristic and QA is pending,
 * hence capability "unknown". Failure behavior is identical to other
 * adapters: any error releases the user's original send untouched.
 */
export const copilotAdapter: ProviderAdapter = {
  id: 'copilot',
  name: 'Microsoft Copilot',
  capability: 'unknown',
  homepage: 'https://copilot.microsoft.com',

  matches(hostname: string): boolean {
    return hostname === 'copilot.microsoft.com' || hostname.endsWith('.copilot.microsoft.com');
  },

  findInput(): HTMLElement | null {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>('main textarea, form textarea, div[contenteditable="true"]'),
    ).filter(isVisible);
    return candidates[0] ?? null;
  },

  findSendButton(): HTMLElement | null {
    return q<HTMLElement>(
      'button[aria-label*="submit" i], button[aria-label*="send" i], main button[data-testid="send-button"], form button[type="submit"]',
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
    return false;
  },
};
