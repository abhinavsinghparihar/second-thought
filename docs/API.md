# Bring your own key (BYOK)

Second Thought works with **no key at all** — local analysis is the default and
is fully functional. An API key is only needed if you choose *AI-powered*
analysis in Settings.

There is no Second Thought account, no signup, and no server of ours in the
path. Your key is stored in this browser and the request goes from your browser
straight to the provider you pick.

---

## 1. Where to get a key

| Provider | Free tier? | Where to create the key |
|---|---|---|
| **Google Gemini** *(recommended)* | Yes — generous | <https://aistudio.google.com/app/apikey> |
| **OpenAI** | No (prepaid) | <https://platform.openai.com/api-keys> |
| **Groq** | Free tier, very fast | <https://console.groq.com/keys> |
| **OpenRouter** | Some models are free | <https://openrouter.ai/keys> |
| **Anthropic** | No (prepaid) | <https://console.anthropic.com/settings/keys> |
| **Ollama** | Free (local) | n/a — run it locally, see §5 |

---

## 2. Configure it

1. Click the Second Thought icon → **Settings** (or right-click → Options)
2. **01 Analysis engine** → choose **AI-powered**
3. **Provider** → pick one; the model field fills with a working default
4. **API key** → paste → **Save**
5. **Test connection** → this makes one tiny real request and reports latency

A successful test looks like:

```
● Connected to Google Gemini (gemini-2.0-flash) in 486 ms.
```

A failure is reported in plain language — *"Google Gemini rejected the API key.
Check the key in Settings."* — and never contains the key itself.

### After saving

The key row shows `SAVED ····0000 · <date>`: the last four characters and the
date. **The full key is never displayed again, and is never sent back to any part
of the UI.** "Remove key" deletes it immediately.

---

## 3. Which model should I use?

Any model in the provider's list will work; the task is small (one short JSON
analysis), so cost is negligible — a few tenths of a cent per analysis.

| Provider | Default | Notes |
|---|---|---|
| Gemini | `gemini-2.0-flash` | Fastest, cheapest, most reliable JSON output. Good default. |
| OpenAI | `gpt-4o-mini` | Reliable; set a small spend limit on the key. |
| Groq | `llama-3.3-70b-versatile` | Lowest latency; model ids change, any id can be typed in Settings (not verified live). |
| OpenRouter | `meta-llama/llama-3.3-70b-instruct` | Useful for trying many models behind one key. |
| Anthropic | `claude-3-5-haiku-latest` | Cheapest Claude; strong instruction-following. |
| Ollama | `llama3.1` | Fully local. Slower, quality depends on your hardware. |

You can type any model id your account has access to, even if it is not in the
list. An invalid model produces a clear *"The model was not found on …"* error.

---

## 4. What actually gets sent

In AI mode, **exactly one** request is made per prompt you send:

| Sent | Not sent |
|---|---|
| Your request text (as typed) | Your API key *to any third party* — it only goes to the provider, in a request header |
| The detected task category | Your browsing history |
| The requirement slots the local engine found empty | Your other conversations |
| — | Any identifier of you |

The model's only job is to decide **which questions are worth asking** and how
to word them. The final prompt you send to ChatGPT/Claude/whatever is composed
**locally** from your structured answers — the model never writes it. Full detail
in [PRIVACY.md](PRIVACY.md).

---

## 5. Ollama (fully local AI)

```bash
ollama serve
ollama pull llama3.1
```

Then in Settings: Provider → **Ollama (local)** → Test connection.

Notes:

- Ollama listens on `http://localhost:11434`. This is in
  `optional_host_permissions` and is requested **only** if you select Ollama.
- No key is required; `needsKey` is `false` for this provider.
- CORS: Ollama allows localhost origins by default. If you run it behind a proxy
  or in Docker with a restricted origin list, set `OLLAMA_ORIGINS` to include the
  extension origin, or the connection test will report a network error.
- The timeout is 45 s (vs 30 s for hosted providers) because local generation on
  modest hardware is slower than an API.

---

## 6. Errors you may see

Every message is written to be actionable, and none of them contains the key.

| Message | Meaning | What to do |
|---|---|---|
| `… rejected the API key` | 401/403 | Re-paste the key; check it was not revoked |
| `The model was not found on …` | 404 | Pick a different model |
| `… is rate limiting — try again in a moment` | 429 | Wait a few seconds; one automatic retry already happened |
| `… reports no remaining quota for this key` | 429 with billing text | Top up or use another key |
| `… took longer than 30s to respond` | timeout | Retry, or switch to local mode |
| `Could not reach …` | network/CORS | Check connection; for Ollama check it is running |
| `… returned a response that could not be understood` | invalid JSON twice | Retry; if it persists, switch models |

When any of these happens, the panel **keeps working in local mode** and labels
the result honestly:

> **Local analysis.** Google Gemini rejected the API key. Check the key in Settings.

That label is the guarantee: you are never told a rule-based result came from a
model.

---

## 7. Key handling, precisely

- Stored in `chrome.storage.local` — **not** `chrome.storage.sync`, so it is
  never uploaded to a Google account and never rides along to another device.
- Never written to a log, a message payload, an error string, or an analytics
  event (there is no analytics).
- Never returned across a message boundary: `st/settings-get` returns only
  `{ hasKey, savedAt, hint }` where `hint` is the last 4 characters.
- Redacted defensively at the boundary (`redactSecrets`) — even if a provider
  echoes the key back inside an error body, it is stripped before it can reach
  the UI. This is covered by tests.
- Removed by "Remove key", or all at once by `chrome.storage.local.clear()`.

See [PRIVACY.md](PRIVACY.md) for the full data-flow table.


## Models are chosen for you

Leave the Model dropdown alone. When you save a key, Second Thought asks the provider which models **that key** can use, lists only those, and selects the best one for this job (fast, reliable JSON, strong enough for good questions). Use **Refresh models** to reload the list, or pick another from the dropdown. If the list cannot be loaded, a text box appears so you can type a model id.

## Ollama

1. Install Ollama and pull a model, for example `ollama pull llama3.1`.
2. Allow the extension to call it. Ollama refuses browser extensions by default (HTTP 403), so start it with:
   - Windows (PowerShell): `setx OLLAMA_ORIGINS "chrome-extension://*"`, then quit and restart Ollama.
   - macOS/Linux: `OLLAMA_ORIGINS="chrome-extension://*" ollama serve`
3. In Settings choose **Ollama (local)** and click **Test connection**. Chrome asks once for access to `127.0.0.1`; allow it.

The extension talks to `127.0.0.1:11434` (not `localhost`), which avoids the Windows IPv6 mix-up where `localhost` resolves to `::1` while Ollama listens on IPv4 only.

## Custom provider (any OpenAI-compatible API)

Choose **Custom (OpenAI-compatible)**, enter the base URL (for example `https://api.together.xyz/v1`), click **Save & allow**, add a key if the service needs one, then pick a model from the list. The extension calls `<base>/models` and `<base>/chat/completions`. Only `https://` is accepted, except `http://` for a server on your own machine (LM Studio, vLLM, …).
