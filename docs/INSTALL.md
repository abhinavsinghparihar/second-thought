# Install, build and run

## Requirements

| | Version | Why |
|---|---|---|
| Node.js | ≥ 20 | workspaces, ESM, `structuredClone` |
| npm | ≥ 10 | workspace-aware install |
| Chrome / Edge | any current MV3-capable build | the extension target |
| Python + Playwright | optional | only for regenerating screenshots |

There are **no runtime dependencies**. The extension ships no third-party code:
everything in `bundle/` is built from this repository.

---

## 1. Install and verify

```bash
git clone <repository> second-thought
cd second-thought
npm install
npm run verify
```

`npm run verify` runs three things in order and stops at the first failure:

```
npm run typecheck   → tsc -p tsconfig.json --noEmit
npm run test        → vitest run                     (210 tests)
npm run build       → node extension/esbuild.config.mjs
```

Expected output ends with a size table and:

```
Extension built → <repo>/extension/bundle
Load unpacked from this directory in chrome://extensions (Developer mode).
```

---

## 2. Load the extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/bundle` directory — **not** `extension/`

> `extension/src` is TypeScript source. Loading it directly will produce a
> service-worker error; the extension must be loaded from `bundle/`.

After changing source, run `npm run build`, then press the reload icon on the
extension card.

### Optional: pin it

Click the puzzle-piece icon in the toolbar and pin **Second Thought** so the
popup is one click away.

---

## 3. Packages

```bash
npm run package     # → extension/second-thought-extension.zip
```

The zip contains the contents of `bundle/` at its root (unzipped, that folder is
directly loadable). `preview/` and the test suites are **not** included.

---

## 4. Develop

```bash
npm run build -w @second-thought/extension -- --watch   # rebuild on change
npx vitest                                              # watch mode
npx vitest run extension/test/scenarios.test.ts         # one suite
npx vitest run -t "scenario 8"                          # one scenario
```

### What to reload after a change

| Changed | Action |
|---|---|
| `src/content/**` | reload the **tab** (content scripts re-inject) |
| `src/background/**`, AI adapters | reload the **extension** card |
| `src/popup/**`, `src/options/**` | just reopen the popup / options page |
| `packages/core/**` | `npm run build`, then reload the extension |

---

## 5. Preview harness (no browser install needed)

`extension/preview/` contains **self-contained** HTML files that render the real
UI with the real engine, offline, with no `chrome.*` APIs:

```bash
node extension/preview/build-preview.mjs
# → extension/preview/popup.html
# → extension/preview/options.html
# → extension/preview/panel.html
```

Open any of them directly in a browser. They are generated from source (they
inline the built CSS and JS and a small in-memory `chrome` stub), so they cannot
drift from what ships.

`panel.html` is the interesting one: it drives the **real** `ClarifyPanel` with
the **real** `analyzeRequest` / `analyzeNext` / `composeFrom`, over seven sample
prompts, so you can walk the whole flow — questions → follow-up round → summary
→ editable prompt — without touching a provider.

> These are development artefacts. They are excluded from the packaged zip.

---

## 6. Regenerating screenshots

```bash
pip install playwright
python3 -m playwright install --with-deps chromium
npm run shots          # → scratch/*.png
```

The scripts live in `scratch/tools/` and are development-only; nothing in the
product depends on them.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Could not resolve "@second-thought/core"` | `npm install` not run at the repo root | `npm install` (workspaces must be installed together) |
| Panel never appears | Extension disabled, or site excluded | Check the popup: it shows the engine, the site, and whether the content script is live |
| Nothing happens on send | Request scored ≥ 78% | Working as intended — see [TESTING.md](TESTING.md) scenario 3 |
| `Load unpacked` rejects the folder | Pointed at `extension/` | Point at `extension/bundle` |
| Tests fail with `chrome is not defined` | Importing a `chrome.*` module without the fake | Use `installFakeChrome()` from `extension/test/helpers/fake-chrome.ts` |
| Content script does not run on a custom site | Host permission not granted | Options → Custom sites → add the host; Chrome prompts once |

---

## 8. Uninstall and clean removal

1. `chrome://extensions` → **Remove**
2. Optional: clear stored data — open the extension's service worker console and
   run `chrome.storage.local.clear()` (this deletes your saved API keys).

Removing the extension leaves no other trace: no native host, no background
process, no data outside `chrome.storage`.
