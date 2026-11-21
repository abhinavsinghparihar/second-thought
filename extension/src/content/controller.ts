import { analyzeRequest, scoreAnswers } from '@second-thought/core';
import { detectProvider } from '../providers/registry';
import type { ProviderAdapter } from '../providers/types';
import { hostnameOf, loadSettings, matchesSite, DEFAULT_SETTINGS, type Settings } from '../shared/settings';
import type {
  AnalyzeResponse,
  NextRoundResponse,
  RefineResponse,
  RuntimeMessage,
} from '../shared/types';
import { ClarifyPanel } from './panel';

/**
 * Content-script controller.
 *
 * Safety contract:
 *  1. The send is only blocked when the local prefilter is confident that
 *     clarification helps. Everything else passes straight through.
 *  2. Every async step is bounded, and EVERY failure path releases the original
 *     message. If the worker is unreachable, the send proceeds untouched.
 *  3. Insertion is verified before submitting. If the composer did not take the
 *     text, we copy it to the clipboard and leave it for a manual send rather
 *     than submitting the wrong thing.
 *  4. All DOM access is wrapped; the content script fails silent and passive.
 */

/**
 * Timeouts. The original used 9 s for both AI paths, which no hosted model
 * reliably beats once the provider queues the request — so AI mode almost
 * always fell back. These are aligned with the provider adapters' own 30 s
 * abort, plus headroom for the round trip to the service worker.
 */
const TIMEOUTS = {
  settings: 2_000,
  analyzeLocal: 3_000,
  analyzeAi: 36_000,
  nextRound: 36_000,
  refine: 16_000,
} as const;

export class Controller {
  private adapter: ProviderAdapter | null = null;
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private panel: ClarifyPanel | null = null;
  private suppressUntil = 0;
  private destroyed = false;
  private inFlight = false;

  async start(): Promise<void> {
    try {
      const hostname = hostnameOf(location.href);

      // Settings first (with a timeout so a dead worker cannot stall the page).
      try {
        const response = (await this.withTimeout(
          this.send({ type: 'st/settings-get' }),
          TIMEOUTS.settings,
        )) as { settings?: Settings } | undefined;
        // Merge onto the defaults rather than replacing them. A settings
        // payload missing one field (an older worker, a partial write, a future
        // field) used to make `matchesSite(undefined, …)` throw inside the
        // capture listener, which silently disabled interception for the whole
        // session. The merge makes a partial payload harmless.
        if (response?.settings) this.settings = { ...DEFAULT_SETTINGS, ...response.settings };
      } catch {
        this.settings = await loadSettings().catch(() => ({ ...DEFAULT_SETTINGS }));
      }

      const detection = detectProvider(hostname, this.settings.customSites ?? []);
      this.adapter = detection.adapter;
      if (!this.adapter) return; // passive site

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        const next = changes['settings']?.newValue as Partial<Settings> | undefined;
        if (!next) return;
        this.settings = { ...this.settings, ...next };
      });

