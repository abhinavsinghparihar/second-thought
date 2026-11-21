# Supported providers, honestly

This page exists because "supported" is easy to claim and hard to earn. Every
label below states **what was actually tested**, and the same wording appears in
the product UI so the claim cannot drift away from the evidence.

---

## The four labels

| Label | Means | What backs it |
|---|---|---|
| **Supported** | The full loop — detect, read the composer, write text, submit — is exercised by an automated DOM fixture, and the selectors are the site's own stable hooks (test ids over aria-labels). | `extension/test/dom/adapters.test.ts` |
| **Partially supported** | Same automated coverage, but the selectors are layered aria-label / structural guesses on a site that changes often. Expect occasional breakage after a site redesign. | same suite, same fixtures |
| **Unsupported** | Detected, but we know the loop cannot complete. | — |
| **Not tested** | Heuristic selectors on a site we have never verified. The extension will still try, and will fail safe. | no fixture |

> **What no label claims:** that the adapter matched the *live* site today.
> A DOM fixture proves the code path is correct against realistic markup. Only a
> human in a browser can prove the current production markup still matches — see
> [TESTING.md](TESTING.md#what-is-not-covered).

---

## The matrix

| Provider | Site | Capability | Detects | Reads composer | Writes text | Submits | Verified how |
|---|---|---|---|---|---|---|---|
| **ChatGPT** | chatgpt.com, chat.openai.com | **Supported** | ✅ | ✅ | ✅ | ✅ | DOM fixture, full loop |
| **Claude** | claude.ai | **Partially supported** | ✅ | ✅ | ✅ | ✅ | DOM fixture, full loop |
| **Gemini** | gemini.google.com | **Partially supported** | ✅ | ✅ | ✅ | ✅ | DOM fixture, full loop |
| **Copilot** | copilot.microsoft.com | **Not tested** | ✅ | ✅ | ✅ | ✅ | DOM fixture only; no live verification |
| **Any other chat site** | user-added | **Not tested** | ✅ (generic) | heuristic | heuristic | heuristic | Largest-visible-editable heuristic |
| Everything else | — | **Inactive** | ❌ | — | — | — | Stays completely passive |

### Why ChatGPT is the only "supported"

It is the only site where the send control exposes a stable `data-testid`, and
the only adapter whose full loop (including the disabled-button → Enter fallback)
is covered by a dedicated fixture. The others are layered selector lists, which
is a *resilience* strategy, not *evidence*.

### What "Not tested" means for Copilot

The adapter exists and passes its fixture, but nobody has confirmed it works on
the live site for this build. Rather than mark it "partial" and let the label do
work the tests have not done, it is labelled **Not tested** in the UI. If it
fails, it fails safe: your message still sends untouched.

### Everything else is deliberately inactive

The content script is only injected on the hosts in the manifest. On any other
site the extension does nothing at all — no listeners, no DOM access, no network.
You can add a site yourself (Options → Custom sites), which requests a host
permission for **that hostname only** and uses the generic heuristic adapter.

---

## Per-adapter mechanics

All adapters share one implementation (`extension/src/providers/base.ts`), so
behaviour is identical across sites; an adapter is just selectors plus a
capability label.

**Finding the composer**

1. Try each selector in order, returning the first match that is *actually
   visible* (`isVisible`: connected, ≥ 40×12 px, not `display:none`,
   `visibility:hidden`, or `opacity:0`). This is what stops the adapter typing
   into a hidden template editor.
2. Reject anything that cannot accept text (`isEditable`: textarea, input,
   `isContentEditable`, or a `contenteditable` attribute).

**Writing text**

| Target | Method | Why |
|---|---|---|
| `<textarea>` / `<input>` | native `value` setter + `input` + `change` events | A plain `el.value = x` is silently ignored by React; the prototype setter is what React observes. |
| `contenteditable` | select-all → `document.execCommand('insertText')` | Produces a real editor transaction in ProseMirror and Quill. |
| `contenteditable`, fallback | synthetic `paste` with `DataTransfer` | Covers editors that ignore `insertText`. |
| any | verify afterwards | Success is reported **only** if the composer now holds the text. |

**Submitting**

1. Find the send control (stable test id → aria-label → form submit button).
2. If it is visible and not disabled (`disabled` or `aria-disabled="true"`),
   click it.
3. Otherwise dispatch a full Enter sequence (`keydown`/`keypress`/`keyup`,
   `keyCode: 13`) on the composer — many editors expose no usable button.
4. Return `false` if neither works, which makes the controller fall back to the
   clipboard instead of submitting an empty message.

---

## Provider-specific notes

### ChatGPT — `chatgpt.com`, `chat.openai.com`
Composer: `#prompt-textarea` (ProseMirror). Send: `[data-testid="send-button"]`,
then aria-label matches, then form submit. The button is often disabled until a
real key event, which is why the Enter fallback exists and is tested.

### Claude — `claude.ai`
Composer: `div.ProseMirror[contenteditable]` inside a `fieldset`. Send: button
with an aria-label containing "Send message". Anthropic also runs A/B layouts;
the selector list is layered for that reason. **Partially supported.**

### Gemini — `gemini.google.com`
Composer: `.ql-editor[contenteditable]` inside a `<rich-textarea>` custom
element. Angular re-renders the composer on navigation, so the adapter resolves
the composer fresh on every send rather than caching a node. **Partially
supported.**

### Copilot — `copilot.microsoft.com`
Composer: `#userInput` textarea, or a form-scoped textarea. Send: form submit.
**Not tested against the live site.**

### Custom sites
Hostname added by you → generic adapter → the largest visible editable element
is treated as the composer, and the nearest visible submit-ish button (or Enter)
is used to send. Capability is always reported as **Not tested**, because by
definition we have not tested it.

---

## Maintenance: when a site breaks

Symptom: the panel does not open, or the prompt lands in the wrong place.

1. `extension/test/dom/fixtures.ts` — update the fixture to the new markup.
2. `src/providers/<site>.ts` — adjust `inputSelectors` / `sendSelectors`.
3. `npx vitest run extension/test/dom` — the fixture is the regression test.
4. Reload the tab and confirm manually.
5. Update that adapter's `verification` string and this page if the capability
   label changes.

Never raise a capability label without a fixture-backed test for that label.
