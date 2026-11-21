# Change log — the upgrade

Everything below was done to an **existing** product. The starting point is
commit `2a91805` ("Initial release"), audited in [AUDIT.md](AUDIT.md). Nothing was
rewritten from scratch and nothing working was deleted without a stated reason.

Read this alongside the audit: the audit says what was *wrong*, this says what was
*changed* and why.

---

## Headline

| | Before | After |
|---|---|---|
| Build | **fails** — `@second-thought/core` missing entirely | ✅ 374 KB bundle |
| Typecheck | fails | ✅ clean |
| Tests | **0 runnable** (imported a non-existent module) | ✅ **210 passing** |
| Engine | only survived as minified code inside `bundle/background.js` | ✅ reconstructed as `packages/core`, 49 tests |
| Decisions | AI mode paid for a call it could not act on | ✅ local verdict is final; complete prompts cost nothing |
| Fail-safe | panel could wait on a dead worker | ✅ every path releases the message |

---

## Phase 1 — Audit

- `docs/AUDIT.md`: 17 numbered bugs (B1–B17), 9 security findings (S1–S9), and the
  phased plan.
- Key finding: the repository **could not build, typecheck, or run a single
  test**. The entire intelligent behaviour lived in a workspace package
  (`@second-thought/core`) that was not in the repository; the only surviving copy
  was minified inside the committed `bundle/background.js`, which was
  de-minified and used as the reference contract so no behaviour was lost.

---

## Phase 2 — Redesign to the product's own visual language

Rebuilt all surfaces against `site/index.html`, `site/mark.svg` and the site's
tokens. No generic SaaS styling, no glows, no fake metrics.

- `src/ui/tokens.ts` — one source of truth: white paper, black ink, hairline
  rules, Inter with negative tracking, pill radii, `cubic-bezier(.16,1,.3,1)`.
- `src/ui/mark.ts` — the ST disc mark as inline SVG, reused in popup, options,
  panel header and the analysis animation.
- **Popup**: engine/provider/status at a glance, the current site, one primary
  action, honest capability chip.
- **Options**: numbered sections (engine, provider, key, behaviour), segmented
  engine control, key row showing `····0000` only, live connection test, privacy
  note inline where the decision is made.
- **Panel**: five deliberate stages — analyzing → questions → (follow-up) →
  summary → editable prompt — plus error and fallback states.
- **Icons** regenerated at 16/32/48/128 (pure-Python rasteriser, 4× supersampled).

---

## Phase 3 — The engine

Reconstructed as `packages/core` (pure, synchronous, dependency-free, no DOM):

- **Ten task categories**, each with its own requirement schema:
  software, website, mobile, coding/debugging, writing, research, image
  generation, business, education, general. A website request is never asked
  about authentication-on-mobile; an image request is never asked about page
  structure.
- **Contextual questions.** Options are synthesised from the user's own words and
  the detected domain — "Which features should the *expense tracking app*
  include?" with options like `receipt scanning`, not "What features do you want?".
- **Skip what is already known.** Extraction runs first; only genuinely missing
  slots are asked about.
- **Adaptive follow-up.** A second round targets higher-weight slots, and never
  repeats a slot already shown (`askedSlots`).
- **Completeness gates the interruption** rather than being a scoreboard: ≥ 78% →
  never interrupt; a complete prompt is left completely alone. The old score
  ceiling (could not reach 100) and threshold drift (two different thresholds for
  "done") are fixed by construction — one `GAP_THRESHOLD` for both.
- **Prompt composition** keeps the user's sentence verbatim, states the collected
  requirements under headings the model can act on, and ends with a precedence
  rule so the original always wins over a mis-clicked option.

**Fixed during the browser walkthrough** (both invisible to unit tests):

- The prompt repeated the user's own request as a requirement ("What it must do:
  - build expense tracking app"). Extracted purpose text that merely restates the
  original is no longer rendered.
- "What we understood" showed the *original* score above a list of answers that
  had raised it, and listed just-answered slots as "still unspecified". Now:
  `Your wording 31% → Answered 58%`, a live meter, and a gap list recomputed from
  the merged answers.
- The task category was not stated in the prompt at all; `software`, `coding` and
  `website` share a role line, so the model could not tell a debugging request
  from a build request. Now stated explicitly.

---

## Phase 4 — Bring your own key

- **Five modular adapters** (`src/background/providers/`): Gemini, OpenAI,
  OpenRouter, Anthropic, Ollama. One interface, one failure vocabulary — adding a
  provider is one file and one registry line.
