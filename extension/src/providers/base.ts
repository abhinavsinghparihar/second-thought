import type { ProviderCapability } from '../shared/types';
import type { ProviderAdapter } from './types';
import { isVisible } from './types';

/**
 * Shared adapter implementation.
 *
 * The original code duplicated ~40 lines of identical logic across five files,
 * which is how the adapters drifted (Copilot had no Enter fallback, the generic
 * adapter clicked disabled buttons, etc.). Everything common lives here; an
 * adapter is now just its selectors and a capability label.
 */

export interface AdapterSpec {
  id: string;
  name: string;
  capability: ProviderCapability;
  homepage: string;
  /** Hostnames this adapter is responsible for (exact match). */
  hosts: string[];
  /** Also match subdomains of the hosts above. */
  matchSubdomains?: boolean;
  /** Ordered input selectors; the first *visible* match wins. */
  inputSelectors: string[];
  /** Ordered send-button selectors. */
  sendSelectors: string[];
  /** What has actually been verified for this adapter, shown in the UI. */
  verification: string;
}

/** First visible element matching any of the selectors, in order. */
export function queryVisible(selectors: string[], root: ParentNode = document): HTMLElement | null {
  for (const selector of selectors) {
    let matches: NodeListOf<Element>;
    try {
      matches = root.querySelectorAll(selector);
    } catch {
      continue; // invalid selector on this browser
    }
    for (const element of Array.from(matches)) {
      if (element instanceof HTMLElement && isVisible(element)) return element;
    }
  }
  return null;
}

/**
 * True when the element can accept programmatic text.
 *
 * `isContentEditable` is the correct check but it is not dependable everywhere:
 * it is missing in some DOM implementations and can report `false` for elements
 * that are editable via the attribute (notably inside shadow roots). Falling
 * back to the attribute means the adapter finds the composer instead of
 * silently typing into nothing.
 */
export function isEditable(element: HTMLElement): boolean {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) return true;
  if (element.isContentEditable === true) return true;
  const attr = element.getAttribute('contenteditable');
  return attr !== null && attr.toLowerCase() !== 'false';
}

export function createAdapter(spec: AdapterSpec): ProviderAdapter {
  return {
    id: spec.id,
    name: spec.name,
    capability: spec.capability,
    homepage: spec.homepage,

    matches(hostname: string): boolean {
      const host = hostname.toLowerCase();
      return spec.hosts.some(
        (candidate) => host === candidate || (spec.matchSubdomains === true && host.endsWith(`.${candidate}`)),
      );
    },

    findInput(): HTMLElement | null {
      try {
        const element = queryVisible(spec.inputSelectors);
        if (!element) return null;
        return isEditable(element) ? element : null;
      } catch {
        return null;
      }
    },

    findSendButton(): HTMLElement | null {
      try {
        const explicit = queryVisible(spec.sendSelectors);
        if (explicit) return explicit;
        // Fallback: the nearest submit-ish button to the composer.
        const input = this.findInput();
        const form = input?.closest('form');
        if (form) {
          const submit = form.querySelector<HTMLElement>('button[type="submit"]');
          if (submit && isVisible(submit)) return submit;
        }
        return null;
      } catch {
        return null;
      }
    },

    getText(input: HTMLElement): string {
      if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) return input.value;
      // innerText respects line breaks in contenteditable editors.
      const text = input.innerText;
      return typeof text === 'string' ? text : input.textContent ?? '';
    },

    setText(input: HTMLElement, text: string): boolean {
      return writeText(input, text);
    },

    submit(): boolean {
      try {
        const button = this.findSendButton();
        if (button && !isDisabled(button) && isVisible(button)) {
          button.click();
          return true;
        }
        // Keyboard fallback — many editors submit on Enter and expose no
        // reliable button (or keep it disabled until a real key event).
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

function isDisabled(element: HTMLElement): boolean {
  if (element instanceof HTMLButtonElement) return element.disabled;
  return element.getAttribute('aria-disabled') === 'true';
}

export function dispatchEnter(target: HTMLElement): void {
  const init: KeyboardEventInit = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    composed: true,
  } as KeyboardEventInit;
  target.dispatchEvent(new KeyboardEvent('keydown', init));
  target.dispatchEvent(new KeyboardEvent('keypress', init));
  target.dispatchEvent(new KeyboardEvent('keyup', init));
}

/**
 * Write text into a composer, in the way that particular editor understands.
 *
 * - textarea/input: native value setter + input event, so React sees the change.
 * - contenteditable: select-all then `insertText`, which drives ProseMirror and
 *   Quill through their own input pipeline.
 * - last resort: a synthetic paste event.
 */
export function writeText(input: HTMLElement, text: string): boolean {
  try {
    input.focus();

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      const proto =
        input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(input, text);
      else input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    if (!isEditable(input)) return false;

    // Select the whole editor contents.
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Prefer execCommand where available: it produces a real editor transaction.
    if (typeof document.execCommand === 'function') {
      const cleared = document.execCommand('delete', false);
      const inserted = document.execCommand('insertText', false, text);
      if (inserted) return true;
      if (!inserted && cleared) {
        // delete worked but insert did not — fall through to paste.
      }
    }

    // Synthetic paste.
    const data = new DataTransfer();
    data.setData('text/plain', text);
    const paste = new ClipboardEvent('paste', {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(paste);

    // Verify: if the editor still has text, treat it as success.
    return (input.innerText ?? input.textContent ?? '').trim().length > 0 || text.trim() === '';
  } catch {
    return false;
  }
}

/** Ordered fallback list helper, used by the generic adapter. */
export function largestVisible(selectors: string[]): HTMLElement | null {
  const candidates: HTMLElement[] = [];
  for (const selector of selectors) {
    try {
      for (const element of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
        if (isVisible(element)) candidates.push(element);
      }
    } catch {
      // skip invalid selector
    }
  }
  let best: HTMLElement | null = null;
  let bestArea = 0;
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > bestArea) {
      best = element;
      bestArea = area;
    }
  }
  return best;
}
