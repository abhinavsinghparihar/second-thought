"use strict";(()=>{var i=class extends Error{kind;retryable;status;constructor(t,n,s={}){super(n),this.name="AiError",this.kind=t,this.retryable=s.retryable??(t==="rate-limit"||t==="network"||t==="server"||t==="timeout"),this.status=s.status}};function ne(e,t){let n=e;return t&&t.length>=8&&(n=n.split(t).join("[redacted]")),n.replace(/\b(sk|pk|rk|api|key|token)[-_][A-Za-z0-9_-]{8,}/gi,"[redacted]").replace(/\bAIza[A-Za-z0-9_-]{20,}/g,"[redacted]").replace(/\bsk-[A-Za-z0-9_-]{10,}/g,"[redacted]").replace(/\b[A-Za-z0-9_-]{32,}\b/g,"[redacted]")}function se(e,t,n,s){let o=ne(oe(n),s).slice(0,200);if(e===401||e===403)return new i("auth",`${t} rejected the API key. Check the key in Settings.${o?` (${o})`:""}`,{status:e});if(e===404)return new i("model-not-found",`The model was not found on ${t}. Pick a different model in Settings.${o?` (${o})`:""}`,{status:e});if(e===429){let a=/quota|billing|credit/i.test(n);return new i(a?"quota":"rate-limit",a?`${t} reports no remaining quota for this key.`:`${t} is rate limiting \u2014 try again in a moment.`,{status:e,retryable:!a})}return e>=500?new i("server",`${t} had a server error (${e}). Try again shortly.`,{status:e}):new i("unknown",`${t} returned an error (${e}).${o?` ${o}`:""}`,{status:e})}function oe(e){try{let t=JSON.parse(e),n=t.error;if(typeof n=="string")return n;if(n?.message)return n.message;if(t.message)return t.message}catch{}return e.replace(/\s+/g," ").trim().slice(0,160)}async function v(e,t,n,s){let o=new AbortController,a=t.signal??void 0,r=()=>o.abort();a?.addEventListener("abort",r,{once:!0});let c=setTimeout(()=>o.abort(),n);try{return await fetch(e,{...t,signal:o.signal})}catch{throw o.signal.aborted?a?.aborted?new i("aborted","Request cancelled."):new i("timeout",`${s} took longer than ${Math.round(n/1e3)}s to respond.`):new i("network",`Could not reach ${s}. Check your connection, then retry.`)}finally{clearTimeout(c),a?.removeEventListener("abort",r)}}async function b(e,t){let n=await e.text().catch(()=>"");if(!e.ok)throw se(e.status,t,n);try{return JSON.parse(n)}catch{throw new i("bad-response",`${t} returned a response that was not valid JSON.`)}}function d(e,...t){let n=e;for(let s of t){if(n==null)return;if(typeof s=="number"){if(!Array.isArray(n))return;n=n[s]}else{if(typeof n!="object")return;n=n[s]}}return n}function x(e){if(typeof e!="string")return null;let t=e.trim();if(t===""||t.length>300)return null;let n;try{n=new URL(t)}catch{return null}let s=n.hostname==="localhost"||n.hostname==="127.0.0.1"||n.hostname==="[::1]";if(n.protocol!=="https:"&&!(n.protocol==="http:"&&s)||n.username!==""||n.password!=="")return null;let o=n.pathname.replace(/\/+$/,"");return`${n.protocol}//${n.host}${o}`}var re=3e4,L={meta:{id:"anthropic",name:"Anthropic",defaultModel:"claude-3-5-haiku-latest",models:["claude-3-5-haiku-latest","claude-3-5-sonnet-latest","claude-sonnet-4-20250514","claude-3-7-sonnet-latest"],keyUrl:"https://console.anthropic.com/settings/keys",needsKey:!0,origin:"https://api.anthropic.com/*",transport:"Your request text is sent from this browser directly to Anthropic, never to us."},async complete(e,t,n){if(e.trim()==="")throw new i("no-key","Anthropic needs an API key. Add one in Settings.");let s=await v("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":e,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:t,max_tokens:n.maxTokens??1400,temperature:n.temperature??.2,system:n.system,messages:[{role:"user",content:n.user}]}),signal:n.signal},re,"Anthropic"),o=await b(s,"Anthropic"),a=d(o,"stop_reason"),r=d(o,"content");if(!Array.isArray(r))throw new i("bad-response","Anthropic returned an unexpected response shape.");let c=r.map(f=>typeof d(f,"text")=="string"?String(d(f,"text")):"").join("");if(c.trim()==="")throw new i("bad-response","Anthropic returned an empty response.");if(a==="max_tokens")throw new i("bad-response","Anthropic hit the token limit before finishing. Try a smaller request or another model.");return c}};var ae=45e3,$={meta:{id:"custom",name:"Custom (OpenAI-compatible)",defaultModel:"",models:[],needsKey:!1,keyOptional:!0,origin:"",transport:"Your request text is sent from this browser directly to the base URL you entered, never to us."},async complete(e,t,n){let s=x(n.baseUrl);if(!s)throw new i("unknown","Custom provider needs a valid Base URL (https://\u2026/v1) in Settings.");if(t.trim()==="")throw new i("model-not-found","Custom provider has no model selected. Open Settings and pick one.");let o=await v(`${s}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",...e.trim()!==""?{Authorization:`Bearer ${e}`}:{}},body:JSON.stringify({model:t,temperature:n.temperature??.2,max_tokens:n.maxTokens??1400,...n.json?{response_format:{type:"json_object"}}:{},messages:[{role:"system",content:n.system},{role:"user",content:n.user}]}),signal:n.signal},ae,"Custom provider"),a=await b(o,"Custom provider"),r=d(a,"choices",0,"message","content");if(typeof r!="string"||r.trim()==="")throw new i("bad-response","The custom provider returned an empty response.");return r}};var ie=3e4,R={meta:{id:"gemini",name:"Google Gemini",defaultModel:"gemini-2.0-flash",models:["gemini-2.0-flash","gemini-2.5-flash","gemini-1.5-flash","gemini-1.5-pro"],keyUrl:"https://aistudio.google.com/app/apikey",needsKey:!0,origin:"https://generativelanguage.googleapis.com/*",transport:"Your request text is sent from this browser directly to Google, never to us."},async complete(e,t,n){if(e.trim()==="")throw new i("no-key","Google Gemini needs an API key. Add one in Settings.");let s=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(t)}:generateContent`,o=await v(s,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":e},body:JSON.stringify({systemInstruction:{parts:[{text:n.system}]},contents:[{role:"user",parts:[{text:n.user}]}],generationConfig:{temperature:n.temperature??.2,maxOutputTokens:n.maxTokens??1400,...n.json?{responseMimeType:"application/json"}:{}}}),signal:n.signal},ie,"Google Gemini"),a=await b(o,"Google Gemini"),r=d(a,"candidates",0);if(!r){let h=d(a,"promptFeedback","blockReason");throw new i("bad-response",typeof h=="string"?`Gemini blocked this request (${h}).`:"Gemini returned no candidates.")}let c=d(r,"content","parts"),f=Array.isArray(c)?c.map(h=>typeof d(h,"text")=="string"?String(d(h,"text")):"").join(""):"";if(f.trim()==="")throw new i("bad-response","Gemini returned an empty response.");return f}};var le=45e3,H={meta:{id:"ollama",name:"Ollama (local)",defaultModel:"llama3.1",models:["llama3.1","llama3.2","qwen2.5","mistral","phi3"],needsKey:!1,origin:"http://127.0.0.1:11434/*",transport:"Runs entirely on your machine. Nothing leaves your computer."},async complete(e,t,n){let s;try{s=await v("http://127.0.0.1:11434/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:t,stream:!1,...n.json?{format:"json"}:{},options:{temperature:n.temperature??.2},messages:[{role:"system",content:n.system},{role:"user",content:n.user}]}),signal:n.signal},le,"Ollama")}catch(r){throw O(r)}let o;try{o=await b(s,"Ollama")}catch(r){throw O(r)}let a=d(o,"message","content");if(typeof a!="string"||a.trim()==="")throw new i("bad-response","Ollama returned an empty response. Is the model pulled?");return a}};function O(e){return e instanceof i?e.status===403?new i("auth","Ollama refused the request (403). Start Ollama with OLLAMA_ORIGINS=chrome-extension://* (then restart it) so it accepts this extension.",{status:403}):e.kind==="network"?new i("network",'Could not reach Ollama at 127.0.0.1:11434. Make sure it is running (ollama serve) and click "Test connection" once so the extension can ask for access.'):e.kind==="model-not-found"||e.status===404?new i("model-not-found","Ollama does not have this model. Pick an installed one in Settings, or run: ollama pull <model>.",{status:404}):e:new i("unknown","Ollama request failed unexpectedly.")}var ce=3e4;function C(e){return{meta:{id:e.id,name:e.name,defaultModel:e.defaultModel,models:e.models,keyUrl:e.keyUrl,needsKey:!0,origin:e.origin,transport:`Your request text is sent from this browser directly to ${e.name}, never to us.`},async complete(t,n,s){if(t.trim()==="")throw new i("no-key",`${e.name} needs an API key. Add one in Settings.`);let o=await v(e.endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`,...e.extraHeaders??{},...e.id==="openrouter"?{"X-Title":"Second Thought"}:{}},body:JSON.stringify({model:n,temperature:s.temperature??.2,max_tokens:s.maxTokens??1400,...s.json?{response_format:{type:"json_object"}}:{},messages:[{role:"system",content:s.system},{role:"user",content:s.user}]}),signal:s.signal},ce,e.name),a=await b(o,e.name),r=d(a,"choices",0,"message","content"),c=d(a,"choices",0,"message","refusal");if(typeof c=="string"&&c!=="")throw new i("bad-response",`${e.name} declined to answer this request.`);if(typeof r!="string"||r.trim()==="")throw new i("bad-response",`${e.name} returned an empty response.`);return r}}}var U=C({id:"openai",name:"OpenAI",endpoint:"https://api.openai.com/v1/chat/completions",defaultModel:"gpt-4o-mini",models:["gpt-4o-mini","gpt-4o","gpt-4.1","gpt-4.1-mini","o4-mini"],keyUrl:"https://platform.openai.com/api-keys",origin:"https://api.openai.com/*"}),z=C({id:"openrouter",name:"OpenRouter",endpoint:"https://openrouter.ai/api/v1/chat/completions",defaultModel:"openai/gpt-4o-mini",models:["openai/gpt-4o-mini","anthropic/claude-3.5-haiku","google/gemini-2.0-flash-001","meta-llama/llama-3.1-8b-instruct","qwen/qwen-2.5-72b-instruct"],keyUrl:"https://openrouter.ai/keys",origin:"https://openrouter.ai/*"}),K=C({id:"groq",name:"Groq",endpoint:"https://api.groq.com/openai/v1/chat/completions",defaultModel:"llama-3.3-70b-versatile",models:["llama-3.3-70b-versatile","llama-3.1-8b-instant"],keyUrl:"https://console.groq.com/keys",origin:"https://api.groq.com/*"});var N={gemini:R,groq:K,openai:U,openrouter:z,anthropic:L,ollama:H,custom:$},de=["gemini","groq","openai","anthropic","openrouter","ollama","custom"];function E(e){return N[e]?.meta}function j(){return de.map(e=>N[e].meta)}function q(e={}){let{size:t=20,animated:n=!1,inverted:s=!1,label:o,className:a=""}=e,r=s?"#fff":"var(--st-mark-disc, #000)",c=s?"#000":"var(--st-mark-ink, #fff)",f=["st-mark",n?"st-mark--in":"",a].filter(Boolean).join(" "),h=o?`role="img" aria-label="${me(o)}"`:'aria-hidden="true" focusable="false"';return`<svg class="${f}" width="${t}" height="${t}" viewBox="0 0 64 64" ${h}
    style="display:block;overflow:visible;flex:none">
    <circle class="st-mark__disc" cx="32" cy="32" r="32" fill="${r}" />
    <text class="st-mark__ess" x="11" y="46" fill="${c}"
      font-family="Inter, 'Arial Black', sans-serif" font-size="34" font-weight="800">S</text>
    <path class="st-mark__tee" d="M32 14h24M44 14v36" fill="none" stroke="${c}"
      stroke-width="3.2" stroke-linecap="square" />
  </svg>`}var D=`
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
`,De="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#000"/><text x="11" y="46" fill="#fff" font-family="Inter,Arial Black,sans-serif" font-size="34" font-weight="800">S</text><path d="M32 14h24M44 14v36" stroke="#fff" stroke-width="3.2" stroke-linecap="square" fill="none"/></svg>');function me(e){return e.replace(/[&<>"']/g,t=>t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t==='"'?"&quot;":"&#39;")}var G=`
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
`,J=`
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
`;var w="st-custom-sites";function Y(e){let t=new Set;for(let n of e){let s=n.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/.*$/,"");if(!(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)&&s!=="localhost")){if(s==="localhost"||s.endsWith(".localhost")){t.add("http://localhost/*"),t.add("https://localhost/*");continue}t.add(`https://${s}/*`)}}return Array.from(t).sort()}var pe=[{name:"ChatGPT",host:"chatgpt.com",capability:"supported"},{name:"Claude",host:"claude.ai",capability:"partial"},{name:"Google Gemini",host:"gemini.google.com",capability:"partial"},{name:"Microsoft Copilot",host:"copilot.microsoft.com",capability:"unknown"}],l=null;async function ue(){we(),document.getElementById("brand-mark").innerHTML=q({size:40,animated:!0,label:"Second Thought"}),document.getElementById("version-label").textContent=`v${chrome.runtime.getManifest().version}`,document.getElementById("foot-ver").textContent="Second Thought \xB7 engine 0.3.0";let e=await g({type:"st/settings-get"});if(!e){y("Could not read settings. Reload the extension.",!0);return}l={settings:e.settings,keys:e.keys},ee(e.settings.theme),ge(),fe(),he(),_(),A(),document.getElementById("ext-id").textContent=chrome.runtime.id,B()}function _(){if(!l)return;let e=l.settings;for(let h of Array.from(document.querySelectorAll(".segmented__opt")))h.setAttribute("aria-checked",String(h.dataset.engine===e.analysisEngine));let t=document.getElementById("engine-explain");t.textContent=e.analysisEngine==="ai"?"In AI mode the message you were about to send is sent from this browser directly to your provider to generate sharper questions. The final prompt is always assembled locally from your answers.":"Local mode runs the full requirement engine on-device: intent detection, gap analysis, question synthesis and prompt assembly. No key, no network, no cost.",document.getElementById("ai-config").setAttribute("aria-hidden",String(e.analysisEngine!=="ai"));let s=document.getElementById("st-provider");s.value=e.aiProvider;let o=E(e.aiProvider),a=document.getElementById("key-block");a.style.display=o&&!o.needsKey&&!o.keyOptional?"none":"";let r=document.getElementById("base-url-block");r.hidden=e.aiProvider!=="custom",document.getElementById("st-base-url").value=e.customBaseUrl,k();let c=document.getElementById("key-link");o?.keyUrl?(c.href=o.keyUrl,c.style.display=""):c.style.display="none",Z();let f=document.getElementById("dataflow");f.textContent=o?o.transport:"Select a provider to see exactly where your request text travels.",S("st-enabled",e.enabled),S("st-intercept",e.autoIntercept),S("st-adaptive",e.adaptiveFollowUp),S("st-history",e.historyEnabled),document.getElementById("st-maxq").value=String(e.maxQuestions),document.getElementById("st-excluded").value=e.excludedSites.join(`
`),document.getElementById("st-custom").value=e.customSites.join(`
`),document.getElementById("st-theme").value=e.theme,F()}function F(){if(!l)return;let e=l.settings,t=E(e.aiProvider),n=l.keys[e.aiProvider],s=document.getElementById("status-engine");e.analysisEngine==="ai"?s.textContent=n?.hasKey||t?.needsKey===!1?"AI-powered":"Local (no key \u2014 AI unavailable)":s.textContent="Local (on-device)",document.getElementById("status-provider").textContent=t?`${t.name}`:"\u2014";let o=document.getElementById("status-key");t&&!t.needsKey&&!(t.keyOptional&&n?.hasKey)?o.textContent=t.keyOptional?"Optional":"Not required":n?.hasKey?o.textContent=`Saved \xB7\xB7\xB7\xB7${n.hint}`:o.textContent="Not configured"}function Z(){if(!l)return;let e=l.keys[l.settings.aiProvider],t=document.getElementById("key-state"),n=document.getElementById("st-apikey"),s=document.getElementById("btn-remove-key");if(e?.hasKey){let o=e.savedAt?new Date(e.savedAt).toLocaleDateString():"";t.textContent=`Saved \xB7\xB7\xB7\xB7${e.hint}${o?` \xB7 ${o}`:""}`,t.className="key-block__state key-block__state--saved",n.placeholder="Replace key\u2026 (leave blank to keep)",s.disabled=!1}else t.textContent="No key saved",t.className="key-block__state",n.placeholder="Paste your key\u2026",s.disabled=!0}function ge(){let e=document.getElementById("st-provider");e.textContent="";for(let t of j()){let n=document.createElement("option");n.value=t.id,n.textContent=t.needsKey?t.name:`${t.name} \u2014 no key`,e.appendChild(n)}}function fe(){let e=document.getElementById("builtin-sites");e.textContent="";for(let t of pe){let n=document.createElement("div");n.className="site-list__row";let s=document.createElement("div"),o=document.createElement("div");o.className="site-list__name",o.textContent=t.name;let a=document.createElement("div");a.className="site-list__host",a.textContent=t.host,s.append(o,a);let r=document.createElement("span"),c=t.capability;r.className=`st-chip ${c==="supported"?"st-chip--ok":c==="partial"?"st-chip--warn":""}`,r.textContent=c==="supported"?"Supported":c==="partial"?"Beta":"Experimental",n.append(s,r),e.appendChild(n)}}function he(){let e=(t,n,s)=>{document.getElementById(t)?.addEventListener(n,s)};for(let t of Array.from(document.querySelectorAll(".segmented__opt")))t.addEventListener("click",()=>{m({analysisEngine:t.dataset.engine})});e("st-enabled","change",()=>{m({enabled:I("st-enabled")})}),e("st-intercept","change",()=>{m({autoIntercept:I("st-intercept")})}),e("st-adaptive","change",()=>{m({adaptiveFollowUp:I("st-adaptive")})}),e("st-history","change",()=>{m({historyEnabled:I("st-history")})}),e("st-maxq","change",()=>{m({maxQuestions:Number(document.getElementById("st-maxq").value)})}),e("st-theme","change",()=>{let t=document.getElementById("st-theme").value;ee(t),m({theme:t})}),e("st-provider","change",()=>{let t=document.getElementById("st-provider").value;p=[],m({aiProvider:t,aiModel:""}).then(()=>A())}),e("st-model","change",()=>{m({aiModel:document.getElementById("st-model").value.trim()})}),e("st-model-manual","change",()=>{m({aiModel:document.getElementById("st-model-manual").value.trim()})}),e("btn-models","click",()=>{A(!0)}),e("btn-companion","click",()=>{Ie()}),e("btn-companion-off","click",()=>{Se()}),e("btn-base-url","click",()=>{Ee()}),e("st-excluded","change",()=>{m({excludedSites:X(document.getElementById("st-excluded").value)})}),e("btn-toggle-key","click",()=>{let t=document.getElementById("st-apikey"),n=document.getElementById("btn-toggle-key"),s=t.type==="password";t.type=s?"text":"password",n.textContent=s?"Hide":"Show",n.setAttribute("aria-label",s?"Hide key":"Show key")}),e("btn-save-key","click",()=>{W()}),e("st-apikey","keydown",t=>{t.key==="Enter"&&W()}),e("btn-remove-key","click",()=>{ye()}),e("btn-test","click",()=>{V()}),e("btn-history","click",()=>{Q()}),e("btn-close-history","click",()=>{document.getElementById("history-modal")?.removeAttribute("open"),document.getElementById("history-modal")?.close()}),e("btn-clear-history","click",()=>{ke()}),e("btn-apply-custom","click",()=>{ve()}),e("btn-wipe","click",()=>{xe()})}async function m(e){if(!l)return;let t=l.settings;l.settings={...l.settings,...e},_();let n=await g({type:"st/settings-set",settings:e});if(!n?.settings){l.settings=t,_(),y("Could not save that setting.",!0);return}l.settings=n.settings,e.aiProvider&&await T()}async function T(){let e=await g({type:"st/settings-get"});e&&l&&(l.keys=e.keys,Z(),F())}async function W(){if(!l)return;let e=document.getElementById("st-apikey"),t=e.value.trim();if(t===""){y("Paste a key first.");return}let n=l.settings.aiProvider,s=document.getElementById("btn-save-key");s.disabled=!0,u("test-status","","");try{await g({type:"st/key-set",provider:n,apiKey:t}),e.value="",e.type="password",document.getElementById("btn-toggle-key").textContent="Show",await T(),y("Key saved on this device."),await A(!0),await V(!0)}finally{s.disabled=!1}}async function ye(){if(!l)return;let e=l.settings.aiProvider;await g({type:"st/key-clear",provider:e}),await T(),u("test-status","Key removed from this device.","ok"),y("Key removed."),p=[],k("Add a key to load the models it can use. The best one is selected for you.")}async function V(e=!1){if(!l)return;let t=document.getElementById("btn-test"),n=document.getElementById("st-apikey");t.disabled=!0,u("test-status",e?"Key saved \u2014 testing\u2026":"Testing\u2026","");try{if(!await P(l.settings.aiProvider)){u("test-status","Access to this server was not granted. Click Test connection again and allow it.","err");return}let s=await g({type:"st/test-connection",provider:l.settings.aiProvider,model:l.settings.aiModel,apiKey:n.value.trim()});if(!s){u("test-status","No response from the extension background. Reload the extension.","err");return}u("test-status",s.message,s.ok?"ok":"err")}catch{u("test-status","Connection test failed unexpectedly.","err")}finally{t.disabled=!1}}async function ve(){let e=document.getElementById("custom-status"),t=document.getElementById("btn-apply-custom"),n=document.getElementById("st-custom").value,s=X(n),o=Y(s);t.disabled=!0;try{await m({customSites:s});let r=(await chrome.scripting.getRegisteredContentScripts().catch(()=>[])).some(te=>te.id===w);if(o.length===0){r&&await chrome.scripting.unregisterContentScripts({ids:[w]}),u("custom-status","Saved \u2014 custom sites cleared.","ok");return}let c={permissions:["scripting"],origins:o};if(!(await chrome.permissions.contains({origins:o})||await chrome.permissions.request(c))){u("custom-status","Permission denied \u2014 those sites stay inactive.","err");return}r&&await chrome.scripting.unregisterContentScripts({ids:[w]}),await chrome.scripting.registerContentScripts([{id:w,js:["content.js"],matches:o,runAt:"document_idle",persistAcrossSessions:!0}]),u("custom-status",`Active on ${s.length} site${s.length===1?"":"s"} \u2014 refresh the tab once.`,"ok")}catch(a){let r=a instanceof Error?a.message:"Unknown error";u("custom-status",`Could not apply: ${r.slice(0,120)}`,"err")}finally{t.disabled=!1}}async function Q(){let e=document.getElementById("history-modal"),t=document.getElementById("history-body");t.textContent="";let s=(await g({type:"st/history-list"}))?.history??[];if(s.length===0){let o=document.createElement("div");o.className="empty",o.textContent=l?.settings.historyEnabled?"No refined prompts yet. They will appear here after your first refinement.":"History is off. Turn on \u201CKeep prompt history\u201D above to record refined prompts on this device.",t.appendChild(o)}else for(let o of s.slice(0,50))t.appendChild(be(o));typeof e.showModal=="function"?e.showModal():e.setAttribute("open","")}function be(e){let t=document.createElement("div");t.className="history-item";let n=document.createElement("div");n.className="history-item__meta";let s=new Date(e.createdAt).toLocaleString();for(let r of[s,e.taskType,e.engine]){let c=document.createElement("span");c.textContent=r,n.appendChild(c)}let o=document.createElement("span");o.className="history-item__score",o.textContent=`${e.scoreBefore}% \u2192 ${e.scoreAfter}%`,n.appendChild(o);let a=document.createElement("div");return a.className="history-item__text",a.textContent=e.original,t.append(n,a),t}async function ke(){await g({type:"st/history-clear"}),y("History cleared."),document.getElementById("history-modal").open&&await Q()}async function xe(){await g({type:"st/key-clear-all"}),await g({type:"st/history-clear"}),await T(),u("wipe-status","All saved keys and history removed from this device.","ok"),y("Everything removed.")}function g(e){return chrome.runtime.sendMessage(e).catch(()=>{})}function X(e){return Array.from(new Set(e.split(/[\n,]/).map(t=>t.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/.*$/,"")).filter(t=>t!==""&&(t==="localhost"||/^[a-z0-9.-]+\.[a-z]{2,}$/.test(t)))))}function I(e){return document.getElementById(e).checked}function S(e,t){let n=document.getElementById(e);n&&(n.checked=t)}function u(e,t,n){let s=document.getElementById(e);s&&(s.textContent=t,s.className=`status-line${n==="ok"?" status-line--ok":n==="err"?" status-line--err":""}`)}function ee(e){let t=e==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":e;document.documentElement.dataset.theme=t,document.getElementById("shell")?.setAttribute("data-theme",t)}var M;function y(e,t=!1){let n=document.getElementById("toast");n&&(n.textContent=e,n.className=`toast show${t?" toast--danger":""}`,M&&window.clearTimeout(M),M=window.setTimeout(()=>{n.className="toast"},3600))}function we(){let e=document.createElement("style");e.textContent=`${G}
${J}
${D}`,document.head.prepend(e)}document.addEventListener("DOMContentLoaded",()=>{ue()});var p=[];function Ae(e){if(e==="ollama")return["http://127.0.0.1/*","http://localhost/*"];if(e==="custom"){let t=x(l?.settings.customBaseUrl);if(!t)return[];let n=new URL(t);return[`${n.protocol}//${n.hostname}/*`]}return[]}async function P(e){let t=Ae(e);if(t.length===0)return!0;try{return await chrome.permissions.contains({origins:t})?!0:await chrome.permissions.request({origins:t})}catch{return!1}}function k(e){if(!l)return;let t=document.getElementById("st-model"),n=document.getElementById("st-model-manual"),s=document.getElementById("model-status"),o=l.settings.aiModel;if(p.length>0){t.textContent="";for(let a of p){let r=document.createElement("option");r.value=a,r.textContent=a,t.appendChild(r)}t.value=p.includes(o)?o:p[0],t.hidden=!1,n.hidden=!0}else t.hidden=!0,n.hidden=!1,n.value=o;e!==void 0&&(s.textContent=e)}async function A(e=!1){if(!l)return;let t=l.settings.aiProvider,n=E(t),s=document.getElementById("st-apikey").value.trim(),o=!!l.keys[t]?.hasKey||s!=="",a=document.getElementById("btn-models");if(n?.needsKey&&!o){p=[],k("Add and save a key to load the models it can use. The best one is selected for you.");return}if(t==="custom"&&!x(l.settings.customBaseUrl)){p=[],k('Enter your Base URL above and click "Save & allow".');return}a.disabled=!0,k("Loading the models your key can use\u2026");try{if(e&&!await P(t)){p=[],k("Access was not granted, so the model list could not be loaded.");return}let r=await g({type:"st/list-models",provider:t,apiKey:s});if(!r||!r.ok){p=[],k(r?.message??"Could not load models. You can type a model id instead.");return}p=r.models,!p.includes(l.settings.aiModel)&&r.best&&await m({aiModel:r.best}),k(`${p.length} model${p.length===1?"":"s"} available for your key \xB7 best one selected automatically.`)}finally{a.disabled=!1}}async function Ee(){if(!l)return;let e=document.getElementById("st-base-url"),t=x(e.value);if(!t){y("Enter a valid https://\u2026/v1 address (http is allowed only for localhost).",!0);return}if(await m({customBaseUrl:t,aiModel:""}),!await P("custom")){y("Access to that server was not granted.",!0);return}p=[],y("Base URL saved."),await A()}async function B(){let e=document.getElementById("companion-status");if(!e)return;let t=await g({type:"st/companion-status"});e.textContent=t?`${t.detail}${t.version?` (v${t.version})`:""}`:"Could not check the companion.",e.className=`status-line ${t?.state==="connected"?"status-line--ok":""}`}async function Ie(){let e=!1;try{e=await chrome.permissions.request({permissions:["nativeMessaging"]})}catch{e=!1}if(!e){y("Permission was not granted, so the companion stays disconnected.",!0);return}await m({useCompanion:!0}),await B()}async function Se(){await m({useCompanion:!1});try{await chrome.permissions.remove({permissions:["nativeMessaging"]})}catch{}await B()}})();
