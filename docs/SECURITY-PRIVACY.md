# Security & privacy

## Where your prompt goes

| Mode | What happens |
|---|---|
| Local | Analysed on your PC. Nothing is sent anywhere. |
| AI (your key) | The request text and your answers go **directly from your PC to the provider you chose** (or your Custom base URL). Nothing goes to us; there is no Second Thought server. |
| Browser ↔ companion | Only over a local pipe on your PC. |

No telemetry, no accounts, no analytics. The desktop UI blocks all network requests from its own windows.

## Secrets

* API keys are stored with Windows **DPAPI** (Electron `safeStorage`): readable only by your Windows user on this PC. If encryption is unavailable the app refuses to save keys instead of writing plain text.
* Keys are never logged, never in the repository, never sent to the browser extension by the companion, never shown back (only the last four characters).
* Prompts and answers are held in memory for the session and not written to disk by the companion.

## Attack surface and the controls on it

* **Pipe:** per-user name + a random token regenerated at every start, stored in your profile, required as the first message; malformed or oversized input drops the connection. (Executed in tests: wrong token is dropped; oversize frame exits.)
* **Native host:** `allowed_origins` is exactly the extension ID you registered, per browser. It prints nothing but framed replies and never logs prompt text.
* **Electron:** `contextIsolation`, `sandbox`, `nodeIntegration: false`, strict CSP on both windows, navigation and new windows denied, all permission requests denied, IPC handlers accept calls only from our own pages and validate every argument. Node APIs are never exposed to renderers.
* **Extension:** content scripts can only send the analyze/refine messages; keys, settings writes, history and provider tests are refused when they come from a web page. AI calls are rate-limited (24/min) to protect your quota.
* **UI Automation:** reads the ChatGPT input only when you press the shortcut; inserts through the clipboard and restores your previous clipboard text; presses Enter only after you click *Insert & send*.

## Limits you should know

* A local process running as *you* can read your own files and clipboard; the controls above defend against other users and web pages, not against malware already running as you.
* Free providers may log prompts under their own terms. Read your provider’s policy.
