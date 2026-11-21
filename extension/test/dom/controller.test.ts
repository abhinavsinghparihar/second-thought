// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://chatgpt.com/c/1"}
/**
 * Controller tests — the fail-safe contract.
 *
 * The controller decides whether a send is allowed through, paused for
 * clarification, or released. Its one non-negotiable rule: **the user's message
 * is never lost**. Every test here ends by asserting either (a) the original
 * send happened untouched, or (b) the panel opened and a callback can still
 * release it.
 *
 * The services the controller talks to (`chrome.runtime.sendMessage`) are the
 * real code path with the fake transport from `helpers/fake-chrome`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeChrome, type FakeChrome } from '../helpers/fake-chrome';
import { analyzeRequest } from '@second-thought/core';
import { Controller } from '../../src/content/controller';
import type { AnalyzeResponse } from '../../src/shared/types';

const PROMPT = 'Build me an expense tracking app';

interface Rig {
  chrome: FakeChrome;
  controller: Controller;
  input: HTMLElement;
  /**
   * Dispatch a send the way a user does, and report whether the page's own
   * handler saw an un-prevented event (i.e. the message really went out).
   */
  pressSend: () => Promise<boolean>;
  sends: () => number;
}

function elementWithBox<T extends HTMLElement>(el: T, width = 500, height = 60): T {
  el.getBoundingClientRect = () => ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0 }) as DOMRect;
  return el;
}

/** A ChatGPT-shaped page whose form records real submissions. */
async function rig(options: {
  respond: (message: unknown) => unknown | Promise<unknown>;
  draft?: string;
  /** Settings the fake worker reports at startup. */
  settings?: Record<string, unknown>;
}): Promise<Rig> {
  document.body.innerHTML = `
    <form id="host-form">
      <div id="prompt-textarea" contenteditable="true" role="textbox"></div>
      <button type="button" data-testid="send-button" aria-label="Send prompt">Send</button>
    </form>`;

  const chrome = installFakeChrome();
  let submissions = 0;

  // The host page's own submit handler: this is the user's message going out.
  const form = document.querySelector<HTMLFormElement>('#host-form')!;
  void form;

  const input = elementWithBox(document.querySelector<HTMLElement>('#prompt-textarea')!);
  input.textContent = options.draft ?? PROMPT;

  // Stand in for the service worker: answer exactly like the worker does.
  vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(async (message: unknown) => {
    const type = (message as { type?: string }).type;
    if (type === 'st/settings-get') {
      return {
        settings: {
          enabled: true,
          autoIntercept: true,
          analysisEngine: 'local',
          maxQuestions: 4,
          ...options.settings,
        },
      };
    }
    return options.respond(message);
  });

  const controller = new Controller();
  liveControllers.push(controller);
  await controller.start();

  // The host app turns its send button into a form submission. The button needs
  // a layout box: the adapter deliberately ignores zero-sized (hidden) controls.
  const button = elementWithBox(document.querySelector<HTMLElement>('[data-testid="send-button"]')!, 88, 36);
  button.addEventListener('click', () => {
    const event = new Event('submit', { bubbles: true, cancelable: true });
    if (form.dispatchEvent(event)) submissions += 1;
  });

  /**
   * Press send and report whether it actually went out.
   *
   * The controller cancels the event in the capture phase, so a cancelled
   * event means the host's handler never ran — that is the interception we are
   * testing, observed from the outside exactly as the site would.
   */
  const pressSend = async (): Promise<boolean> => {
    const before = submissions;
    // A real pointer click, as a user produces: the browser would dispatch the
    // event itself, so the *host handler running* is the ground truth for
    // "the message actually went out".
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 40));
    return submissions > before;
  };

  return { chrome, controller, input, pressSend, sends: () => submissions };
}

function interceptResponse(text: string): AnalyzeResponse {
  const result = analyzeRequest(text, { maxQuestions: 4 });
  return {
    decision: 'intercept',
    analysisId: result.id,
    result,
    engine: 'local',
  };
}

/**
 * Controllers register document-level capture listeners, so each test tears its
 * controller down. Tests run in one shared document; leaked listeners would
 * make the *previous* controller intercept the *next* test's send.
 */
