# Privacy and security

Short version: **in local mode nothing leaves your browser at all.** In AI mode,
your request text goes from your browser directly to the provider whose key you
saved. There is no Second Thought server, no account, no analytics, and no
telemetry.

---

## 1. What leaves your browser

### Local mode (the default)

| Destination | What | When |
|---|---|---|
| *nothing* | *nothing* | — |

This is enforced in code, not by policy: the local path never calls `fetch`, and
a test (`scenario 1`) asserts that the fetch stub has **not** been called after a
full local analysis.

### AI mode (opt-in, your key)

One HTTPS request per prompt you send, **only after you choose AI mode and save a
key**, straight to the origin you selected:

| Provider | Origin | Key travels in |
|---|---|---|
| Google Gemini | `https://generativelanguage.googleapis.com` | `x-goog-api-key` header |
| OpenAI | `https://api.openai.com` | `Authorization: Bearer` header |
| OpenRouter | `https://openrouter.ai` | `Authorization: Bearer` header |
| Anthropic | `https://api.anthropic.com` | `x-api-key` header |
| Ollama | `http://localhost:11434` | no key; your machine only |

Request body contents:

- your request text, verbatim (truncated at 6 000 characters)
- the detected task category
- the requirement slots the local engine found empty
- conflicts the engine detected, if any

Never included: the page URL, your name, your email, a device or installation id,
any other conversation, or any history — history is a local-only, opt-in feature
and is never transmitted even when enabled.

**Your key is never placed in a URL.** Gemini uses a header specifically so the
credential cannot end up in a proxy or CDN access log.

### Ollama mode

Nothing leaves your machine. `localhost:11434` is a loopback call.

---

## 2. What is stored, and where

| Data | Store | Lifetime | Default |
|---|---|---|---|
| Settings (engine, provider, model, toggles) | `chrome.storage.sync` | until changed | present, no secrets |
| **API keys** | **`chrome.storage.local`** | until you remove them | absent |
| Analyses in progress (question sets, answers) | `chrome.storage.session` | 15 min TTL, max 50, cleared when the browser closes | transient |
| Prompt history | `chrome.storage.local` | until you clear it | **off** |

### Why keys are in `local` and not `sync`

`chrome.storage.sync` is uploaded to the user's Google account and replicated to
every signed-in device. A credential does not belong there. A test asserts that
after saving a key, `storage.sync` never contains it.

### Why the analysis cache is in `session`

The original implementation used an in-memory `Map` in the service worker. MV3
kills an idle worker after ~30 seconds, so `refine` regularly answered "analysis
expired" and the user lost the answers they had just given. `storage.session` is
memory-only, survives worker restarts, and is destroyed when the browser closes.

### History is opt-in and capped

`historyEnabled` defaults to `false`. When you turn it on: max 100 entries,
stored locally, cleared by "Clear history", never transmitted, never read by
anything except the history view.

---

## 3. Permissions, and why each one exists

```jsonc
"permissions": ["storage"],
"optional_permissions": ["scripting"],
"host_permissions": [
  "https://generativelanguage.googleapis.com/*",
  "https://api.openai.com/*",
  "https://openrouter.ai/*",
  "https://api.anthropic.com/*"
],
"optional_host_permissions": ["https://*/*", "http://localhost/*"],
"content_scripts": [ /* 5 hosts: chatgpt, chat.openai, claude, gemini, copilot */ ]
```

| Permission | Why | Why it is acceptable |
|---|---|---|
| `storage` | remember settings and (optionally) your key | no network capability |
| `scripting` (**optional**) | inject the content script into a site *you* add | requested at runtime, only when you add a custom site |
| 4 AI origins | call the provider you chose | granted at install; unused in local mode |
| `https://*/*` (**optional**) | so a custom site can be added later | **not** requested at install; prompted per operation |
| content scripts on 5 hosts | the sites we actually support | the extension is inert everywhere else |

