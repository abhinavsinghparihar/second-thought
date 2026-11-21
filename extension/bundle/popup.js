"use strict";(()=>{function v(t,e=document){for(let r of t.split(","))try{let n=e.querySelector(r.trim());if(n)return n}catch{}return null}function d(t){if(!t.isConnected)return!1;let e=t.getBoundingClientRect();if(e.width<40||e.height<12)return!1;let r=window.getComputedStyle(t);return r.visibility!=="hidden"&&r.display!=="none"&&r.opacity!=="0"}function y(t,e=document){for(let r of t){let n;try{n=e.querySelectorAll(r)}catch{continue}for(let a of Array.from(n))if(a instanceof HTMLElement&&d(a))return a}return null}function k(t){if(t instanceof HTMLTextAreaElement||t instanceof HTMLInputElement||t.isContentEditable===!0)return!0;let e=t.getAttribute("contenteditable");return e!==null&&e.toLowerCase()!=="false"}function p(t){return{id:t.id,name:t.name,capability:t.capability,homepage:t.homepage,matches(e){let r=e.toLowerCase();return t.hosts.some(n=>r===n||t.matchSubdomains===!0&&r.endsWith(`.${n}`))},findInput(){try{let e=y(t.inputSelectors);return e&&k(e)?e:null}catch{return null}},findSendButton(){try{let e=y(t.sendSelectors);if(e)return e;let n=this.findInput()?.closest("form");if(n){let a=n.querySelector('button[type="submit"]');if(a&&d(a))return a}return null}catch{return null}},getText(e){if(e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement)return e.value;let r=e.innerText;return typeof r=="string"?r:e.textContent??""},setText(e,r){return b(e,r)},submit(){try{let e=this.findSendButton();if(e&&!z(e)&&d(e))return e.click(),!0;let r=this.findInput();return r?(r.focus(),g(r),!0):!1}catch{return!1}}}}function z(t){return t instanceof HTMLButtonElement?t.disabled:t.getAttribute("aria-disabled")==="true"}function g(t){let e={key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:!0,cancelable:!0,composed:!0};t.dispatchEvent(new KeyboardEvent("keydown",e)),t.dispatchEvent(new KeyboardEvent("keypress",e)),t.dispatchEvent(new KeyboardEvent("keyup",e))}function b(t,e){try{if(t.focus(),t instanceof HTMLTextAreaElement||t instanceof HTMLInputElement){let s=t instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,i=Object.getOwnPropertyDescriptor(s,"value")?.set;return i?i.call(t,e):t.value=e,t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0})),!0}if(!k(t))return!1;let r=window.getSelection(),n=document.createRange();if(n.selectNodeContents(t),r?.removeAllRanges(),r?.addRange(n),typeof document.execCommand=="function"){let s=document.execCommand("delete",!1),i=document.execCommand("insertText",!1,e);if(i)return!0}let a=new DataTransfer;a.setData("text/plain",e);let o=new ClipboardEvent("paste",{clipboardData:a,bubbles:!0,cancelable:!0});return t.dispatchEvent(o),(t.innerText??t.textContent??"").trim().length>0||e.trim()===""}catch{return!1}}function w(t){let e=[];for(let a of t)try{for(let o of Array.from(document.querySelectorAll(a)))d(o)&&e.push(o)}catch{}let r=null,n=0;for(let a of e){let o=a.getBoundingClientRect(),s=o.width*o.height;s>n&&(r=a,n=s)}return r}var $={id:"chatgpt",name:"ChatGPT",capability:"supported",homepage:"https://chatgpt.com",hosts:["chatgpt.com","chat.openai.com"],inputSelectors:["#prompt-textarea",'form div[contenteditable="true"]#prompt-textarea','form div[contenteditable="true"][id*="prompt" i]',"form textarea[data-id]","form textarea",'div.ProseMirror[contenteditable="true"]','div[contenteditable="true"][role="textbox"]','[data-testid="prompt-textarea"]'],sendSelectors:['button[data-testid="send-button"]','form button[data-testid="send-button"]','button[aria-label*="Send prompt" i]','button[aria-label*="send" i]','form button[type="submit"]','button[data-testid="composer-submit-button"]'],verification:"Input, text insertion and submit exercised in a DOM fixture."},E=p($);var O={id:"claude",name:"Claude",capability:"partial",homepage:"https://claude.ai",hosts:["claude.ai"],inputSelectors:['div[contenteditable="true"].ProseMirror','div.ProseMirror[contenteditable="true"]','fieldset div[contenteditable="true"]','div[aria-label*="Write your prompt" i][contenteditable="true"]','form div[contenteditable="true"]','main div[contenteditable="true"]'],sendSelectors:['button[aria-label*="Send message" i]','button[aria-label*="Send" i]','fieldset button[type="submit"]','form button[type="submit"]'],verification:"DOM fixture only; live claude.ai not verified for this release."},S=p(O);var q={id:"copilot",name:"Microsoft Copilot",capability:"unknown",homepage:"https://copilot.microsoft.com",hosts:["copilot.microsoft.com"],matchSubdomains:!0,inputSelectors:["main textarea","form textarea",'main div[contenteditable="true"][role="textbox"]','main div[contenteditable="true"]'],sendSelectors:['button[aria-label*="Submit" i]','button[aria-label*="Send" i]','main button[data-testid="send-button"]','form button[type="submit"]'],verification:"Not tested against the live site. Heuristic selectors."},T=p(q);function C(t,e){let r={id:t,name:e,capability:"unknown",homepage:`https://${e}`,hosts:[e],matchSubdomains:!0,inputSelectors:[],sendSelectors:[],verification:"Heuristic. Not tested against this site."};return{id:r.id,name:r.name,capability:r.capability,homepage:r.homepage,matches(n){let a=n.toLowerCase();return a===e||a.endsWith(`.${e}`)},findInput(){try{return typeof document>"u"?null:w(["textarea",'div[contenteditable="true"]','[role="textbox"]'])}catch{return null}},findSendButton(){try{let n=this.findInput();if(!n)return null;let a=n.closest("form");if(a){let s=v('button[type="submit"], button[aria-label*="send" i]',a);if(s&&d(s))return s}let o=n.parentElement;for(let s=0;s<4&&o;s+=1){let i=Array.from(o.querySelectorAll("button")).filter(c=>{if(!d(c))return!1;let u=c.getAttribute("aria-label")??c.textContent??"";return c instanceof HTMLButtonElement&&c.type==="submit"||/send|submit/i.test(u)});if(i.length>0)return i[i.length-1]??null;o=o.parentElement}return null}catch{return null}},getText(n){return n instanceof HTMLTextAreaElement||n instanceof HTMLInputElement?n.value:n.innerText??n.textContent??""},setText(n,a){return b(n,a)},submit(){try{let n=this.findSendButton();if(n&&!n.disabled)return n.click(),!0;let a=this.findInput();return a?(a.focus(),g(a),!0):!1}catch{return!1}}}}var D={id:"gemini",name:"Google Gemini",capability:"partial",homepage:"https://gemini.google.com",hosts:["gemini.google.com"],inputSelectors:['div.ql-editor[contenteditable="true"]','rich-textarea div[contenteditable="true"]','main div[contenteditable="true"][aria-label*="prompt" i]','main div[contenteditable="true"][role="textbox"]'],sendSelectors:["button.send-button",'button[aria-label*="Send message" i]','button[mattooltip*="Send" i]','main button[data-test-id="send-button"]'],verification:"DOM fixture only; live gemini.google.com not verified for this release."},A=p(D);var K=[E,S,A,T];function h(t,e=[]){let r=t.toLowerCase();for(let n of K)if(n.matches(r))return{adapter:n,custom:!1};for(let n of e){let a=n.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/.*$/,"");if(a!==""&&(r===a||r.endsWith(`.${a}`)))return{adapter:C("custom",a),custom:!0}}return{adapter:null,custom:!1}}function M(t={}){let{size:e=20,animated:r=!1,inverted:n=!1,label:a,className:o=""}=t,s=n?"#fff":"var(--st-mark-disc, #000)",i=n?"#000":"var(--st-mark-ink, #fff)",c=["st-mark",r?"st-mark--in":"",o].filter(Boolean).join(" "),u=a?`role="img" aria-label="${U(a)}"`:'aria-hidden="true" focusable="false"';return`<svg class="${c}" width="${e}" height="${e}" viewBox="0 0 64 64" ${u}
    style="display:block;overflow:visible;flex:none">
    <circle class="st-mark__disc" cx="32" cy="32" r="32" fill="${s}" />
    <text class="st-mark__ess" x="11" y="46" fill="${i}"
      font-family="Inter, 'Arial Black', sans-serif" font-size="34" font-weight="800">S</text>
    <path class="st-mark__tee" d="M32 14h24M44 14v36" fill="none" stroke="${i}"
      stroke-width="3.2" stroke-linecap="square" />
  </svg>`}var L=`
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
`,ht="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#000"/><text x="11" y="46" fill="#fff" font-family="Inter,Arial Black,sans-serif" font-size="34" font-weight="800">S</text><path d="M32 14h24M44 14v36" stroke="#fff" stroke-width="3.2" stroke-linecap="square" fill="none"/></svg>');function U(t){return t.replace(/[&<>"']/g,e=>e==="&"?"&amp;":e==="<"?"&lt;":e===">"?"&gt;":e==='"'?"&quot;":"&#39;")}var _=`
:host, :root {
  /* \u2500\u2500 surfaces \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  --st-bg: #ffffff;
  --st-bg-subtle: #fafafa;
  --st-bg-raised: #ffffff;
  --st-bg-inverse: #0a0a0a;
  --st-overlay: rgba(0, 0, 0, 0.32);
  --st-scrim: rgba(255, 255, 255, 0.72);

  /* \u2500\u2500 ink \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  --st-fg: #000000;
  --st-fg-muted: #525252;
  --st-fg-subtle: #737373;
  --st-fg-faint: #a3a3a3;
  --st-fg-inverse: #ffffff;
  --st-fg-inverse-muted: #737373;

  /* \u2500\u2500 lines \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  --st-line: rgba(0, 0, 0, 0.1);
  --st-line-strong: rgba(0, 0, 0, 0.22);
  --st-line-inverse: rgba(255, 255, 255, 0.1);

  /* \u2500\u2500 semantic (used sparingly; the brand is monochrome) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  --st-ok: #1a7f37;
  --st-ok-bg: #f0f9f2;
  --st-warn: #8a5a12;
  --st-warn-bg: #fdf7ed;
  --st-danger: #b42318;
  --st-danger-bg: #fef3f2;

  /* \u2500\u2500 accent = ink \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  --st-accent: #000000;
  --st-accent-fg: #ffffff;
  --st-focus: #000000;

  /* \u2500\u2500 type \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

  /* \u2500\u2500 geometry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

  /* \u2500\u2500 motion (matches the site's cubic-bezier(.16,1,.3,1)) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  --st-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --st-ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --st-dur-fast: 120ms;
  --st-dur-base: 200ms;
  --st-dur-slow: 420ms;

  /* \u2500\u2500 elevation: hairline-first, never a heavy drop shadow \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  --st-shadow-pop: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 32px -8px rgba(0, 0, 0, 0.18);
  --st-shadow-raise: 0 1px 3px rgba(0, 0, 0, 0.06), 0 24px 60px -16px rgba(0, 0, 0, 0.28);
}

/* \u2500\u2500 dark theme \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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
`,H=`
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

/* Eyebrow label \u2014 the site's .mono.k */
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

/* Hairline \u2014 the site's structural device */
.st-rule { height: 1px; background: var(--st-line); border: 0; margin: 0; }

/* \u2500\u2500 buttons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 inputs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 chips \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 utility \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
`;var I={supported:{text:"Supported",cls:"chip--supported"},partial:{text:"Beta",cls:"chip--partial"},unknown:{text:"Experimental",cls:"chip--unknown"}},P="Focus the message box on the page with your draft typed, then open Second Thought to review it.";async function F(){W();let t=l=>document.getElementById(l),e=t("brand-mark");e.innerHTML=M({size:19,animated:!0,label:"Second Thought"});let r=chrome.runtime.getManifest().version;t("foot-ver").textContent=`v${r}`;let[n]=await chrome.tabs.query({active:!0,currentWindow:!0}),a=n?.url??"",o="";try{o=new URL(a).hostname.replace(/^www\./,"")}catch{o=""}let s;try{s=await chrome.runtime.sendMessage({type:"st/settings-get"})}catch{s=void 0}let i=s?.settings;i||m("Second Thought could not read its settings. Reload the extension.",!0),Y(i?.theme??"system"),G(o,i),V(s?.engineStatus),n?.id!==void 0&&o!==""&&h(o,i?.customSites??[]).adapter&&j(n.id);let c=t("tg-enabled"),u=t("tg-intercept");i&&(c.checked=i.enabled,u.checked=i.autoIntercept),c.addEventListener("change",()=>{B({enabled:c.checked})}),u.addEventListener("change",()=>{B({autoIntercept:u.checked})}),t("open-options").addEventListener("click",()=>{chrome.runtime.openOptionsPage()}),t("engine-change").addEventListener("click",()=>{chrome.runtime.openOptionsPage()}),t("link-history").addEventListener("click",l=>{l.preventDefault(),chrome.runtime.openOptionsPage()}),t("link-privacy").addEventListener("click",l=>{l.preventDefault(),chrome.runtime.openOptionsPage()});let f=t("refine-draft"),N=t("cta-note");o||(f.disabled=!0,N.textContent="Open an AI chat to use Second Thought."),f.addEventListener("click",async()=>{if(!n?.id)return;f.disabled=!0;let l=f.querySelector(".cta__label"),R=l?.textContent??"";l&&(l.textContent="Opening\u2026");try{(await chrome.tabs.sendMessage(n.id,{type:"st/open-panel"}))?.ok===!1?(m(P),f.disabled=!1):window.close()}catch{m(P),f.disabled=!1}finally{l&&(l.textContent=R)}})}function G(t,e){let r=document.getElementById("site-name"),n=document.getElementById("site-status"),a=document.getElementById("site-note"),o=t===""?{adapter:null}:h(t,e?.customSites??[]);if(o.adapter){r.textContent=o.adapter.name;let s=I[o.adapter.capability]??I.unknown;n.textContent=s.text,n.className=`chip ${s.cls}`,e&&!e.enabled?a.textContent="Second Thought is switched off. Requests will send unchanged.":e&&!e.autoIntercept?a.textContent="Pause-before-send is off. Use \u201CReview current draft\u201D to run it manually.":a.textContent="";return}n.textContent=t===""?"Unknown":"Passive",n.className="chip chip--off",r.textContent=t===""?"No page":t,a.textContent=t===""?"Open ChatGPT, Claude, Gemini or Copilot.":"Second Thought stays passive here. Add this site in Settings to enable it."}function V(t){let e=document.getElementById("engine-badge"),r=document.getElementById("engine-name"),n=document.getElementById("engine-reason");if(!t){e.textContent="Local",e.className="engine__badge engine__badge--local",r.textContent="On-device requirement engine",n.textContent="";return}if(t.engine==="ai"){e.textContent="AI",e.className="engine__badge",r.textContent=`${t.providerName} \xB7 ${t.model}`,n.textContent="Sharper questions via your own key. Your text goes straight to the provider.";return}e.textContent="Local",e.className="engine__badge engine__badge--local",r.textContent="On-device requirement engine",n.textContent=t.reason??"Runs entirely in your browser. No key, no network."}async function B(t){try{await chrome.runtime.sendMessage({type:"st/settings-set",settings:t})}catch{m("Could not save that setting. Reload the extension.",!0)}}function Y(t){let e=document.getElementById("shell"),r=t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":t;e&&(e.dataset.theme=r),document.documentElement.dataset.theme=r}function W(){let t=document.createElement("style");t.textContent=`${_}
${H}
${L}`,document.head.prepend(t)}var x;function m(t,e=!1){let r=document.getElementById("toast");r&&(r.textContent=t,r.className=`toast show${e?" toast--danger":""}`,x&&window.clearTimeout(x),x=window.setTimeout(()=>{r.className="toast"},4200))}F();async function j(t){let e=document.getElementById("site-status"),r=document.getElementById("site-note");try{let n=await chrome.tabs.sendMessage(t,{type:"st/ping"});if(!n?.ok)throw new Error("no reply");n.inputFound===!1?(e.textContent="No input found",e.className="chip chip--partial",r.textContent="Second Thought is running but cannot see the message box on this page yet. Click into the box, or reload the tab. If it persists the site layout changed \u2014 use \u201CReview current draft\u201D."):n.sendFound===!1&&(r.textContent="Message box found. The send button is not visible yet \u2014 it appears once you type.")}catch{e.textContent="Reload tab",e.className="chip chip--partial",r.textContent="This tab was opened before Second Thought was installed. Reload it once (F5) and it will attach."}}})();