- **Never hardcoded, never logged, never synced.** Keys live in
  `chrome.storage.local`; only `{ hasKey, savedAt, hint(4 chars) }` crosses a
  message boundary; `redactSecrets` strips anything key-shaped at the boundary,
  including a key a provider echoes back in an error.
- **Strict JSON + schema validation** of model output: type-checked per field,
  capped (≤6 questions, ≤7 options, length limits, confidence clamped), malformed
  entries dropped, non-objects rejected.
- **Real error taxonomy**: `auth`, `model-not-found`, `rate-limit`, `quota`,
  `server`, `timeout`, `network`, `bad-response`, `no-key`, `aborted`. One retry,
  transient errors only, +400 ms backoff.
- **Honest fallback.** Any failure degrades to the local engine with a visible
  "Local analysis" label. Rule-based output is **never** described as AI, in the
  UI or in the docs.

---

## Phase 5–7 — Natural UX and fail-safe delivery

- Panel opens bottom-right inside a **closed shadow root**; page scripts cannot
  reach it.
- Flow: questions (with "Other" on every MCQ, all skippable) → editable
  requirement summary → generated prompt → **Use this prompt**.
- Per-provider capability labels displayed in the product, matching
  [PROVIDERS.md](PROVIDERS.md).
- **Never trap the user**: Send original, Back, Retry, Escape, and manual
  fallback all preserve the message. Insertion is verified before submitting; if
  it fails, nothing is sent and the prompt is copied to the clipboard.
- **Timeouts sized for real latency** (the original used 9 s for AI paths, which
  no hosted model reliably beats): local 3 s, AI 36 s, follow-up 36 s, refine 8 s,
  settings 2 s.

**Production bugs found by writing the controller tests:**

1. **The send decision could be made after the send.** `processSendIntent` awaits
   the worker *then* called `preventDefault()`. In a real browser, cancelling at
   that point is too late — the site has already dispatched the message, so the
   user's prompt went out **and** the panel opened. Split into a synchronous gate
   (`shouldPause`) that cancels immediately, and async work that follows.
2. **A partial settings payload disabled interception for the whole session.**
   `matchesSite(undefined, …)` threw inside the capture listener, which is
   wrapped in a silent `catch` — so the extension appeared dead with no error
   anywhere. Settings are now merged onto the defaults.

**Layout bugs found by screenshotting (jsdom cannot see either):**

3. A long follow-up round escaped the panel body — a flex child without
   `min-height: 0` refuses to shrink, so the content rendered outside the card.
4. Setting focus on an option made the browser scroll the nearest scrollable
   ancestor into view, sliding the panel's own header out and leaving an
   apparently blank white card. Fixed with `overflow: clip` plus keeping DOM
   focus out of the native inputs (which stay tabbable).

---

## Phase 8 — Tests

| Suite | Tests |
|---|---|
| `packages/core/test/engine.test.ts` | 49 |
| `extension/test/scenarios.test.ts` | 23 |
| `extension/test/extension.test.ts` | 35 |
| `extension/test/dom/adapters.test.ts` | 31 |
| `extension/test/dom/controller.test.ts` | 9 |
| `packages/core/test/quality.test.ts` | 63 |
| **Total** | **210 passing** |

- The 14 acceptance scenarios run the **real** worker; AI mode goes through the
  **real** provider adapter and a **real** `fetch` (stubbed at the network
  boundary), so the assertions inspect the actual request body and the exact
  response shapes.
- Adapter DOM fixtures cover the failures that matter: hidden decoy editor,
  React-owned textarea, disabled send button, empty page, hostname-suffix
  attacks.
- New: a functional `chrome.*` fake (`test/helpers/fake-chrome.ts`) with the real
  async shapes and separate `sync`/`local`/`session` scopes.
- **Deleted**: the stale `extension/test/extension.test.ts` (it imported a module
  removed during the rewrite and asserted a `Settings` field that no longer
  exists). It was **rewritten, not restored** — reintroducing dead code to satisfy
  a test would have been the wrong direction.

---

## Phase 9 — Product coherence and docs

- One design language across popup, options, panel and error states.
- `README.md` rewritten (it was a 16-byte stub containing only `# second-thought`).
- Added: `docs/INSTALL.md`, `docs/API.md`, `docs/PROVIDERS.md`,
  `docs/PRIVACY.md`, `docs/TESTING.md`, `docs/LIMITATIONS.md`, this file.
- `npm run verify` = typecheck + tests + build, and the build now stages into
  `.bundle-staging` and only swaps into `bundle/` on success, so a failed build
  never leaves a broken extension on disk.
- Screenshot/debug scripts moved out of the repository root into `scratch/tools/`.

