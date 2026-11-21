/**
 * Design tokens — extracted from the official website (site/index.html).
 *
 * The website is Swiss/brutalist monochrome editorial: pure white and black,
 * hairline rules as the primary structural device, Inter with tightly negative
 * letter-spacing, pill buttons, and a single ink-black accent. Nothing in the
 * extension may invent a colour that is not derived from these values.
 *
 * Source of truth (site/index.html):
 *   --bg #fff · --fg #000 · --muted #525252 · --line rgba(0,0,0,.1)
 *   footer #0A0A0A · muted-on-dark #737373
 *   headings letter-spacing -0.05em, line-height .9, weight 700–800
 *   body letter-spacing -0.02em
 *   eyebrow: ui-monospace, 11–14px, uppercase, letter-spacing .1em
 *   buttons: border-radius 999px
 *   ease: cubic-bezier(.16,1,.3,1)
 */

export const CSS_TOKENS = `
:host, :root {
  /* ── surfaces ───────────────────────────────────────────────────────── */
  --st-bg: #ffffff;
  --st-bg-subtle: #fafafa;
  --st-bg-raised: #ffffff;
  --st-bg-inverse: #0a0a0a;
  --st-overlay: rgba(0, 0, 0, 0.32);
  --st-scrim: rgba(255, 255, 255, 0.72);

  /* ── ink ────────────────────────────────────────────────────────────── */
  --st-fg: #000000;
  --st-fg-muted: #525252;
  --st-fg-subtle: #737373;
  --st-fg-faint: #a3a3a3;
  --st-fg-inverse: #ffffff;
  --st-fg-inverse-muted: #737373;

  /* ── lines ──────────────────────────────────────────────────────────── */
  --st-line: rgba(0, 0, 0, 0.1);
  --st-line-strong: rgba(0, 0, 0, 0.22);
  --st-line-inverse: rgba(255, 255, 255, 0.1);

  /* ── semantic (used sparingly; the brand is monochrome) ─────────────── */
  --st-ok: #1a7f37;
  --st-ok-bg: #f0f9f2;
  --st-warn: #8a5a12;
  --st-warn-bg: #fdf7ed;
  --st-danger: #b42318;
  --st-danger-bg: #fef3f2;

  /* ── accent = ink ───────────────────────────────────────────────────── */
  --st-accent: #000000;
  --st-accent-fg: #ffffff;
  --st-focus: #000000;

  /* ── type ───────────────────────────────────────────────────────────── */
  --st-font: Inter, "Noto Sans", "Noto Sans Devanagari", "Noto Sans SC", "Noto Sans Arabic", system-ui, -apple-system, "Segoe UI", sans-serif;
  --st-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --st-tracking-body: -0.02em;
  --st-tracking-heading: -0.05em;
  --st-tracking-label: 0.1em;

  --st-text-xs: 11px;
  --st-text-sm: 12px;
  --st-text-base: 13px;
  --st-text-md: 14px;
  --st-text-lg: 16px;
  --st-text-xl: 20px;
  --st-text-2xl: 26px;

  /* ── geometry ───────────────────────────────────────────────────────── */
  --st-radius-pill: 999px;
  --st-radius-lg: 14px;
  --st-radius-md: 10px;
  --st-radius-sm: 7px;

  --st-space-1: 4px;
  --st-space-2: 8px;
  --st-space-3: 12px;
  --st-space-4: 16px;
  --st-space-5: 20px;
  --st-space-6: 24px;
  --st-space-8: 32px;
  --st-space-10: 40px;

  /* ── motion (matches the site's cubic-bezier(.16,1,.3,1)) ───────────── */
  --st-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --st-ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --st-dur-fast: 120ms;
  --st-dur-base: 200ms;
  --st-dur-slow: 420ms;

  /* ── elevation: hairline-first, never a heavy drop shadow ───────────── */
  --st-shadow-pop: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 32px -8px rgba(0, 0, 0, 0.18);
  --st-shadow-raise: 0 1px 3px rgba(0, 0, 0, 0.06), 0 24px 60px -16px rgba(0, 0, 0, 0.28);
}

/* ── dark theme ──────────────────────────────────────────────────────────
   The site's own dark surface is #0A0A0A with #737373 muted text; the dark
   theme is that surface extended, not a separate palette. */
:host([data-theme="dark"]), :root[data-theme="dark"] {
  --st-bg: #0a0a0a;
  --st-bg-subtle: #131313;
  --st-bg-raised: #161616;
  --st-bg-inverse: #ffffff;
  --st-fg: #f5f5f5;
  --st-fg-muted: #a3a3a3;
  --st-fg-subtle: #8a8a8a;
  --st-fg-faint: #666666;
  --st-fg-inverse: #0a0a0a;
  --st-fg-inverse-muted: #737373;
  --st-line: rgba(255, 255, 255, 0.12);
  --st-line-strong: rgba(255, 255, 255, 0.26);
  --st-line-inverse: rgba(0, 0, 0, 0.1);
  --st-accent: #ffffff;
  --st-accent-fg: #0a0a0a;
  --st-focus: #ffffff;
  --st-ok: #4ac26b;
  --st-ok-bg: rgba(26, 127, 55, 0.14);
  --st-warn: #e3b341;
  --st-warn-bg: rgba(138, 90, 18, 0.18);
  --st-danger: #ff7b72;
  --st-danger-bg: rgba(180, 35, 24, 0.16);
  --st-scrim: rgba(10, 10, 10, 0.72);
  --st-shadow-pop: 0 1px 2px rgba(0, 0, 0, 0.5), 0 12px 32px -8px rgba(0, 0, 0, 0.7);
  --st-shadow-raise: 0 1px 3px rgba(0, 0, 0, 0.6), 0 24px 60px -16px rgba(0, 0, 0, 0.8);
  color-scheme: dark;
}

@media (prefers-reduced-motion: reduce) {
  :host, :root {
    --st-dur-fast: 0ms;
    --st-dur-base: 0ms;
    --st-dur-slow: 0ms;
  }
}
`;

