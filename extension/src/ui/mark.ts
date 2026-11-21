/**
 * The Second Thought mark — the real thing from site/mark.svg.
 *
 *   64×64 disc · white "S" (Inter 800, 34px, x=11 y=46)
 *   white T drawn as M32 14h24 (bar) + M44 14v36 (stem), stroke 3.2, square caps
 *
 * The site animates it as: disc pops → S fades → T draws. `animated` reproduces
 * that once, on mount, with the same cubic-bezier(.16,1,.3,1) curve. Because
 * the mark lives inside a closed shadow root / extension page, the animation is
 * pure CSS and respects prefers-reduced-motion via the token overrides.
 */

export interface MarkOptions {
  /** Rendered size in px. */
  size?: number;
  /** Play the entrance animation. */
  animated?: boolean;
  /** Inverted (white disc, black ink) — used on dark surfaces. */
  inverted?: boolean;
  /** Accessible label; omit for decorative use. */
  label?: string;
  className?: string;
}

export function markSvg(options: MarkOptions = {}): string {
  const { size = 20, animated = false, inverted = false, label, className = '' } = options;
  const disc = inverted ? '#fff' : 'var(--st-mark-disc, #000)';
  const ink = inverted ? '#000' : 'var(--st-mark-ink, #fff)';
  const classes = ['st-mark', animated ? 'st-mark--in' : '', className].filter(Boolean).join(' ');
  const a11y = label
    ? `role="img" aria-label="${escapeAttr(label)}"`
    : 'aria-hidden="true" focusable="false"';

  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 64 64" ${a11y}
    style="display:block;overflow:visible;flex:none">
    <circle class="st-mark__disc" cx="32" cy="32" r="32" fill="${disc}" />
    <text class="st-mark__ess" x="11" y="46" fill="${ink}"
      font-family="Inter, 'Arial Black', sans-serif" font-size="34" font-weight="800">S</text>
    <path class="st-mark__tee" d="M32 14h24M44 14v36" fill="none" stroke="${ink}"
      stroke-width="3.2" stroke-linecap="square" />
  </svg>`;
}

/** Styles for the mark's entrance animation. Scoped by class, no globals. */
export const MARK_CSS = `
.st-mark__disc { transform-origin: 32px 32px; }
.st-mark__ess { opacity: 0; }
.st-mark__tee { stroke-dasharray: 80; stroke-dashoffset: 80; }

.st-mark--in .st-mark__disc { animation: st-mark-pop 0.7s var(--st-ease) forwards; }
.st-mark--in .st-mark__ess { animation: st-mark-fade 0.5s var(--st-ease) 0.35s forwards; }
.st-mark--in .st-mark__tee { animation: st-mark-draw 0.7s var(--st-ease) 0.45s forwards; }

@keyframes st-mark-pop {
  from { transform: scale(0); }
  to { transform: scale(1); }
}
@keyframes st-mark-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes st-mark-draw {
  from { stroke-dashoffset: 80; }
  to { stroke-dashoffset: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .st-mark__disc { transform: none; }
  .st-mark__ess { opacity: 1; }
  .st-mark__tee { stroke-dashoffset: 0; }
  .st-mark--in .st-mark__disc,
  .st-mark--in .st-mark__ess,
  .st-mark--in .st-mark__tee { animation: none; }
}
`;

/** Inline data-URI favicon-ish mark, for places that cannot run JS. */
export const MARK_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#000"/><text x="11" y="46" fill="#fff" font-family="Inter,Arial Black,sans-serif" font-size="34" font-weight="800">S</text><path d="M32 14h24M44 14v36" stroke="#fff" stroke-width="3.2" stroke-linecap="square" fill="none"/></svg>',
  );

function escapeAttr(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}
