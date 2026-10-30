import type { ProviderCapability } from '../shared/types';

/**
 * Provider adapter contract.
 *
 * Each AI site gets an adapter implementing detection + DOM interaction.
 * Adapters must be defensive: any thrown error is caught by the controller,
 * which then releases the user's send event untouched — the AI website must
 * never break because of Second Thought.
 */
export interface ProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly capability: ProviderCapability;
  readonly homepage: string;
  matches(hostname: string): boolean;
  /** Locate the primary prompt input. Returns null when not found. */
  findInput(): HTMLElement | null;
  /** Locate the send/submit button. Returns null when not found. */
  findSendButton(): HTMLElement | null;
  getText(input: HTMLElement): string;
  setText(input: HTMLElement, text: string): boolean;
  /** Best-effort programmatic submission of whatever is in the input. */
  submit(): boolean;
}

/** Query helper: first match, scoped, tolerant of missing roots. */
export function q<T extends Element = Element>(selectors: string, root: ParentNode = document): T | null {
  for (const sel of selectors.split(',')) {
    try {
      const el = root.querySelector(sel.trim());
      if (el) return el as T;
    } catch {
      // invalid selector on this browser — try the next one
    }
  }
  return null;
}

/** Read text from either a contenteditable or a textarea/input. */
export function readInputText(input: HTMLElement): string {
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    return input.value;
  }
  return (input as HTMLElement).innerText ?? '';
}

/**
 * Write text into either kind of input, preserving draft semantics.
 *
 * - textarea/input: use the prototype's native value setter so React-style
 *   frameworks notice the change, then dispatch a bubbling input event.
 * - ProseMirror/Quill contenteditables: select-all + execCommand('insertText')
 *   (fires the editor's own input pipeline), with a synthetic paste event as
 *   fallback.
 */
export function writeInputText(input: HTMLElement, text: string): boolean {
  try {
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.focus();
      const proto = input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(input, text);
      else input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    input.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(input);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const executed = document.execCommand('insertText', false, text);
    if (!executed) throw new Error('execCommand returned false');
    return true;
  } catch {
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      input.dispatchEvent(evt);
      return true;
    } catch {
      return false;
    }
  }
}

export function isContentEditable(el: Element | null): el is HTMLElement {
  return el !== null && el instanceof HTMLElement && el.isContentEditable;
}

/** Visible check — avoids picking up hidden template editors. */
export function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 12) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}
