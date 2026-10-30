/** Styles for the clarification panel (injected inside shadow DOM). */
export const PANEL_CSS = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #16211c;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
.overlay {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 380px;
  max-width: calc(100vw - 32px);
  max-height: min(72vh, 640px);
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  background: #fbfaf7;
  border: 1px solid #d8d4c8;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(20, 24, 20, 0.22), 0 2px 8px rgba(20, 24, 20, 0.08);
  overflow: hidden;
  animation: st-in 160ms ease-out;
}
@keyframes st-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.overlay.flash { animation: st-flash 360ms ease-out; }
@keyframes st-flash {
  0%, 100% { box-shadow: 0 12px 40px rgba(20,24,20,0.22); }
  50% { box-shadow: 0 0 0 4px rgba(194, 65, 12, 0.35); }
}
header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #e6e2d6;
  background: #f4f2ea;
}
.brand {
  display: flex; align-items: center; gap: 8px;
  font-weight: 650; font-size: 13px; letter-spacing: 0.01em; color: #1d2a22;
}
.brand .dot { width: 18px; height: 18px; border-radius: 6px; background: #c2410c; display: inline-block; position: relative; flex: none; }
.brand .dot::after { content: ""; position: absolute; inset: 5px; border-radius: 50%; background: #fbfaf7; }
.spacer { flex: 1; }
button.icon {
  border: none; background: transparent; cursor: pointer;
  width: 26px; height: 26px; border-radius: 7px; color: #5c665e;
  font-size: 15px; line-height: 1;
}
button.icon:hover { background: #e6e2d6; color: #1d2a22; }
.body { padding: 12px 14px; overflow-y: auto; flex: 1; }
.context {
  font-size: 12.5px; color: #4c564e; margin-bottom: 4px;
}
.original {
  font-size: 12.5px; color: #2a332c; background: #efece2;
  border-left: 3px solid #c2410c; padding: 7px 10px; border-radius: 0 8px 8px 0;
  margin: 8px 0 12px; line-height: 1.45; word-break: break-word;
}
.original .lbl, .context .lbl { font-weight: 650; color: #1d2a22; }
.q { margin-bottom: 14px; }
.q[data-hidden="true"] { display: none; }
.q .qt { font-size: 13px; font-weight: 600; margin-bottom: 7px; color: #1d2a22; }
.q .qt .opt-tag { font-weight: 450; color: #7a837b; font-size: 11.5px; }
.q .opts { display: flex; flex-direction: column; gap: 5px; }
.q label.opt {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid #dcd7c9; background: #fff; border-radius: 9px;
  padding: 7px 10px; font-size: 13px; cursor: pointer; user-select: none;
  transition: border-color 120ms, background 120ms;
}
.q label.opt:hover { border-color: #c2410c66; }
.q label.opt.checked { border-color: #c2410c; background: #fdf3ec; }
.q input { accent-color: #c2410c; margin: 0; }
.q input[type="text"] {
  width: 100%; border: 1px solid #dcd7c9; border-radius: 9px;
  padding: 8px 10px; font-size: 13px; font-family: inherit; background: #fff; color: #16211c;
}
.q input[type="text"]:focus { outline: 2px solid #c2410c33; border-color: #c2410c; }
.q .hint { font-size: 11.5px; color: #7a837b; margin-top: 5px; }
.other-wrap { margin-top: 5px; display: none; }
.other-wrap.show { display: block; }
.scorebar { display: flex; align-items: center; gap: 10px; margin: 2px 0 12px; }
.scorebar .track { flex: 1; height: 6px; border-radius: 3px; background: #e6e2d6; overflow: hidden; }
.scorebar .fill { height: 100%; background: #c2410c; border-radius: 3px; transition: width 300ms ease; }
.scorebar .num { font-size: 12px; font-weight: 650; color: #1d2a22; font-variant-numeric: tabular-nums; }
.changes { margin: 0 0 12px; padding: 0; list-style: none; }
.changes li {
  font-size: 12px; color: #4c564e; padding: 3px 0 3px 20px; position: relative;
}
.changes li::before { content: "✓"; position: absolute; left: 2px; color: #2e7d32; font-weight: 700; }
.refined {
  width: 100%; min-height: 150px; resize: vertical;
  border: 1px solid #dcd7c9; border-radius: 10px; background: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px; line-height: 1.5; padding: 10px; color: #16211c;
}
.refined:focus { outline: 2px solid #c2410c33; border-color: #c2410c; }
footer {
  display: flex; gap: 8px; padding: 11px 14px; border-top: 1px solid #e6e2d6;
  background: #f4f2ea; align-items: center;
}
button.primary, button.ghost {
  border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer;
  padding: 8px 14px; font-family: inherit; transition: background 120ms, opacity 120ms;
}
button.primary {
  background: #1d2a22; color: #fbfaf7; border: 1px solid #1d2a22;
}
button.primary:hover { background: #2c3f33; }
button.primary:disabled { opacity: 0.45; cursor: default; }
button.ghost {
  background: transparent; color: #1d2a22; border: 1px solid #cfcaba;
}
button.ghost:hover { background: #ece9de; }
.err { font-size: 13px; color: #7f1d1d; background: #fdeceb; border: 1px solid #f5c6c0; border-radius: 10px; padding: 10px 12px; line-height: 1.45; }
.muted { font-size: 11.5px; color: #7a837b; }
.spin {
  display: inline-block; width: 13px; height: 13px; border: 2px solid #d8d4c8;
  border-top-color: #c2410c; border-radius: 50%; animation: st-rot 700ms linear infinite; vertical-align: -2px; margin-right: 6px;
}
@keyframes st-rot { to { transform: rotate(360deg); } }
.engine-chip {
  font-size: 10.5px; font-weight: 600; color: #5c665e; background: #e9e6da;
  border-radius: 20px; padding: 2px 8px; letter-spacing: 0.02em;
}
`;