/** Shared primitives used by popup, options and the in-page panel. */
export const CSS_BASE = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

body {
  background: var(--st-bg);
  color: var(--st-fg);
  font-family: var(--st-font);
  font-size: var(--st-text-base);
  letter-spacing: var(--st-tracking-body);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, h4 {
  margin: 0;
  font-weight: 700;
  letter-spacing: var(--st-tracking-heading);
  line-height: 1.05;
}
p { margin: 0; }
a { color: inherit; text-decoration: none; }

/* Eyebrow label — the site's .mono.k */
.st-eyebrow {
  font-family: var(--st-font-mono);
  font-size: var(--st-text-xs);
  text-transform: uppercase;
  letter-spacing: var(--st-tracking-label);
  color: var(--st-fg-muted);
  font-weight: 500;
}

.st-h1 { font-size: var(--st-text-2xl); font-weight: 800; letter-spacing: -0.06em; line-height: 0.92; }
.st-h2 { font-size: var(--st-text-xl); font-weight: 700; letter-spacing: var(--st-tracking-heading); }
.st-h3 { font-size: var(--st-text-lg); font-weight: 700; letter-spacing: -0.03em; }
.st-muted { color: var(--st-fg-muted); }
.st-subtle { color: var(--st-fg-subtle); font-size: var(--st-text-sm); line-height: 1.5; }

/* Hairline — the site's structural device */
.st-rule { height: 1px; background: var(--st-line); border: 0; margin: 0; }

/* ── buttons ───────────────────────────────────────────────────────────── */
.st-btn {
  appearance: none;
  border: 1px solid var(--st-line-strong);
  background: transparent;
  color: var(--st-fg);
  font-family: inherit;
  font-size: var(--st-text-base);
  font-weight: 600;
  letter-spacing: -0.01em;
  border-radius: var(--st-radius-pill);
  padding: 9px 18px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  transition: background var(--st-dur-fast) var(--st-ease),
              color var(--st-dur-fast) var(--st-ease),
              border-color var(--st-dur-fast) var(--st-ease),
              opacity var(--st-dur-fast) var(--st-ease);
  white-space: nowrap;
}
.st-btn:hover { background: var(--st-bg-subtle); border-color: var(--st-fg-faint); }
.st-btn:active { transform: translateY(0.5px); }
.st-btn:disabled { opacity: 0.4; cursor: default; pointer-events: none; }
.st-btn:focus-visible { outline: 2px solid var(--st-focus); outline-offset: 2px; }

.st-btn--primary {
  background: var(--st-accent);
  color: var(--st-accent-fg);
  border-color: var(--st-accent);
}
.st-btn--primary:hover { background: var(--st-accent); opacity: 0.86; border-color: var(--st-accent); }

.st-btn--ghost { border-color: transparent; color: var(--st-fg-muted); padding-inline: 10px; }
.st-btn--ghost:hover { color: var(--st-fg); background: var(--st-bg-subtle); }

.st-btn--danger { color: var(--st-danger); border-color: var(--st-line); }
.st-btn--danger:hover { background: var(--st-danger-bg); border-color: var(--st-danger); }

.st-btn--sm { font-size: var(--st-text-sm); padding: 6px 13px; min-height: 30px; }
.st-btn--block { width: 100%; }

/* ── inputs ────────────────────────────────────────────────────────────── */
.st-input, .st-select, .st-textarea {
  width: 100%;
  font-family: inherit;
  font-size: var(--st-text-base);
  letter-spacing: var(--st-tracking-body);
  color: var(--st-fg);
  background: var(--st-bg);
  border: 1px solid var(--st-line);
  border-radius: var(--st-radius-md);
  padding: 9px 11px;
  transition: border-color var(--st-dur-fast) var(--st-ease), box-shadow var(--st-dur-fast) var(--st-ease);
}
.st-input::placeholder, .st-textarea::placeholder { color: var(--st-fg-faint); }
.st-input:focus, .st-select:focus, .st-textarea:focus {
  outline: none;
  border-color: var(--st-fg);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
}
:root[data-theme="dark"] .st-input:focus,
:root[data-theme="dark"] .st-select:focus,
:root[data-theme="dark"] .st-textarea:focus,
:host([data-theme="dark"]) .st-input:focus {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}
.st-textarea { resize: vertical; line-height: 1.55; min-height: 80px; }
.st-select { cursor: pointer; appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 16px) calc(50% + 1px), calc(100% - 11px) calc(50% + 1px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: 32px;
}

.st-field { display: flex; flex-direction: column; gap: 6px; }
.st-field__label { font-size: var(--st-text-sm); font-weight: 650; color: var(--st-fg); letter-spacing: -0.01em; }
.st-field__hint { font-size: var(--st-text-xs); color: var(--st-fg-subtle); line-height: 1.5; }

/* ── chips ─────────────────────────────────────────────────────────────── */
.st-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--st-text-xs);
  font-weight: 650;
  font-family: var(--st-font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 9px;
  border-radius: var(--st-radius-pill);
  border: 1px solid var(--st-line);
  color: var(--st-fg-muted);
  background: var(--st-bg);
  white-space: nowrap;
}
.st-chip--solid { background: var(--st-accent); color: var(--st-accent-fg); border-color: var(--st-accent); }
.st-chip--ok { color: var(--st-ok); border-color: color-mix(in srgb, var(--st-ok) 35%, transparent); background: var(--st-ok-bg); }
.st-chip--warn { color: var(--st-warn); border-color: color-mix(in srgb, var(--st-warn) 35%, transparent); background: var(--st-warn-bg); }
.st-chip--danger { color: var(--st-danger); border-color: color-mix(in srgb, var(--st-danger) 35%, transparent); background: var(--st-danger-bg); }

.st-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }

/* ── utility ───────────────────────────────────────────────────────────── */
.st-row { display: flex; align-items: center; gap: var(--st-space-2); }
.st-spacer { flex: 1; }
.st-stack { display: flex; flex-direction: column; }
.st-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@keyframes st-fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@keyframes st-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes st-spin { to { transform: rotate(360deg); } }
@keyframes st-draw { to { stroke-dashoffset: 0; } }
@keyframes st-pop { from { transform: scale(0); } to { transform: scale(1); } }
@keyframes st-scan {
  0% { transform: translateY(-100%); opacity: 0; }
  20% { opacity: 0.5; }
  100% { transform: translateY(400%); opacity: 0; }
}
@keyframes st-pulse-line {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 1; }
}
`;
