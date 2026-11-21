# Architecture & audit report — Windows companion

Written before the companion was built, from the repository as it actually is. Everything marked **(verified)** was read in the code or executed; everything marked **(hypothesis)** could not be reproduced from here.

## 1. What exists

| Part | Location | State |
|---|---|---|
| Website | `site/` (static; `index.html`, `style.css`, `app.js`, `img/`) | Kept. Cinematic redesign, strict CSP, no remote assets. |
| Browser extension (MV3) | `extension/src/**` → `extension/bundle/` | Kept. Additive changes only (below). |
| Shared engine | `packages/core/src/**` (classification, gaps, questions, completeness, composer) | Kept, unchanged apart from CJK word counting and custom slot labels. |
| Extension worker | `extension/src/background/worker.ts` (+ `ai/`, `providers/`, `local-buy.ts`) | The orchestrator: local engine, buying guides, AI providers, auto model choice, AI prompt composition. |
| Providers | OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama, Custom (OpenAI-compatible) | Real adapters. No invented providers. |

## 2. Why the extension can "install fine but do nothing" on another Chrome

Reproduction was impossible from here (no second machine). These are the causes found in the code and in how Chrome behaves, ranked by likelihood:

1. **(verified)** Chrome does **not** inject content scripts into tabs that were already open when an extension is installed. The extension had no signal for this: the popup said nothing. → *Fixed:* the popup now pings the tab; if nothing answers it shows **"Reload tab"** with the reason.
2. **(verified)** The popup could not tell "script running but composer not found" from "working". → *Fixed:* the content script now reports `adapter / inputFound / sendFound` and the popup shows **"No input found"** with guidance.
3. **(verified)** The ChatGPT adapter relied on `#prompt-textarea` and `send-button`. → *Hardened:* extra role-based fallbacks (`div.ProseMirror[contenteditable]`, `[role=textbox]`, `composer-submit-button`). These fallbacks are **not verified against the live site** (no network here).
4. **(verified)** Loading the wrong folder: only `extension/bundle/` is loadable; `extension/` has no manifest. Documented in the setup guide.
5. **(verified)** Older default: engine was `local` with generic English-only questions; non-English or CJK prompts were passed through ("Too short") so it looked inert. → Fixed earlier (AI-first default, multilingual, CJK length).
6. **(hypothesis)** ChatGPT A/B-tests its composer markup per account. The layered selectors and diagnostics are the mitigation; a real fix needs a check against the user's live page.
7. **(verified)** `minimum_chrome_version` is 116; older Chrome refuses the extension (a visible error, not silent).

Both `https://chatgpt.com/*` and `https://chat.openai.com/*` are in `content_scripts.matches`; the adapter matches both hosts and rejects look-alikes (`evilchatgpt.com`, `chatgpt.com.evil.io`) — **executed**, see TEST-REPORT.

## 3. Target architecture

```
 Chrome / Edge ── ChatGPT page ── Extension (works alone)
      │  optional, user-enabled
      │  Chrome Native Messaging (stdio, 4-byte length + JSON, v1)
      ▼
 second-thought-host.cmd → host.js   (plain Node; one process per browser connection)
      │  per-user named pipe  \\.\pipe\second-thought-<user>   + random token
      ▼
 Companion (Electron main) ── bridge.ts ── shared engine (extension worker on a chrome shim)
      │                                          │
      │ global shortcut                          └─ local engine / buying guides / AI providers (BYOK)
      ▼
 UiaHelper.exe (.NET, Windows UI Automation) ── ChatGPT Desktop
```

* **One engine.** The companion does not re-implement analysis. `src/main/chromeShim.ts` provides the ~15 `chrome.*` calls the worker uses; the worker runs unmodified. Tests execute it in Node (see TEST-REPORT).
* **Extension stays independent.** Native messaging is an *optional permission* the user grants from Settings. Every companion call resolves to `null` on any problem and the extension's own path continues; the user's text is never held back or dropped.
* **Protocol** (`src/main/protocol.ts`): `{v:1, id, type: hello|analyze|next-round|refine, payload}` → `{v:1, id, ok, payload|error}`. Validated at the host, the pipe and the bridge; size-capped everywhere.
* **Browsers registered separately** (`nativeHost.ts`): one manifest + one HKCU registry key per browser, each with that browser's own extension ID in `allowed_origins`. No admin rights.
* **ChatGPT Desktop:** UI Automation finds the input in the accessibility tree (no coordinates); reading uses ValuePattern/TextPattern; inserting uses clipboard paste (restored afterwards); submit presses Enter only after the user clicks *Insert & send*.

## 4. Files added / changed

Added: `desktop/**` (Electron app, native host, UIA helper, tests, installer config), `extension/src/background/companion.ts`, `extension/src/background/local-buy.ts`, `extension/src/background/ai/compose.ts`, `extension/src/background/providers/{models,custom}.ts`, `site/{style.css,app.js,boot.js,_headers}`, `vercel.json`, docs.

Changed (additive): extension manifest (`optional_permissions` + `nativeMessaging`, Groq host), worker (sender allowlist, AI rate limit, companion hooks), popup (tab diagnostics), options (companion section, model dropdown, custom provider, base URL), settings (`useCompanion`, `customBaseUrl`, automatic model), ChatGPT adapter selectors, core (`wordCount`, `labels`).

Not touched: the site's content/structure was redesigned visually earlier at the user's request, not deleted; nothing was removed.

## 5. Known limits

* Windows-only pieces (Electron shell, installer, registry, named pipe, UIA) **could not be built or run** in the Linux environment this was produced in. See TEST-REPORT.
* ChatGPT Desktop is a web-technology app; whether its prompt box is exposed through UI Automation depends on the installed version. The integration detects this and falls back to the clipboard rather than pretending.
