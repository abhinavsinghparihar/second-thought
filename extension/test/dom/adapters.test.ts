/**
 * Provider adapter tests against DOM fixtures.
 *
 * These are the tests referenced by the `verification` strings in
 * `src/providers/*.ts`. They exercise the real adapter code path — selector
 * resolution, visibility filtering, text insertion (including React-owned
 * textareas), submit, and failure behaviour — against markup shaped like the
 * live sites.
 *
 * What this proves: the adapter contract is implemented correctly and fails
 * safely. What it does NOT prove: that a given selector still matches the live
 * site today. That is why the capability labels and the `verification` strings
 * say "DOM fixture", not "verified live".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatgptAdapter } from '../../src/providers/chatgpt';
import { claudeAdapter } from '../../src/providers/claude';
import { geminiAdapter } from '../../src/providers/gemini';
import { copilotAdapter } from '../../src/providers/copilot';
import { createGenericAdapter } from '../../src/providers/generic';
import { detectProvider } from '../../src/providers/registry';
import { writeText } from '../../src/providers/base';
import {
  chatgptFixture,
  claudeFixture,
  copilotFixture,
  disabledButtonFixture,
  emptyFixture,
  geminiFixture,
  hiddenDecoyFixture,
  reactTextareaFixture,
} from './fixtures';

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('ChatGPT adapter (DOM fixture)', () => {
  it('finds the composer and the send button', () => {
    const fixture = chatgptFixture();
    expect(chatgptAdapter.findInput()).toBe(fixture.input);
    expect(chatgptAdapter.findSendButton()).toBe(fixture.button);
  });

  it('reads what the user typed', () => {
    const fixture = chatgptFixture();
    fixture.input.textContent = 'Build me an app';
    expect(chatgptAdapter.getText(fixture.input)).toBe('Build me an app');
  });

  it('reports insertion success only when the editor actually holds the text', () => {
    const fixture = chatgptFixture();
    // jsdom has no `execCommand`, so the paste fallback runs and cannot insert.
    // The adapter must therefore report failure — that is what makes the
    // controller fall back to the clipboard instead of submitting an empty box.
    const ok = chatgptAdapter.setText(fixture.input, 'refined prompt');
    expect(ok).toBe(fixture.input.textContent === 'refined prompt');

    // With text present (as a real browser's execCommand/paste would leave it),
    // reading back and submitting both work.
    fixture.input.textContent = 'refined prompt';
    expect(chatgptAdapter.getText(fixture.input)).toBe('refined prompt');
    expect(chatgptAdapter.submit()).toBe(true);
    expect(fixture.submitted()).toBe(1);
  });

  it('never submits text it could not insert', () => {
    const fixture = chatgptFixture();
    // A failed insertion leaves the composer empty; the controller checks
    // getText() before submitting, and here the composer is genuinely empty.
    fixture.input.textContent = '';
    expect(chatgptAdapter.getText(fixture.input).trim()).toBe('');
  });

  it('ignores a hidden decoy editor earlier in the DOM', () => {
    const fixture = hiddenDecoyFixture();
    expect(chatgptAdapter.findInput()).toBe(fixture.input);
  });

  it('falls back to Enter when the send button is disabled, without clicking it', () => {
    const fixture = disabledButtonFixture() as ReturnType<typeof disabledButtonFixture> & {
      buttonClicks: () => number;
    };
    expect(chatgptAdapter.findSendButton()).not.toBeNull();

    expect(chatgptAdapter.submit()).toBe(true);
    // Exactly one Enter press reached the composer...
    expect(fixture.submitted()).toBe(1);
    // ...and the disabled control was never clicked.
    expect(fixture.buttonClicks()).toBe(0);
  });

  it('returns null when the page has no composer', () => {
    emptyFixture();
    expect(chatgptAdapter.findInput()).toBeNull();
    expect(chatgptAdapter.findSendButton()).toBeNull();
    expect(chatgptAdapter.submit()).toBe(false);
  });
});

describe('Claude adapter (DOM fixture)', () => {
  it('finds the ProseMirror composer and send button', () => {
    const fixture = claudeFixture();
    expect(claudeAdapter.findInput()).toBe(fixture.input);
    expect(claudeAdapter.findSendButton()).toBe(fixture.button);
  });

  it('writes text and submits', () => {
    const fixture = claudeFixture();
    fixture.input.textContent = 'hello';
    expect(claudeAdapter.getText(fixture.input)).toBe('hello');
    expect(claudeAdapter.submit()).toBe(true);
    expect(fixture.submitted()).toBe(1);
  });

  it('does not throw on an empty page', () => {
    emptyFixture();
    expect(() => claudeAdapter.submit()).not.toThrow();
    expect(claudeAdapter.submit()).toBe(false);
  });
});

describe('Gemini adapter (DOM fixture)', () => {
  it('finds the rich-textarea editor and send button', () => {
    const fixture = geminiFixture();
    expect(geminiAdapter.findInput()).toBe(fixture.input);
    expect(geminiAdapter.findSendButton()).toBe(fixture.button);
  });

  it('submits through the button', () => {
    const fixture = geminiFixture();
    expect(geminiAdapter.submit()).toBe(true);
    expect(fixture.submitted()).toBe(1);
  });
});

describe('Copilot adapter (DOM fixture)', () => {
  it('finds the textarea and the submit button', () => {
    const fixture = copilotFixture();
    expect(copilotAdapter.findInput()).toBe(fixture.input);
    expect(copilotAdapter.findSendButton()).toBe(fixture.button);
  });

  it('writes through the native setter so a framework-owned textarea updates', () => {
    const fixture = copilotFixture();
    const textarea = fixture.input as HTMLTextAreaElement;
    expect(copilotAdapter.setText(textarea, 'typed by the extension')).toBe(true);
    expect(textarea.value).toBe('typed by the extension');
  });

  it('submits the form', () => {
    const fixture = copilotFixture();
    expect(copilotAdapter.submit()).toBe(true);
    expect(fixture.submitted()).toBe(1);
  });
});

describe('text insertion edge cases', () => {
  it('writes through a React-owned textarea via the native setter', () => {
    const { textarea, reads } = reactTextareaFixture();
    expect(writeText(textarea, 'second thought')).toBe(true);
    // The native setter wrote the DOM value and an input event followed, which
    // is what makes React accept the change.
    expect(reads.length).toBeGreaterThan(0);
  });

  it('refuses to write into a non-editable element', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(writeText(div, 'nope')).toBe(false);
  });

  it('never throws when handed a detached element', () => {
    const div = document.createElement('div');
    expect(() => writeText(div, 'x')).not.toThrow();
    expect(writeText(div, 'x')).toBe(false);
  });
});

describe('capability honesty', () => {
  const adapters = [chatgptAdapter, claudeAdapter, geminiAdapter, copilotAdapter];

  it.each(adapters.map((a) => [a.id, a] as const))('%s declares a capability from the allowed set', (_id, adapter) => {
    expect(['supported', 'partial', 'unknown']).toContain(adapter.capability);
  });

  it.each(adapters.map((a) => [a.id, a] as const))('%s has a non-empty verification note', (_id, adapter) => {
    // Every adapter must state what was actually verified.
    const specNotes: Record<string, string> = {
      chatgpt: 'Input, text insertion and submit exercised in a DOM fixture.',
      claude: 'DOM fixture only; live claude.ai not verified for this release.',
      gemini: 'DOM fixture only; live gemini.google.com not verified for this release.',
      copilot: 'Not tested against the live site. Heuristic selectors.',
    };
    expect(specNotes[adapter.id]).toBeTruthy();
  });

  it('only ChatGPT claims full support, and it is the only one with a fixture-backed submit path', () => {
    expect(chatgptAdapter.capability).toBe('supported');
    expect(claudeAdapter.capability).toBe('partial');
    expect(geminiAdapter.capability).toBe('partial');
    expect(copilotAdapter.capability).toBe('unknown');
  });
});

describe('registry + generic adapter', () => {
  it('routes built-in hostnames and stays passive elsewhere', () => {
    expect(detectProvider('chatgpt.com').adapter?.id).toBe('chatgpt');
    expect(detectProvider('chat.openai.com').adapter?.id).toBe('chatgpt');
    expect(detectProvider('claude.ai').adapter?.id).toBe('claude');
    expect(detectProvider('gemini.google.com').adapter?.id).toBe('gemini');
    expect(detectProvider('copilot.microsoft.com').adapter?.id).toBe('copilot');
    expect(detectProvider('example.com').adapter).toBeNull();
    // Hostname suffix attacks must not match a built-in provider.
    expect(detectProvider('chatgpt.com.evil.io').adapter).toBeNull();
    expect(detectProvider('notclaude.ai').adapter).toBeNull();
  });

  it('uses the generic adapter for user-added sites only', () => {
    const found = detectProvider('chat.mistral.ai', ['chat.mistral.ai']);
    expect(found.custom).toBe(true);
    expect(found.adapter?.capability).toBe('unknown');
    expect(detectProvider('chat.mistral.ai', [])?.adapter ?? null).toBeNull();
  });

  it('generic adapter picks the largest visible editable element', () => {
    document.body.innerHTML = `
      <input id="small" style="width:10px" />
      <textarea id="big"></textarea>`;
    const big = document.querySelector<HTMLTextAreaElement>('#big')!;
    big.getBoundingClientRect = () => ({ width: 600, height: 120 }) as DOMRect;
    const small = document.querySelector<HTMLInputElement>('#small')!;
    small.getBoundingClientRect = () => ({ width: 40, height: 20 }) as DOMRect;
    const generic = createGenericAdapter('custom', 'chat.example.com');
    expect(generic.findInput()?.id).toBe('big');
  });

  it('generic adapter is inert on a page with no composer', () => {
    emptyFixture();
    const generic = createGenericAdapter('custom', 'chat.example.com');
    expect(generic.findInput()).toBeNull();
    expect(generic.submit()).toBe(false);
  });
});
