/**
 * Styles for the in-page clarification panel.
 *
 * Injected inside a closed shadow root, prefixed by the shared tokens and base
 * primitives. The visual language is the website's: white paper, black ink,
 * hairline rules, Inter with negative tracking, pill buttons, and the ST mark's
 * scan-line motif reused as the analysis indicator.
 */
export const PANEL_CSS = `
/* ── shell ─────────────────────────────────────────────────────────────── */
.overlay {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 400px;
  max-width: calc(100vw - 28px);
  max-height: min(80vh, 720px);
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  background: var(--st-bg);
  color: var(--st-fg);
  border: 1px solid var(--st-line-strong);
  border-radius: var(--st-radius-lg);
  box-shadow: var(--st-shadow-raise);
  /* overflow:hidden still allows *programmatic* scrolling, and the browser
     scrolls the nearest scrollable ancestor into view whenever a radio inside
     the panel receives focus — which slid the header out of the panel and left
     an apparently blank card. overflow:clip cannot be scrolled at all; the
     hidden declaration stays first as the fallback for older browsers. */
  overflow: hidden;
  overflow: clip;
  font-family: var(--st-font);
  font-size: var(--st-text-base);
  letter-spacing: var(--st-tracking-body);
  line-height: 1.5;
  animation: st-panel-in var(--st-dur-slow) var(--st-ease) both;
}
@keyframes st-panel-in {
  from { opacity: 0; transform: translateY(10px) scale(0.99); }
  to { opacity: 1; transform: none; }
}
.overlay.is-flash { animation: st-panel-flash 380ms var(--st-ease); }
@keyframes st-panel-flash {
  0%, 100% { box-shadow: var(--st-shadow-raise); }
  45% { box-shadow: 0 0 0 3px var(--st-fg), var(--st-shadow-raise); }
}

/* ── header ────────────────────────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 14px 12px;
  border-bottom: 1px solid var(--st-line);
  flex: none;
  background: var(--st-bg);
}
.header__brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
.header__name { font-size: 13px; font-weight: 700; letter-spacing: -0.045em; white-space: nowrap; }
.header__task {
  font-family: var(--st-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--st-fg-subtle);
  border: 1px solid var(--st-line);
  border-radius: var(--st-radius-pill);
  padding: 2px 7px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 132px;
}
.header__spacer { flex: 1; }
.icon-btn {
  appearance: none; border: 0; background: transparent; color: var(--st-fg-subtle);
  width: 26px; height: 26px; border-radius: var(--st-radius-sm);
  display: grid; place-items: center; cursor: pointer; flex: none;
  font-size: 15px; line-height: 1;
  transition: background var(--st-dur-fast) var(--st-ease), color var(--st-dur-fast) var(--st-ease);
}
.icon-btn:hover { background: var(--st-bg-subtle); color: var(--st-fg); }
.icon-btn:focus-visible { outline: 2px solid var(--st-focus); outline-offset: 1px; }

/* engine badge */
.engine-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--st-font-mono);
  font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  padding: 3px 7px; border-radius: var(--st-radius-pill);
  background: var(--st-accent); color: var(--st-accent-fg); flex: none;
}
.engine-chip--local {
  background: transparent; color: var(--st-fg-subtle);
  border: 1px solid var(--st-line-strong);
}

/* ── body ──────────────────────────────────────────────────────────────── */
.body {
  padding: 15px 14px 16px;
  overflow-y: auto;
  flex: 1 1 auto;
  /* Without min-height:0 a flex child refuses to shrink below its content, so
     a long question set (follow-up rounds) pushed the body out of the panel
     instead of scrolling inside it. */
  min-height: 0;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.body::-webkit-scrollbar { width: 7px; }
.body::-webkit-scrollbar-thumb { background: var(--st-line-strong); border-radius: 4px; }

.stage { animation: st-stage-in var(--st-dur-base) var(--st-ease) both; }
@keyframes st-stage-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: none; }
}

/* ── analyzing stage ───────────────────────────────────────────────────── */
.analyzing { padding: 8px 0 4px; }
.analyzing__visual {
  position: relative;
  height: 62px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  overflow: hidden;
  border-radius: var(--st-radius-md);
  background: var(--st-bg-subtle);
  border: 1px solid var(--st-line);
}
.analyzing__scan {
  position: absolute; inset: 0 12% auto;
  height: 2px;
  background: var(--st-fg);
  opacity: 0.22;
  animation: st-scan 1.9s var(--st-ease) infinite;
}
.analyzing__lines { display: flex; flex-direction: column; gap: 7px; width: 62%; }
.analyzing__line {
  height: 6px;
  border-radius: 3px;
  background: var(--st-line-strong);
  animation: st-pulse-line 1.5s ease-in-out infinite;
}
.analyzing__line:nth-child(1) { width: 100%; animation-delay: 0ms; }
.analyzing__line:nth-child(2) { width: 74%; animation-delay: 140ms; }
.analyzing__line:nth-child(3) { width: 88%; animation-delay: 280ms; }

.analyzing__title {
  font-size: 15px; font-weight: 700; letter-spacing: -0.04em; margin-bottom: 4px;
}
.analyzing__step { font-size: 12px; color: var(--st-fg-muted); min-height: 18px; }

/* ── context block ─────────────────────────────────────────────────────── */
.context { margin-bottom: 14px; }
.context__label {
  font-family: var(--st-font-mono); font-size: 9.5px; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--st-fg-subtle); margin-bottom: 5px; display: block;
}
.context__quote {
  font-size: 12.5px; line-height: 1.5; color: var(--st-fg-muted);
  border-left: 2px solid var(--st-line-strong);
  padding: 1px 0 1px 10px;
  word-break: break-word;
}
.context__quote mark {
  background: transparent; color: var(--st-fg); font-weight: 600;
}

/* ── completeness meter ────────────────────────────────────────────────── */
.meter { margin: 13px 0 16px; }
.meter__head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 6px;
}
.meter__label {
  font-family: var(--st-font-mono); font-size: 9.5px; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--st-fg-subtle);
}
.meter__value {
  font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
}
.meter__track {
  height: 3px; border-radius: 2px; background: var(--st-line); overflow: hidden;
}
.meter__fill {
  height: 100%; background: var(--st-fg); border-radius: 2px;
  transition: width var(--st-dur-slow) var(--st-ease);
}
.meter__facets {
  display: flex; gap: 10px; flex-wrap: wrap; margin-top: 7px;
}
.meter__facet {
  font-size: 10px; color: var(--st-fg-faint); letter-spacing: -0.005em;
  display: flex; align-items: center; gap: 3px;
}
.meter__note {
  margin-top: 6px;
  font-size: 10.5px;
  line-height: 1.5;
  color: var(--st-fg-faint);
}
.meter__facet b { color: var(--st-fg-muted); font-weight: 650; }

/* ── questions ─────────────────────────────────────────────────────────── */
.round-label {
  display: flex; align-items: center; gap: 7px; margin-bottom: 12px;
}
.round-label__text {
  font-family: var(--st-font-mono); font-size: 9.5px; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--st-fg-subtle);
}
.round-label__rule { flex: 1; height: 1px; background: var(--st-line); }

.q { margin-bottom: 17px; }
.q[data-hidden="true"] { display: none; }
.q__head { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 3px; }
.q__title {
  font-size: 13px; font-weight: 650; letter-spacing: -0.02em; line-height: 1.35; flex: 1;
}
.q__optional {
  font-family: var(--st-font-mono); font-size: 9px; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--st-fg-faint); padding-top: 3px; flex: none;
}
.q__why {
  font-size: 10.5px; color: var(--st-fg-faint); line-height: 1.45; margin-bottom: 8px;
  letter-spacing: -0.005em;
}
.q__why:empty { display: none; }

.opts { display: flex; flex-direction: column; gap: 5px; }

.opt {
  display: flex; align-items: center; gap: 9px;
  border: 1px solid var(--st-line);
  border-radius: var(--st-radius-sm);
  padding: 8px 11px;
  font-size: 12.5px; letter-spacing: -0.01em;
  cursor: pointer; user-select: none;
  background: var(--st-bg);
  transition: border-color var(--st-dur-fast) var(--st-ease),
              background var(--st-dur-fast) var(--st-ease);
}
.opt:hover { border-color: var(--st-line-strong); background: var(--st-bg-subtle); }
.opt.is-checked { border-color: var(--st-fg); background: var(--st-bg-subtle); }
/* The border width never changes on selection — a thicker border moved every
   option below it by a pixel mid-click. */
.opt.is-selected { border-color: var(--st-fg); }
.opt.is-checked .opt__mark { background: var(--st-fg); border-color: var(--st-fg); }
.opt.is-checked .opt__mark::after { opacity: 1; transform: scale(1); }
.opt:focus-visible, .q:focus-visible { outline: 2px solid var(--st-focus); outline-offset: 1px; }

.opt__mark {
  width: 14px; height: 14px; flex: none;
  border: 1.5px solid var(--st-line-strong);
  border-radius: 50%;
  display: grid; place-items: center;
  transition: background var(--st-dur-fast) var(--st-ease), border-color var(--st-dur-fast) var(--st-ease);
  position: relative;
}
.opt__mark--multi { border-radius: 4px; }
.opt__mark::after {
  content: ""; width: 5px; height: 5px; border-radius: 50%;
  background: var(--st-accent-fg);
  opacity: 0; transform: scale(0.6);
  transition: opacity var(--st-dur-fast) var(--st-ease), transform var(--st-dur-fast) var(--st-ease);
}
.opt__mark--multi::after { border-radius: 1.5px; width: 6px; height: 6px; }
.opt__label { flex: 1; }
.opt__tag {
  font-family: var(--st-font-mono); font-size: 9px; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--st-fg-faint);
}
.opt--other .opt__label { color: var(--st-fg-muted); }

.q__custom { margin-top: 6px; display: none; }
.q__custom.is-open { display: block; animation: st-stage-in var(--st-dur-fast) var(--st-ease) both; }
.q__custom input {
  width: 100%;
  font-family: inherit; font-size: 12.5px; letter-spacing: -0.01em;
  color: var(--st-fg); background: var(--st-bg);
  border: 1px solid var(--st-line); border-radius: var(--st-radius-sm);
  padding: 8px 10px;
}
.q__custom input:focus { outline: none; border-color: var(--st-fg); }
/* Quick-pick chips for free-text questions. Fill the box; do not submit. */
.chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 7px; }
.chip {
  font-family: inherit; font-size: 10.5px; line-height: 1.3; letter-spacing: -0.005em;
  color: var(--st-fg-muted); background: var(--st-bg-subtle, transparent);
  border: 1px solid var(--st-line); border-radius: 999px;
  padding: 4px 9px; cursor: pointer; text-align: left;
  transition: color var(--st-dur-fast) var(--st-ease),
              border-color var(--st-dur-fast) var(--st-ease),
              background-color var(--st-dur-fast) var(--st-ease);
}
.chip:hover { color: var(--st-fg); border-color: var(--st-fg-faint); }
.chip:focus-visible { outline: 2px solid var(--st-fg); outline-offset: 1px; }
@media (prefers-reduced-motion: reduce) { .chip { transition: none; } }

.q__text {
  width: 100%; min-height: 62px; resize: vertical;
  font-family: inherit; font-size: 12.5px; line-height: 1.5; letter-spacing: -0.01em;
  color: var(--st-fg); background: var(--st-bg);
  border: 1px solid var(--st-line); border-radius: var(--st-radius-sm);
  padding: 8px 10px;
}
.q__text:focus { outline: none; border-color: var(--st-fg); }
.q__hint { font-size: 10.5px; color: var(--st-fg-faint); margin-top: 5px; line-height: 1.45; }

/* ── conflict banner ───────────────────────────────────────────────────── */
.conflict {
  display: flex; gap: 9px; align-items: flex-start;
  border: 1px solid var(--st-line);
  border-left: 2px solid var(--st-fg);
  border-radius: 0 var(--st-radius-sm) var(--st-radius-sm) 0;
  background: var(--st-bg-subtle);
  padding: 9px 11px;
  margin-bottom: 14px;
  font-size: 11.5px; line-height: 1.5; color: var(--st-fg-muted);
}
.conflict b { color: var(--st-fg); font-weight: 650; }

/* ── summary stage ─────────────────────────────────────────────────────── */
.summary__head { margin-bottom: 12px; }
.summary__title { font-size: 15px; font-weight: 750; letter-spacing: -0.04em; }
.summary__sub { font-size: 11.5px; color: var(--st-fg-muted); margin-top: 3px; line-height: 1.5; }
.summary__list { display: flex; flex-direction: column; margin: 4px 0 14px; }
.summary__row {
  display: flex; gap: 10px; padding: 8px 0;
  border-bottom: 1px solid var(--st-line);
  font-size: 12px; line-height: 1.45;
}
.summary__row:first-child { border-top: 1px solid var(--st-line); }
.summary__key {
  flex: none; width: 108px; color: var(--st-fg-subtle);
  font-family: var(--st-font-mono); font-size: 9.5px; text-transform: uppercase;
  letter-spacing: 0.05em; padding-top: 2px;
}
.summary__val { flex: 1; color: var(--st-fg); word-break: break-word; }
.summary__empty { color: var(--st-fg-faint); font-style: italic; }

/* Answered vs. obtainable — two honest numbers, never one inflated one. */
.score-frame {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin: 2px 0 10px;
  font-size: 11px;
  letter-spacing: -0.01em;
  color: var(--st-fg-muted);
  font-variant-numeric: tabular-nums;
}
.score-frame__item { white-space: nowrap; }
.score-frame__item--now { color: var(--st-fg); font-weight: 650; }
.score-frame__item--projected { color: var(--st-fg-faint); }
.score-frame__arrow { color: var(--st-fg-faint); }

.summary__missing {
  display: flex;
  gap: 8px;
  align-items: baseline;
  flex-wrap: wrap;
  margin: 10px 0 2px;
  padding: 9px 11px;
  border: 1px solid var(--st-line);
  border-radius: 10px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--st-fg-muted);
}
.summary__missing-label {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--st-fg-faint);
  white-space: nowrap;
}

/* ── review stage ──────────────────────────────────────────────────────── */
.review__changes { margin: 0 0 13px; padding: 0; list-style: none; }
.review__changes li {
  font-size: 11.5px; color: var(--st-fg-muted); line-height: 1.45;
  padding: 3px 0 3px 17px; position: relative;
}
.review__changes li::before {
  content: "✓"; position: absolute; left: 0; top: 2px;
  color: var(--st-ok); font-weight: 700; font-size: 10px;
}

.prompt-box { position: relative; }
.prompt-box__head {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;
}
.prompt-box__label {
  font-family: var(--st-font-mono); font-size: 9.5px; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--st-fg-subtle);
}
.prompt-box textarea {
  width: 100%; min-height: 190px; resize: vertical;
  font-family: var(--st-font-mono); font-size: 11px; line-height: 1.55;
  color: var(--st-fg); background: var(--st-bg-subtle);
  border: 1px solid var(--st-line); border-radius: var(--st-radius-md);
  padding: 11px 12px;
}
.prompt-box textarea:focus { outline: none; border-color: var(--st-fg); background: var(--st-bg); }

.residual {
  display: flex; gap: 8px; align-items: flex-start;
  margin-top: 10px; padding: 9px 11px;
  border-radius: var(--st-radius-sm);
  border: 1px solid var(--st-line);
  background: var(--st-bg-subtle);
  font-size: 11px; line-height: 1.5; color: var(--st-fg-muted);
}
.residual__dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--st-fg-faint);
  margin-top: 6px; flex: none;
}
.residual--ok { color: var(--st-ok); border-color: color-mix(in srgb, var(--st-ok) 30%, transparent); background: var(--st-ok-bg); }
.residual--ok .residual__dot { background: var(--st-ok); }

/* ── error stage ───────────────────────────────────────────────────────── */
.err-box {
  border: 1px solid color-mix(in srgb, var(--st-danger) 26%, transparent);
  background: var(--st-danger-bg);
  border-radius: var(--st-radius-md);
  padding: 12px 13px;
  margin-bottom: 14px;
}
.err-box__title {
  font-size: 12.5px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--st-danger); margin-bottom: 4px;
}
.err-box__body { font-size: 11.5px; line-height: 1.55; color: var(--st-fg-muted); word-break: break-word; }

/* ── footer ────────────────────────────────────────────────────────────── */
.footer {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 14px;
  border-top: 1px solid var(--st-line);
  background: var(--st-bg-subtle);
  flex: none;
  flex-wrap: wrap;
}
.footer__info {
  font-family: var(--st-font-mono); font-size: 9.5px; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--st-fg-faint);
}
.footer__spacer { flex: 1; }

.btn {
  appearance: none; font-family: inherit; cursor: pointer;
  font-size: 12px; font-weight: 650; letter-spacing: -0.01em;
  border-radius: var(--st-radius-pill);
  padding: 8px 15px; min-height: 32px;
  border: 1px solid var(--st-line-strong);
  background: transparent; color: var(--st-fg);
  display: inline-flex; align-items: center; gap: 6px;
  transition: background var(--st-dur-fast) var(--st-ease),
              opacity var(--st-dur-fast) var(--st-ease),
              border-color var(--st-dur-fast) var(--st-ease);
  white-space: nowrap;
}
.btn:hover { background: var(--st-bg); border-color: var(--st-fg-faint); }
.btn:disabled { opacity: 0.4; cursor: default; pointer-events: none; }
.btn:focus-visible { outline: 2px solid var(--st-focus); outline-offset: 2px; }
.btn--primary {
  background: var(--st-accent); color: var(--st-accent-fg); border-color: var(--st-accent);
}
.btn--primary:hover { background: var(--st-accent); opacity: 0.87; }
.btn--ghost { border-color: transparent; color: var(--st-fg-muted); padding-inline: 8px; }
.btn--ghost:hover { color: var(--st-fg); background: transparent; }
.btn--sm { font-size: 11px; padding: 5px 11px; min-height: 26px; }

.spinner {
  width: 11px; height: 11px; border-radius: 50%;
  border: 1.5px solid var(--st-line-strong);
  border-top-color: var(--st-fg);
  animation: st-spin 620ms linear infinite;
  flex: none;
}

/* ── responsive ────────────────────────────────────────────────────────── */
@media (max-width: 520px) {
  .overlay {
    right: 8px; left: 8px; bottom: 8px;
    width: auto; max-height: 86vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .overlay, .stage, .analyzing__scan, .analyzing__line, .spinner { animation: none !important; }
  .spinner { border-top-color: var(--st-fg); }
}

  /* ── cinematic finish ─────────────────────────────── */
  .overlay {
    background: linear-gradient(165deg, #171a20 0%, #0b0c0f 70%);
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 20px;
    box-shadow: 0 40px 120px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04) inset;
    animation: st-cine-in .9s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes st-cine-in { from { opacity: 0; transform: translateY(18px) scale(.97); filter: blur(8px); } to { opacity: 1; transform: none; filter: none; } }
  .q__title, .q__text, .analyzing__title { font-family: "Iowan Old Style", "Palatino Linotype", Georgia, "Noto Serif Devanagari", "Noto Serif SC", serif; letter-spacing: -.01em; }
  .stage { animation: st-slide .6s cubic-bezier(.16,1,.3,1) both; }
  @keyframes st-slide { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: none; } }
  .chip, .opt { transition: transform .3s cubic-bezier(.16,1,.3,1), border-color .3s, background .3s; }
  .chip:hover, .opt:hover { transform: translateY(-1px); }
`;
