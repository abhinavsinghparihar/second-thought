# Second Thought — Phase 1 Complete Audit

**Auditor:** senior product/extension/AI/security review
**Commit audited:** `2a91805` (main, "Initial release: Second Thought website and extension")
**Date:** 2026-10-31
**Method:** every file read line-by-line; deps installed; build, typecheck and tests actually executed; the committed `bundle/background.js` was de-minified to recover the original engine (its source package is missing from the repo — see §1.1).

---

## 0. TL;DR — the headline finding

**The repository, as published, cannot build, cannot be typechecked, and cannot run a single test.**

Every intelligent behaviour of the product lives in a workspace package
`@second-thought/core` — `analyzeRequest`, `refineRequest`, the task
classifier, the requirement extractors, the gap detector, the completeness
scorer, the question bank and the prompt composer.

That package **is not in the repository.** Neither is the root
`package.json`, the `tsconfig.base.json` it extends, or any `docs/`.
The extension source imports a module that does not exist:

```
✘ [ERROR] Could not resolve "@second-thought/core"
    src/background/worker.ts:7:7
```

The only surviving copy of the engine is the compiled, minified
`extension/bundle/background.js` that was committed to the repo
(45,949 bytes). De-minifying it recovered the original behaviour, which
is documented in §3 and was used as the **reference contract** for the
reimplementation, so that no working behaviour was lost.

Also note: `README.md` is a 16-byte file containing only `# second-thought`
(no newline, no content), `.gitignore` is **0 bytes**, and the website
links to a repository that is not this one.

---

## 1. Existing architecture

### 1.1 What the repo actually contains

```
second-thought/
├── .gitignore                    0 bytes  (empty!)
├── README.md                     16 bytes (a bare "# second-thought")
├── extension/
│   ├── esbuild.config.mjs        aliases @second-thought/core → ../../packages/core/src/index.ts  ← MISSING
│   ├── tsconfig.json             extends ../../tsconfig.base.json                                  ← MISSING
│   ├── package.json              no dependencies, no test script
│   ├── popup.html + src/popup/popup.ts
│   ├── options.html + src/options/options.ts
│   ├── public/manifest.json + public/icons/*
│   ├── src/background/{worker.ts, ai-client.ts}
│   ├── src/content/{main.ts, controller.ts, panel.ts, panel.css.ts}
│   ├── src/providers/{types,registry,chatgpt,claude,gemini,copilot,generic}.ts
│   ├── src/shared/{types,settings,custom-sites}.ts
│   ├── test/extension.test.ts    (does not run)
│   └── bundle/                   committed build output (stale, v0.2.0 manifest)
├── site/  index.html, logos.html, logos-st.html, mark.svg, img/*.jpg (10 images)
└── (MISSING) packages/core, package.json, tsconfig.base.json, docs/
```

### 1.2 Intended (and now restored) architecture

```
┌───────────────────────────── Chrome ─────────────────────────────┐
│ popup.html  (action)        options.html (settings)              │
│        └──────────┬───────────────┘                              │
│            chrome.runtime messages                               │
│                   ▼                                              │
│  background.js  (MV3 service worker)                             │
│    ├── policy/orchestration (worker.ts)                           │
│    ├── @second-thought/core  ← local requirement engine (PURE)    │
│    └── ai-client.ts          ← direct BYOK calls to providers     │
│                   ▲                                              │
│                   │ messages                                     │
│  content.js  (on chatgpt.com / claude.ai / gemini.google.com /    │
│               copilot.microsoft.com / user-added sites)          │
│    ├── controller.ts  — intercept keydown+click, own the send     │
│    ├── panel.ts       — Shadow-DOM clarification UI (closed)      │
│    └── providers/*    — DOM adapters per site                     │
└──────────────────────────────────────────────────────────────────┘
```

Design intent that is genuinely good and was preserved:
- the engine is **pure and synchronous** (no I/O), so it can run in the
  content script for a ~1 ms prefilter and in the worker for the full job;
- the panel is **closed Shadow DOM** with `textContent`-only writes;
- the **content script never throws into the host page**;
- keys are in `chrome.storage.local`, settings in `chrome.storage.sync`.

---

## 2. Feature status

### 2.1 Actually implemented and working (once `core` exists)

