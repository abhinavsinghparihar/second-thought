# Known limitations

Nothing here is a bug report we are hiding — these are the boundaries of what the
current build actually does. Where a limitation is a deliberate trade-off, the
reason is stated.

---

## 1. Verification limits (the honest section)

| Limitation | Detail |
|---|---|
| **No live-site verification for this build** | Adapters are proven against DOM fixtures. Nobody has confirmed against a live ChatGPT/Claude/Gemini session for *this* build, because that requires an interactive browser session. Labelled accordingly in [PROVIDERS.md](PROVIDERS.md). |
| **No live API calls tested** | Auth, quota and model availability are exercised against recorded response *shapes*. A real key may still surprise us (a new model id, a new error shape). Fail-safe handling means that becomes a labelled fallback, not a broken prompt. |
| **Provider labels are conservative** | Only ChatGPT carries "Supported". The others are "Partially supported" or "Not tested" even though their fixtures pass — the label tracks the *evidence*, not the code quality. |

---

## 2. Engine limits

| Limitation | Detail |
|---|---|
| **Rule-based, English-first** | The local engine classifies and extracts with lexical heuristics. It handles English well and degrades on other languages — task detection and slot extraction become guesses. AI mode is the mitigation. |
| **Ten categories, ten schemas** | software, website, mobile, coding, writing, research, image, business, education, general. A request that straddles two (e.g. "build a website *and* write the copy") is classified to the closest and may ask about the other's dimensions less precisely. |
| **Completeness is a heuristic** | The percentage is a weighted coverage score, not a measurement of answer quality. It gates the interruption (≥ 78% → never interrupt); it is not a grade. Two numbers are shown on purpose: what your wording scored and what answering would reach. |
| **Maximum one follow-up round** | Deliberate. A second round is where this kind of tool starts to feel like a form. The residual gaps are listed instead of asked. |
| **Answer-length caps** | Question text ≤ 220 chars, options ≤ 90, ≤ 6 questions and ≤ 7 options. Guards against a runaway model, at the cost of very fine-grained questions. |
| **No project memory** | Every prompt is analysed fresh. The engine does not learn your stack or your preferences across sessions. A deliberate privacy choice. |
| **Extraction is pattern-matching, not understanding** | Each slot is read by regular expressions tuned against a **19-prompt corpus** that lives in `scratch/corpus.ts`. Prompts phrased outside those patterns fall back to asking, and a paraphrased requirement ("keep it tight" for length) is simply missed. Unusual phrasings degrade toward more questions, never toward wrong answers. |
| **Suggestion chips are static per artifact** | Free-text questions offer one-tap chips, but the chip lists are hand-written per artifact type (cover letter, blog post, report, email…). An artifact not in that table gets chips derived from its subject, and a subject the engine failed to extract gets none beyond a generic fallback. |
| **The interrupt threshold is a tuning choice** | 78% is calibrated on the same small corpus. On a long, dense brief that the extractor only partly reads, the tool can still interrupt a prompt a human would call complete. The panel always offers **Send original**, so the cost is one click, not a wrong answer. |

---

## 3. AI mode limits

| Limitation | Detail |
|---|---|
| **Costs money** | One short completion per prompt, typically a few hundredths of a cent — but it is not free, and it is your key. |
| **Adds latency** | Expect 0.4–2 s for the analysis before the panel appears, versus instant in local mode. The panel shows an analysis state and lets you skip it. |
| **Timeouts** | Hosted providers: 30 s with one retry for transient errors. Ollama: 45 s. Beyond that the request falls back to local and says so. |
| **Single retry only** | Two attempts maximum. More retries mean the user waits longer for a result they were never promised. |
| **No streaming** | The analysis response is parsed in one shot; there is no partial UI. |
| **Model choice is yours to get right** | An invalid or ungranted model id produces a clear error and a local fallback, not a repair. |
| **Anthropic browser access** | Requires the documented `anthropic-dangerous-direct-browser-access` header for direct browser calls. That is Anthropic's supported BYOK path for browser clients, not a bypass. |

---

## 4. Browser and platform limits

| Limitation | Detail |
|---|---|
| **Chromium MV3 only** | Chrome and Edge. Firefox requires a different manifest (`browser_specific_settings`, event pages) and Safari requires packaging — neither is done. |
| **Site redesigns break adapters** | This is inherent, not incidental. Mitigations: layered selectors, visible-element filtering, and failing safe rather than failing loud. See the maintenance procedure in [PROVIDERS.md](PROVIDERS.md#maintenance-when-a-site-breaks). |
| **Service worker is not persistent** | MV3 reclaims it when idle. That is why the analysis cache lives in `storage.session` rather than a `Map` — but a very long pause between answering questions (>15 min) will expire the analysis and return you to the composer. |
| **jsdom is not a browser** | Two real layout bugs (a flex child escaping its container, a focus-scroll shifting the panel) were invisible to the DOM tests and only found by screenshotting. Visual behaviour needs a human or a screenshot diff. |
| **Clipboard fallback needs a gesture** | If insertion cannot be verified, the prompt is copied and left in the composer. A page that blocks `navigator.clipboard` shows the "prompt is in the box" message instead, with no copy. |

---

## 5. Scope limits (things this product deliberately does not do)

- **It does not rewrite your prompt.** The composer output is a structured brief
  with your original sentence verbatim at the top and a precedence rule that
  makes the original authoritative. If you want a rewriter, this is not one.
- **It never intercepts:**
  - greetings and short messages,
  - direct factual questions ("What is the capital of India?"),
  - requests already ≥ 78% specified,
  - anything on an excluded site,
  - anything while the extension is off.
- **It does not auto-send.** Every submission is either the user's own click or
  an explicit "Use this prompt" / "Send original".
- **It collects no telemetry.** There is no analytics layer, no crash reporting,
  no usage counter of any kind.
- **It has no server.** There is nothing of ours to be down, breached, or
  subpoenaed.

---

## 6. Accessibility

| Supported | Notes |
|---|---|
| Keyboard | Everything is reachable by Tab; Enter/Continue, Escape to exit. Options use native radio/checkbox inputs kept in the tab order but excluded from pointer focus, to avoid the browser scrolling the host page. |
| Screen readers | `role="dialog"`, `aria-modal`, `aria-labelledby` on groups, live progress text. Labelled icon buttons. |
| Focus visibility | `:focus-visible` rings on options, buttons and the close control. |
| Reduced motion | Honoured. `prefers-reduced-motion: reduce` zeroes the duration tokens and disables the entrance, scan, line and spinner animations (verified in a headless Chromium with that preference set). |
| Dark mode | Follows the system preference. |

---

## 7. If something goes wrong

Your message is the priority. In every failure mode below, it is still delivered:

| Failure | What happens |
|---|---|
| Worker does not respond | the original send is released untouched |
| Provider errors | the panel still opens, in local mode, labelled "Local analysis" |
| Text insertion fails | nothing is submitted; the prompt is copied and left in the box |
| The panel is closed or Escape is pressed | the draft stays exactly as you typed it |

If you ever find a case where a message is *lost*, that is a bug worth reporting
with: the site, whether AI mode was on, and what the panel was showing.
