# Second Thought v0.3.0 (pre-1.0 beta)

First public download. Manual install only: not on the Chrome Web Store, and Chrome will not auto-update it.

## Install
1. Download `second-thought-extension.zip` (attached below).
2. Extract it, open `chrome://extensions`, enable Developer mode.
3. Load unpacked, choose the extracted folder containing `manifest.json`.
4. Pin the extension, open Settings, add your own API key.

## What it does
Pauses a vague request once, asks a few multiple-choice questions, and sends a structured brief with your original wording kept verbatim at the top. Complete prompts and simple questions pass straight through, and every failure path releases your original message.

## Provider status (honest)
| Provider | Status |
|---|---|
| ChatGPT | Fixture-tested (jsdom). Not yet confirmed on the live site. |
| Claude, Gemini | Fixture-tested on layered selectors. May break on site redesigns. |
| Copilot | Heuristic selectors, never verified live. |
| Any other chat | Add the hostname under Custom sites (generic adapter). |

Question engine: local rules (no key), or your own Groq / Gemini / OpenAI / Anthropic / OpenRouter / Ollama key.

## Privacy (verified against source)
API keys are stored in `chrome.storage.local` only (never synced). No telemetry or analytics. The only network calls are to the AI provider you configure. Prompt history is off by default.

## Known limitations
See `docs/LIMITATIONS.md`. Requires Chrome/Edge 116+.

## Report issues
https://github.com/abhinavsinghparihar/second-thought/issues