| Area | Status | Notes |
|---|---|---|
| Provider detection by hostname | ✅ | exact/subdomain match, `chatgpt.com.evil.io` correctly rejected |
| Custom-site match-pattern building | ✅ | pure, well tested, rejects wildcards |
| API key in `storage.local`, settings in `storage.sync` | ✅ | correct storage split |
| Error redaction before UI | ✅ | `[A-Za-z0-9_-]{24,}` → `[redacted]` |
| Shadow-DOM panel, XSS-safe rendering | ✅ | no `innerHTML` anywhere |
| Intercept on Enter + on send-button click, with own-submit suppression | ✅ | `suppressUntil` window |
| Local prefilter before blocking the send | ✅ | prevents pausing "What is the capital of India?" |
| Fail-safe if worker unreachable → original send released | ✅ | good contract |
| AI JSON parsing hardened against fences/prose/malformed fields | ✅ | `parseAiJson` |
| Four provider AI adapters (OpenAI, OpenRouter, Anthropic, Gemini) + Ollama | ⚠️ code present, **never verifiable** — no `host_permissions`, see §6.4 |

### 2.2 Partially implemented

| Area | Gap |
|---|---|
| AI analysis | Only **replaces the question list** after the local engine already decided to interrupt. The model never sees *which slots are missing*, never sees the schema, never sees previous answers, is capped at 3 questions and 500 output tokens. Single-shot; no follow-ups. |
| Provider adapters | Selectors are plausible but `capability` is self-assigned. Claude/Gemini are marked `partial` with no evidence; Copilot `unknown`. No insertion verification. |
| History | Written in `worker.handleRefine` with `providerId: 'unknown'` (hardcoded, controller's provider id is dropped). No UI to read it. |
| Custom sites | `options.ts` calls `chrome.scripting.getRegisteredContentScripts()` **before** requesting the `scripting` permission → throws → always shows "Could not apply". |
| Dark mode | None anywhere. |
| Mobile/narrow layouts | Popup fixed `300px`; panel `380px`; no responsive breakpoints. |

### 2.3 Missing entirely

- **The intelligence engine itself** (source deleted from repo).
- Adaptive follow-up round (questions that depend on answers).
- Requirement summary that the user can review and edit.
- "Remove API key" control; "Test connection" exists but cannot work (§6.4).
- Per-provider model discovery / model validation.
- Any indication of real vs. fallback engine beyond a tiny chip.
- MockChat test page that the website advertises.
- All documentation (install, API, providers, privacy, testing, limitations).
- Any build for the website (it is a hand-written static file — acceptable, but undocumented).

---

## 3. Current MCQ generation — the real problem

This is the part the brief calls the highest-priority defect. Verified by
running the recovered engine.

### 3.1 It is a static lookup, not a generator

The engine ships a fixed bank of **34 question objects** in a plain object
literal, keyed by `slot` or `"taskType.slot"`:

```
language_out, format, deadline, audience, tone, length, depth, geography,
constraints, platform, coding.mobile_os, language, framework, feature,
output_shape, writing.content_type, writing.purpose, scope, research.purpose,
sources, subject, style, aspect_ratio, lighting, objective, tooling,
dataset_desc, level, goal, timeframe, recipient, communication.purpose,
key_points
```

Question selection is `bank[taskType + "." + slot] ?? bank[slot]`, sorted by
static weight, sliced to `maxQuestions`. There is **no use of the user's
prompt when writing the question text** and **no use of the prompt when
building the options**.

Consequently, for the exact example in the brief:

> "Build me a really cool app."

the engine asks `platform` with the fixed options
`web | android | ios | desktop | cli | browser extension` and `feature` as a
*blank text box*. It can never ask:

> "Which features should the expense-tracking app include?"
> · Monthly spending analytics · Budget limits and alerts · Receipt scanning
> · Category-wise expense tracking · All of these · Other

because option text is a constant. **This is the core defect.** Adding more
entries to the bank cannot fix it — the bank is the wrong shape.

### 3.2 Other verified defects in the engine

1. **Only 3 questions, ever.** `parseAiJson` and `Z()` both hard-cap at 3;
   no 3–6 range, no "All of these" aggregate option, no per-question
   importance signal.
2. **No adaptation.** `refineRequest` is one-shot. `panel.ts` can only
   show/hide questions that were *already generated* via a static
   `condition` field (`mobile_os` when `platform === mobile`). A second
   round is structurally impossible — `onRefine` must return a final prompt.
3. **Conflicting weight thresholds.** Gaps are computed with
   `weight >= 0.55`; the completeness score counts every slot with
   `weight >= 0.30`. A task can therefore be "complete enough" (score ≥ 70)
   while the gap detector still lists material gaps, or vice versa.
4. **Score ceiling.** `0.6·coverage + 0.25·specificity + 0.15·intentClarity`
   where specificity ≤ 0.65 by construction and intentClarity ≤ 1 → a
   realistic completion tops out around 78. The user sees a number that
   never reaches 100 and cannot tell whether it improved.
5. **`intentClarity` is a proxy, not a measure.** It is
   `min(1, classifierConfidence + 0.15 if a verb is present)` — the same
   value for "build an app" and "build an expense tracker for 4 people in
   React Native with receipt scanning".
6. **Ambiguity is scored, never detected.** "really cool app", "something",
   "whatever", "etc." only subtract a specificity penalty. Nothing records
   *why* the request is vague, so nothing can target the question at it.
7. **No conflict detection.** "short but comprehensive", "cheap and
   premium", "detailed 2-line summary" produce no warning and no question.
8. **Blank text boxes.** The two highest-weight slots for several categories
   (`feature`, `subject`, `objective`, `goal`, `research.purpose`) are
   free-text with zero options — the least useful possible MCQ.
9. **`ignoreSlots` is never populated** by the worker.
10. **AI never improves the interrupt decision.** In `worker.handleAnalyze`,
    `runAiAnalysis` begins with `if (!base.isRefinable) return null`, so a
    prompt the local engine considers complete is never sent to the model
    even in AI mode. Conversely, in AI mode a local-engine false positive
    still interrupts the user.

### 3.3 Answer → prompt mapping issues

`refineRequest` maps answers onto `fields` and rebuilds the prompt from a
per-category template. It works, and it correctly preserves the original
text and states *"If any detail above conflicts with the original request,
the original request wins."* — that is a genuinely good property and was
kept. However:

- answers are not validated against the slot's type/options;
- no de-duplication when the user's "Other" answer repeats an existing field;
- `changes` labels reuse the (now AI-supplied) question text, which in AI
  mode can be a long sentence — truncated at 90 chars in the UI, losing meaning;
- nothing checks the *final* prompt for completeness, so the review screen
  cannot warn "you still never said who this is for".

---

## 4. Build and test results (measured, before changes)

| Command | Result |
|---|---|
| `npm install` | "up to date" — **`package.json` declares no dependencies at all** |
| `npm run build` (`node esbuild.config.mjs`) | ❌ `ERR_MODULE_NOT_FOUND: Cannot find package 'esbuild'` — esbuild is not declared |
| after installing esbuild manually | ❌ `Could not resolve "@second-thought/core"` + `Cannot find base config file "../../tsconfig.base.json"` |
| `npx tsc -p tsconfig.json` | ❌ `TS5083: Cannot read file '/home/user/tsconfig.base.json'` + 4× `TS2307: Cannot find module '@second-thought/core'` |
| `npx vitest run` | ❌ suite fails to load: `Failed to load tsconfig '../../tsconfig.base.json': Tsconfig not found` — **0 tests executed** |
| `npm test` | ❌ script does not exist |
| `npm run package` | ❌ depends on the broken build; also requires `zip` and is undocumented |

The 148-line test file is *good* content and was kept and extended; it simply
has never had a chance to execute.

---

## 5. Visual identity audit (website → extension)

The website is a **Swiss/brutalist monochrome editorial** design. The
extension is a **warm paper + burnt-orange dashboard**. They share nothing
but the name.

### 5.1 Website design language (extracted from `site/index.html`, `mark.svg`)

| Token | Value |
|---|---|
| Background / foreground | `#fff` / `#000` |
| Muted text | `#525252` |
| Hairline | `rgba(0,0,0,.1)` — 1px rules used as the primary structural device |
| Inverse surface | `#0A0A0A` (footer) with `#737373` muted |
| Type | **Inter**; body `letter-spacing: -0.02em`; headings `-0.05em` / `line-height: 0.9` / weight 700–800 |
| Eyebrow label | `ui-monospace`, 14px, `uppercase`, `letter-spacing: .1em` |
| Buttons | pills, `border-radius: 999px`, black fill / 1px outline ghost |
| Sections | `h2` at `clamp(36px,6vw,56px)`, outline-fill "wipe" reveal, numbered `<ol>` with hairline top borders |
| Motion | `cubic-bezier(.16,1,.3,1)`, 0.7–1.4 s, restrained; a single `scan` line in the hero; `prefers-reduced-motion` fully honoured |
| Logo | 64×64 black disc, white `S` (Inter 800, 34px, x=11 y=46), white T made of `M32 14h24` + `M44 14v36`, 3.2 stroke, square caps. Animation: disc pops → S fades → T draws |

`site/img/` holds 10 photographic assets (hero, scenes, cards) used by
variants of the page but **not currently referenced by `index.html`**
(the page is pure type). `site/logos.html` / `logos-st.html` are the mark
exploration sheets; **mark 05 — white ST on black tile — is the shipped mark.**

### 5.2 Extension design language (current)

| Token | Value | Verdict |
|---|---|---|
| Background | `#fbfaf7` / `#f2f0e9` / `#f4f2ea` warm papers | ✗ clashes |
| Accent | `#c2410c` burnt orange (used for logo dot, switches, focus rings) | ✗ not in brand |
| Type | `-apple-system, Segoe UI, Roboto` | ✗ not Inter |
| Letter-spacing | `0.01em`, `-0.01em` | ✗ brand is tight/negative |
| Radii | 6–14px rounded cards | ✗ brand is pills + hairlines |
| Logo | orange rounded square with a white dot — **invented, not the ST mark** | ✗ wrong logo |
| Shadows | heavy `0 12px 40px` | ✗ brand uses hairlines |
| Dark mode | none | ✗ |

Answer to "does the extension match the website?" — **no, in every token.**

---

## 6. Security audit

### 6.1 Good (preserve)

1. API key isolated in `chrome.storage.local`; settings in `sync`. ✅
2. Key never sent anywhere except the chosen provider; no backend. ✅
3. Error strings redacted before reaching any UI surface. ✅
4. Panel is `mode: 'closed'`, all writes via `textContent`/`value`. ✅
5. No `eval`, no `new Function`, no remote code, no CDN, `offline_enabled`. ✅
6. `parseAiJson` treats model output as hostile and clamps every field. ✅
7. Prompt injection in *page content* cannot reach the model — only the
   user's own draft text is sent. ✅
8. Content script degrades to fully passive on any error. ✅

### 6.2 Real problems

| # | Severity | Finding |
|---|---|---|
| S1 | **High** | **No `host_permissions` for any provider API.** In MV3, `fetch()` from the service worker to `api.openai.com` etc. is subject to CORS; without host permission the preflight fails and **AI mode can never work**. It is currently impossible to verify BYOK at all. |
| S2 | **High** | `optional_host_permissions: ["https://*/*"]` requests *every site on the web*. A user who ever grants it gives the extension read access everywhere. Should be narrowed to the exact provider origins. |
| S3 | **Medium** | `.gitignore` is **empty** → `node_modules/`, `bundle/`, editor files and any future `.env`/key file would be committed. There is no secret-handling guardrail at all. |
| S4 | **Medium** | `worker.handleTestConnection` passes a junk key through the same path; error text is redacted but provider messages like `Incorrect API key provided: sk-proj-…abcd` can survive redaction if the key contains characters outside the class or is shorter than 24 chars. Redaction should be applied **inside** the AI client, on the message, before it leaves. |
| S5 | **Medium** | Analysis cache is an in-memory `Map` in the service worker. MV3 kills idle workers after ~30 s, so `st/refine` frequently returns *"Analysis expired"* → the user loses their answers. Not a secret leak, but a data-loss bug. |
| S6 | **Low** | `max_tokens: 500` + no `AbortController` → a hung request can hold the send hostage until the browser's fetch timeout; the 9 s UI timeout aborts the *wait* but not the *request*. |
| S7 | **Low** | Custom-site injection registers `content.js` on arbitrary user hosts. Legitimate (user gesture + permission), but the UI does not explain what the extension will read there. |
| S8 | **Low** | No CSP declared (`content_security_policy.extension_pages`); defaults are fine, but being explicit is better. |
| S9 | **Info** | "Closed shadow, textContent, no eval" is also advertised on the website, and it is true — keep it true. |

### 6.3 Direct-to-provider vs. backend proxy — decision

| | Direct BYOK (current, and retained) | Backend proxy |
|---|---|---|
| Key custody | user's browser only | server holds/forwards keys → breach blast radius |
| Data leaves browser | prompt → chosen provider only | prompt → your server → provider |
| Cost to user | their own quota, transparent | indeterminate |
| Abuse/rate-limit control | none (per-user) | centralised |
| Legal | simple | you become a data processor (GDPR/DPDP) |
| **Verdict** | **keep** | not justified for this product |

A proxy is only warranted if shipping a bundled key. This product does not.
Decision recorded in `docs/PRIVACY.md`; the UI states plainly where the text goes.

### 6.4 Verification limits (disclosed honestly)

I cannot verify, in this environment: live provider API calls (no
credentials, no network egress to those hosts from the sandbox), and live
DOM behaviour on chatgpt.com / claude.ai / gemini.google.com /
copilot.microsoft.com (the real sites are not loadable here). Provider
capability labels therefore stay conservative and every adapter is
exercised against a **jsdom fixture** that reproduces its documented DOM,
not against the live site. Anything not exercised is labelled "not tested"
rather than claimed.

---

## 7. Other verified bugs (numbered for the change log)

| # | File | Bug |
|---|---|---|
| B1 | `content/panel.ts:310` | `footer.lastElementChild.className = 'spacer'` runs **after** appending the Refine button — the primary button loses its class and renders unstyled. |
| B2 | `content/controller.ts:259` | Manual "Refine current draft" path uses the **local** 2.5 s timeout even in AI mode → AI refinement from the popup always times out. |
| B3 | `content/controller.ts:180` | AI analyse timeout 9 s and refine timeout 9 s are far too short for real hosted LLMs; the wait is aborted while the request keeps running. |
| B4 | `options/options.ts` | `getRegisteredContentScripts()` called before the `scripting` permission is granted → custom sites **always** fail with "Could not apply". |
| B5 | `options/options.ts` | No way to remove a stored API key. |
| B6 | `options/options.ts` | `persist()` saves `customSites` without granting permission, so the list looks applied but is not. |
| B7 | `background/worker.ts:186` | History entry hardcodes `providerId: 'unknown'`; the controller's provider id is discarded. |
| B8 | `background/worker.ts` | `st/open-panel` is declared in `RuntimeMessage` but never handled by the worker. |
| B9 | `shared/types.ts` | `AnalyzeResponse.engine` is `string`, not the `AnalysisEngine` union — typos compile. |
| B10 | `content/controller.ts:53` | `{...this.settings, ...newValue}` spreads a possibly-null base; a partial settings object can then reach `processSendIntent`. |
| B11 | `popup.html:88` | Footer link points at `github.com/second-thought/second-thought` — **does not exist**; the real repo is `abhinavsinghparihar/second-thought`. |
| B12 | version drift | `package.json` 0.1.0 · `manifest.json` 0.2.0 · `bundle/manifest.json` 0.2.0 · options footer "v0.1.0". |
| B13 | `site/index.html:220` | Install instructions point to `apps/extension/unpacked` and a `mockchat.html` that **do not exist**. |
| B14 | `site/index.html:186-189` | Capability copy contradicts the code (says ChatGPT "partial", code says `supported`; says Claude/Gemini "unknown", code says `partial`). |
| B15 | `esbuild.config.mjs` | `rmSync(out)` runs before the build; a failed build therefore **deletes the committed `bundle/`**. Observed during this audit (restored from git). |
| B16 | `extension/package.json` | No `dependencies`, no `devDependencies`, no `test`/`typecheck` script, no `engines`. |
| B17 | `src/shared/types.ts` | `st/apikey-get` returns only `hasApiKey`; the options page imports `getApiKey` directly from a *shared* module that assumes `chrome.storage`, so it cannot be unit-tested. |

---

## 8. Change plan (phases, in order)

1. **Restore the foundation** — workspace root, `tsconfig.base.json`, real
   `.gitignore`, declared dev-dependencies, `test`/`typecheck`/`build`
   scripts, version alignment. Fix B15 so a failed build never deletes
   `bundle/`.
2. **Rebuild the intelligence engine** (`packages/core`) as an adaptive
   requirement-discovery engine — reference-compatible with the recovered
   contract (`analyzeRequest`, `refineRequest`, `AnalysisResult`,
   `AnswerSet`, `RefinementOutcome`) so the existing worker/controller keep
   working, and additive (`analyzeNext`, `composeFrom`, `evaluatePrompt`).
   Contextual option synthesis, ambiguity/conflict detection, weighted
   decision gate, adaptive follow-up round, final-prompt completeness check.
3. **Fix the AI layer** — host permissions (S1/S2), real per-provider
   adapters with timeouts, retries, strict schema validation, richer
   task-aware prompt that includes the schema, what is already known and
   previous answers; removal of the "AI never changes the decision" bug.
4. **Premium redesign** to the website's tokens — popup, options page,
   clarification panel, MCQ interface, loading/analysis states, prompt
   preview, key configuration, error/fallback states, dark mode, responsive.
5. **Provider hardening + fail-safe** — verified insertion, manual fallback,
   persisted analysis cache (S5), timeouts that don't abandon requests (S6).
6. **Tests** — the 14 scenarios in the brief, local *and* AI mode, jsdom
   adapter fixtures, fake `chrome` API. Only claimed green when green.
7. **Documentation** — install, API config, providers, privacy, testing,
   limitations, build. Plus this audit.

**Nothing was deleted.** The only file replaced wholesale is the question
bank inside the engine, which had no source in the repo and whose behaviour
is superseded — and that is documented in the change log.
