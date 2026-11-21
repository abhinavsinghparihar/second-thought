# Second Thought

**The pause between intention and send.**

Second Thought is a browser extension that sits between you and ChatGPT, Claude,
Gemini or Copilot. When you press send on a request that is missing the details
the answer actually needs, it pauses once, asks a few sharp multiple-choice
questions about *your* request, and then hands the AI a structured brief — with
your original wording kept verbatim at the top.

It is not a prompt rewriter. It is a requirement-discovery layer: it adds what
you forgot, it does not put words in your mouth.

```
You:      "Build me an expense tracking app"        ← 31% specified
              ↓  one pause, 4 questions, ~15 seconds
You get:  a brief that names the features, the storage, the deliverable
          form and the constraints — then sends it for you
```

---

## Install (Chrome / Edge)

Second Thought is **not on the Chrome Web Store**. It is installed manually, and
Chrome will not update it for you.

1. Download [`second-thought-extension.zip`](https://github.com/abhinavsinghparihar/second-thought/releases/latest/download/second-thought-extension.zip) from the latest [Release](https://github.com/abhinavsinghparihar/second-thought/releases).
2. Extract it to a folder you will keep.
3. Open `chrome://extensions` and turn on **Developer mode**.
4. Click **Load unpacked** and select the extracted folder (the one containing `manifest.json`).
5. Pin Second Thought to the toolbar, open its Settings and add your own API key.

To update, download the newest ZIP and repeat. Status: pre-1.0; provider support is
fixture-tested but not yet verified against the live sites (see [docs/LIMITATIONS.md](docs/LIMITATIONS.md)).

Report problems: [https://github.com/abhinavsinghparihar/second-thought/issues](https://github.com/abhinavsinghparihar/second-thought/issues)

## Repository layout

| Folder | Purpose | Deployed / released as |
|---|---|---|
| `site/` | Static website | Netlify (publish dir `site`) |
| `extension/` | Chrome extension source; `bundle/` is the built output | GitHub Release ZIP |
| `packages/core/` | Requirement engine used by the extension | bundled into the extension |
| `desktop/` | Experimental Windows companion app | not part of this release |
| `docs/`, `synopsis/`, `design-explorations/`, `scratch/` | Documentation and working material | not shipped |

---

## Build from source

```bash
npm install          # workspaces: packages/core + extension
npm run verify       # typecheck + 210 tests + build
```

Then load the extension:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** → select `extension/bundle`

Open a chat on a supported provider and press send on a vague request.

| Command | What it does |
|---|---|
| `npm test` | Run the full suite (engine, worker scenarios, adapters, controller) |
| `npm run typecheck` | `tsc --noEmit` across the repo |
| `npm run build` | Bundle the extension into `extension/bundle` |
| `npm run package` | Produce `second-thought-extension.zip` |
| `npm run shots` | Render popup / options / panel screenshots (needs Playwright) |

Full instructions: **[docs/INSTALL.md](docs/INSTALL.md)**.

---

## Documentation

| Document | Contents |
|---|---|
| [docs/AUDIT.md](docs/AUDIT.md) | The Phase 1 audit of the original repository: every bug, every security finding, and the plan |
| [docs/INSTALL.md](docs/INSTALL.md) | Install, build, package, and run the preview harness |
| [docs/API.md](docs/API.md) | Bring-your-own-key setup for Gemini, Groq, OpenAI, OpenRouter, Anthropic, Ollama |
| [docs/PROVIDERS.md](docs/PROVIDERS.md) | Per-provider capability matrix and what "supported" actually means |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Exactly what leaves your browser, when, and what is stored where |
| [docs/TESTING.md](docs/TESTING.md) | The 14 acceptance scenarios, how they are tested, and what is *not* covered |
| [docs/LIMITATIONS.md](docs/LIMITATIONS.md) | Known limitations, stated plainly |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Every change made during the upgrade, phase by phase |

---

## How it works

```
┌──────────────────────────── your browser ────────────────────────────┐
│                                                                      │
│  chatgpt.com / claude.ai / gemini / copilot                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  content script                                                │  │
│  │    • detects the provider (or stays completely passive)        │  │
│  │    • runs the local prefilter on every send  (no network)      │  │
│  │    • opens the panel, collects answers, puts the prompt back    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              ↕ chrome.runtime messages                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  service worker                                                │  │
│  │    • local engine runs ALWAYS (packages/core)                  │  │
│  │    • in AI mode, your provider refines only the questions      │  │
│  │    • the final prompt is always composed locally               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  chrome.storage.local → your API key (opt-in, never synced)          │
└──────────────────────────────────────────────────────────────────────┘
                 │ only when you choose AI mode and save a key
                 ▼
        your provider (Gemini / OpenAI / …) — directly, never through us
```

Two engines, deliberately:

- **Local (default).** A rule-based requirement engine, on-device, zero network,
  zero cost. It is never described as AI anywhere in the interface.
- **AI (opt-in, your key).** The model sees your request and the locally-detected
  gaps, and may change *which questions are worth asking*. It does not write the
  final prompt — that is always composed locally from your structured answers,
  so the output stays auditable and your wording is never overwritten.

If the provider fails — bad key, rate limit, timeout, garbage JSON — Second
Thought falls back to the local engine and **says so** on the panel. Your
message is never trapped.

---

## The safety contract

These are enforced by tests, not just intended:

- **Your message is never lost.** Every failure path either sends the untouched
  original or leaves it in the composer. A complete request is never interrupted.
- **The send decision is synchronous.** `preventDefault()` is called before any
  `await`, because cancelling after a round trip is too late — by then the site
  has already sent it.
- **Insertion is verified before submitting.** If the composer did not take the
  text, nothing is submitted; the prompt is copied to the clipboard instead.
- **Your key never leaves `chrome.storage.local`.** It is never synced, never
  logged, never echoed in an error, and only a 4-character hint reaches any UI.
- **The model is untrusted input.** Its JSON is validated field by field, capped,
  and rendered with `textContent` only. The shipped UI has no data-path
  `innerHTML` (a test enforces this).

---

## Repository layout

```
second-thought/
├── packages/core/          the requirement-discovery engine (pure, no DOM)
│   ├── src/                classify · extract · schema · questions · scoring · compose · engine
│   └── test/               49 engine acceptance tests
├── extension/
│   ├── src/
│   │   ├── background/     service worker, AI adapters, prompt + validation
│   │   ├── content/        controller (interception) + clarification panel
│   │   ├── providers/      DOM adapters for ChatGPT / Claude / Gemini / Copilot
│   │   ├── popup/ options/ shared/ ui/
│   ├── test/               worker scenarios · adapter fixtures · controller · packaging
│   ├── preview/            self-contained offline previews of every surface
│   └── bundle/             built, loadable extension
├── docs/                   audit, install, API, providers, privacy, testing, limitations
└── site/                   the product site (design source of truth)
```

## Licence

MIT.


## Windows companion (desktop)

A background tray app that gives the browser extension a shared engine and adds an assist for the ChatGPT Desktop app. The extension and website keep working without it.

* Architecture & audit: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
* Install (Chrome, Edge, ChatGPT Desktop) and troubleshooting: [docs/SETUP-WINDOWS.md](docs/SETUP-WINDOWS.md)
* Security & privacy: [docs/SECURITY-PRIVACY.md](docs/SECURITY-PRIVACY.md)
* What was and was not tested: [docs/TEST-REPORT.md](docs/TEST-REPORT.md)

Build on Windows (Node 20+, .NET 8 SDK):

```powershell
cd desktop
npm install
npm test
npm run dist      # → desktop\release\Second Thought Setup 0.3.0.exe
```
