import { analyzeRequest } from '@second-thought/core';
import { detectProvider } from '../providers/registry';
import type { ProviderAdapter } from '../providers/types';
import {
  hostnameOf,
  loadSettings,
  matchesSite,
  type Settings,
} from '../shared/settings';
import type { AnalyzeResponse, RefineResponse, RuntimeMessage } from '../shared/types';
import { ClarifyPanel } from './panel';

/**
 * Content-script controller.
 *
 * Safety contract (see docs/extension.md):
 *  1. The user's send is only blocked when we are confident interception is
 *     useful (settings on + local prefilter says refinable).
 *  2. Every async step has a timeout; every error path releases the original
 *     send. If the worker is unreachable, the request proceeds untouched.
 *  3. All DOM access is wrapped; the content script fails silent and passive.
 */

const ANALYZE_TIMEOUT_MS = 2500;
const AI_ANALYZE_TIMEOUT_MS = 9000;
const REFINE_TIMEOUT_MS = 9000;

export class Controller {
  private adapter: ProviderAdapter | null = null;
  private settings: Settings | null = null;
  private panel: ClarifyPanel | null = null;
  private suppressUntil = 0;
  private destroyed = false;
  private retryTimer: number | null = null;

  async start(): Promise<void> {
    try {
      const hostname = hostnameOf(location.href);
      const initial = await this.withTimeout(this.send({ type: 'st/settings-get' }), 1500);
      this.settings = (initial as { settings: Settings } | undefined)?.settings ?? (await loadSettings());

      const detection = detectProvider(hostname, this.settings.customSites);
      this.adapter = detection.adapter;

      if (!this.adapter) {
        // Passive site — nothing to do. (Custom-site injection is handled by
        // the worker via chrome.scripting when the user adds a site.)
        return;
      }

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes['settings']) {
          this.settings = { ...this.settings, ...(changes['settings'] as { newValue: Settings }).newValue };
        }
      });

      this.bindGlobalListeners();
      this.scheduleRebind();
    } catch {
      // Never break the host site — stay fully passive on any boot failure.
    }
  }

  // ── listeners ────────────────────────────────────────────────────────────

  private bindGlobalListeners(): void {
    document.addEventListener(
      'keydown',
      (evt) => this.handleKeyEvent(evt),
      true,
    );
    document.addEventListener(
      'click',
      (evt) => this.handleClickEvent(evt),
      true,
    );
    chrome.runtime.onMessage.addListener((msg: RuntimeMessage, _sender, sendResponse) => {
      if (msg?.type === 'st/open-panel') {
        void this.openForCurrentDraft();
        sendResponse({ ok: true });
        return false;
      }
      if (msg?.type === 'st/ping') {
        // Injection guard: lets tooling check whether the controller is live.
        sendResponse({ ok: true });
        return false;
      }
      return false;
    });
  }

  /**
   * SPA-safe rebinding: on navigations the input element is replaced, so we
   * poll cheaply (every 3s) and re-check. Listeners are global (document,
   * capture) so they survive DOM swaps.
   */
  private scheduleRebind(): void {
    if (this.retryTimer !== null) return;
    this.retryTimer = window.setInterval(() => {
      if (this.destroyed) return;
      try {
        if (!this.adapter) return;
        const input = this.adapter.findInput();
        void input; // probe only — adapters memoize nothing
        if (!this.panel?.isAttached()) {
          this.panel?.dispose();
          this.panel = null;
        }
      } catch {
        // ignore probe failures
      }
    }, 3000);
  }

  private handleKeyEvent(evt: KeyboardEvent): void {
    try {
      if (evt.key !== 'Enter' || evt.shiftKey || evt.isComposing) return;
      if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
      const input = this.adapter?.findInput();
      if (!input || !evt.target) return;
      const target = evt.target as Node;
      if (!(target === input || input.contains(target))) return;
      this.processSendIntent(evt, input);
    } catch {
      // absolute fail-safe: never break typing
    }
  }

  private handleClickEvent(evt: MouseEvent): void {
    try {
      const send = this.adapter?.findSendButton();
      if (!send || !evt.target) return;
      const target = evt.target as Node;
      const btn = target instanceof Element ? target.closest('button') : null;
      if (!btn || btn !== send) return;
      const input = this.adapter?.findInput();
      if (!input) return;
      this.processSendIntent(evt, input);
    } catch {
      // absolute fail-safe: never break clicking
    }
  }

  // ── the interception decision ─────────────────────────────────────────────

  private async processSendIntent(evt: Event, input: HTMLElement): Promise<void> {
    const settings = this.settings;
    if (!settings || !this.adapter) return;
    if (Date.now() < this.suppressUntil) return; // our own programmatic submit

    const text = this.adapter.getText(input).trim();
    if (text === '') return;

    const hostname = hostnameOf(location.href);
    if (matchesSite(settings.excludedSites, hostname)) return;
    if (!settings.enabled || !settings.autoIntercept) return;

    // Panel already open: block stray sends so the user doesn't double-post.
    if (this.panel?.isOpen) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      this.panel.flash();
      return;
    }

    // Local prefilter — cheap, synchronous, avoids stealing obvious
    // pass-through events ("what is the capital of India?").
    let pre = null;
    try {
      pre = analyzeRequest(text, { maxQuestions: settings.maxQuestions });
    } catch {
      return; // analysis blew up → let the request pass
    }
    if (!pre.isRefinable) return;

    // Confident enough to pause: block the send while we ask the worker.
    evt.preventDefault();
    evt.stopImmediatePropagation();

    const timeout = settings.analysisEngine === 'ai' ? AI_ANALYZE_TIMEOUT_MS : ANALYZE_TIMEOUT_MS;
    let response: AnalyzeResponse | undefined;
    try {
      response = await this.withTimeout(
        this.send({ type: 'st/analyze', body: { text, url: location.href, providerId: this.adapter.id } }),
        timeout,
      ) as AnalyzeResponse | undefined;
    } catch {
      response = undefined;
    }

    if (this.destroyed) return;

    if (!response || response.decision === 'error' || response.decision === 'passthrough') {
      // Worker unreachable, failed, or decided not to pause → send original.
      this.releaseOriginalSend();
      return;
    }

    this.panel = new ClarifyPanel({
      result: response.result,
      engine: response.engine,
      analysisId: response.analysisId,
      onCancel: () => this.releaseOriginalSend(),
      onDismiss: () => this.closePanel(),
      onRefine: async (answers) => {
        const refine = await this.withTimeout(
          this.send({ type: 'st/refine', body: { analysisId: response!.analysisId, answers } }),
          REFINE_TIMEOUT_MS,
        ) as RefineResponse | undefined;
        if (!refine) throw new Error('Refinement timed out');
        if (!refine.ok) throw new Error(refine.error);
        return refine.outcome;
      },
      onUseRefined: (refinedText) => this.deliverRefinedPrompt(input, refinedText),
    });
    this.panel.open();
  }

  /** Re-trigger the original send with the untouched input. */
  private releaseOriginalSend(): void {
    if (!this.adapter) return;
    this.closePanel();
    this.suppressUntil = Date.now() + 600;
    try {
      if (!this.adapter.submit()) {
        this.suppressUntil = 0;
      }
    } catch {
      this.suppressUntil = 0; // user can press Enter again — nothing is lost
    }
  }

  private async deliverRefinedPrompt(input: HTMLElement, refinedText: string): Promise<void> {
    this.closePanel();
    const adapter = this.adapter;
    if (!adapter) return;
    const placed = adapter.setText(input, refinedText);
    this.suppressUntil = Date.now() + 600;
    const submitted = placed && adapter.submit();
    if (!submitted) {
      // Fallback: clipboard + leave the text in the input for manual send.
      try {
        await navigator.clipboard.writeText(refinedText);
      } catch {
        // clipboard denied — text remains in the input, nothing lost
      }
    }
  }

  private async openForCurrentDraft(): Promise<void> {
    try {
      if (!this.adapter || !this.settings) return;
      const input = this.adapter.findInput();
      if (!input) return;
      const text = this.adapter.getText(input).trim();
      if (text === '') return;
      if (this.panel?.isOpen) return;
      const response = await this.withTimeout(
        this.send({ type: 'st/analyze', body: { text, url: location.href, providerId: this.adapter.id } }),
        ANALYZE_TIMEOUT_MS,
      ) as AnalyzeResponse | undefined;
      if (!response || response.decision !== 'intercept') return;
      this.panel = new ClarifyPanel({
        result: response.result,
        engine: response.engine,
        analysisId: response.analysisId,
        onCancel: () => this.closePanel(),
        onDismiss: () => this.closePanel(),
        onRefine: async (answers) => {
          const refine = await this.withTimeout(
            this.send({ type: 'st/refine', body: { analysisId: response!.analysisId, answers } }),
            REFINE_TIMEOUT_MS,
          ) as RefineResponse | undefined;
          if (!refine || !refine.ok) throw new Error(refine && !refine.ok ? refine.error : 'Refinement timed out');
          return refine.outcome;
        },
        onUseRefined: (refinedText) => this.deliverRefinedPrompt(input, refinedText),
      });
      this.panel.open();
    } catch {
      // manual path must never throw into the page
    }
  }

  private closePanel(): void {
    try {
      this.panel?.dispose();
    } catch {
      // ignore
    }
    this.panel = null;
  }

  // ── messaging helpers ────────────────────────────────────────────────────

  private send(message: RuntimeMessage): Promise<unknown> {
    return chrome.runtime.sendMessage(message);
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), ms);
      promise.then(
        (value) => { clearTimeout(timer); resolve(value); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }
}