Deliberately **not** requested: `tabs`, `webRequest`, `clipboardRead`,
`clipboardWrite`, `activeTab`, `<all_urls>`, `unlimitedStorage`. A test enforces
this list.

> The extension writes to the clipboard through `navigator.clipboard` (the
> standard web API) in the manual-fallback path — that is a user-gesture
> operation and needs no permission.

---

## 4. Security measures

### Content script

- **Closed shadow root.** The panel is unreachable from page scripts, so a
  hostile page cannot read your answers or click its buttons.
- **Capture-phase, synchronous cancellation.** `preventDefault()` runs before any
  `await`; cancelling after a round trip would let the message go out first.
- **Scoped interception.** Enter is only intercepted when the event target is
  inside the detected composer, so the site's search box, rename fields and
  dialogs keep working.
- **Verified insertion.** Text is only submitted if the composer demonstrably
  holds it. Otherwise nothing is sent and the prompt is copied to the clipboard.
- **No data path `innerHTML`.** Everything is `textContent`/`value`. A test scans
  the shipped UI modules for `innerHTML` and fails on anything that is not our
  own static SVG.

### Model output is untrusted input

The model is treated exactly like hostile user text. A response is:

- extracted as the first JSON object (fences and prose stripped);
- type-checked field by field;
- capped: ≤ 6 questions, ≤ 7 options each, ≤ 220 chars per question, ≤ 90 per
  option, confidence clamped to 0–1;
- rejected wholesale if it is not an object with a `questions` array;
- with malformed individual questions dropped rather than failing the call.

The prompt tells the model that the user's request is untrusted data and that
instructions inside it must be ignored. That is defence in depth, not the primary
defence — the primary defence is that its output can only ever become *text in a
`textContent` node*.

### Credentials

- Redacted at every boundary. Providers sometimes echo the key back in an error
  body; `redactSecrets` strips it (and pattern-matches `sk-…`, `AIza…`, and 32+
  char tokens) before the message can reach any UI surface.
- Never logged. Nothing in the extension calls `console.log` with a request,
  response, or key.
- A 4-character hint is the maximum that crosses a message boundary.
- Error messages are written in plain language and tested to contain no key.

### Build integrity

- No third-party runtime code is bundled; no CDN, no remote script.
- `content_security_policy.extension_pages` is `script-src 'self'` — no
  `unsafe-eval`, no remote origins.
- `npm run verify` runs typecheck + 210 tests + build, and the build writes to a
  staging directory and only swaps into `bundle/` on success (a failed build
  leaves the previous, working bundle intact).

---

## 5. Threat model — what this defends against, and what it does not

| Threat | Mitigation |
|---|---|
| A malicious page reading the panel | closed shadow root; panel state never in the page's DOM |
| A page reading your API key | key lives in `chrome.storage.local`, only read by the extension's own worker |
| Prompt-injection in a model response | strict validation, no markup rendering, no tool use |
| A key leaking through an error message | boundary redaction + tests |
| Silent data loss | every failure path releases the original message |
| Over-broad permissions at install | optional permissions; 5 hosts only |

**Not** defended against, by design:

- A compromised browser profile (malware with extension API access can read
  `storage.local` — as with any extension).
- The provider itself retaining your request (governed by their terms).
- A malicious *extension* running alongside this one.

---

## 6. Verifying these claims yourself

| Claim | Where to check |
|---|---|
| No network in local mode | `extension/test/scenarios.test.ts` — "scenario 1" |
| Key not in `sync`, not in responses | `scenarios.test.ts` — "credential handling" |
| No key in error strings | `scenarios.test.ts` scenario 9; `extension.test.ts` — redaction |
| Only declared permissions | `extension.test.ts` — manifest block |
| No data-path `innerHTML` | `extension.test.ts` — "no shipped UI module interpolates data through innerHTML" |
| Complete prompts not interrupted | `scenarios.test.ts` — scenario 3 |
