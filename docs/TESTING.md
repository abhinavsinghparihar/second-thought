# Testing

```bash
npm test          # 210 tests
npm run typecheck # clean
npm run verify    # both + build
```

As of the current build: **210 / 210 passing**, `tsc` clean, build succeeds
(374 KB). Every number on this page was produced by actually running the command.

| Suite | Tests | Environment | What it covers |
|---|---|---|---|
| `packages/core/test/engine.test.ts` | 49 | node | the requirement engine |
| `packages/core/test/quality.test.ts` | 63 | node | corpus regressions: nothing already stated is asked again, no blank free-text questions, no duplicate options |
| `extension/test/scenarios.test.ts` | 23 | node | the 14 acceptance scenarios, through the real worker |
| `extension/test/extension.test.ts` | 35 | node | manifest, permissions, redaction, model-output validation, packaging |
| `extension/test/dom/adapters.test.ts` | 31 | jsdom | provider adapters against DOM fixtures |
| `extension/test/dom/controller.test.ts` | 9 | jsdom | interception and the fail-safe contract |

---

## The 14 acceptance scenarios

All fourteen run against the **real** service worker (`src/background/worker.ts`)
with a functional in-memory `chrome.*` fake. In AI mode the **real** provider
adapter performs a **real** `fetch`, intercepted at the network boundary so the
test can assert on the actual request body and return the exact JSON shape each
provider sends. There is no mocked module in place of the code under test.

| # | Scenario | Asserted | Mode |
|---|---|---|---|
| 1 | Vague prompt | Interrupts; 3–6 domain-specific questions naming "expense"; score < 78; **`fetch` never called** | local |
| 2 | Vague prompt | Interrupts via provider; `engine: 'ai'`; reports provider + model + latency; key in a header, **never in the URL** | AI |
| 3 | Fully specified prompt | Passes through; **no API call**; engine scores it ≥ 78 | local + AI |
| 4 | Greeting | Passes through | local |
| 5 | Direct factual question | Passes through, and **no API call** even in AI mode | local + AI |
| 6 | Answers collected | Follow-up round never re-asks a seen slot; score rises | local |
| 7 | Prompt composition | Original wording verbatim; answers included; precedence rule present; score rises | local |
| 8 | Model returns non-JSON | Falls back to local; `engine: 'local'`; key absent from the payload | AI |
| 9 | Key rejected (401) | Falls back; `fallback.kind === 'auth'`; **key and `AIza` absent from the whole response object** | AI |
| 10 | Rate limited (429) | Exactly one retry; then honest fallback. And: recovers when the retry succeeds | AI |
| 11 | Provider never answers | Hard timeout fires; falls back; user still gets questions | AI (fake clock) |
| 12 | AI mode, no key | Immediate fallback labelled `no-key`; **no API call**; status strip admits AI is not ready | AI |
| 13 | History disabled | Nothing written to `storage.local`; history list empty | local |
| 14 | Failure paths | Never returns `error`: always `intercept` or `passthrough`; malformed messages and unknown analysis ids fail soft | mixed |

Plus **credential handling**: keys land in `local` and never in `sync`; only a
4-character hint crosses a message boundary; removal works.

---

## Adapter fixtures

`extension/test/dom/fixtures.ts` reproduces the structure each adapter depends
on — a composer, a visible send button, a form — plus the cases that actually
break in production:

- a **hidden decoy editor** earlier in the DOM (the classic "typed into the
  invisible field" bug);
- a **React-owned textarea** whose DOM value is shadowed, proving the native
  setter path works;
- a **disabled send button**, proving the adapter does not click a dead control
  and does use the Enter fallback;
- an **empty page**, proving every adapter returns `null` instead of throwing;
- **hostname suffix** attacks (`chatgpt.com.evil.io`, `notclaude.ai`).

Every adapter declares a capability label and the suite asserts that label is one
of the allowed values *and* that its `verification` note exists. The labels are
not aspirational — see [PROVIDERS.md](PROVIDERS.md).

---

## Controller fail-safe tests

`extension/test/dom/controller.test.ts` drives the real `Controller` in a jsdom
page whose URL is `https://chatgpt.com/c/1`, with a host-side click handler that
records whether the message actually left:

| Test | Proves |
|---|---|
| blocks a vague send | the panel opens and the host handler never runs |
| lets a complete prompt through | the host handler *does* run |
| never asks the worker about a greeting | zero messages sent |
| worker unreachable | the send still goes out |
| worker returns an error | the send still goes out |
| extension disabled | the send is untouched |
| composer untouched while the panel is open | no text is destroyed |
| "Send original" | the original message is released, unchanged |
| Escape | the panel closes |

Two production bugs were found *by writing these tests*:

1. **The send decision could be made too late.** `processSendIntent` awaited the
   worker before calling `preventDefault()`. In a real browser the site's own
   handler has already run by then, so the message went out *and* the panel
   opened. Fixed by splitting the synchronous gate (`shouldPause`) from the async
   work.
2. **A partial settings payload silently disabled interception for the whole
   session** — `matchesSite(undefined, …)` threw inside the capture listener.
   Settings are now merged onto the defaults.

---

## What is **not** covered

Stated plainly, because a test suite that oversells itself is worse than none.

| Not covered | Why | Consequence |
|---|---|---|
| The **live** provider sites | No credentials, and the sites are not reproducible offline | A site redesign can break an adapter. Fixtures prove the code path, not today's markup. |
| Real API calls to Gemini/OpenAI/OpenRouter | No keys available in this environment | Auth, billing and model-availability behaviour is exercised against recorded response *shapes*, not the real service. Providers are labelled accordingly. |
| A real Chrome install of the loaded extension | Requires an interactive browser profile | Load `extension/bundle` and try it manually — the checklist below exists for that. |
| Custom-site permission grants | Needs a real `chrome.permissions` prompt | Logic is unit-tested; the Chrome UI flow is not. |
| Cross-browser (Firefox/Safari) | Out of scope | Chromium MV3 only. |
| Visual regression | Screenshots are generated but not diffed | Layout is verified by eye, not automatically. |

---

## Manual smoke test (5 minutes, real browser)

Run this after any change that touches the content script or adapters.

1. `npm run build`, reload the extension, reload the chatgpt.com tab.
2. Type **`Build me an expense tracking app`** → press Enter.
   - Expected: the panel opens bottom-right, ~4 questions, footer says "4 to answer".
   - The message must **not** have been sent.
3. Answer three options → **Continue**.
   - Expected: a second round of *different* questions; the footer counts progress;
     the round-2 meter carries a note that these questions are not yet counted.
4. Answer one → **Build prompt**.
   - Expected: a summary reading `Your wording 31% → Answered …`, then an editable prompt.
5. Check the prompt contains your original sentence **verbatim** and no duplicated
   "what it must do" line.
6. Press **Use this prompt**.
   - Expected: text lands in the composer and is sent once.
7. Repeat steps 2–3 and press **Send original** instead.
   - Expected: exactly your original text is sent, once.
8. Repeat and press Escape.
   - Expected: nothing is sent; your draft is still in the composer.
9. Type **`hey there`** → Enter.
   - Expected: no interception at all.
10. Options → Test connection (with a real key).
    - Expected: latency message, or a plain-language failure with no key in it.

---

## Writing new tests

- Import the **real** module. Use `installFakeChrome()` for `chrome.*` and
  `vi.stubGlobal('fetch', …)` for the network.
- For DOM suites, add the environment header so the page URL matches the provider
  you are testing:
  ```ts
  // @vitest-environment jsdom
  // @vitest-environment-options {"url": "https://chatgpt.com/c/1"}
  ```
- Call `controller.dispose()` when finished — leaked capture listeners make the
  *next* test intercept the *previous* one's sends.
- Never assert a capability or a "supported" claim you have not exercised
  end-to-end.
