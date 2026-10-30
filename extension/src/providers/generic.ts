import { isVisible, q, readInputText, writeInputText, type ProviderAdapter } from './types';

/**
 * Generic adapter for user-added sites (capability: unknown).
 * Heuristic: the largest visible contenteditable/textarea is the prompt
 * input; the nearest following submit-ish button is send. This is
 * intentionally conservative — when in doubt it returns null and
 * Second Thought simply stays passive on that site.
 */
export function createGenericAdapter(id: string, hostname: string): ProviderAdapter {
  return {
    id,
    name: hostname,
    capability: 'unknown',
    homepage: `https://${hostname}`,

    matches(h: string): boolean {
      return h === hostname || h.endsWith(`.${hostname}`);
    },

    findInput(): HTMLElement | null {
      if (typeof document === 'undefined') return null;
      const editors = Array.from(
        document.querySelectorAll<HTMLElement>(
          'textarea, div[contenteditable="true"], [role="textbox"]',
        ),
      ).filter(isVisible);
      let best: HTMLElement | null = null;
      let bestArea = 0;
      for (const el of editors) {
        const rect = el.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > bestArea) {
          best = el;
          bestArea = area;
        }
      }
      return best;
    },

    findSendButton(): HTMLElement | null {
      const input = this.findInput();
      if (!input) return null;
      const form = input.closest('form');
      if (form) {
        const submit = q<HTMLButtonElement>('button[type="submit"], button[aria-label*="send" i]', form);
        if (submit) return submit;
      }
      // Look for a small sibling button near the input.
      const container = input.closest('div');
      if (container) {
        const btns = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).filter(
          (b) => isVisible(b) && (b.getAttribute('aria-label')?.match(/send|submit/i) || b.type === 'submit'),
        );
        if (btns.length > 0) return btns[btns.length - 1]!;
      }
      return null;
    },

    getText(input: HTMLElement): string {
      return readInputText(input);
    },

    setText(input: HTMLElement, text: string): boolean {
      return writeInputText(input, text);
    },

    submit(): boolean {
      const btn = this.findSendButton();
      if (btn) {
        (btn as HTMLButtonElement).click();
        return true;
      }
      return false;
    },
  };
}