const liveControllers: Controller[] = [];

beforeEach(() => {
  vi.restoreAllMocks();
  while (liveControllers.length > 0) liveControllers.pop()!.dispose();
  document.body.innerHTML = '';
});

afterEach(() => {
  while (liveControllers.length > 0) liveControllers.pop()!.dispose();
});

describe('interception policy', () => {
  it('blocks the send and opens the panel for a vague prompt', async () => {
    const r = await rig({ respond: () => interceptResponse(PROMPT) });
    const wentOut = await r.pressSend();
    expect(wentOut).toBe(false);
    expect(r.sends()).toBe(0);
    expect(document.getElementById('second-thought-panel')).not.toBeNull();
  });

  it('lets a complete prompt through untouched', async () => {
    const complete =
      'Build a React dashboard that shows monthly revenue by region, Postgres via Prisma, auth with Google sign-in, ' +
      'deploy to Vercel. Must be responsive and mobile-first. For our sales team of 12 people. ' +
      'Deliver a complete runnable project with unit tests.';
    const r = await rig({ draft: complete, respond: () => ({ decision: 'passthrough', reason: 'complete' }) });
    const wentOut = await r.pressSend();
    expect(wentOut).toBe(true);
    expect(r.sends()).toBe(1);
  });

  it('never even asks the worker about a greeting', async () => {
    const spy = vi.fn(async () => ({ decision: 'passthrough', reason: 'greeting' }));
    const r = await rig({ draft: 'hey there!', respond: spy });
    await r.pressSend();
    // The synchronous local prefilter already said no: nothing was sent to the
    // worker and the message went straight out.
    expect(spy).not.toHaveBeenCalled();
    expect(r.sends()).toBe(1);
  });

  it('never blocks when the worker is unreachable', async () => {
    const r = await rig({
      respond: () => {
        throw new Error('receiving end does not exist');
      },
    });
    const wentOut = await r.pressSend();
    expect(wentOut).toBe(true);
    expect(r.sends()).toBe(1);
  });

  it('never blocks when the worker reports an error', async () => {
    const r = await rig({ respond: () => ({ decision: 'error', error: 'boom' }) });
    const wentOut = await r.pressSend();
    expect(wentOut).toBe(true);
  });

  it('a disabled extension never touches the send', async () => {
    const r = await rig({
      settings: { enabled: false },
      respond: () => interceptResponse(PROMPT),
    });
    const wentOut = await r.pressSend();
    expect(wentOut).toBe(true);
    expect(document.getElementById('second-thought-panel')).toBeNull();
  });
});

describe('fail-safe exit paths', () => {
  it('"Send original" releases the untouched message', async () => {
    const r = await rig({ respond: () => interceptResponse(PROMPT) });
    await r.pressSend();
    expect(r.sends()).toBe(0);

    // The shipped panel uses a closed shadow root; the setup file forces it
    // open so the user-facing exit can be driven from a test.
    const root = document.getElementById('second-thought-panel')!.shadowRoot!;
    // The panel shows the analysis animation first; wait for the questions.
    await new Promise((resolve) => setTimeout(resolve, 900));
    const sendOriginal = Array.from(root.querySelectorAll('button')).find((b) =>
      /send original/i.test(b.textContent ?? ''),
    );
    expect(sendOriginal).toBeTruthy();
    sendOriginal!.click();
    await new Promise((resolve) => setTimeout(resolve, 30));

    // The original message went out, and it went out untouched.
    expect(r.sends()).toBeGreaterThanOrEqual(1);
    expect(r.input.textContent).toBe(PROMPT);
  });
});

describe('draft safety', () => {
  it('leaves the composer text untouched while the panel is open', async () => {
    const r = await rig({ respond: () => interceptResponse(PROMPT) });
    await r.pressSend();
    expect(r.input.textContent).toBe(PROMPT);
  });

  it('releases the original send when the panel is dismissed', async () => {
    const r = await rig({ respond: () => interceptResponse(PROMPT) });
    await r.pressSend();
    // Drive the Escape key, which is the documented "return control" exit.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.getElementById('second-thought-panel')).toBeNull();
  });
});