      this.bindGlobalListeners();
    } catch {
      // Never break the host site.
    }
  }

  // ── listeners ────────────────────────────────────────────────────────────

  /**
   * Detach every document-level listener.
   *
   * Without this, a second controller (a re-injected content script, or a test)
   * leaves the first one attached and every send is handled twice — the first
   * controller cancels the event, the second releases it, and the panel opens
   * *after* the message has already been sent.
   */
  dispose(): void {
    this.destroyed = true;
    try {
      document.removeEventListener('keydown', this.onKeydown, true);
      document.removeEventListener('click', this.onClick, true);
    } catch {
      // nothing to detach
    }
    this.closePanel();
  }

  private onKeydown = (evt: KeyboardEvent): void => this.handleKeyEvent(evt);
  private onClick = (evt: MouseEvent): void => this.handleClickEvent(evt);

  private bindGlobalListeners(): void {
    document.addEventListener('keydown', this.onKeydown, true);
    document.addEventListener('click', this.onClick, true);

    chrome.runtime.onMessage.addListener((msg: RuntimeMessage, _sender, sendResponse) => {
      if (msg?.type === 'st/open-panel') {
        void this.openForCurrentDraft().then((opened) => sendResponse({ ok: opened }));
        return true;
      }
      if (msg?.type === 'st/ping') {
        // Diagnostics for the popup: is the script alive, and can it see the composer?
        let inputFound = false;
        let sendFound = false;
        try {
          inputFound = Boolean(this.adapter?.findInput());
          sendFound = Boolean(this.adapter?.findSendButton());
        } catch {
          // diagnostics only
        }
        sendResponse({ ok: true, adapter: this.adapter?.id ?? null, inputFound, sendFound });
        return false;
      }
      return false;
    });
  }

  private handleKeyEvent(evt: KeyboardEvent): void {
    try {
      if (evt.key !== 'Enter' || evt.shiftKey || evt.isComposing) return;
      if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
      const input = this.adapter?.findInput();
      if (!input || !evt.target) return;
      const target = evt.target as Node;
      // Only intercept when typing inside the prompt box — never in the search
      // bar, rename fields, or anywhere else with an Enter handler.
      if (!(target === input || input.contains(target))) return;
      // The decision must be made synchronously: `preventDefault()` after an
      // await is too late, the site has already sent the message.
      void this.processSendIntent(evt, input, this.shouldPause(evt, input));
    } catch {
      // absolute fail-safe: never break typing
    }
  }

  /**
   * Everything that can be decided without the network, decided now.
   *
   * Returns true when the send must be held back for clarification. When it
   * returns false the caller passes the send through untouched — the original
   * event is never cancelled, so the user's message is always delivered.
   */
  private shouldPause(evt: Event, input: HTMLElement): boolean {
    const settings = this.settings;
    const adapter = this.adapter;
    if (!adapter) return false;
    if (Date.now() < this.suppressUntil) return false; // our own programmatic submit

    if (this.inFlight) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      return false;
    }

    const text = adapter.getText(input).trim();
    if (text === '') return false;

    const hostname = hostnameOf(location.href);
    if (matchesSite(settings.excludedSites ?? [], hostname)) return false;
    if (!settings.enabled || !settings.autoIntercept) return false;

    // Panel already open: block stray sends so the user does not double-post.
    if (this.panel?.isOpen) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      this.panel.flash();
      return false;
    }

    // Local prefilter: cheap, synchronous, and the primary filter for obvious
    // pass-throughs ("What is the capital of India?"). It runs the SAME engine
    // the worker will use, so the two can never disagree about the decision.
    let pre: ReturnType<typeof analyzeRequest>;
    try {
      pre = analyzeRequest(text, { maxQuestions: settings.maxQuestions });
    } catch {
      return false; // analysis blew up → let the request pass
    }
    if (!pre.isRefinable) return false;

    evt.preventDefault();
    evt.stopImmediatePropagation();
    return true;
  }

  private handleClickEvent(evt: MouseEvent): void {
    try {
      const send = this.adapter?.findSendButton();
      if (!send || !evt.target) return;
      const target = evt.target as Node;
      const btn = target instanceof Element ? target.closest('button, [role="button"]') : null;
      if (!btn) return;
      if (btn !== send && !send.contains(btn) && !btn.contains(send)) return;

      const input = this.adapter?.findInput();
      if (!input) return;
      void this.processSendIntent(evt, input, this.shouldPause(evt, input));
    } catch {
      // absolute fail-safe: never break clicking
    }
  }

  // ── the interception decision ─────────────────────────────────────────────

  private async processSendIntent(evt: Event, input: HTMLElement, pause: boolean): Promise<void> {
    const settings = this.settings;
    const adapter = this.adapter;
    if (!adapter) return;

    // `pause` was decided synchronously in `shouldPause`, which also cancelled
    // the event. If it declined, the site's own handler already ran.
    if (!pause) return;

    const text = adapter.getText(input).trim();
    this.inFlight = true;
    const timeout = settings.analysisEngine === 'ai' ? TIMEOUTS.analyzeAi : TIMEOUTS.analyzeLocal;

    let response: AnalyzeResponse | undefined;
    try {
      response = (await this.withTimeout(
        this.send({ type: 'st/analyze', body: { text, url: location.href, providerId: adapter.id } }),
        timeout,
      )) as AnalyzeResponse | undefined;
    } catch {
      response = undefined;
    } finally {
      this.inFlight = false;
    }

    if (this.destroyed) return;

    if (!response || response.decision === 'error' || response.decision === 'passthrough') {
      // Worker unreachable, failed, or decided not to pause → send the original.
      this.releaseOriginalSend();
      return;
    }

    this.openPanel(input, response, { sendOnCancel: true });
  }

  /** Manual path: the popup asked us to review the current draft. */
  private async openForCurrentDraft(): Promise<boolean> {
    try {
      const adapter = this.adapter;
      if (!adapter) return false;
      const input = adapter.findInput();
      if (!input) return false;
      const text = adapter.getText(input).trim();
      if (text === '') return false;
      if (this.panel?.isOpen) {
        this.panel.flash();
        return true;
      }

      // Manual refinement from the toolbar must honour the same engine and the
      // same timeout as the automatic path (the original used the local 2.5 s
      // timeout here, so AI refinement from the popup always timed out).
      const timeout = this.settings.analysisEngine === 'ai' ? TIMEOUTS.analyzeAi : TIMEOUTS.analyzeLocal;
      const response = (await this.withTimeout(
        this.send({ type: 'st/analyze', body: { text, url: location.href, providerId: adapter.id } }),
        timeout,
      )) as AnalyzeResponse | undefined;

      if (!response) return false;

      if (response.decision === 'passthrough') {
        this.showTransientNote('Nothing material to clarify in this draft.');
        return false;
      }
      if (response.decision === 'error') {
        this.showTransientNote('Second Thought could not analyse this draft.');
        return false;
      }

      // Manually opened ⇒ the user did NOT press send, so cancelling must not
      // submit anything.
      this.openPanel(input, response, { sendOnCancel: false });
      return true;
    } catch {
      return false;
    }
  }

  private openPanel(
    input: HTMLElement,
    response: Extract<AnalyzeResponse, { decision: 'intercept' }>,
    options: { sendOnCancel: boolean },
  ): void {
    const adapter = this.adapter;
    if (!adapter) return;

    this.panel = new ClarifyPanel({
      result: response.result,
      analysisId: response.analysisId,
      engine: response.engine,
      fallback: response.fallback,

      onNextRound: async (answers, askedSlots) => {
        const reply = (await this.withTimeout(
          this.send({
            type: 'st/next-round',
            body: { analysisId: response.analysisId, answers, askedSlots },
          }),
          TIMEOUTS.nextRound,
        )) as NextRoundResponse | undefined;

        if (!reply || !reply.ok) {
          return {
            questions: [],
            hasMore: false,
            nextSlots: [],
            completeness: response.result.completeness,
          };
        }
        if (reply.fallback) response.fallback = reply.fallback;
        return reply.round;
      },

      // Re-score with the answers merged in, plus a projection of what is
      // still obtainable. Computed locally: it never leaves the page and never
      // touches the provider. Powers the honest three-number framing on the
      // summary step and keeps the "still unspecified" list accurate.
      onScore: async (answers, slots) => {
        try {
          return scoreAnswers(response.result, answers, slots);
        } catch {
          return null;
        }
      },

      onRefine: async (answers) => {
        const reply = (await this.withTimeout(
          this.send({ type: 'st/refine', body: { analysisId: response.analysisId, answers } }),
          TIMEOUTS.refine,
        )) as RefineResponse | undefined;

        if (!reply) throw new Error('Composing the prompt timed out.');
        if (!reply.ok) throw new Error(reply.error);
        return reply.outcome;
      },

      onUseRefined: (refinedText) => void this.deliverRefinedPrompt(input, refinedText),

      onSendOriginal: () => {
        if (options.sendOnCancel) this.releaseOriginalSend();
        else this.closePanel();
      },

      onDismiss: () => this.closePanel(),
    });

    this.panel.open();
  }

  // ── delivery ─────────────────────────────────────────────────────────────

  /** Re-trigger the original send with the untouched composer contents. */
  private releaseOriginalSend(): void {
    const adapter = this.adapter;
    this.closePanel();
    if (!adapter) return;
    this.suppressUntil = Date.now() + 700;
    try {
      if (!adapter.submit()) this.suppressUntil = 0;
    } catch {
      this.suppressUntil = 0; // the user can press Enter again — nothing is lost
    }
  }

  private async deliverRefinedPrompt(input: HTMLElement, refinedText: string): Promise<void> {
    this.closePanel();
    const adapter = this.adapter;
    if (!adapter) return;

    const placed = adapter.setText(input, refinedText);
    this.suppressUntil = Date.now() + 700;

    // Verify insertion before submitting: submitting a composer that did not
    // take the text would send an empty or stale message.
    const verified = placed && adapter.getText(input).trim().length > 0;
    const submitted = verified && adapter.submit();

    if (!submitted) {
      // Manual fallback: clipboard + leave the text in the composer.
      try {
        await navigator.clipboard.writeText(refinedText);
        this.showTransientNote('Prompt copied and placed in the box — press send.');
      } catch {
        this.showTransientNote('Prompt is in the box — press send.');
      }
      this.suppressUntil = 0;
    }
  }

  /** Small, non-blocking, self-removing note. Never a modal. */
  private showTransientNote(message: string): void {
    try {
      const host = document.createElement('div');
      const shadow = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = `
        .note {
          position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
          z-index: 2147483647;
          background: #0a0a0a; color: #fff;
          font-family: Inter, system-ui, sans-serif;
          font-size: 12.5px; letter-spacing: -0.01em;
          padding: 10px 16px; border-radius: 999px;
          box-shadow: 0 8px 24px -6px rgba(0,0,0,0.4);
          max-width: min(78vw, 420px); text-align: center;
          animation: note-in 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes note-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `;
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = message;
      shadow.append(style, note);
      document.documentElement.appendChild(host);
      window.setTimeout(() => host.remove(), 4200);
    } catch {
      // purely cosmetic — never throw
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
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }
}
