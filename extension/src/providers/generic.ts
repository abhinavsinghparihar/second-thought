import type { ProviderCapability } from '../shared/types';
import type { ProviderAdapter } from './types';
import {
  dispatchEnter,
  largestVisible,
  writeText,
  type AdapterSpec,
} from './base';
import { isVisible, q } from './types';

/**
 * Generic adapter for user-added sites.
 *
 * Heuristic by design: the largest visible editor is the composer, and the
 * nearest submit-ish control is send. It is conservative — when in doubt it
 * returns null and Second Thought simply stays passive on that site.
 */
export function createGenericAdapter(id: string, hostname: string): ProviderAdapter {
  const spec: AdapterSpec = {
    id,
    name: hostname,
    capability: 'unknown',
    homepage: `https://${hostname}`,
    hosts: [hostname],
    matchSubdomains: true,
    inputSelectors: [],
    sendSelectors: [],
    verification: 'Heuristic. Not tested against this site.',
  };

  return {
    id: spec.id,
    name: spec.name,
    capability: spec.capability as ProviderCapability,
    homepage: spec.homepage,

    matches(host: string): boolean {
      const clean = host.toLowerCase();
      return clean === hostname || clean.endsWith(`.${hostname}`);
    },

    findInput(): HTMLElement | null {
      try {
        if (typeof document === 'undefined') return null;
        return largestVisible(['textarea', 'div[contenteditable="true"]', '[role="textbox"]']);
      } catch {
        return null;
      }
    },

    findSendButton(): HTMLElement | null {
      try {
        const input = this.findInput();
        if (!input) return null;

        const form = input.closest('form');
        if (form) {
          const submit = q<HTMLElement>('button[type="submit"], button[aria-label*="send" i]', form);
          if (submit && isVisible(submit)) return submit;
        }

        // Look outwards through a few ancestors for a nearby send control.
        let scope: HTMLElement | null = input.parentElement;
        for (let depth = 0; depth < 4 && scope; depth += 1) {
          const buttons = Array.from(scope.querySelectorAll<HTMLElement>('button')).filter((button) => {
            if (!isVisible(button)) return false;
            const label = button.getAttribute('aria-label') ?? button.textContent ?? '';
            const isSubmit = button instanceof HTMLButtonElement && button.type === 'submit';
            return isSubmit || /send|submit/i.test(label);
          });
          if (buttons.length > 0) return buttons[buttons.length - 1] ?? null;
          scope = scope.parentElement;
        }
        return null;
      } catch {
        return null;
      }
    },

    getText(input: HTMLElement): string {
      if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) return input.value;
      return input.innerText ?? input.textContent ?? '';
    },

    setText(input: HTMLElement, text: string): boolean {
      return writeText(input, text);
    },

    submit(): boolean {
      try {
        const button = this.findSendButton();
        if (button && !(button as HTMLButtonElement).disabled) {
          button.click();
          return true;
        }
        const input = this.findInput();
        if (!input) return false;
        input.focus();
        dispatchEnter(input);
        return true;
      } catch {
        return false;
      }
    },
  };
}
