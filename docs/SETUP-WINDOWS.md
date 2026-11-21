# Windows setup

> Status: the installer and the Windows-only parts were authored but **not built or run on Windows** in this delivery. Follow "Build" first, then the steps below, and report anything that differs.

## Build (once, on a Windows PC with Node 20+ and the .NET 8 SDK)

```powershell
cd second-thought\desktop
npm install
npm test            # builds, then runs the relay + shared-engine tests
npm run dist        # builds the app, the UI Automation helper and the installer
```

Output: `desktop\release\Second Thought Setup 0.3.0.exe` (per-user, no administrator rights). Run it, then launch **Second Thought** — it starts in the system tray and (by default) with Windows.

For development: `npm start`.

## Chrome

1. Build the extension: `npm run build` in the repo root → load **`extension\bundle`** (not `extension`) at `chrome://extensions` → *Developer mode* → *Load unpacked*.
2. Open the extension’s **Settings**. Copy the *extension ID* shown under **Windows companion**.
3. Open Second Thought (tray icon) → **Browsers** → paste it under *Chrome extension ID* → **Register**.
4. Restart Chrome. In the extension Settings click **Connect to companion** and accept the permission. The status line should read *Connected to the Windows companion*.
5. Reload any open ChatGPT tab (tabs opened before install are not injected by Chrome).

## Edge

Same as Chrome, but use `edge://extensions`, the **Edge** ID and the Edge row under **Browsers**. Chrome and Edge IDs differ; register each.

## ChatGPT Desktop

1. Start the ChatGPT Desktop app and type a prompt in its message box.
2. Press **Ctrl+Alt+Space** (changeable in Settings → General).
3. Answer the questions → review → **Insert** or **Insert & send**.
4. If the companion cannot reach the message box, it says why, uses your clipboard as the source, and puts the improved prompt on the clipboard for **Ctrl+V**.
5. Settings → Connection status → ChatGPT Desktop → **Test** reports whether the box is reachable. If your app runs under a different process name, set it under General.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Extension installed, nothing happens | Reload the ChatGPT tab. Open the popup: it says *Reload tab* or *No input found*. |
| "Companion not reachable" | Companion not running (check the tray), browser not registered, or browser not restarted after registering. |
| Registered but still not connecting | Wrong extension ID (Chrome vs Edge differ; unpacked IDs change if you load from another folder). Re-register. |
| ChatGPT Desktop: "did not expose its message box" | The installed app version hides it from accessibility. Use the clipboard fallback; please report the app version. |
| Shortcut unavailable | Another app owns it. Pick a different combination. |
| Ollama 403 | Set `OLLAMA_ORIGINS=chrome-extension://*` and restart Ollama. |
| No AI mode | Add a key in Settings; local mode works without any key. |

Uninstall: remove the app from Windows Settings → Apps; Settings → Browsers → **Remove** deletes the registry entries first.
