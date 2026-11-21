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

/** Visible check — avoids picking up hidden template editors. */
export function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 12) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}