---

## Phase 10 — Engine quality: contextual, not generic

The brief's central promise is that the questions adapt to the request. Phase 9
made the engine *correct*; probing a corpus of 19 realistic prompts showed it was
still often **generic** — it asked for things the user had already written.

Everything below was found by running `scratch/corpus.ts` through
`npx tsx` and reading the output, then fixed and re-probed. Every fix has a
regression test in `packages/core/test/quality.test.ts` (63 tests).

### What was actually wrong

| Symptom | Cause | Fix |
|---|---|---|
| "Write a 900-word post…" asked for length | the length regex required the unit as a separate word, so `900-word` never matched | hyphenated compound accepted |
| `with a checklist at the end` asked for structure | structure regex only knew "three sections" style phrasings | rewritten to accept trailing-clause structure requests |
| "…and no jargon" asked for exclusions | no `must_avoid` slot existed at all | new slot in `WRITING`, plus `must_include`/`must_avoid` extraction for **every** category |
| "for first-time home buyers in Lucknow" asked for audience | audience extractor only knew a curated list | conservative generic second pass that stops at a trailing preposition |
| "write a haiku about rain" asked "What exactly is it about?" | topic extraction only read `about X` for some categories, and ignored the subject entirely | subject-derived topic, quoted-material topic, and derivative-noun guard |
| "translate … to French" treated as a blog post | no translation signal in the classifier | `write-translate` signal (3.0) + `write-form` (2.6); `edu-explain` split into `edu-teach` / `edu-lookup` so bare lookups still pass through |
| "Fix this Python error…" scored like an empty request | the verb, the exception and the pasted material were all unread | `goal` derived from the verb, `error` keeps the actual exception, `problem` takes pasted code |
| **free-text questions had no answer to tap** | every `kind: 'text'` slot rendered a bare textarea — the "answerable by MCQ with an Other path" requirement was not met | every text question now ships **domain-derived suggestion chips** that fill the box; the panel renders them as buttons |
| "General readers" appeared next to "General audience" | pack options were concatenated without deduplication | merged; asserted across the whole corpus |
| "What should the **the this** include?" | the fallback subject is the word `this` | interpolation normalises the double determiner |

### The result, measured

| Prompt | Before | After |
|---|---|---|
| 900-word blog brief, fully specified | interrupted at 58, four generic gaps | **passes through at 86** |
| `explain how DNS works` | `general`, generic questions | `education`, asks level / depth / learning style |
| `write a haiku about rain` | `general`, generic questions | `writing`, names the poem in its questions |
| `Fix this Python error…` | 10, treated as empty | 66, asks only what is genuinely missing |
| `translate "hello" to French` | `general` | `writing`, translation-aware |

**Honest caveat:** the score is a heuristic, not a measurement of answer
quality. A high score means "the request looks specified"; it does not mean the
resulting prompt is better, and nothing here is validated against real model
output.

---

## Deletions, and why

| Removed | Reason |
|---|---|
| `extension/src/background/ai-client.ts` | Superseded by `src/background/ai/{prompt,validate,analyze}.ts`, which adds schema validation, per-provider adapters, retries and timeouts. Nothing imported it after the rewrite. |
| The old question bank inside the engine | No source existed in the repository; its behaviour was recovered from the minified bundle and is superseded by the schema-driven question builder. Documented in the audit. |
| `extension/test/extension.test.ts` (old contents) | Imported a deleted module; asserted a removed setting. Rewritten against the current architecture. |
| `@sparticuz/chromium` devDependency | Unusable in this environment (missing system libraries) and unrelated to the product. |

## Preserved

The website (`site/`), the ST mark and all imagery, all four provider
integrations plus Gemini and Ollama API adapters, custom-site support, the
history feature (still opt-in), exclusion lists, the popup/options/panel
architecture, and the original engine's public contract
(`analyzeRequest`, `refineRequest`, `AnalysisResult`, `AnswerSet`,
`RefinementOutcome`) — which is why the existing worker and controller continued
to work during the rewrite.

---

## What still cannot be claimed

Everything here is verified *except* these, which are stated as limitations
rather than hidden:

- No live verification against the real provider sites for this build (adapters
  are fixture-tested; labels say so).
- No live calls to Gemini/OpenAI/OpenRouter/Anthropic (no keys in this
  environment; behaviour is tested against real response shapes).
- No interactive Chrome install of the built extension (the manual smoke test in
  [TESTING.md](TESTING.md) exists for that).
- Nothing else. Everything claimed in these documents was executed and observed;
  the four items above are the ones that require a live browser session or real
  API credentials to close.
