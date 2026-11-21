# Test report

Honest status. "Executed" means it was run in this delivery's environment (Linux, Node 22, headless Chromium). Nothing Windows-specific was executed.

## Executed — passed

| What | How | Result |
|---|---|---|
| Native host framing, pipe relay, bridge, protocol validation | `desktop/test/relay.test.mjs` (real host process + real pipe server; a unix socket stands in for the Windows pipe) | 5/5 passed: validation rejects malformed input; companion closed → immediate `companion-not-running`; hello + analyze round trip; wrong token dropped; oversized frame exits |
| Shared engine in the companion | `desktop/test/engine.test.mjs` (the real extension worker on the chrome shim, no API key) | 5/5 passed: laptop MCQs (budget/RAM/storage), Hinglish + Devanagari questions, greeting passthrough, refine keeps original + answers, unknown id fails cleanly |
| URL patterns | script: manifest `content_scripts.matches` + adapter host match | `chatgpt.com` ✔, `chat.openai.com` ✔ each independently; look-alike hosts rejected |
| Extension build | `node extension/esbuild.config.mjs` | built |
| Desktop bundle | `node desktop/build.mjs` (main, 2 preloads, host, 2 renderers) | built |
| Type check | `tsc` with stubs for `chrome`/`electron` | no errors other than stub artefacts; **not** checked against the real Electron types |
| Website | headless Chromium screenshots, no console errors | rendered |

## Not executed — needs Windows or a network

Fresh desktop install · Chrome install · Edge install · ChatGPT on chatgpt.com / chat.openai.com (live) · ChatGPT Desktop · companion closed/open in a real browser · browser restart · Windows restart · live API failure · Native Messaging with a real browser · the .exe installer · the .NET helper (not compiled) · the repo's `vitest` suite (not installable offline).

## Manual test plan

Run in a clean Windows user profile; tick each.

1. Install the setup .exe; confirm the tray icon appears and Settings opens.
2. Chrome: load `extension\bundle`, register, restart, **Connect to companion** → status *Connected*.
3. Edge: same with the Edge ID.
4. `chatgpt.com`: type "i want a laptop", press Enter → questions appear; finish → improved prompt is inserted and sent.
5. `chat.openai.com`: repeat (if the site still serves it).
6. Quit the companion from the tray; repeat step 4 → extension still works on its own (no hang).
7. Restart the browser; restart Windows → companion returns in the tray, browser reconnects.
8. Kill the companion mid-question → the extension finishes with its built-in engine.
9. Remove the API key → Local mode, questions still appear. Use a bad key → clear error, flow continues locally.
10. Complete prompt (long, specific) → passes through untouched.
11. ChatGPT Desktop: Settings → Test; shortcut with text in the box; confirm insert, insert & send, and the clipboard fallback when Test fails.
12. Cancel and Esc in every screen leave the original prompt untouched.
