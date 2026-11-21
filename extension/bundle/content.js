"use strict";(()=>{var qe=["software","website","mobile","coding","writing","research","image","business","education","general"],Rt={website:[{id:"site-build",re:/\b(build|create|make|design|develop|redesign|rework|launch)\b[^.?!]{0,40}\b(website|web ?site|landing page|homepage|web ?page|portfolio site|marketing site|blog site|store|shop|e-?commerce site|web ?app)\b/i,weight:3.6},{id:"site-noun",re:/\b(landing page|homepage|webshop|web site|website|webapp|web app|saas site)\b/i,weight:1.8},{id:"site-tech",re:/\b(next\.?js|nuxt|astro|gatsby|wordpress|shopify|webflow|framer|tailwind|html|css)\b/i,weight:.9},{id:"site-hindi",re:/\b(website|site|web ?page)\b[^.?!]{0,24}\b(banao|bana do|banana hai|banani hai|chahiye)\b/i,weight:3.2},{id:"site-seo",re:/\b(seo|responsive|pages?|navigation|hero section|footer|cta|forms?)\b/i,weight:.7}],mobile:[{id:"mobile-build",re:/\b(build|create|make|develop|design)\b[^.?!]{0,40}\b(android|ios|iphone|ipad|mobile ?app|mobile application|flutter|react native|swiftui|kotlin)\b/i,weight:3.8},{id:"mobile-noun",re:/\b(android app|ios app|iphone app|mobile app|mobile application|react native|flutter app|swiftui|jetpack compose)\b/i,weight:2.2},{id:"mobile-store",re:/\b(app store|play store|apk|testflight|push notifications?)\b/i,weight:1.4},{id:"mobile-hindi",re:/\b(android|ios|mobile)\b[^.?!]{0,24}\b(app|application)\b[^.?!]{0,18}\b(banao|bana do|banana hai|chahiye)\b/i,weight:3.2}],software:[{id:"sw-app-build",re:/\b(?:build|make|create|develop|design|ship|launch)\b[^.?!]{0,40}\b(app|application|tool|platform|dashboard|system|product)\b/i,weight:2.8},{id:"sw-build",re:/\b(build|develop|create|make|implement|architect|ship|write)\b[^.?!]{0,44}\b(api|backend|back-end|microservice|service|cli|library|sdk|plugin|extension|bot|daemon|pipeline|database|schema|system|platform|dashboard|tool)\b/i,weight:3.2},{id:"sw-noun",re:/\b(backend|back-end|microservice|rest api|graphql|sdk|library|command[- ]line|cli tool|chrome extension|browser extension|bot|cron job|etl|webhook)\b/i,weight:2},{id:"sw-arch",re:/\b(architecture|refactor|scalab\w+|concurren\w+|queue|worker|cache|deploy|docker|kubernetes|ci\/cd|unit tests?)\b/i,weight:1.3},{id:"sw-automation",re:/\b(automate|automation|script|scraper|crawler|integration|sync)\b/i,weight:1}],coding:[{id:"code-debug",re:/\b(debug|fix|why (does|is|do)|not working|throws? (an? )?(error|exception)|stack ?trace|traceback|error message|fails?|crash\w*|broken)\b/i,weight:3},{id:"code-language",re:/\b(python|javascript|typescript|java|kotlin|swift|golang|rust|c\+\+|c#|php|ruby|scala|dart|sql|bash|powershell|r)\b/i,weight:1.6},{id:"code-explain",re:/\b(explain (this|the) (code|function|error|regex)|what does (this|the) (code|function)|time complexity|big[- ]o|refactor|optimi[sz]e|unit test|regex for|parse this)\b/i,weight:2.6},{id:"code-snippet",re:/```|^\s*(import|const|let|function|def|class|public|private|#include|package)\b/m,weight:2.4},{id:"code-leetcode",re:/\b(algorithm|data structure|leetcode|dynamic programming|recursion|sorting|binary search)\b/i,weight:1.8}],writing:[{id:"write-content",re:/\b(write|draft|compose|rewrite|edit|proofread|polish|summari[sz]e|paraphrase)\b[^.?!]{0,44}\b(article|blog|blog post|essay|story|poem|post|linkedin post|caption|copy|newsletter|script|speech|bio|review|guide|documentation|readme|thesis|paragraph|email|e-?mail|letter|cover letter|press release|case study|whitepaper|proposal|report)\b/i,weight:3.4},{id:"write-noun",re:/\b(blog post|linkedin post|cover letter|press release|case study|whitepaper|newsletter|product description|landing copy|ad copy|tagline|readme|documentation|docstring|changelog)\b/i,weight:2},{id:"write-hindi",re:/\b(blog|article|email|e-?mail|letter|essay|caption|poem|story|post)\b[^.?!]{0,24}\b(likho|likh do|likhna hai|banao|bana do|chahiye)\b/i,weight:3.2},{id:"write-docs",re:/\b(api ?docs?|documentation|docstrings?|technical writing|style guide|release notes)\b/i,weight:2.2},{id:"write-tone",re:/\b(tone|voice|audience|headline|hook|intro|outro)\b/i,weight:.5},{id:"write-form",re:/\b(haiku|limerick|sonnet|ode|acrostic|taglines?|slogan|blurb|bios?|poem|poetry|verse|rhyme|jingle|pitch|toast|eulogy|vows?)\b/i,weight:2.6},{id:"write-translate",re:/\b(translate|translation|localise|localize|transliterate)\b/i,weight:3}],research:[{id:"research-verbs",re:/\b(research|investigate|analy[sz]e|compare|evaluate|assess|benchmark|survey)\b[^.?!]{0,54}\b(options|tools|products|vendors|market|competitors|alternatives|trends|landscape|literature|papers|evidence|providers|platforms|solutions|services|frameworks|pricing)\b/i,weight:3.4},{id:"research-compare",re:/\b(pros and cons|trade-?offs?|versus|vs\.?|comparison|which (one )?is better|recommend a|best \w+ for)\b/i,weight:2.2},{id:"research-market",re:/\b(market (research|analysis|size|trends?)|state of|industry report|competitive analysis|due diligence)\b/i,weight:2.6},{id:"research-sources",re:/\b(sources?|citations?|references|peer[- ]reviewed|studies|papers|data on)\b/i,weight:1.6}],image:[{id:"image-verbs",re:/\b(generate|create|draw|design|make|render|illustrate|paint|sketch)\b[^.?!]{0,32}\b(image|picture|photo|illustration|logo|icon|poster|banner|artwork|avatar|wallpaper|mockup|sketch|painting|thumbnail|scene|portrait|sticker|badge)\b/i,weight:3.4},{id:"image-noun",re:/\b(logo|icon|poster|banner|avatar|wallpaper|thumbnail|illustration|photorealistic|watercolour|watercolor|pixel art|3d render|oil painting|line art|flat design|isometric|cinematic)\b/i,weight:2.2},{id:"image-tool",re:/\b(midjourney|dall-?e|stable diffusion|flux|sdxl|imagen|nano banana)\b/i,weight:1.8},{id:"image-camera",re:/\b(camera angle|shallow depth of field|bokeh|wide shot|close-?up|golden hour|aspect ratio|16:9|9:16|1:1)\b/i,weight:1.4}],business:[{id:"biz-plan",re:/\b(business plan|go[- ]to[- ]market|gtm|monetis\w+|monetiz\w+|pricing strategy|revenue model|business model|pitch deck|investor deck)\b/i,weight:3.4},{id:"biz-strategy",re:/\b(strategy|strategic|launch plan|growth plan|roadmap|positioning|value proposition|target market|customer segment)\b/i,weight:2.2},{id:"biz-finance",re:/\b(revenue|profit|margin|burn rate|runway|forecast|break[- ]even|arr|mrr|cac|ltv)\b/i,weight:1.8},{id:"biz-startup",re:/\b(startup|saas business|company|venture|fundrais\w+|seed round|investors?)\b/i,weight:1.2}],education:[{id:"edu-teach",re:/\b(explain|teach me|help me understand|walk me through|eli5|explain like i'?m|break down how)\b/i,weight:2.4},{id:"edu-lookup",re:/\b(what is|what are|how does|how do|why does|why is|difference between|meaning of|define)\b/i,weight:1.2},{id:"edu-plan",re:/\b(learn|study|master|practice|course|curriculum|tutorial|roadmap to learn|from scratch|beginner|syllabus|revision)\b/i,weight:2},{id:"edu-exam",re:/\b(exam|test prep|interview prep|questions to practice|homework|assignment|lesson plan)\b/i,weight:2.4}]};function re(n,t={}){let e=Pt(n),i=new Map,o=[];for(let[d,m]of Object.entries(Rt)){let h=0;for(let p of m)p.re.test(e)&&(h+=p.weight,o.push(p.id));h>0&&i.set(d,h)}if(i.size===0)return{taskType:"general",confidence:.2,signals:[]};let s=[...i.entries()].sort((d,m)=>m[1]-d[1]||Ie(d[0])-Ie(m[0])),[r,a]=s[0],l=s[1]?.[1]??0,c=r,u=d=>o.includes(d);c==="website"&&(u("mobile-build")||u("mobile-noun"))&&(c="mobile"),c==="software"&&(u("site-build")||u("site-noun"))&&!u("sw-noun")&&(c="website"),c==="software"&&u("mobile-build")&&(c="mobile"),c==="coding"&&(u("site-build")||u("mobile-build")||u("sw-build"))&&(c=u("mobile-build")?"mobile":u("site-build")?"website":"software"),c==="general"&&t.prefersTechnical&&(c="coding"),c==="general"&&u("sw-app-build")&&!u("mobile-build")&&!u("site-build")&&(c="software");let g=a-l,f=Mt(.35+Math.min(1,a/6)*.4+Math.min(1,g/4)*.25);return{taskType:c,confidence:Nt(f),signals:o.filter(d=>d!=="")}}var ie={software:"Software development",website:"Website development",mobile:"Mobile app development",coding:"Coding & debugging",writing:"Writing & documentation",research:"Research & analysis",image:"Image generation",business:"Business planning",education:"Education & learning",general:"General request"};function se(n){return ie[n]??ie.general}var oe={software:"Software",website:"Website",mobile:"Mobile app",coding:"Coding",writing:"Writing",research:"Research",image:"Image",business:"Business",education:"Learning",general:"General"};function ae(n){return oe[n]??oe.general}function Pt(n){return n.replace(/\s+/g," ").trim()}function Ie(n){return qe.indexOf(n)}function Mt(n){return Math.min(1,Math.max(0,n))}function Nt(n){return Math.round(n*100)/100}var R=[{id:"must_avoid",label:"Explicitly excluded",weight:.3,kind:"text",optional:!0},{id:"output_format",label:"Output format",weight:.25,kind:"single",optional:!0},{id:"deadline",label:"Deadline",weight:.15,kind:"single",optional:!0}],zt=[{id:"purpose",label:"Website purpose",weight:.95,kind:"single"},{id:"site_type",label:"Website type",weight:.7,kind:"single"},{id:"audience",label:"Target audience",weight:.8,kind:"single"},{id:"pages",label:"Required pages",weight:.75,kind:"multi"},{id:"design_direction",label:"Design direction",weight:.6,kind:"single"},{id:"features",label:"Features",weight:.85,kind:"multi"},{id:"tech_stack",label:"Technology preference",weight:.55,kind:"single"},{id:"backend",label:"Backend requirements",weight:.7,kind:"single"},{id:"auth",label:"Authentication",weight:.55,kind:"single",condition:{slot:"backend",equals:["dynamic","unsure"]}},{id:"database",label:"Database",weight:.5,kind:"single",condition:{slot:"backend",equals:["dynamic","unsure"]}},{id:"deployment",label:"Deployment",weight:.4,kind:"single",optional:!0},{id:"content",label:"Content readiness",weight:.45,kind:"single",optional:!0},...R],It=[{id:"purpose",label:"What it does",weight:.95,kind:"text"},{id:"platform",label:"Runtime / platform",weight:.7,kind:"single"},{id:"features",label:"Core functionality",weight:.9,kind:"multi"},{id:"language",label:"Language",weight:.6,kind:"single"},{id:"framework",label:"Framework / stack",weight:.5,kind:"single"},{id:"constraints",label:"Constraints",weight:.6,kind:"multi"},{id:"interfaces",label:"Interfaces",weight:.55,kind:"multi",condition:{slot:"platform",equals:["server","backend","api"]}},{id:"data_storage",label:"Data storage",weight:.55,kind:"single"},{id:"scale",label:"Scale expectations",weight:.4,kind:"single",optional:!0},{id:"output_shape",label:"Deliverable form",weight:.55,kind:"single"},{id:"testing",label:"Tests expected",weight:.35,kind:"single",optional:!0},...R],qt=[{id:"purpose",label:"What the app does",weight:.95,kind:"text"},{id:"mobile_os",label:"Mobile platform",weight:.85,kind:"single"},{id:"features",label:"Core features",weight:.9,kind:"multi"},{id:"audience",label:"Target users",weight:.7,kind:"single"},{id:"framework",label:"Framework",weight:.55,kind:"single"},{id:"backend",label:"Backend / sync",weight:.6,kind:"single"},{id:"auth",label:"Authentication",weight:.5,kind:"single",condition:{slot:"backend",equals:["dynamic","unsure"]}},{id:"notifications",label:"Notifications",weight:.35,kind:"single",optional:!0},{id:"store",label:"Distribution",weight:.35,kind:"single",optional:!0},{id:"design_direction",label:"Design direction",weight:.5,kind:"single"},...R],jt=[{id:"goal",label:"What you need",weight:.9,kind:"single"},{id:"problem",label:"The problem / code",weight:.85,kind:"text"},{id:"language",label:"Language / runtime",weight:.8,kind:"single"},{id:"context",label:"Codebase context",weight:.6,kind:"single"},{id:"error",label:"Error details",weight:.7,kind:"text",condition:{slot:"goal",equals:["debug","fix","review"]}},{id:"constraints",label:"Constraints",weight:.5,kind:"multi"},{id:"output_shape",label:"Answer form",weight:.5,kind:"single"},{id:"level",label:"Explanation depth",weight:.4,kind:"single",optional:!0},...R],Ot=[{id:"content_type",label:"Content type",weight:.92,kind:"single"},{id:"topic",label:"Topic",weight:.85,kind:"text"},{id:"audience",label:"Target audience",weight:.85,kind:"single"},{id:"purpose",label:"Purpose / goal",weight:.65,kind:"single"},{id:"tone",label:"Tone",weight:.65,kind:"single"},{id:"length",label:"Length",weight:.6,kind:"single"},{id:"structure",label:"Structure",weight:.5,kind:"single"},{id:"must_include",label:"Must include",weight:.55,kind:"text",optional:!0},{id:"must_avoid",label:"Must avoid",weight:.4,kind:"text",optional:!0},{id:"language_out",label:"Output language",weight:.45,kind:"single",optional:!0},{id:"source_language",label:"Source language",weight:.6,kind:"single",condition:{slot:"intent_kind",equals:["translate"]}},{id:"register",label:"Register",weight:.5,kind:"single",condition:{slot:"intent_kind",equals:["translate"]}},...R],$t=[{id:"question",label:"Research question",weight:.95,kind:"text"},{id:"scope",label:"Scope",weight:.85,kind:"single"},{id:"decision",label:"Decision it informs",weight:.7,kind:"text"},{id:"depth",label:"Depth",weight:.6,kind:"single"},{id:"sources",label:"Source expectations",weight:.6,kind:"multi"},{id:"recency",label:"Recency",weight:.5,kind:"single"},{id:"geography",label:"Geography / market",weight:.45,kind:"single",optional:!0},{id:"output_format",label:"Output format",weight:.5,kind:"single"},...R],Dt=[{id:"subject",label:"Main subject",weight:.95,kind:"text"},{id:"style",label:"Visual style",weight:.85,kind:"single"},{id:"composition",label:"Composition",weight:.6,kind:"single"},{id:"environment",label:"Environment",weight:.6,kind:"single"},{id:"lighting",label:"Lighting / mood",weight:.5,kind:"single"},{id:"aspect_ratio",label:"Aspect ratio",weight:.55,kind:"single"},{id:"purpose",label:"Intended use",weight:.5,kind:"single"},{id:"palette",label:"Palette",weight:.4,kind:"single",optional:!0},{id:"text_in_image",label:"Text in the image",weight:.3,kind:"text",optional:!0}],Ht=[{id:"goal",label:"Business goal",weight:.95,kind:"single"},{id:"offering",label:"Product / offering",weight:.85,kind:"text"},{id:"market",label:"Market / audience",weight:.8,kind:"single"},{id:"stage",label:"Stage",weight:.6,kind:"single"},{id:"timeframe",label:"Timeframe",weight:.6,kind:"single"},{id:"budget",label:"Budget / resources",weight:.5,kind:"single",optional:!0},{id:"constraints",label:"Constraints",weight:.5,kind:"multi"},{id:"output_shape",label:"Deliverable",weight:.6,kind:"single"},...R],Ft=[{id:"topic",label:"Topic",weight:.95,kind:"text"},{id:"level",label:"Current level",weight:.85,kind:"single"},{id:"goal",label:"Learning goal",weight:.75,kind:"single"},{id:"depth",label:"Depth",weight:.55,kind:"single"},{id:"style",label:"Explanation style",weight:.5,kind:"single"},{id:"timeframe",label:"Time available",weight:.45,kind:"single",optional:!0},{id:"language_out",label:"Output language",weight:.4,kind:"single",optional:!0},...R],Wt=[{id:"goal",label:"Objective",weight:.85,kind:"text"},{id:"context",label:"Context",weight:.6,kind:"text",optional:!0},{id:"output_format",label:"Expected output",weight:.6,kind:"single"},{id:"audience",label:"Audience",weight:.45,kind:"single",optional:!0},{id:"depth",label:"Depth",weight:.45,kind:"single",optional:!0},...R],le={website:zt,software:It,mobile:qt,coding:jt,writing:Ot,research:$t,image:Dt,business:Ht,education:Ft,general:Wt},je=new Map;function _(n){let t=je.get(n);if(t)return t;let e=new Set,i=[];for(let o of le[n]??le.general)e.has(o.id)||(e.add(o.id),i.push(o));return je.set(n,i),i}function Oe(n,t){return _(n).find(e=>e.id===t)}function B(n,t){return Oe(n,t)?.label??$e(t)}function $e(n){let t=n.replace(/[_.-]+/g," ").trim();return t===""?n:t.charAt(0).toUpperCase()+t.slice(1)}var G=new Set(["features","feature","purpose","goal","problem","question","subject","topic","content_type","offering","scope","output_shape","interfaces"]),ce=new Set(["constraints","deadline","budget","tech_stack","framework","language","deployment","scale","timeframe","recency","palette"]),de=new Set(["audience","market","recipient","level"]),ue=new Set(["output_format","output_shape","format","length","structure","depth","style","deliverable","store","aspect_ratio"]),pe=new Set(["platform","language","framework","tech_stack","backend","database","auth","data_storage","mobile_os","deployment","testing","interfaces","notifications","context","error"]);function A(n){return n.replace(/\s+/g," ").trim()}var Bt=/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0eff\u1000-\u109f\u1780-\u17ff]/;function O(n){let t=n.trim();if(t==="")return 0;let e=0;for(let i of t.split(/\s+/))Bt.test(i)?e+=Math.max(1,Math.ceil(Array.from(i).length/2)):e+=1;return e}function U(n,t){let e=n.trim();return e.length<=t?e:`${e.slice(0,Math.max(0,t-1)).trimEnd()}\u2026`}function N(n){return n===void 0?[]:Array.isArray(n)?n:[n]}var me=0;function ge(n="a"){return me=(me+1)%1e6,`${n}-${Date.now().toString(36)}-${me.toString(36)}`}function S(n,t,e){return Math.min(e,Math.max(t,n))}function T(n){return S(Math.round(n),0,100)}var Ut="english|hindi|spanish|french|german|japanese|chinese|mandarin|arabic|portuguese|russian|korean|italian|tamil|telugu|bengali|marathi|urdu|dutch|turkish|polish",b=n=>n.toLowerCase().trim(),z=n=>n.trim(),Qt=[{slot:"output_format",re:/\b(?:as|in|into|using)\s+(?:a\s+)?(bullet points?|bullets|a table|table|markdown|json|csv|yaml|a list|list|plain text|paragraphs?|an essay|a report|slides?|deck|a spreadsheet|pdf|docx|html|code)\b/i,group:1,confidence:.8,normalize:b},{slot:"deadline",re:/\b(?:by|before|within|in|due)\s+(tomorrow|today|tonight|next week|next month|this week|this month|the weekend|\d+\s*(?:days?|weeks?|months?|hours?))/i,group:1,confidence:.8,normalize:b},{slot:"budget",re:/(?:[$£€₹]|rs\.?|inr|usd|eur|gbp)\s?\d[\d,.]*\s?(?:k|thousand|million|lakh|crore)?|\b\d[\d,.]*\s?(?:dollars|rupees|euros|usd|inr)\b/i,group:0,confidence:.85,normalize:z},{slot:"audience",re:/\b(?:for|aimed at|targeting|target(?:ed)? (?:at|audience:?)|used by|written for|meant for|audience:?)\s+(?:(?:my|our|the|a|an)\s+)?((?:[a-z0-9'-]+\s+){0,2}(?:beginners?|newbies|students?|kids|children|teens|teenagers|adults|professionals|developers?|engineers?|designers?|founders?|executives?|managers?|investors?|recruiters?|customers?|clients?|users?|readers?|general public|small business(?:es)?|enterprises?|internal teams?|team))\b/i,group:1,confidence:.8,normalize:b},{slot:"audience",re:/\b(?:written\s+)?for\s+((?:(?:first[- ]time|new|existing|prospective|potential|aspiring|small|large|senior|junior|non[- ]technical)\s+)?(?:home\s+|prospective\s+)?[a-z][a-z0-9'-]*(?:\s+(?!in\b|at\b|with\b|that\b|who\b|about\b|on\b|by\b|from\b)[a-z][a-z0-9'-]*){0,3})\s*(?:[,;:.]|\s+(?:in|at|with|that|who|about|on|by|from)\b|$)/i,group:1,confidence:.55,normalize:b},{slot:"language_out",re:new RegExp(`\\b(?:in|into|to)\\s+(${Ut})\\b`,"i"),group:1,confidence:.85,normalize:b},{slot:"level",re:/\b(beginner|intermediate|advanced|expert|newbie|no (?:prior )?experience|from scratch|eli5|five[- ]year[- ]old|just starting)\b/i,group:1,confidence:.8,normalize:b},{slot:"depth",re:/\b(brief|quick|short|concise|detailed|in-?depth|comprehensive|exhaustive|thorough|deep dive)\b(?:\s+(?:overview|analysis|summary|report|answer|guide|explanation))?/i,group:1,confidence:.65,normalize:b},{slot:"tone",re:/\b(formal|informal|casual|friendly|professional|playful|witty|serious|empathetic|confident|humble|persuasive|neutral|enthusiastic|sarcastic|humorous|warm|direct|bold)\b(?:\s+tone)?/i,group:1,confidence:.75,normalize:b},{slot:"length",re:/\b((?:\d[\d,]*\s*-?\s*(?:words?|pages?|slides?|paragraphs?|sentences?|lines?|characters?))|one[- ]page|single[- ]page|two[- ]pages?|short|long)\b/i,group:1,confidence:.7,normalize:b},{slot:"geography",re:/\b(?:in|for|across|targeting)\s+(india|the us|the usa|usa|us|america|europe|asia|africa|uk|britain|canada|australia|germany|france|japan|china|singapore|dubai|uae|mumbai|delhi|bangalore|bengaluru|hyderabad|pune|new york|london|global|worldwide)\b/i,group:1,confidence:.75,normalize:b},{slot:"recency",re:/\b(last|past|recent)\s+(week|month|quarter|year|five years|decade|\d+ (?:days|weeks|months|years))|\b(?:20\d\d)\b|\blatest\b|\bcurrent\b/i,group:0,confidence:.6,normalize:z},{slot:"timeframe",re:/\b(\d+\s*(?:days?|weeks?|months?|years?)|a (?:day|week|month|year)|weekend|this (?:week|month|quarter|year)|next quarter|q[1-4])\b/i,group:1,confidence:.7,normalize:b},{slot:"constraints",re:/\b(no (?:backend|database|login|auth\w*|javascript|js|framework|dependencies)|must (?:be|run|work|not)\b[^.,;]{0,40}|offline(?:[- ]first)?|without (?:a )?(?:backend|database|login|auth\w*)|single[- ]file|vanilla|lightweight|mobile[- ]first|accessible|a11y|seo[- ]friendly|gdpr|hipaa)\b/i,group:0,confidence:.7,multi:!0,normalize:b},{slot:"output_shape",re:/\b(complete (?:runnable |working )?(?:project|app|application|codebase|website|site)|full (?:project|codebase|implementation)|whole (?:project|thing)|single file|one file|just the code|code only|snippet|architecture|design only|plan only|production[- ]ready|working example|boilerplate|scaffold|end[- ]to[- ]end)\b/i,group:0,confidence:.8,normalize:b},{slot:"testing",re:/\b(unit tests?|integration tests?|e2e|end[- ]to[- ]end tests?|test suite|with tests|no tests)\b/i,group:0,confidence:.8,normalize:b},{slot:"site_type",re:/\b(landing page|marketing site|portfolio|blog|e-?commerce|online store|shop|saas|dashboard|web app|webapp|documentation site|docs site|wiki|forum|community site|booking site|news site|personal site|brochure site|admin panel|marketplace)\b/i,group:1,confidence:.8,normalize:b},{slot:"pages",re:/\b(home|homepage|about|about us|services?|products?|pricing|contact|blog|faq|careers|testimonials?|gallery|portfolio|checkout|cart|signup|sign[- ]up|login|terms|privacy|dashboard|settings) pages?\b|\b(?:pages?|screens?):\s*([^.]+)/i,group:0,confidence:.7,multi:!0,normalize:b},{slot:"design_direction",re:/\b(minimal(?:ist)?|brutalist|swiss|editorial|corporate|playful|bold|clean|modern|elegant|luxur\w+|premium|dark mode|light mode|glassmorph\w+|material|flat design|bento|retro|maximalist|monochrome|neubrutalism|immersive|3d)\b(?:\s+(?:design|look|style|aesthetic|theme))?/i,group:1,confidence:.7,normalize:b},{slot:"features",re:/\b(auth\w*|login|sign[- ]in|sign[- ]up|payments?|stripe|razorpay|checkout|cart|search|filters?|notifications?|chat|comments?|likes?|reviews?|ratings?|analytics|dashboard|admin panel|cms|blog|newsletter|subscriptions?|multi[- ]?language|i18n|dark mode|upload|file (?:upload|storage)|booking|calendar|map|geolocation|export|csv export|api|webhooks?|integrations?|referrals?|coupons?|invoices?|onboarding)\b/i,group:1,confidence:.7,multi:!0,normalize:b},{slot:"tech_stack",re:/\b(next\.?js|nuxt|sveltekit|astro|gatsby|remix|react|vue|angular|svelte|solidjs|wordpress|shopify|webflow|framer|html|css|tailwind|bootstrap|django|flask|fastapi|rails|laravel|express|node\.?js|php|astro)\b/i,group:1,confidence:.85,normalize:b},{slot:"backend",re:/\b(no backend|static site|static|serverless|supabase|firebase|node backend|python backend|django|flask|fastapi|lambdas?|cloudflare workers?|appwrite|pocketbase|hasura)\b/i,group:0,confidence:.7,normalize:b},{slot:"auth",re:/\b(no (?:login|auth\w*|accounts?)|google (?:sign[- ]in|oauth)|github (?:sign[- ]in|oauth)|magic link|otp|jwt|email\/password|email and password|sso|oauth|passwordless|2fa)\b/i,group:0,confidence:.75,normalize:b},{slot:"database",re:/\b(postgres(?:ql)?|mysql|sqlite|mongo(db)?|redis|supabase|firebase|dynamodb|planet ?scale|neon|prisma|drizzle)\b/i,group:0,confidence:.8,normalize:b},{slot:"deployment",re:/\b(vercel|netlify|cloudflare|aws|gcp|azure|heroku|railway|render|digitalocean|fly\.io|github pages|self[- ]host\w*|docker)\b/i,group:0,confidence:.75,normalize:b},{slot:"platform",re:/\b(web|browser|cli|command[- ]line|desktop|server|backend|api|mobile|android|ios|macos|windows|linux|browser extension|chrome extension|vscode extension|slack bot|discord bot|telegram bot|whatsapp bot)\b/i,group:1,confidence:.75,normalize:b,multi:!0},{slot:"language",re:/\b(python|javascript|typescript|java|kotlin|swift|golang|go|rust|c\+\+|c#|csharp|php|ruby|scala|dart|sql|bash|shell|powershell|haskell|elixir|erlang|clojure|lua|r)\b/i,group:1,confidence:.85,normalize:b,multi:!0,only:["software","coding","website","mobile","general"]},{slot:"framework",re:/\b(react|next\.?js|vue|nuxt|svelte|angular|django|flask|fastapi|spring|laravel|rails|express|nest\.?js|node\.?js|flutter|react native|jetpack compose|swiftui|tailwind|bootstrap|dotnet|\.net|pandas|numpy|polars|pytorch|tensorflow|scikit-?learn|electron|tauri|expo)\b/i,group:1,confidence:.85,normalize:b,only:["software","coding","website","mobile"]},{slot:"data_storage",re:/\b(postgres(?:ql)?|mysql|sqlite|mongo(db)?|redis|dynamodb|firestore|supabase|json file|csv file|in[- ]memory|localstorage|no (?:database|storage|persistence))\b/i,group:0,confidence:.75,normalize:b,only:["software"]},{slot:"interfaces",re:/\b(rest api|graphql|grpc|webhook\w*|websocket\w*|cli|http api|openapi|swagger|message queue|kafka|rabbitmq|sdk)\b/i,group:0,confidence:.8,normalize:b,multi:!0,only:["software"]},{slot:"mobile_os",re:/\b(android|ios|iphone|ipad|both platforms|cross[- ]platform)\b/i,group:1,confidence:.85,normalize:b,only:["mobile"]},{slot:"context",re:/\b(in my (?:existing )?(?:codebase|project|repo)|existing (?:app|code|project)|legacy|monorepo|typescript project|next\.?js app|django project|already have)\b/i,group:0,confidence:.7,normalize:z,only:["coding"]},{slot:"error",re:/\b(error|exception|traceback|stack ?trace|typeerror|valueerror|nullpointer|segfault|500|404|crash(?:es|ing)?|fails? (?:with|when))\b/i,group:0,confidence:.7,normalize:z,only:["coding"]},{slot:"content_type",re:/\b(blog post|article|essay|story|poem|email|e-?mail|letter|cover letter|speech|newsletter|caption|thread|press release|whitepaper|case study|product description|resume|cv|bio|landing copy|ad copy|tagline|readme|documentation|docstring|changelog|proposal|report|guide|tutorial)\b/i,group:1,confidence:.85,normalize:b,only:["writing"]},{slot:"purpose",re:/\b(?:to|in order to|so (?:that|it can))\s+(apply|apologi[sz]e|request|inform|announce|invite|thank|follow up|pitch|sell|promote|introduce|remind|congratulate|resign|negotiate|convert|educate|persuade|rank|launch|sell|generate leads?|build trust)\b/i,group:1,confidence:.7,normalize:b,only:["writing","research"]},{slot:"must_avoid",re:/\b(?:no|avoid|without|don't use|do not use|never use)\s+((?:[a-z-]+\s+){0,2}(?:jargon|buzzwords?|clich[eé]s?|slang|emojis?|technical terms?|fluff|filler))\b/i,group:1,confidence:.7,normalize:b},{slot:"must_include",re:/\b(?:must|should|needs? to|has to|make sure to|be sure to)\s+(?:include|mention|cover|contain|address|explain)\s+([^.,;]{3,60})/i,group:1,confidence:.6,normalize:z},{slot:"structure",re:/\b(?:with\s+(?:an?\s+)?)?((?:intro\w*|introduction|checklist|sections?|headings?|subheadings?|bullet points?|numbered list|tl;?dr|summary|conclusion|call to action|cta|table|steps?)(?:\s+(?:at|in)\s+the\s+(?:top|end|beginning))?)/i,group:1,confidence:.65,normalize:b,only:["writing"]},{slot:"sources",re:/\b(peer[- ]reviewed|academic|scholarly|citations?|cite|references|research papers|studies|official docs|documentation|news articles|primary sources|recent studies)\b/i,group:0,confidence:.75,normalize:b,multi:!0,only:["research"]},{slot:"scope",re:/\b(pricing|features?|alternatives|competitors?|market (?:size|share|trends?)|adoption|performance|security|reliability|cost of ownership|total cost|integration|ecosystem|developer experience|community|roadmap)\b/i,group:0,confidence:.65,normalize:b,multi:!0,only:["research"]},{slot:"style",re:/\b(photorealistic|photo ?real|realistic|cartoon|anime|watercolou?r|oil painting|pixel art|3d render|render|line art|flat design|flat illustration|minimal(?:ist)?|modern|vintage|retro|cyberpunk|steampunk|isometric|cinematic|abstract|art deco|bauhaus|low poly|vector|claymation|ukiyo-?e|comic|sketch|concept art)\b(?:\s+(?:style|look|aesthetic))?/i,group:1,confidence:.8,normalize:b,only:["image"]},{slot:"lighting",re:/\b(studio lighting|golden hour|natural light|low light|neon|backlit|soft light|dramatic lighting|harsh shadows|moody|bright|blue hour|rim light|candle ?light|sunset|sunrise|overcast)\b/i,group:1,confidence:.75,normalize:b,only:["image"]},{slot:"aspect_ratio",re:/\b(\d+:\d+|\d+x\d+|square|portrait|landscape|widescreen|vertical|horizontal)\b/i,group:1,confidence:.8,normalize:b,only:["image"]},{slot:"environment",re:/\b(?:in|on|at|inside)\s+(?:a|an|the)\s+([a-z][a-z \-]{2,28})/i,group:1,confidence:.55,normalize:b,only:["image"]},{slot:"composition",re:/\b(close[- ]up|wide shot|full body|portrait|headshot|top[- ]down|bird'?s[- ]eye|low angle|high angle|centered|symmetrical|rule of thirds|macro|panorama)\b/i,group:1,confidence:.75,normalize:b,only:["image"]},{slot:"palette",re:/\b(pastel|monochrome|black and white|sepia|vibrant|muted|earthy|neon colors?|warm tones?|cool tones?|duotone)\b/i,group:1,confidence:.7,normalize:b,only:["image"]},{slot:"stage",re:/\b(idea stage|idea|mvp|prototype|pre[- ]launch|launched|early stage|growth stage|scaling|established|series [a-c]|seed)\b/i,group:1,confidence:.7,normalize:b,only:["business"]},{slot:"market",re:/\b(?:for|targeting|serving)\s+(small business(?:es)?|smbs?|enterprises?|consumers?|b2b|b2c|developers?|students?|freelancers?|agencies|creators?|restaurants?|retailers?|healthcare|education|fintech)\b/i,group:1,confidence:.75,normalize:b,only:["business"]},{slot:"style",re:/\b(with examples?|analogy|analogies|step[- ]by[- ]step|visual|hands[- ]on|exercises?|quiz|flashcards?|diagram)\b/i,group:0,confidence:.6,normalize:b,only:["education"]}],De=/\b(really|cool|nice|good|great|amazing|awesome|better|best|modern|professional|attractive|simple|clean|beautiful|pretty|fancy|slick|powerful|robust|scalable|efficient|smart|seamless|intuitive|user[- ]friendly|top[- ]notch|world[- ]class|cutting[- ]edge|next[- ]gen|innovative|ultimate|perfect)\b/gi,Kt="app|application|website|web app|webapp|site|landing page|dashboard|tool|platform|bot|extension|plugin|system|service|api|tracker|store|shop|game|portal|marketplace|portfolio|blog|chatbot|assistant|agent|crm|erp|saas|clone",Vt=new RegExp(`([a-z][a-z0-9'\\-]*(?:\\s+[a-z][a-z0-9'\\-]*){0,3})\\s+(${Kt})\\b`,"i"),Yt=/\b(blog post|post|letter|cover letter|essay|article|email|e-?mail|story|poem|guide|report|proposal|plan|script|speech|newsletter|caption|documentation|readme|blog)\b/i,Jt=new RegExp("^(?:"+["i\\s+(?:really\\s+)?(?:want|need|would\\s+like|'d\\s+like|am\\s+looking\\s+for)","we\\s+(?:want|need|are\\s+looking\\s+for)","can\\s+you|could\\s+you|would\\s+you|please|pls|help\\s+me|for\\s+me","build|make|create|develop|design|write|draft|compose|generate|implement|launch|ship|add","me|us|a|an|the|our|my|your|their|some|any","really|very|super|just|also|new|simple|nice|cool|good|great|amazing|awesome|best|small|big|quick|modern|professional|clean|beautiful|fancy|slick"].join("|")+")(?:\\s+|$)","i"),Zt=/\b(?:image|picture|photo|photograph|illustration|drawing|artwork|render|logo|icon|poster|banner|wallpaper|avatar|sketch|painting)\s+(?:of|for|showing|with|featuring)\s+(?:a|an|the|my|our)?\s*([a-z0-9][a-z0-9 '\-]{1,42})/i;function He(n){let t=A(n),e=Zt.exec(t);if(e?.[1]){let l=e[1].replace(/\b(in|with|on|at|for|that|which|using|and then|style|photorealistic|cartoon)\b.*$/i,"").replace(/[.,;!?]+$/,"").trim();if(l!==""&&l.split(" ").length<=6)return{subject:l,domain:l,category:"image"}}let i=Vt.exec(t);if(!i)return{subject:"",domain:"",category:""};let o=(i[1]??"").trim(),s=(i[2]??"").trim().toLowerCase();for(let l=0;l<6;l+=1){let c=o.replace(Jt,"");if(c===o)break;o=c}let r=o.replace(De," ").replace(/\s+/g," ").trim();return r.split(" ").filter(Boolean).length===0?{subject:s,domain:"",category:s}:{subject:r===""?s:`${r} ${s}`,domain:r,category:s}}function he(n){let t=A(n),e=/\b(?:about|on|regarding|covering|explaining|discussing|understanding|learn|study|teach(?:\s+me)?)\s+([A-Za-z][A-Za-z0-9 &'’\-]{2,44})/i.exec(t);if(e?.[1])return e[1].replace(/\b(in|with|that|which|using|and then)\b.*$/i,"").trim();let i=/^\W*(?:please\s+)?(?:explain|describe|teach me|help me understand|walk me through)\s+(.{3,60})$/i.exec(t);return i?.[1]?i[1].replace(/[.?!]+$/,"").replace(/\b(in|with|that|which|using|and then|for me)\b.*$/i,"").trim():""}var Xt=[{kind:"vague-noun",re:/\b(something|anything|stuff|things|whatever|some kind of|a thing|etc\.?|and so on|you know)\b/i,severity:.9},{kind:"vague-adjective",re:De,severity:.55},{kind:"hedge",re:/\b(maybe|kind of|sort of|idk|i don'?t know|not sure|probably|perhaps|or whatever)\b/i,severity:.6},{kind:"unbounded",re:/\b(as (?:much|many|long|detailed) as possible|no limit|unlimited|as needed|sky'?s the limit)\b/i,severity:.5}];function Q(n){let t=[];for(let e of Xt){let i=new RegExp(e.re.source,e.re.flags.includes("g")?e.re.flags:`${e.re.flags}g`),o,s=0;for(;(o=i.exec(n))!==null&&s<8;)s+=1,t.push({kind:e.kind,evidence:o[0].trim(),severity:e.severity}),o.index===i.lastIndex&&(i.lastIndex+=1)}if(t.length>3)for(let e of t)e.severity=Math.min(1,e.severity+.05);return t}var en=[{id:"short-vs-detailed",a:/\b(short|brief|concise|one[- ]page|tl;?dr|quick|minimal)\b/i,b:/\b(detailed|comprehensive|in-?depth|thorough|exhaustive|everything|complete guide)\b/i,description:"The request asks for a short result and a comprehensive one at the same time.",question:"You asked for something short and something comprehensive \u2014 which should win?"},{id:"simple-vs-rich",a:/\b(simple|minimal|bare[- ]bones|mvp|basic|lightweight)\b/i,b:/\b(full[- ]featured|rich|advanced|everything|enterprise|complete)\b/i,description:"The request asks for a minimal build and a feature-rich one at the same time.",question:"Should this stay minimal, or include the full feature set?"},{id:"cheap-vs-premium",a:/\b(cheap|budget|low[- ]cost|free|inexpensive|affordable)\b/i,b:/\b(premium|luxur\w+|high[- ]end|enterprise|best[- ]in[- ]class|expensive)\b/i,description:"The request asks for both a low-cost and a premium outcome.",question:"Budget or premium quality \u2014 which matters more here?"},{id:"no-backend-vs-login",a:/\b(no|without) (?:a )?(backend|database|server)\b/i,b:/\b(login|sign[- ]?in|sign[- ]?up|accounts?|users? can (?:save|log ?in)|authentication)\b/i,description:"Login and saved data were requested, but no backend or database was allowed.",question:"You ruled out a backend but asked for logins \u2014 how should accounts work?"},{id:"static-vs-dynamic",a:/\b(static site|static|plain html|no javascript|vanilla html)\b/i,b:/\b(react|next\.?js|vue|angular|svelte|dynamic|real[- ]time|dashboard)\b/i,description:"A static/no-JavaScript constraint conflicts with the requested framework or behaviour.",question:"Static HTML or a JavaScript framework \u2014 which constraint is firm?"},{id:"dark-vs-light",a:/\b(dark (?:mode|theme)|black background)\b/i,b:/\b(light (?:mode|theme)|white background|bright)\b/i,description:"Both a dark and a light visual direction were requested.",question:"Dark or light as the primary theme?"},{id:"free-vs-paid",a:/\b(free|no cost|open source)\b/i,b:/\b(paid|subscription|monetis\w+|monetiz\w+|charge|pricing tiers?)\b/i,description:"The request asks for both a free and a paid/monetised product.",question:"Is this free, or does it need a paid tier?"}];function fe(n){let t=[];for(let e of en){let i=e.a.exec(n),o=e.b.exec(n);i&&o&&t.push({id:e.id,description:e.description,evidence:[i[0].trim(),o[0].trim()],question:e.question})}return t}function be(n,t){let e=A(n),i=new Set(_(t).map(d=>d.id)),o=new Set(["output_format","deadline","budget","audience","language_out","level","depth","tone","length","geography","recency","timeframe","constraints","output_shape","must_include","must_avoid","topic"]),s=[],r={};for(let d of Qt){if(d.only&&!d.only.includes(t)||!i.has(d.slot)&&!o.has(d.slot))continue;let m=[];if(d.multi){let p=new RegExp(d.re.source,d.re.flags.includes("g")?d.re.flags:`${d.re.flags}g`),y,x=0;for(;(y=p.exec(e))!==null&&x<12;){x+=1;let E=y[d.group??0]??y[0]??"",v=(d.normalize??z)(E);v!==""&&m.push({value:v,evidence:y[0].trim()}),y.index===p.lastIndex&&(p.lastIndex+=1)}}else{let p=d.re.exec(e);if(p){let y=p[d.group??0]??p[0]??"",x=(d.normalize??z)(y);x!==""&&m.push({value:x,evidence:p[0].trim()})}}if(m.length===0)continue;let h=r[d.slot];if(d.multi){let p=new Set([...Array.isArray(h)?h:h?[h]:[],...m.map(y=>y.value)]);r[d.slot]=Array.from(p)}else h===void 0&&(r[d.slot]=m[0].value);s.push({slot:d.slot,value:d.multi?m.map(p=>p.value):m[0].value,confidence:d.confidence,evidence:m.map(p=>p.evidence).join(" \xB7 ").slice(0,160)})}let a=He(e),l=/\b(translate|translation|localise|localize|transliterate)\b/i.exec(e)?"translate":/\b(fix|debug|repair|traceback|exception|typeerror|stack ?trace)\b/i.test(e)?"debug":/\b(draw|illustrate|render|paint|sketch|photo|image of|picture of)\b/i.test(e)?"illustrate":"";a.intent=l;let c=/\b(build|make|create|develop|design|launch|need|want|plan|write|draft|research)\b/i.exec(e),u=t!=="coding"&&c!==null&&a.subject!=="";if(r.purpose===void 0&&u){let d=_(t).find(m=>m.id==="purpose"||m.id==="goal");if(d&&r[d.id]===void 0){let m=c[1].toLowerCase()==="want"||c[1].toLowerCase()==="need"?a.subject:`${c[1].toLowerCase()} ${a.subject}`;r[d.id]=m,s.push({slot:d.id,value:m,confidence:.6,evidence:a.subject})}}if(r.topic===void 0&&i.has("topic")){let d=he(e);if(d!==""&&d.split(" ").length<=6)r.topic=d.toLowerCase(),s.push({slot:"topic",value:d.toLowerCase(),confidence:.65,evidence:d});else if(a.subject!==""&&!Yt.test(a.subject)){let m=a.subject.toLowerCase();r.topic||(r.topic=m,s.push({slot:"topic",value:m,confidence:.5,evidence:a.subject}))}else if(a.subject!==""&&r.audience!==void 0){let m=r.audience,h=(Array.isArray(m)?m[0]:m)??"";h!==""&&!r.topic&&(r.topic=h,s.push({slot:"topic",value:h,confidence:.5,evidence:`audience: ${h}`}))}}if(i.has("topic")&&r.topic===void 0){let d=he(e);d!==""&&(r.topic=d,s.push({slot:"topic",value:d,confidence:.6,evidence:d}))}if(i.has("subject")&&r.subject===void 0&&a.domain!==""&&(r.subject=a.subject,s.push({slot:"subject",value:a.subject,confidence:.6,evidence:a.domain})),r.topic===void 0||r.topic===""){let d=/["“'']([^"”'']{2,80})["”'']/.exec(e);if(d?.[1]&&i.has("topic")){let m=d[1].trim();r.topic=m,s.push({slot:"topic",value:m,confidence:.6,evidence:e.slice(0,40)})}}l!==""&&(r.intent_kind=l);let g=[["topic","subject","question","problem"],["purpose","goal","objective"]];for(let d of g){let m=d.find(y=>r[y]!==void 0&&r[y]!=="");if(m===void 0)continue;let h=r[m],p=Array.isArray(h)?h.join(", "):h;for(let y of d)y===m||!i.has(y)&&!o.has(y)||r[y]!==void 0&&r[y]!==""||_(t).find(E=>E.id===y)?.kind!=="text"||(r[y]=p,s.push({slot:y,value:p,confidence:.55,evidence:`derived from ${m}`}))}if(i.has("goal")&&(r.goal===void 0||r.goal==="")){let d=/\b(fix(?:ing)?|debug(?:ging)?|repair|why (?:does|is|do)|explain|refactor|optimi[sz]e|review|write tests?|add tests?|test|build|write|implement|port|migrate)\b/i.exec(e),m={fix:"fix",fixing:"fix",repair:"fix",debug:"debug",debugging:"debug","why does":"debug","why is":"debug","why do":"debug",explain:"explain",refactor:"refactor",optimize:"refactor",optimise:"refactor",review:"review","write tests":"test","add tests":"test",test:"test",build:"write",write:"write",implement:"write",port:"write",migrate:"write"},h=d?.[1]?.toLowerCase(),p=h?m[h]:void 0;p&&(r.goal=p,s.push({slot:"goal",value:p,confidence:.7,evidence:d[0]}))}if(i.has("error")&&(r.error===void 0||r.error===""||r.error==="error")){let d=/((?:type|value|name|key|index|attribute|import|syntax|runtime)?error|[A-Z][a-zA-Z]*(?:Error|Exception))\s*:?\s*([^.]{0,80})|\b(?:traceback|stack ?trace)\b/i.exec(e);if(d){let m=A(d[0]).slice(0,120);r.error=m,s.push({slot:"error",value:m,confidence:.7,evidence:m})}}if(i.has("problem")&&(r.problem===void 0||r.problem==="")){let d=/```|\b(def |class |function |import |const |let |>\s*\d|\$ )/.test(n),m=r.error!==void 0;if(d||m){let h=A(n).slice(0,280);r.problem=h,s.push({slot:"problem",value:h,confidence:d?.75:.6,evidence:h.slice(0,80)})}}let f={react:"typescript",next:"typescript",nuxt:"typescript",vue:"typescript",svelte:"typescript",angular:"typescript",express:"typescript",nest:"typescript","node.js":"typescript",nodejs:"typescript",tailwind:"typescript",django:"python",flask:"python",fastapi:"python",pandas:"python",laravel:"php",rails:"ruby",spring:"java",flutter:"dart","react native":"typescript",expo:"typescript",swiftui:"swift"};if(r.language===void 0&&typeof r.framework=="string"){let d=f[String(r.framework).toLowerCase()];d&&(r.language=d,s.push({slot:"language",value:d,confidence:.6,evidence:`implied by ${String(r.framework)}`}))}return{fields:r,detected:s,subject:a}}var nn=[{id:"finance-tracking",match:/\b(expense|spending|budget|finance|financial|money|wallet|invoice|billing|accounting|tax|payroll|salary|savings?|investment)\b/i,label:"finance",features:["Monthly spending analytics","Budget limits and alerts","Receipt scanning","Category-wise expense tracking","Shared or family accounts","Export to CSV or spreadsheets"],purpose:["Track where my money goes","Stay inside a monthly budget","Split costs with other people","Prepare records for tax or accounts"],pages:["Dashboard","Transactions list","Add expense","Reports","Settings"],audience:["Just me","My household or family","A small team","Freelance clients"]},{id:"commerce",match:/\b(shop|store|storefront|e-?commerce|marketplace|checkout|cart|product catalogue|product catalog|retail|merch)\b/i,label:"store",features:["Product catalogue with search and filters","Cart and checkout","Payment gateway integration","Order tracking for customers","Admin panel for inventory","Discount codes and coupons"],purpose:["Sell products online","Show a catalogue and take enquiries","Manage orders and inventory"],pages:["Home","Product listing","Product detail","Cart","Checkout","Order confirmation"],audience:["Direct consumers","Small businesses","Wholesale buyers"]},{id:"content-blog",match:/\b(blog|magazine|news|publication|newsletter|articles?|cms|content site|docs site|documentation site|wiki)\b/i,label:"publication",features:["Article editor with drafts","Categories and tags","Search","Email newsletter signup","Comments","Author profiles"],purpose:["Publish regular articles","Share documentation","Build an audience"],pages:["Home","Article page","Category archive","About","Search results","Subscribe"],audience:["General readers","Professionals in the field","Existing customers"]},{id:"booking",match:/\b(booking|reservation|appointment|scheduling|hotel|restaurant table|salon|clinic|tickets?)\b/i,label:"booking",features:["Availability calendar","Booking and cancellation flow","Email or SMS confirmations","Payment or deposit collection","Staff or resource management","Admin view of all bookings"],purpose:["Let customers book online","Reduce phone bookings","Manage staff schedules"],pages:["Home","Availability / calendar","Booking form","Confirmation","My bookings","Admin"],audience:["Customers booking online","Staff managing bookings"]},{id:"productivity",match:/\b(todo|to-do|task|note|notes|habit|journal|productivity|reminder|planner|kanban|project management|time tracking)\b/i,label:"tracker",features:["Create and organise items","Due dates and reminders","Tags or categories","Progress and streak tracking","Search and filters","Sync across devices"],purpose:["Keep myself organised","Share with a team","Build a daily habit"],pages:["Today","All items","Item detail","Stats","Settings"],audience:["Just me","A small team","Students"]},{id:"social",match:/\b(social|feed|chat|messaging|community|forum|dating|friends|followers|posts? app|comments?)\b/i,label:"social app",features:["Profiles","Posts and a feed","Likes and comments","Direct messages","Follow / friend requests","Notifications"],purpose:["Connect people around a topic","Let users share updates","Build a community"],pages:["Feed","Profile","Post detail","Messages","Notifications"],audience:["Early adopters","A specific community"]},{id:"health-fitness",match:/\b(fitness|workout|gym|health|calorie|diet|nutrition|sleep|meditation|yoga|running|step)\b/i,label:"fitness app",features:["Workout logging","Progress charts","Goal setting","Reminders","Exercise library","Apple Health / Google Fit sync"],purpose:["Track workouts consistently","Hit a specific fitness goal","Follow a plan"],audience:["Beginners","Regular gym-goers","Personal trainers"]},{id:"learning",match:/\b(learn|course|lms|study|quiz|flashcard|tutor|school|student|exam|language learning)\b/i,label:"learning app",features:["Lessons or course modules","Quizzes and progress tracking","Spaced-repetition review","Streaks and achievements","Instructor or admin content management","Certificates"],purpose:["Teach a skill step by step","Help students revise","Deliver a course"],audience:["Beginner learners","Students preparing for exams","Professionals upskilling"]},{id:"ai-tools",match:/\b(ai|llm|gpt|chatbot|assistant|agent|prompt|rag|embedding|summari[sz]er)\b/i,label:"AI tool",features:["Prompt input and streaming output","Saved history or sessions","Custom system instructions","File or document upload","Multiple models to choose from","Export results"],purpose:["Automate a repetitive task","Help users write better prompts","Answer questions over my documents"],audience:["Just me","My team","Public users"]},{id:"dashboard",match:/\b(dashboard|analytics|metrics|kpi|reporting|monitor|admin panel|crm|erp)\b/i,label:"dashboard",features:["Charts and KPI cards","Filterable data table","Date-range comparison","CSV / Excel export","Scheduled email reports","Role-based access"],purpose:["See performance at a glance","Replace a manual spreadsheet","Share reports with stakeholders"],pages:["Overview","Detail view","Filters","Export","Settings"],audience:["My team","Management","External clients"]},{id:"portfolio",match:/\b(portfolio|personal (?:site|website)|resume site|cv site|freelance site|agency site)\b/i,label:"portfolio",features:["Project gallery with case studies","About page with bio","Contact form","Testimonials","Blog or writing section","Downloadable CV"],purpose:["Win freelance clients","Apply for jobs","Showcase my work"],pages:["Home","Work / projects","About","Contact"],audience:["Potential clients","Recruiters","Peers in my field"]}];function ye(n){let t=`${n.subject.subject} ${n.subject.domain} ${String(n.fields.purpose??"")} ${String(n.fields.topic??"")} ${String(n.fields.goal??"")}`;return nn.filter(e=>e.match.test(t))}var on="All of these",rn="__all__";function $(n,t){let e=Qe(n).filter(o=>o.trim()!==""),i=e.map(o=>({value:Ue(o),label:o}));return t&&e.length>=3&&i.push({value:rn,label:on,aggregate:!0}),i}function Ue(n){return n.toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9]+/g," ").trim()}function Qe(n){let t=new Set,e=[];for(let i of n){let o=i.toLowerCase().trim();t.has(o)||(t.add(o),e.push(i.trim()))}return e}function we(n,t){let e=t.subject.subject||t.subject.category||"this",i=t.subject.domain||t.subject.subject,o=H(t.resolved.topic)||H(t.resolved.goal)||i,s=H(t.resolved.content_type)||H(t.resolved.output_shape)||H(t.resolved.output_format)||t.subject.subject;return n.replace(/\{subject\}/g,e).replace(/\{domain\}/g,i||"this").replace(/\{category\}/g,t.subject.category||"project").replace(/\{topic\}/g,o||"this topic").replace(/\{deliverable\}/g,s||"output").replace(/\bthe this\b/gi,"this").replace(/\bthis this\b/gi,"this").replace(/\s+/g," ").trim()}function H(n){return n===void 0?"":Array.isArray(n)?n[0]??"":n}var Fe={"website.purpose":{text:"What is the {subject} mainly for?",options:["Generate leads or enquiries","Sell products or services","Showcase work or a portfolio","Publish content regularly","Provide a tool or app to users"],rationale:"Purpose decides structure, copy and calls to action."},"website.site_type":{text:"What kind of site should this be?",options:["Single-page landing page","Multi-page marketing site","Blog or content site","Online store","Web app with user accounts","Documentation site"],skip:n=>!!n.resolved.purpose,rationale:"The shape of the site follows from its type."},"website.audience":{text:"Who is the {subject} for?",options:["General consumers","Small businesses","Enterprise buyers","Other developers","A niche community"],rationale:"Audience sets vocabulary, pricing framing and depth."},"website.pages":{text:"Which pages should the {subject} include?",options:["Home","About","Services or features","Pricing","Contact","Blog"],rationale:"Page list fixes the scope of the build."},"website.design_direction":{text:"What design direction fits?",options:["Minimal and typographic","Bold and editorial","Corporate and trustworthy","Playful and colourful","Dark, premium and quiet"],rationale:"Design direction changes layout, type scale and imagery."},"website.features":{text:"Which features should the {subject} include?",options:["Contact form or enquiry capture","Blog or content publishing","Search and filtering","User accounts and login","Payments or checkout","Admin dashboard","Image gallery","Testimonials","Newsletter signup","Multi-language support"],rationale:"Features are the largest driver of build effort."},"website.tech_stack":{text:"Any technology preference?",options:["Next.js + React","Plain HTML/CSS/JS","Astro","WordPress","No preference \u2014 you choose"],rationale:"The stack decides what code you actually receive."},"website.backend":{text:"Does the {subject} need a backend?",options:["No \u2014 static site is fine","Yes \u2014 dynamic data and a database","Only a form endpoint / email","Not sure \u2014 recommend one"],rationale:"Backend or not changes the entire architecture."},"website.auth":{text:"How should users sign in?",options:["Email and password","Google sign-in","Magic link / OTP","No login needed"],rationale:"Authentication choice affects both backend and UI work."},"website.database":{text:"Any database preference?",options:["Postgres","Supabase","Firebase","SQLite","No preference"],rationale:"Data model and hosting follow from this."},"website.deployment":{text:"Where should it be deployed?",options:["Vercel","Netlify","Cloudflare Pages","AWS","Not decided yet"],optional:!0},"website.content":{text:"Do you already have the content?",options:["Yes \u2014 text and images are ready","Partly \u2014 text only","No \u2014 write placeholder copy","No \u2014 write real copy for me"],optional:!0,rationale:"Content readiness changes whether copywriting is in scope."},"software.purpose":{text:"What should {subject} actually do?",kind:"text",hint:"One or two sentences is enough \u2014 the key behaviour, not the whole spec.",rationale:"The core behaviour defines everything else."},"software.platform":{text:"Where should it run?",options:["Command line","Web browser","Server / backend service","Desktop app","As a library / SDK"],rationale:"Runtime decides language, packaging and testing strategy."},"software.features":{text:"Which features should the {subject} include?",options:["Core create / read / update / delete","Search and filtering","Authentication","Scheduled jobs","Third-party integration","Logging and monitoring"],rationale:"Feature scope is the main cost driver."},"software.language":{text:"Any language preference?",options:["TypeScript / Node","Python","Go","Rust","Java / Kotlin","No preference"],rationale:"Language determines the code you will receive."},"software.framework":{text:"Any framework or library preference?",options:["Express / Fastify","Next.js API routes","FastAPI","Django / DRF","NestJS","No preference"]},"software.constraints":{text:"Any constraints to respect?",options:["No external dependencies","Must run offline","Must be production-ready","Keep it minimal (prototype)","Strict performance budget"],rationale:"Constraints rule out whole classes of solution."},"software.interfaces":{text:"How should it be accessed?",options:["REST API","GraphQL","CLI commands","Webhooks","Library imports"],rationale:"The interface contract shapes the design."},"software.data_storage":{text:"How should data be stored?",options:["Postgres","SQLite","MongoDB","Files on disk","No persistence needed"],rationale:"Persistence decides schema and migration work."},"software.scale":{text:"Roughly what scale should this handle?",options:["Personal use","A small team","Thousands of users","High traffic, needs to scale"],optional:!0},"software.output_shape":{text:"What should the AI deliver?",options:["Complete runnable project","A single file","Function-level snippets","Architecture and plan only"],rationale:"Deliverable form prevents a plan when you wanted code."},"software.testing":{text:"Should tests be included?",options:["Yes \u2014 unit tests","Yes \u2014 unit and integration","No tests","Just a quick check"],optional:!0},"mobile.purpose":{text:"What should the {subject} do for its users?",kind:"text",hint:"The single job the app must do well.",rationale:"The core job drives screens and data model."},"mobile.mobile_os":{text:"Which platform(s)?",options:["iOS only","Android only","Both \u2014 cross-platform","Both \u2014 native separately"],rationale:"Platform choice decides the framework and store process."},"mobile.features":{text:"Which features should the app include?",options:["Accounts and sync","Push notifications","Offline support","In-app purchases","Camera or photo upload","Location features"],rationale:"Each feature pulls in permissions and platform APIs."},"mobile.audience":{text:"Who are the users?",options:["General consumers","A specific professional niche","Internal team","Students"],rationale:"Audience shapes onboarding and pricing."},"mobile.framework":{text:"Any framework preference?",options:["React Native / Expo","Flutter","Native SwiftUI","Native Kotlin / Compose","No preference"],rationale:"Framework choice decides the language, tooling and hiring pool."},"mobile.backend":{text:"Does it need a backend?",options:["No \u2014 local storage only","Yes \u2014 accounts and cloud sync","Firebase / Supabase","Not sure"],rationale:"Cloud sync vs local decides cost and complexity."},"mobile.auth":{text:"How should users sign in?",options:["Email and password","Apple / Google sign-in","Phone OTP","No login needed"]},"mobile.notifications":{text:"Are push notifications needed?",options:["Yes \u2014 reminders","Yes \u2014 marketing","No"],optional:!0},"mobile.store":{text:"Where will it be distributed?",options:["App Store","Play Store","Both stores","Internal / test only"],optional:!0},"mobile.design_direction":{text:"What should it feel like?",options:["Clean and minimal","Playful and friendly","Dense and professional","Dark and premium"]},"coding.goal":{text:"What do you need help with?",options:["Fix a bug","Explain the code","Write new code","Refactor or improve it","Review for problems","Write tests"],rationale:"The kind of help needed changes the whole answer."},"coding.problem":{text:"What is the code or problem you are working on?",kind:"text",hint:"Paste the relevant code or describe the behaviour and what you expected.",rationale:"Without the code, any answer is a guess."},"coding.language":{text:"Which language or runtime?",options:["TypeScript / JavaScript","Python","Java / Kotlin","Go","Rust","C#","PHP / Ruby"],rationale:"The answer must be in the language you actually use."},"coding.context":{text:"What is the surrounding setup?",options:["Small script","Framework app (React/Next/Django)","Existing production codebase","Just learning / exploring"],rationale:"Context decides how defensive and idiomatic the answer should be."},"coding.error":{text:"What happens when it fails?",kind:"text",hint:'Error message, stack trace, or "expected X, got Y".',rationale:"The exact error is the fastest route to the fix."},"coding.constraints":{text:"Any constraints on the solution?",options:["No new dependencies","Keep the current API","Performance matters","Readability over cleverness"]},"coding.output_shape":{text:"How should the answer be shaped?",options:["Corrected code with a short explanation","Explanation first, code after","Just the code","Step-by-step walkthrough"],rationale:"Answer shape prevents an essay when you wanted a patch."},"coding.level":{text:"How deep should the explanation go?",options:["Just fix it","Explain briefly why","Teach me the concept properly"],optional:!0},"writing.content_type":{text:"What form should this take?",options:["Blog post","Email","LinkedIn post","Article","Landing page copy","Documentation","Report"],rationale:"Format decides structure and length expectations."},"writing.source_language":{text:"Which language is the text in now?",options:["English","Hindi","Spanish","French","German","Other"],rationale:"Ambiguous source text is the most common translation failure."},"writing.register":{text:"How formal should the translation read?",options:["Neutral","Formal","Conversational","Legal / official","Marketing"],rationale:"Register changes word choice more than syntax."},"writing.topic":{text:"What should the {deliverable} be about?",kind:"text",hint:"One line naming the subject, or the angle you want taken.",rationale:"The subject is the substance of the piece."},"writing.audience":{text:"Who is the reader?",options:["General readers","Professionals in the field","Beginners","Senior decision-makers","Existing customers"],rationale:"Reading level and assumed knowledge depend on this."},"writing.purpose":{text:"What should it achieve?",options:["Inform or explain","Persuade","Rank on search","Announce news","Build trust","Get a reply"],rationale:"Purpose determines the call to action and framing."},"writing.tone":{text:"What tone?",options:["Professional","Friendly and warm","Direct and punchy","Formal","Playful"],rationale:"Tone sets every sentence."},"writing.length":{text:"Roughly how long?",options:["Under 300 words","300\u2013600 words","600\u20131,200 words","1,200+ words"],rationale:"Length determines depth and structure."},"writing.structure":{text:"Any structural requirements?",options:["Short intro + sections","Bullet points","Numbered list","TL;DR at the top","No headings, flowing prose"]},"writing.must_include":{text:"Anything that must be included or avoided?",kind:"text",hint:"Facts, names, numbers, or things to avoid saying.",optional:!0},"writing.language_out":{text:"What language should it be written in?",options:["English","Hindi","Spanish","French","German"],optional:!0},"research.question":{text:"What question should the research answer?",kind:"text",hint:"State it as a question or a decision you need to make.",rationale:"A precise question is the difference between research and a listicle."},"research.scope":{text:"What should the comparison focus on?",options:["Pricing and total cost","Features and capability","Ease of use","Performance and reliability","Ecosystem and integrations","Security and compliance"],rationale:"Criteria decide what gets compared."},"research.decision":{text:"What decision does this feed?",kind:"text",hint:'e.g. "picking a vendor this week", "writing an internal recommendation".',rationale:"The decision determines the depth and format required."},"research.depth":{text:"How deep should it go?",options:["Quick overview","Solid working analysis","Exhaustive deep dive"],rationale:"Depth sets effort and length."},"research.sources":{text:"Which sources should be prioritised?",options:["Official documentation","Hands-on reviews","Academic or peer-reviewed","Community discussion","Recent news and announcements"],rationale:"Source preference changes what the answer can be trusted for."},"research.recency":{text:"How recent must the information be?",options:["Last 3 months","Last year","Last 2\u20133 years","No restriction"]},"research.geography":{text:"Any market or region to focus on?",options:["Global","India","United States","Europe","Asia-Pacific"],optional:!0},"research.output_format":{text:"What shape should the output take?",options:["Comparison table","Written analysis","Pros and cons per option","Recommendation with reasoning","Slide-ready summary"],rationale:"Output shape decides structure."},"image.subject":{text:"What is the main subject of the image?",kind:"text",hint:'The single most important thing that must be recognisable \u2014 e.g. "a red vintage motorcycle".',rationale:"Without a clear subject, generation is a lottery."},"image.style":{text:"What visual style should it have?",options:["Photorealistic","Cinematic still","Flat vector illustration","3D render","Watercolour","Minimal line art","Anime / manga"],rationale:"Style drives palette, detail level and rendering."},"image.composition":{text:"How should it be framed?",options:["Centred subject, wide background","Close-up","Full body / full object","Top-down flat lay","Wide panoramic scene"],rationale:"Framing changes what fits in the frame."},"image.environment":{text:"Where is the scene set?",options:["Studio, plain background","Outdoors, natural setting","Urban street","Interior room","Abstract or surreal"],rationale:"Setting determines context and props."},"image.lighting":{text:"What lighting or mood?",options:["Soft natural light","Golden hour warmth","Dramatic studio lighting","Moody low light","Bright and airy"],rationale:"Lighting is the fastest way to change mood."},"image.aspect_ratio":{text:"What shape and use?",options:["1:1 \u2014 social post","16:9 \u2014 wide header or slide","9:16 \u2014 phone or story","4:5 \u2014 feed portrait","A2/A3 \u2014 print poster"],rationale:"Aspect ratio must match where the image will be used."},"image.purpose":{text:"Where will this image be used?",options:["Social media post","Website hero image","Logo or brand mark","Print or poster","Presentation slide","App or product mockup"],rationale:"Intended use constrains cropping and text legibility."},"image.palette":{text:"Any colour direction?",options:["Muted and earthy","Vibrant and saturated","Pastel","Monochrome","Brand colours"],optional:!0},"image.text_in_image":{text:"Does the image need text in it?",kind:"text",hint:"Exact wording, or leave blank for none.",optional:!0},"business.goal":{text:"What business outcome are you after?",options:["Get first customers","Grow revenue","Raise funding","Launch a new product","Enter a new market","Reduce costs"],rationale:"The outcome determines which plan is useful."},"business.offering":{text:"What exactly are you offering?",kind:"text",hint:"Product or service, and who pays for it.",rationale:"The offer is the unit everything else is built around."},"business.market":{text:"Who is the target market?",options:["Small businesses (SMB)","Enterprise","Individual consumers","Developers or technical buyers","A specific industry niche"],rationale:"Market choice changes pricing, channel and messaging."},"business.stage":{text:"What stage are you at?",options:["Idea only","Validating","MVP built","Launched, early revenue","Scaling"],rationale:"Stage decides whether plan or execution is the bottleneck."},"business.timeframe":{text:"Over what timeframe?",options:["Next 30 days","Next quarter","Next 6 months","This year"],rationale:"A plan without a horizon is not actionable."},"business.budget":{text:"What budget or resources exist?",options:["Bootstrapped, near zero","A few hundred a month","A meaningful budget","Funded"],optional:!0},"business.constraints":{text:"Any hard constraints?",options:["Solo founder, limited time","No paid ads","Must be compliant (regulated)","Must not require hiring"],optional:!0},"business.output_shape":{text:"What should the deliverable be?",options:["One-page strategy","Detailed plan with milestones","Pitch deck outline","Positioning and messaging","Financial model sketch"],rationale:"Deliverable form prevents a vague essay."},"education.topic":{text:"What do you want to learn or teach?",kind:"text",hint:"A topic, a subject area, or a specific question.",rationale:"The topic is the substance of the lesson."},"education.level":{text:"Where are you starting from?",options:["Complete beginner","Some basics","Comfortable, filling gaps","Advanced, want depth"],rationale:"Starting level decides vocabulary and pace."},"education.goal":{text:"What do you want to be able to do afterwards?",options:["Understand it conceptually","Pass an exam or interview","Use it at work","Teach it to someone else"],rationale:"The goal decides how practice is structured."},"education.depth":{text:"How deep should it go?",options:["Quick intuitive explanation","Solid working understanding","Full syllabus-level depth"],rationale:"Depth decides how much detail is appropriate."},"education.style":{text:"How do you learn best?",options:["Simple analogies","Step-by-step with examples","Visual diagrams","Exercises and quizzes","Real-world case studies"],rationale:"Explanation style changes what a good answer looks like."},"education.timeframe":{text:"How much time do you have?",options:["An hour","A few days","A few weeks","No deadline"],optional:!0,rationale:"Time budget decides whether this is a lesson or a syllabus."},"education.language_out":{text:"What language should the explanation be in?",options:["English","Hindi","Spanish","French"],optional:!0},"general.goal":{text:"What would a perfect result look like?",kind:"text",hint:"One line on what you need, and what you would do with it.",rationale:"A concrete objective is the single biggest improvement available."},"general.context":{text:"Any context worth knowing?",kind:"text",hint:"Constraints, background, or who will read or use this.",optional:!0},"general.output_format":{text:"How should the answer be delivered?",options:["Short prose answer","Step-by-step","Bullet points","Table","Code","Detailed report"],rationale:"Output shape prevents the wrong kind of answer."},"general.audience":{text:"Who is this for?",options:["Just me","My team","A client","Public audience","A beginner"],optional:!0},"general.depth":{text:"How deep should it go?",options:["Quick answer","Balanced","Thorough"],optional:!0},output_format:{text:"How should the result be formatted?",options:["Markdown","Plain prose","Bullet points","Table","Code block","Document"],rationale:"Format decides the shape of the output."},output_shape:{text:"What should be delivered?",options:["A complete working artifact","A plan or outline","A draft to iterate on","Direct answer only"],rationale:"Deliverable form prevents the wrong level of output."},deadline:{text:"Is there a deadline?",options:["Today","This week","This month","No deadline"],optional:!0}};function xe(n,t){return Fe[`${n}.${t}`]??Fe[t]}function sn(n,t){let e=n.kind==="multi",i=ye(t),o=l=>{let c=[];for(let u of i){let g=u[l];Array.isArray(g)&&c.push(...g)}return c},s=xe(t.taskType,n.id),r=s?.options??[],a=s?.conditionalOptions?s.conditionalOptions(t):[];switch(n.id){case"features":{let l=o("features");return l.length>=3?$([...l.slice(0,5),...a],e):$([...l,...r.slice(0,6),...a],e)}case"pages":case"screens":{let l=o("pages");return $(l.length>0?[...l,...r.slice(0,2)]:r,e)}case"audience":case"market":{let l=o("audience");return $(l.length>0?[...l,...r.slice(0,3)]:r,e)}case"purpose":{let l=o("purpose");return $(l.length>0?[...l,...r.slice(0,3)]:r,e)}default:return $([...r,...a],e)}}function an(n,t){return n.kind==="text"?"text":n.kind==="multi"?"multi":t?.kind==="text"?"text":n.kind}function ve(n,t){let e=xe(t.taskType,n.id);if(e?.skip?.(t))return null;let i=an(n,e),o=e?.optional??n.optional,s=we(e?.text??un(n,t),t);if(i==="text")return{id:n.id,slot:n.id,text:s,kind:"text",options:[],suggestions:dn(n,t),allowCustom:!1,optional:o,hint:e?.hint,priority:n.weight,rationale:e?.rationale};let r=sn(n,t);if(r.length<2)return null;let a=t.resolved[n.id],l=Array.isArray(a)?r.filter(c=>!a.some(u=>c.value.includes(Ue(String(u))))):r;return{id:n.id,slot:n.id,text:s,kind:i,options:l.length>=2?l:r,suggestions:[],allowCustom:!0,optional:o,hint:e?.hint,condition:n.condition,priority:n.weight,rationale:e?.rationale}}var ke={"cover letter":["A specific job posting","A career change with no direct experience","A promotion I want internally","A first job or internship"],"blog post":["A problem my readers keep hitting","A walkthrough of how something works","An opinion backed by examples","A beginner introduction to the topic"],email:["Cold outreach","A follow-up","An apology or service recovery","An announcement"],report:["Progress against a plan","A recommendation with options","An incident write-up","A comparison of options"],essay:["An argument I want to make","A personal experience","An analysis of a text or event","A comparison"],story:["A character-driven scene","A twist ending","A childhood memory","A speculative idea"],poem:["A single image or moment","A feeling I cannot name","A place","A person"],"landing page":["A single clear offer","A product feature","A waitlist sign-up","A free trial"]},ln=new RegExp(`\\b(${Object.keys(ke).join("|").replace(/ /g,"\\s+")})\\b`,"i");function cn(n){let t=[String(n.resolved.content_type??""),String(n.fields.content_type??""),n.subject.subject,n.subject.domain].join(" "),e=ln.exec(t);if(!e)return;let i=e[1].toLowerCase().replace(/\s+/g," ");return ke[i]?i:void 0}function dn(n,t){let e=[],i=t.subject.subject||t.subject.domain||"",o=t.subject.domain||"",s=cn(t),r=s?ke[s]:void 0;if(r&&(n.id==="topic"||n.id==="purpose")&&e.push(...r),!r&&n.id==="topic"&&(o?e.push(`A practical introduction to ${o}`,`${We(o)} for beginners`,`Common mistakes with ${o}`):i&&e.push(`Getting started with ${i}`,`${We(i)}: what to know first`)),n.id==="offering"&&e.push("A product I sell","A service I deliver","Software I am building","Content or expertise I share"),n.id==="question"){let a=o||i||"this market";e.push(`How big is ${a} and how fast is it growing?`,`Who are the main players in ${a}?`,`What is changing in ${a} right now?`,`Should we enter ${a}?`)}n.id==="decision"&&e.push("Whether to invest at all","How much to spend","Which option to pick","When to move","Nothing yet \u2014 just understanding"),n.id==="purpose"&&e.length===0&&e.push("Make it work correctly","Make it faster","Make it easier to maintain","Explain what is going wrong"),n.id==="must_include"&&e.push("A concrete example","A step-by-step walkthrough","Numbers or data","A short checklist","Common pitfalls"),n.id==="must_avoid"&&e.push("No jargon","No hype or superlatives","No pricing details","No competitor names"),(n.id==="problem"||n.id==="error")&&e.push("It crashes only in production","It works locally but not after deploy","The output is wrong, not missing"),n.id==="topic"&&e.push("Leave it to me \u2014 you decide the angle");for(let a of ye(t)){let l=a[n.id];Array.isArray(l)&&e.push(...l.filter(c=>typeof c=="string"))}return Qe(e.filter(a=>a.trim()!=="")).slice(0,4)}function We(n){return n.charAt(0).toUpperCase()+n.slice(1)}function un(n,t){let e=B(t.taskType,n.id).toLowerCase(),i=t.subject.subject||"this";return`What about ${e} for ${i}?`}function Se(n,t){let e=n[0];if(!e)return null;let i=[{value:"prioritise-first",label:"Prefer the first one I mentioned"},{value:"prioritise-second",label:"Prefer the second one I mentioned"},{value:"balance",label:"Balance both \u2014 note the tension in the answer"}];return{id:`conflict-${e.id}`,slot:`conflict_${e.id}`,text:we(e.question,t),kind:"single",options:i,suggestions:[],allowCustom:!0,priority:1,rationale:"Two instructions in the request pull in opposite directions."}}var D=.4,K=.7,Ae=78,I={intentClarity:.2,scope:.15,functional:.2,constraints:.1,audience:.1,output:.15,technical:.1},pn=/\b\d+(?:[.,]\d+)?\b/,mn=/\b[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*\b/,gn=/["“'][^"”']{3,}["”']/,hn=/,|\band\b|\bwith\b|\bincluding\b|\bsuch as\b/i,fn=/\b(build|create|make|write|design|develop|generate|plan|analyse|analyze|research|fix|refactor|explain|teach|compare|draft|implement|migrate|optimi[sz]e|debug|review|translate|summari[sz]e|audit|scaffold|deploy)\b/i;function V(n){let t=O(n),e=S(t/28,0,1)*.55,i=0;return pn.test(n)&&(i+=.12),mn.test(n)&&(i+=.1),gn.test(n)&&(i+=.1),hn.test(n)&&(i+=.08),S(e+i,0,1)}function _e(n,t,e,i){let o=.2;fn.test(n)&&(o+=.3),i&&(o+=.25),o+=S(t.confidence,0,1)*.25;let s=e.filter(r=>r.kind==="vague-noun"||r.kind==="hedge").length;return o-=s*.15,S(o,0,1)}function Ee(n){return n===void 0?!1:Array.isArray(n)?n.length>0:n.trim()!==""}function Ke(n,t){let e=0,i=0;for(let o of n){let s=o.weight;s<.3||(e+=s,Ee(t[o.id])&&(i+=s))}return{score:e===0?1:i/e,total:e}}function F(n,t,e,i){let o=_(n),s=[],r=[],a=0,l=0;for(let v of o)v.weight<.3||(a+=v.weight,Ee(t[v.id])?(l+=v.weight,s.push(v.id)):v.weight>=D&&r.push(v.id));let c=a===0?1:l/a,u={},g=v=>Ke(o.filter(ne=>v.has(ne.id)),t),f=o.filter(v=>v.weight>=K),d=g(G),m=g(ce),h=g(de),p=g(ue),y=g(pe),x=Ke(f,t);u.intentClarity={score:T(S(i,0,1)*100),weight:I.intentClarity,note:i>=.75?"Clear what you want":i>=.45?"Roughly clear":"Intent still fuzzy"},u.scope={score:T(x.score*100),weight:I.scope,note:x.total===0?"No scope-critical slots":`${Math.round(x.score*100)}% of the essentials stated`},u.functional={score:T(d.score*100),weight:I.functional,note:d.total===0?"n/a":"What it must actually do"},u.constraints={score:T(m.total===0?100:m.score*100),weight:I.constraints,note:m.total===0?"No constraints apply":"Limits and limits on the solution"},u.audience={score:T(h.total===0?100:h.score*100),weight:I.audience,note:h.total===0?"No audience slot":"Who it is for"},u.output={score:T(p.total===0?100:p.score*100),weight:I.output,note:p.total===0?"No output slot":"Shape of the deliverable"},u.technical={score:T(y.total===0?100:y.score*100),weight:I.technical,note:y.total===0?"No technical slots":"Stack and platform details"};let E=.6*c+.2*S(e,0,1)+.2*S(i,0,1);return{score:T(E*100),detected:s,missing:r,specificity:Math.round(S(e,0,1)*100)/100,intentClarity:Math.round(S(i,0,1)*100)/100,facets:u}}function Y(n,t,e,i,o=[]){let s=_(n),r=e.some(l=>l.kind==="vague-noun")?.25:0,a=[];for(let l of s){if(l.weight<D||o.includes(l.id)||l.condition||Ee(t[l.id]))continue;let c=1;r>0&&(G.has(l.id)||l.weight>=K)&&(c+=r),i.some(u=>u.id.includes(l.id))&&(c+=.2),a.push({slot:l.id,label:l.label,weight:l.weight,reason:bn(l,n),urgency:Math.round(c*100)/100,priority:Math.round(l.weight*c*1e3)/1e3})}return a.sort((l,c)=>c.priority-l.priority)}function bn(n,t){let e=t==="image"?"the image":"the answer";switch(n.id){case"purpose":case"goal":case"question":case"subject":case"topic":case"problem":case"offering":return`This is the substance of the request \u2014 without it ${e} can only be generic.`;case"features":return"Feature scope is the single biggest driver of what you get back.";case"audience":case"market":return"Who it is for changes vocabulary, examples and depth.";case"platform":case"mobile_os":case"site_type":return"The target platform changes the whole approach.";case"language":case"framework":case"tech_stack":return"The stack determines the code you actually receive.";case"backend":case"data_storage":return"Persistence decides architecture and hosting.";case"style":return"Style drives palette, detail and rendering.";case"aspect_ratio":return"Aspect ratio must match where the result will be used.";case"output_shape":case"output_format":return"Output shape prevents getting a plan when you wanted an artifact.";case"tone":return"Tone decides how the message lands.";case"length":return"Length sets structure and level of detail.";default:return`${n.label} materially changes the result.`}}function Te(n){let{completeness:t,gaps:e,ambiguities:i,conflicts:o,text:s}=n,r=[];if(O(s)<2||s.trim().length<6)return{action:"passthrough",confidence:0,reasons:["Too short to analyse"],estimatedGain:0};if(n.isGreeting)return{action:"passthrough",confidence:0,reasons:["Greeting or chit-chat"],estimatedGain:0};if(n.isQuestion)return{action:"passthrough",confidence:0,reasons:["Direct question \u2014 answering beats clarifying"],estimatedGain:0};let a=e.filter(f=>f.weight>=K),l=i.filter(f=>f.severity>=.85);o.length>0&&r.push(`Conflicting instructions detected: ${o[0].description}`),l.length>0&&r.push(`Vague wording (\u201C${l[0].evidence}\u201D) leaves the target undefined`),a.length>0&&r.push(`Missing ${a.map(f=>f.label.toLowerCase()).slice(0,2).join(" and ")}`),t.score<55&&r.push(`Only ${t.score}% of the requirement set is covered`);let c=S(e.slice(0,4).reduce((f,d)=>f+d.priority,0)/2.4+(o.length>0?.2:0)+l.length*.1,0,1);if(t.score>=Ae&&a.length===0&&o.length===0)return{action:"passthrough",confidence:.9,reasons:[`Request is already ${t.score}% specified`,"No critical gaps detected"],estimatedGain:c};if(e.length===0&&o.length===0)return{action:"passthrough",confidence:.85,reasons:["No material gaps detected"],estimatedGain:c};if(n.questionCount===0)return{action:"passthrough",confidence:.7,reasons:["No useful question could be formed"],estimatedGain:c};if(!(o.length>0||a.length>0&&(l.length>0||t.score<Ae)||t.score<62&&e.length>=2||c>=.55))return{action:"passthrough",confidence:.6,reasons:[...r,"Improvement would be marginal \u2014 not worth the interruption"],estimatedGain:c};let g=S(.45+a.length*.15+(l.length>0?.15:0)+(o.length>0?.15:0)+(t.score<50?.1:0),0,1);return{action:"clarify",confidence:Math.round(g*100)/100,reasons:r,estimatedGain:Math.round(c*100)/100}}function J(n,t,e){let i=t[e];return i!==void 0&&N(i).length>0?i:n[e]}var wn=[/^(hi+|hello+|hey+|yo|sup|good (morning|afternoon|evening)|namaste|hola|namaskar)\b[\s!.,]*(there|again|all|folks|friend)?[\s!.,]*$/i,/^(thanks?|thank you|ty|great|awesome|perfect|ok(ay)?|cool|nice|got it|sure)\b[\s!.,]*$/i,/^(who (are|am) (you|i)|what (can|are) you|what do you do|your name)\b/i],Ve=[/^(what|who|where|when|which)\s+(is|are|was|were)\b/i,/^(who|what)\s+(did|does|do)\b/i,/^(when|where)\s+(did|does|do|is|was)\b/i,/^(define|meaning of|synonyms? of|antonyms? of)\b/i,/^(how (do|does|can|should) (i|you|we)\b)/i,/^(is|are|can|could|should|will|would|does|do|did)\s+\w[^.?!]{0,70}\?$/i,/^(calculate|convert|solve|translate|what'?s)\s+[-\d(]/i,/^(who|what|when|where|which|why|how)\s+\S/i,/^(capital of|population of|height of|distance (from|between)|weather in)\b/i],xn=/\b(build|create|make|design|develop|write|generate|plan|implement|draft|compose|refactor|debug|fix)\b/i;function Ye(n){let t=A(n);return wn.some(e=>e.test(t))}function Je(n){let t=A(n);return!t.endsWith("?")&&!Ve.some(e=>e.test(t))||O(t)>18||xn.test(t)?!1:Ve.some(e=>e.test(t))}function Ze(n,t,e,i,o={}){let s=Math.max(1,Math.min(6,Math.round(o.maxQuestions??4))),r=new Set(o.ignoreSlots??[]),a=o.round??0,l={taskType:n.taskType,subject:{subject:n.subject,domain:n.domain,category:n.subject},fields:n.fields,answers:i,resolved:vn(n.fields,i)},c=[];if(a===0&&n.conflicts.length>0){let p=Se(n.conflicts,l);p&&c.push(p)}let u=e.filter(p=>!r.has(p.slot)),g=_(n.taskType),f=[];for(let p of g){if(!p.condition||r.has(p.id)||p.weight<D||J(n.fields,i,p.id)!==void 0)continue;let y=J(n.fields,i,p.condition.slot);y===void 0||!N(y).map(v=>v.toLowerCase()).some(v=>p.condition.equals.some(ne=>v.includes(ne)))||f.push({spec:p,weight:p.weight})}let d=[...u.map(p=>({slot:p.slot,weight:p.priority})),...f.map(p=>({slot:p.spec.id,weight:p.weight}))].sort((p,y)=>y.weight-p.weight);for(let p of d){if(c.length>=s)break;if(c.some(E=>E.slot===p.slot))continue;let y=g.find(E=>E.id===p.slot);if(!y)continue;let x=ve(y,l);x&&c.push(x)}let m=new Set(c.map(p=>p.slot)),h=u.filter(p=>!m.has(p.slot)).slice(0,4).map(p=>p.slot);return{questions:c,hasMore:h.length>0,nextSlots:h,completeness:t}}function vn(n,t){return{...n,...t}}function Ce(n,t={}){let e=A(n),i=t.id??ge("a"),o=Math.max(1,Math.min(6,Math.round(t.maxQuestions??4))),s=t.taskType?{taskType:t.taskType,confidence:.95,signals:["forced"]}:re(e),r=s.taskType,a=be(e,r),l=Q(e),c=fe(e),u=V(e),g=_e(e,s,l,a.subject.subject!==""),f={...a.fields},d=F(r,f,u,g),m=Y(r,f,l,c,t.ignoreSlots??[]),h={taskType:r,intent:U(e,200),subject:a.subject.subject,domain:a.subject.domain,fields:f,detected:a.detected,gaps:m,ambiguities:l,conflicts:c,classification:s},p=Ze(h,d,m,{},{maxQuestions:o,ignoreSlots:t.ignoreSlots}),y=Te({taskType:r,completeness:d,gaps:m,ambiguities:l,conflicts:c,classification:s,text:e,isQuestion:Je(e),isGreeting:Ye(e),questionCount:p.questions.length}),x=y.action==="clarify";return{id:i,original:e,taskType:r,intent:h.intent,isRefinable:x,passthroughReason:x?void 0:y.reasons[0]??"Nothing material to clarify",completeness:d,requirements:h,questions:x?p.questions:[],decision:y,engine:"local"}}function Xe(n,t){let e={...n},i=[];for(let[o,s]of Object.entries(t)){let r=N(s).map(l=>A(String(l))).filter(l=>l!=="");if(r.length===0||r.length===1&&/^(no preference|doesn'?t matter|any|not sure|skip)$/i.test(r[0]))continue;let a=r.length===1?r[0]:r;e[o]=a,i.push({slot:o,value:a})}return{fields:e,applied:i}}function Le(n,t,e=[]){let{fields:i}=Xe(n.requirements.fields,t),o=n.taskType,s=V(n.original),r=n.completeness.intentClarity,a=Q(n.original).filter(h=>h.kind!=="vague-adjective"),l=n.requirements.conflicts,c=Math.min(1,r+.04*Object.keys(t).length),u=F(o,i,s,c),g={...i},f=0;for(let h of e){let p=g[h];(Array.isArray(p)?p.length>0:(p??"").trim()!=="")||(g[h]="answered",f+=1)}let d=F(o,g,s,Math.min(1,r+.04*(Object.keys(t).length+f))).score,m=Y(o,i,a,l);return{current:u,original:n.completeness.score,projected:Math.max(d,u.score),missingLabels:m.filter(h=>h.weight>=D).map(h=>h.label)}}function et(n,t=document){for(let e of n.split(","))try{let i=t.querySelector(e.trim());if(i)return i}catch{}return null}function P(n){if(!n.isConnected)return!1;let t=n.getBoundingClientRect();if(t.width<40||t.height<12)return!1;let e=window.getComputedStyle(n);return e.visibility!=="hidden"&&e.display!=="none"&&e.opacity!=="0"}function tt(n,t=document){for(let e of n){let i;try{i=t.querySelectorAll(e)}catch{continue}for(let o of Array.from(i))if(o instanceof HTMLElement&&P(o))return o}return null}function nt(n){if(n instanceof HTMLTextAreaElement||n instanceof HTMLInputElement||n.isContentEditable===!0)return!0;let t=n.getAttribute("contenteditable");return t!==null&&t.toLowerCase()!=="false"}function M(n){return{id:n.id,name:n.name,capability:n.capability,homepage:n.homepage,matches(t){let e=t.toLowerCase();return n.hosts.some(i=>e===i||n.matchSubdomains===!0&&e.endsWith(`.${i}`))},findInput(){try{let t=tt(n.inputSelectors);return t&&nt(t)?t:null}catch{return null}},findSendButton(){try{let t=tt(n.sendSelectors);if(t)return t;let i=this.findInput()?.closest("form");if(i){let o=i.querySelector('button[type="submit"]');if(o&&P(o))return o}return null}catch{return null}},getText(t){if(t instanceof HTMLTextAreaElement||t instanceof HTMLInputElement)return t.value;let e=t.innerText;return typeof e=="string"?e:t.textContent??""},setText(t,e){return Pe(t,e)},submit(){try{let t=this.findSendButton();if(t&&!kn(t)&&P(t))return t.click(),!0;let e=this.findInput();return e?(e.focus(),Re(e),!0):!1}catch{return!1}}}}function kn(n){return n instanceof HTMLButtonElement?n.disabled:n.getAttribute("aria-disabled")==="true"}function Re(n){let t={key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:!0,cancelable:!0,composed:!0};n.dispatchEvent(new KeyboardEvent("keydown",t)),n.dispatchEvent(new KeyboardEvent("keypress",t)),n.dispatchEvent(new KeyboardEvent("keyup",t))}function Pe(n,t){try{if(n.focus(),n instanceof HTMLTextAreaElement||n instanceof HTMLInputElement){let r=n instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,a=Object.getOwnPropertyDescriptor(r,"value")?.set;return a?a.call(n,t):n.value=t,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})),!0}if(!nt(n))return!1;let e=window.getSelection(),i=document.createRange();if(i.selectNodeContents(n),e?.removeAllRanges(),e?.addRange(i),typeof document.execCommand=="function"){let r=document.execCommand("delete",!1),a=document.execCommand("insertText",!1,t);if(a)return!0}let o=new DataTransfer;o.setData("text/plain",t);let s=new ClipboardEvent("paste",{clipboardData:o,bubbles:!0,cancelable:!0});return n.dispatchEvent(s),(n.innerText??n.textContent??"").trim().length>0||t.trim()===""}catch{return!1}}function it(n){let t=[];for(let o of n)try{for(let s of Array.from(document.querySelectorAll(o)))P(s)&&t.push(s)}catch{}let e=null,i=0;for(let o of t){let s=o.getBoundingClientRect(),r=s.width*s.height;r>i&&(e=o,i=r)}return e}var Sn={id:"chatgpt",name:"ChatGPT",capability:"supported",homepage:"https://chatgpt.com",hosts:["chatgpt.com","chat.openai.com"],inputSelectors:["#prompt-textarea",'form div[contenteditable="true"]#prompt-textarea','form div[contenteditable="true"][id*="prompt" i]',"form textarea[data-id]","form textarea",'div.ProseMirror[contenteditable="true"]','div[contenteditable="true"][role="textbox"]','[data-testid="prompt-textarea"]'],sendSelectors:['button[data-testid="send-button"]','form button[data-testid="send-button"]','button[aria-label*="Send prompt" i]','button[aria-label*="send" i]','form button[type="submit"]','button[data-testid="composer-submit-button"]'],verification:"Input, text insertion and submit exercised in a DOM fixture."},ot=M(Sn);var An={id:"claude",name:"Claude",capability:"partial",homepage:"https://claude.ai",hosts:["claude.ai"],inputSelectors:['div[contenteditable="true"].ProseMirror','div.ProseMirror[contenteditable="true"]','fieldset div[contenteditable="true"]','div[aria-label*="Write your prompt" i][contenteditable="true"]','form div[contenteditable="true"]','main div[contenteditable="true"]'],sendSelectors:['button[aria-label*="Send message" i]','button[aria-label*="Send" i]','fieldset button[type="submit"]','form button[type="submit"]'],verification:"DOM fixture only; live claude.ai not verified for this release."},rt=M(An);var _n={id:"copilot",name:"Microsoft Copilot",capability:"unknown",homepage:"https://copilot.microsoft.com",hosts:["copilot.microsoft.com"],matchSubdomains:!0,inputSelectors:["main textarea","form textarea",'main div[contenteditable="true"][role="textbox"]','main div[contenteditable="true"]'],sendSelectors:['button[aria-label*="Submit" i]','button[aria-label*="Send" i]','main button[data-testid="send-button"]','form button[type="submit"]'],verification:"Not tested against the live site. Heuristic selectors."},st=M(_n);function at(n,t){let e={id:n,name:t,capability:"unknown",homepage:`https://${t}`,hosts:[t],matchSubdomains:!0,inputSelectors:[],sendSelectors:[],verification:"Heuristic. Not tested against this site."};return{id:e.id,name:e.name,capability:e.capability,homepage:e.homepage,matches(i){let o=i.toLowerCase();return o===t||o.endsWith(`.${t}`)},findInput(){try{return typeof document>"u"?null:it(["textarea",'div[contenteditable="true"]','[role="textbox"]'])}catch{return null}},findSendButton(){try{let i=this.findInput();if(!i)return null;let o=i.closest("form");if(o){let r=et('button[type="submit"], button[aria-label*="send" i]',o);if(r&&P(r))return r}let s=i.parentElement;for(let r=0;r<4&&s;r+=1){let a=Array.from(s.querySelectorAll("button")).filter(l=>{if(!P(l))return!1;let c=l.getAttribute("aria-label")??l.textContent??"";return l instanceof HTMLButtonElement&&l.type==="submit"||/send|submit/i.test(c)});if(a.length>0)return a[a.length-1]??null;s=s.parentElement}return null}catch{return null}},getText(i){return i instanceof HTMLTextAreaElement||i instanceof HTMLInputElement?i.value:i.innerText??i.textContent??""},setText(i,o){return Pe(i,o)},submit(){try{let i=this.findSendButton();if(i&&!i.disabled)return i.click(),!0;let o=this.findInput();return o?(o.focus(),Re(o),!0):!1}catch{return!1}}}}var En={id:"gemini",name:"Google Gemini",capability:"partial",homepage:"https://gemini.google.com",hosts:["gemini.google.com"],inputSelectors:['div.ql-editor[contenteditable="true"]','rich-textarea div[contenteditable="true"]','main div[contenteditable="true"][aria-label*="prompt" i]','main div[contenteditable="true"][role="textbox"]'],sendSelectors:["button.send-button",'button[aria-label*="Send message" i]','button[mattooltip*="Send" i]','main button[data-test-id="send-button"]'],verification:"DOM fixture only; live gemini.google.com not verified for this release."},lt=M(En);var Tn=[ot,rt,lt,st];function ct(n,t=[]){let e=n.toLowerCase();for(let i of Tn)if(i.matches(e))return{adapter:i,custom:!1};for(let i of t){let o=i.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/.*$/,"");if(o!==""&&(e===o||e.endsWith(`.${o}`)))return{adapter:at("custom",o),custom:!0}}return{adapter:null,custom:!1}}var w=class extends Error{kind;retryable;status;constructor(t,e,i={}){super(e),this.name="AiError",this.kind=t,this.retryable=i.retryable??(t==="rate-limit"||t==="network"||t==="server"||t==="timeout"),this.status=i.status}};function Cn(n,t){let e=n;return t&&t.length>=8&&(e=e.split(t).join("[redacted]")),e.replace(/\b(sk|pk|rk|api|key|token)[-_][A-Za-z0-9_-]{8,}/gi,"[redacted]").replace(/\bAIza[A-Za-z0-9_-]{20,}/g,"[redacted]").replace(/\bsk-[A-Za-z0-9_-]{10,}/g,"[redacted]").replace(/\b[A-Za-z0-9_-]{32,}\b/g,"[redacted]")}function Ln(n,t,e,i){let o=Cn(Rn(e),i).slice(0,200);if(n===401||n===403)return new w("auth",`${t} rejected the API key. Check the key in Settings.${o?` (${o})`:""}`,{status:n});if(n===404)return new w("model-not-found",`The model was not found on ${t}. Pick a different model in Settings.${o?` (${o})`:""}`,{status:n});if(n===429){let s=/quota|billing|credit/i.test(e);return new w(s?"quota":"rate-limit",s?`${t} reports no remaining quota for this key.`:`${t} is rate limiting \u2014 try again in a moment.`,{status:n,retryable:!s})}return n>=500?new w("server",`${t} had a server error (${n}). Try again shortly.`,{status:n}):new w("unknown",`${t} returned an error (${n}).${o?` ${o}`:""}`,{status:n})}function Rn(n){try{let t=JSON.parse(n),e=t.error;if(typeof e=="string")return e;if(e?.message)return e.message;if(t.message)return t.message}catch{}return n.replace(/\s+/g," ").trim().slice(0,160)}async function C(n,t,e,i){let o=new AbortController,s=t.signal??void 0,r=()=>o.abort();s?.addEventListener("abort",r,{once:!0});let a=setTimeout(()=>o.abort(),e);try{return await fetch(n,{...t,signal:o.signal})}catch{throw o.signal.aborted?s?.aborted?new w("aborted","Request cancelled."):new w("timeout",`${i} took longer than ${Math.round(e/1e3)}s to respond.`):new w("network",`Could not reach ${i}. Check your connection, then retry.`)}finally{clearTimeout(a),s?.removeEventListener("abort",r)}}async function L(n,t){let e=await n.text().catch(()=>"");if(!n.ok)throw Ln(n.status,t,e);try{return JSON.parse(e)}catch{throw new w("bad-response",`${t} returned a response that was not valid JSON.`)}}function k(n,...t){let e=n;for(let i of t){if(e==null)return;if(typeof i=="number"){if(!Array.isArray(e))return;e=e[i]}else{if(typeof e!="object")return;e=e[i]}}return e}function Z(n){if(typeof n!="string")return null;let t=n.trim();if(t===""||t.length>300)return null;let e;try{e=new URL(t)}catch{return null}let i=e.hostname==="localhost"||e.hostname==="127.0.0.1"||e.hostname==="[::1]";if(e.protocol!=="https:"&&!(e.protocol==="http:"&&i)||e.username!==""||e.password!=="")return null;let o=e.pathname.replace(/\/+$/,"");return`${e.protocol}//${e.host}${o}`}var Pn=3e4,dt={meta:{id:"anthropic",name:"Anthropic",defaultModel:"claude-3-5-haiku-latest",models:["claude-3-5-haiku-latest","claude-3-5-sonnet-latest","claude-sonnet-4-20250514","claude-3-7-sonnet-latest"],keyUrl:"https://console.anthropic.com/settings/keys",needsKey:!0,origin:"https://api.anthropic.com/*",transport:"Your request text is sent from this browser directly to Anthropic, never to us."},async complete(n,t,e){if(n.trim()==="")throw new w("no-key","Anthropic needs an API key. Add one in Settings.");let i=await C("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":n,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:t,max_tokens:e.maxTokens??1400,temperature:e.temperature??.2,system:e.system,messages:[{role:"user",content:e.user}]}),signal:e.signal},Pn,"Anthropic"),o=await L(i,"Anthropic"),s=k(o,"stop_reason"),r=k(o,"content");if(!Array.isArray(r))throw new w("bad-response","Anthropic returned an unexpected response shape.");let a=r.map(l=>typeof k(l,"text")=="string"?String(k(l,"text")):"").join("");if(a.trim()==="")throw new w("bad-response","Anthropic returned an empty response.");if(s==="max_tokens")throw new w("bad-response","Anthropic hit the token limit before finishing. Try a smaller request or another model.");return a}};var Mn=45e3,ut={meta:{id:"custom",name:"Custom (OpenAI-compatible)",defaultModel:"",models:[],needsKey:!1,keyOptional:!0,origin:"",transport:"Your request text is sent from this browser directly to the base URL you entered, never to us."},async complete(n,t,e){let i=Z(e.baseUrl);if(!i)throw new w("unknown","Custom provider needs a valid Base URL (https://\u2026/v1) in Settings.");if(t.trim()==="")throw new w("model-not-found","Custom provider has no model selected. Open Settings and pick one.");let o=await C(`${i}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",...n.trim()!==""?{Authorization:`Bearer ${n}`}:{}},body:JSON.stringify({model:t,temperature:e.temperature??.2,max_tokens:e.maxTokens??1400,...e.json?{response_format:{type:"json_object"}}:{},messages:[{role:"system",content:e.system},{role:"user",content:e.user}]}),signal:e.signal},Mn,"Custom provider"),s=await L(o,"Custom provider"),r=k(s,"choices",0,"message","content");if(typeof r!="string"||r.trim()==="")throw new w("bad-response","The custom provider returned an empty response.");return r}};var Nn=3e4,pt={meta:{id:"gemini",name:"Google Gemini",defaultModel:"gemini-2.0-flash",models:["gemini-2.0-flash","gemini-2.5-flash","gemini-1.5-flash","gemini-1.5-pro"],keyUrl:"https://aistudio.google.com/app/apikey",needsKey:!0,origin:"https://generativelanguage.googleapis.com/*",transport:"Your request text is sent from this browser directly to Google, never to us."},async complete(n,t,e){if(n.trim()==="")throw new w("no-key","Google Gemini needs an API key. Add one in Settings.");let i=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(t)}:generateContent`,o=await C(i,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":n},body:JSON.stringify({systemInstruction:{parts:[{text:e.system}]},contents:[{role:"user",parts:[{text:e.user}]}],generationConfig:{temperature:e.temperature??.2,maxOutputTokens:e.maxTokens??1400,...e.json?{responseMimeType:"application/json"}:{}}}),signal:e.signal},Nn,"Google Gemini"),s=await L(o,"Google Gemini"),r=k(s,"candidates",0);if(!r){let c=k(s,"promptFeedback","blockReason");throw new w("bad-response",typeof c=="string"?`Gemini blocked this request (${c}).`:"Gemini returned no candidates.")}let a=k(r,"content","parts"),l=Array.isArray(a)?a.map(c=>typeof k(c,"text")=="string"?String(k(c,"text")):"").join(""):"";if(l.trim()==="")throw new w("bad-response","Gemini returned an empty response.");return l}};var zn=45e3,gt={meta:{id:"ollama",name:"Ollama (local)",defaultModel:"llama3.1",models:["llama3.1","llama3.2","qwen2.5","mistral","phi3"],needsKey:!1,origin:"http://127.0.0.1:11434/*",transport:"Runs entirely on your machine. Nothing leaves your computer."},async complete(n,t,e){let i;try{i=await C("http://127.0.0.1:11434/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:t,stream:!1,...e.json?{format:"json"}:{},options:{temperature:e.temperature??.2},messages:[{role:"system",content:e.system},{role:"user",content:e.user}]}),signal:e.signal},zn,"Ollama")}catch(r){throw mt(r)}let o;try{o=await L(i,"Ollama")}catch(r){throw mt(r)}let s=k(o,"message","content");if(typeof s!="string"||s.trim()==="")throw new w("bad-response","Ollama returned an empty response. Is the model pulled?");return s}};function mt(n){return n instanceof w?n.status===403?new w("auth","Ollama refused the request (403). Start Ollama with OLLAMA_ORIGINS=chrome-extension://* (then restart it) so it accepts this extension.",{status:403}):n.kind==="network"?new w("network",'Could not reach Ollama at 127.0.0.1:11434. Make sure it is running (ollama serve) and click "Test connection" once so the extension can ask for access.'):n.kind==="model-not-found"||n.status===404?new w("model-not-found","Ollama does not have this model. Pick an installed one in Settings, or run: ollama pull <model>.",{status:404}):n:new w("unknown","Ollama request failed unexpectedly.")}var In=3e4;function Me(n){return{meta:{id:n.id,name:n.name,defaultModel:n.defaultModel,models:n.models,keyUrl:n.keyUrl,needsKey:!0,origin:n.origin,transport:`Your request text is sent from this browser directly to ${n.name}, never to us.`},async complete(t,e,i){if(t.trim()==="")throw new w("no-key",`${n.name} needs an API key. Add one in Settings.`);let o=await C(n.endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`,...n.extraHeaders??{},...n.id==="openrouter"?{"X-Title":"Second Thought"}:{}},body:JSON.stringify({model:e,temperature:i.temperature??.2,max_tokens:i.maxTokens??1400,...i.json?{response_format:{type:"json_object"}}:{},messages:[{role:"system",content:i.system},{role:"user",content:i.user}]}),signal:i.signal},In,n.name),s=await L(o,n.name),r=k(s,"choices",0,"message","content"),a=k(s,"choices",0,"message","refusal");if(typeof a=="string"&&a!=="")throw new w("bad-response",`${n.name} declined to answer this request.`);if(typeof r!="string"||r.trim()==="")throw new w("bad-response",`${n.name} returned an empty response.`);return r}}}var ht=Me({id:"openai",name:"OpenAI",endpoint:"https://api.openai.com/v1/chat/completions",defaultModel:"gpt-4o-mini",models:["gpt-4o-mini","gpt-4o","gpt-4.1","gpt-4.1-mini","o4-mini"],keyUrl:"https://platform.openai.com/api-keys",origin:"https://api.openai.com/*"}),ft=Me({id:"openrouter",name:"OpenRouter",endpoint:"https://openrouter.ai/api/v1/chat/completions",defaultModel:"openai/gpt-4o-mini",models:["openai/gpt-4o-mini","anthropic/claude-3.5-haiku","google/gemini-2.0-flash-001","meta-llama/llama-3.1-8b-instruct","qwen/qwen-2.5-72b-instruct"],keyUrl:"https://openrouter.ai/keys",origin:"https://openrouter.ai/*"}),bt=Me({id:"groq",name:"Groq",endpoint:"https://api.groq.com/openai/v1/chat/completions",defaultModel:"llama-3.3-70b-versatile",models:["llama-3.3-70b-versatile","llama-3.1-8b-instant"],keyUrl:"https://console.groq.com/keys",origin:"https://api.groq.com/*"});var yt={gemini:pt,groq:bt,openai:ht,openrouter:ft,anthropic:dt,ollama:gt,custom:ut},qn=["gemini","groq","openai","anthropic","openrouter","ollama","custom"];function wt(){return qn.map(n=>yt[n].meta)}function xt(n){return typeof n=="string"&&n in yt}var q={enabled:!0,autoIntercept:!0,analysisEngine:"ai",aiProvider:"gemini",aiModel:"",customBaseUrl:"",useCompanion:!1,maxQuestions:4,adaptiveFollowUp:!0,historyEnabled:!1,excludedSites:[],customSites:[],theme:"system",onboarded:!1},vt="settings";async function St(){let n=(await chrome.storage.sync.get(vt))[vt];return jn({...q,...n??{}})}function jn(n){return{enabled:!!n.enabled,autoIntercept:!!n.autoIntercept,analysisEngine:n.analysisEngine==="ai"?"ai":"local",aiProvider:xt(n.aiProvider)?n.aiProvider:q.aiProvider,aiModel:typeof n.aiModel=="string"&&n.aiModel.trim()!==""&&n.aiModel.trim()!==On(n.aiProvider)?n.aiModel.trim().slice(0,120):"",customBaseUrl:Z(n.customBaseUrl)??"",useCompanion:n.useCompanion===!0,maxQuestions:Math.max(1,Math.min(6,Math.round(Number(n.maxQuestions)||4))),adaptiveFollowUp:n.adaptiveFollowUp!==!1,historyEnabled:!!n.historyEnabled,excludedSites:kt(n.excludedSites),customSites:kt(n.customSites),theme:n.theme==="light"||n.theme==="dark"?n.theme:"system",onboarded:!!n.onboarded}}function kt(n){if(!Array.isArray(n))return[];let t=new Set;for(let e of n){if(typeof e!="string")continue;let i=e.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/.*$/,"");i!==""&&(i!=="localhost"&&!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(i)||t.add(i))}return Array.from(t)}function On(n){return wt().find(t=>t.id===n)?.defaultModel??q.aiModel}function Ne(n){try{return new URL(n).hostname.replace(/^www\./,"")}catch{return""}}function At(n,t){return n.some(e=>t===e||t.endsWith(`.${e}`))}var _t=`
/* \u2500\u2500 shell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
     the panel receives focus \u2014 which slid the header out of the panel and left
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

/* \u2500\u2500 header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 body \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 analyzing stage \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 context block \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 completeness meter \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 questions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
/* The border width never changes on selection \u2014 a thicker border moved every
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

/* \u2500\u2500 conflict banner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 summary stage \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* Answered vs. obtainable \u2014 two honest numbers, never one inflated one. */
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

/* \u2500\u2500 review stage \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.review__changes { margin: 0 0 13px; padding: 0; list-style: none; }
.review__changes li {
  font-size: 11.5px; color: var(--st-fg-muted); line-height: 1.45;
  padding: 3px 0 3px 17px; position: relative;
}
.review__changes li::before {
  content: "\u2713"; position: absolute; left: 0; top: 2px;
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

/* \u2500\u2500 error stage \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 footer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 responsive \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

  /* \u2500\u2500 cinematic finish \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
`;function Et(n={}){let{size:t=20,animated:e=!1,inverted:i=!1,label:o,className:s=""}=n,r=i?"#fff":"var(--st-mark-disc, #000)",a=i?"#000":"var(--st-mark-ink, #fff)",l=["st-mark",e?"st-mark--in":"",s].filter(Boolean).join(" "),c=o?`role="img" aria-label="${$n(o)}"`:'aria-hidden="true" focusable="false"';return`<svg class="${l}" width="${t}" height="${t}" viewBox="0 0 64 64" ${c}
    style="display:block;overflow:visible;flex:none">
    <circle class="st-mark__disc" cx="32" cy="32" r="32" fill="${r}" />
    <text class="st-mark__ess" x="11" y="46" fill="${a}"
      font-family="Inter, 'Arial Black', sans-serif" font-size="34" font-weight="800">S</text>
    <path class="st-mark__tee" d="M32 14h24M44 14v36" fill="none" stroke="${a}"
      stroke-width="3.2" stroke-linecap="square" />
  </svg>`}var Tt=`
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
`,wo="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#000"/><text x="11" y="46" fill="#fff" font-family="Inter,Arial Black,sans-serif" font-size="34" font-weight="800">S</text><path d="M32 14h24M44 14v36" stroke="#fff" stroke-width="3.2" stroke-linecap="square" fill="none"/></svg>');function $n(n){return n.replace(/[&<>"']/g,t=>t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t==='"'?"&quot;":"&#39;")}var Ct=`
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
`,Lt=`
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
`;var X=["Reading your request\u2026","Detecting the task category\u2026","Finding missing requirements\u2026","Checking for ambiguity\u2026","Writing questions\u2026"],ee=class{constructor(t){this.cb=t;this.host=document.createElement("div"),this.host.id="second-thought-panel",this.root=this.host.attachShadow({mode:"closed"}),this.askedSlots=t.result.questions.map(e=>e.slot)}cb;host;root;stage="analyzing";stageEl=null;bodyEl;footerEl;questions=[];answers={};askedSlots=[];round=0;outcome=null;scoreFrameEl=null;missingNoteEl=null;lastScore=null;busy=!1;stepTimer=null;theme="light";get isOpen(){return this.host.isConnected}isAttached(){return this.host.isConnected}flash(){let t=this.root.querySelector(".overlay");t&&(t.classList.remove("is-flash"),t.offsetWidth,t.classList.add("is-flash"))}open(){let t=document.createElement("style");t.textContent=`${Ct}
${Lt}
${Tt}
${_t}`,this.root.appendChild(t),this.theme="dark",this.host.setAttribute("data-theme","dark");let e=document.createElement("div");e.className="overlay",e.dataset.theme=this.theme,this.theme==="dark"&&e.setAttribute("data-theme","dark"),e.setAttribute("role","dialog"),e.setAttribute("aria-label","Second Thought \u2014 complete your request"),e.setAttribute("aria-modal","false"),e.appendChild(this.buildHeader()),this.bodyEl=document.createElement("div"),this.bodyEl.className="body",e.appendChild(this.bodyEl),this.footerEl=document.createElement("div"),this.footerEl.className="footer",e.appendChild(this.footerEl),this.root.appendChild(e),document.documentElement.appendChild(this.host),document.addEventListener("keydown",this.onKeydown,!0),this.renderAnalyzing(),this.advanceFromAnalyzing()}dispose(){document.removeEventListener("keydown",this.onKeydown,!0),this.stepTimer!==null&&window.clearInterval(this.stepTimer),this.stepTimer=null,this.host.remove()}onKeydown=t=>{t.key==="Escape"&&(t.stopPropagation(),t.preventDefault(),this.handleDismiss())};buildHeader(){let t=document.createElement("div");t.className="header";let e=document.createElement("div");e.className="header__brand";let i=document.createElement("span");i.style.display="flex",i.innerHTML=Et({size:17,animated:!0});let o=document.createElement("span");o.className="header__name",o.textContent="Second Thought",e.append(i,o);let s=document.createElement("span");s.className="header__task",s.textContent=ae(this.cb.result.taskType),s.title=se(this.cb.result.taskType);let r=document.createElement("span"),a=this.cb.engine==="ai";r.className=`engine-chip${a?"":" engine-chip--local"}`,r.textContent=a?"AI":"Local",r.title=a?"Questions generated with your configured AI provider":"Questions generated on-device by the local requirement engine";let l=document.createElement("div");l.className="header__spacer";let c=document.createElement("button");return c.className="icon-btn",c.setAttribute("aria-label","Close and keep my draft unchanged"),c.textContent="\u2715",c.addEventListener("click",()=>this.handleDismiss()),t.append(e,s,r,l,c),t}renderAnalyzing(){this.stage="analyzing",this.bodyEl.textContent="",this.footerEl.textContent="";let t=document.createElement("div");t.className="analyzing stage";let e=document.createElement("div");e.className="analyzing__visual";let i=document.createElement("div");i.className="analyzing__scan";let o=document.createElement("div");o.className="analyzing__lines";for(let u=0;u<3;u+=1){let g=document.createElement("div");g.className="analyzing__line",o.appendChild(g)}e.append(i,o);let s=document.createElement("div");s.className="analyzing__title",s.textContent="Taking a second thought";let r=document.createElement("div");r.className="analyzing__step",r.textContent=X[0],t.append(e,s,r),this.bodyEl.appendChild(t);let a=0;this.stepTimer=window.setInterval(()=>{a=(a+1)%X.length,r.textContent=X[a]??X[0]},620);let l=document.createElement("button");l.className="btn btn--ghost",l.textContent="Skip",l.addEventListener("click",()=>{this.stepTimer!==null&&window.clearInterval(this.stepTimer),this.stepTimer=null,this.startClarify()});let c=document.createElement("span");c.className="footer__info",c.textContent=this.cb.engine==="ai"?"AI analysis":"On-device",this.footerEl.append(c,W(),l)}async advanceFromAnalyzing(){await new Promise(t=>setTimeout(t,420)),this.host.isConnected&&(this.stepTimer!==null&&(window.clearInterval(this.stepTimer),this.stepTimer=null),this.stage==="analyzing"&&this.startClarify())}startClarify(){this.cb.fallback&&this.renderFallbackNote(),this.renderClarify(this.cb.result.questions,!1)}renderFallbackNote(){let t=this.cb.fallback;if(!t||t.message==="")return;let e=document.createElement("div");e.className="conflict";let i=document.createElement("b");i.textContent="Local analysis. ",e.append(i,document.createTextNode(t.message)),this.bodyEl.appendChild(e)}renderClarify(t,e){this.stage="clarify",this.bodyEl.textContent="",this.footerEl.textContent="",this.questions=[],this.cb.fallback&&!e&&this.renderFallbackNote(),this.bodyEl.appendChild(this.buildContext()),this.bodyEl.appendChild(this.buildMeter(this.cb.result.completeness.score,e?"First-round answers counted. These second-round questions are not yet included.":void 0)),this.bodyEl.appendChild(this.buildRoundLabel(e,t.length));for(let i of t){let o=this.buildQuestion(i);this.questions.push(o),this.bodyEl.appendChild(o.root)}this.syncConditionalVisibility(),this.renderQuestionFooter()}buildContext(){let t=document.createElement("div");t.className="context";let e=document.createElement("span");e.className="context__label",e.textContent="Your request";let i=document.createElement("div");return i.className="context__quote",i.textContent=ze(this.cb.result.original,180),t.append(e,i),t}buildMeter(t,e){let i=document.createElement("div");i.className="meter";let o=document.createElement("div");o.className="meter__head";let s=document.createElement("span");s.className="meter__label",s.textContent="Requirement completeness";let r=document.createElement("span");r.className="meter__value",r.textContent=`${t}%`,o.append(s,r);let a=document.createElement("div");a.className="meter__track";let l=document.createElement("div");l.className="meter__fill",l.style.width=`${t}%`,a.appendChild(l),i.append(o,a);let c=this.cb.result.completeness.facets,u=[["Intent",c.intentClarity.score],["Scope",c.scope.score],["Function",c.functional.score],["Output",c.output.score]],g=document.createElement("div");g.className="meter__facets";for(let[f,d]of u){let m=document.createElement("span");m.className="meter__facet";let h=document.createElement("b");h.textContent=`${d}`,m.append(document.createTextNode(`${f} `),h),g.appendChild(m)}if(i.appendChild(g),e){let f=document.createElement("div");f.className="meter__note",f.textContent=e,i.appendChild(f)}return i}buildRoundLabel(t,e){let i=document.createElement("div");i.className="round-label";let o=document.createElement("span");o.className="round-label__text",o.textContent=t?`Follow-up \xB7 ${e} question${e===1?"":"s"}`:`${e} question${e===1?"":"s"} \xB7 answer what you can`;let s=document.createElement("span");return s.className="round-label__rule",i.append(o,s),i}buildQuestion(t){let e=document.createElement("div");e.className="q",e.dataset.slot=t.slot,e.dataset.hidden="false";let i=document.createElement("div");i.className="q__head";let o=document.createElement("div");if(o.className="q__title",o.id=`st-q-${t.slot}`,o.textContent=t.text,i.appendChild(o),t.optional){let u=document.createElement("span");u.className="q__optional",u.textContent="Optional",i.appendChild(u)}e.appendChild(i);let s=document.createElement("div");s.className="q__why",s.textContent=t.rationale??"",e.appendChild(s);let r=[],a=null,l=null,c=null;if(t.kind==="text"){let u=t.suggestions??[];if(u.length>0){let g=document.createElement("div");g.className="chips",g.setAttribute("role","group"),g.setAttribute("aria-label","Suggested answers \u2014 tap to use");for(let f of u){let d=document.createElement("button");d.type="button",d.className="chip",d.textContent=f,d.addEventListener("click",m=>{m.preventDefault(),c&&(c.value=f,c.focus(),c.setSelectionRange(f.length,f.length),this.updateFooterState())}),g.appendChild(d)}e.appendChild(g)}if(c=document.createElement("textarea"),c.className="q__text",c.rows=2,c.placeholder=t.hint??"Type your answer\u2026",c.setAttribute("aria-labelledby",o.id),c.addEventListener("input",()=>this.updateFooterState()),e.appendChild(c),t.hint){let g=document.createElement("div");g.className="q__hint",g.textContent=t.hint,e.appendChild(g)}}else{let u=document.createElement("div");u.className="opts",u.setAttribute("role",t.kind==="multi"?"group":"radiogroup"),u.setAttribute("aria-labelledby",o.id);let g=`st-${this.cb.analysisId}-${t.slot}`;for(let f of t.options){let{label:d,input:m}=this.buildOption({question:t,name:g,value:f.value,text:f.label,tag:f.aggregate?"all":void 0});m.addEventListener("change",()=>{e.tabIndex=-1,e.focus({preventScroll:!0}),this.syncCheckedStyles(e),this.closeCustom(a,l),this.syncConditionalVisibility(),this.updateFooterState()}),r.push(m),u.appendChild(d)}if(t.allowCustom){let f=this.buildOption({question:t,name:g,value:"__other__",text:"Other \u2014 type my own",other:!0});f.input.addEventListener("change",()=>{if(this.syncCheckedStyles(e),a&&l){let d=f.input.checked;a.classList.toggle("is-open",d),d?l.focus():l.value=""}this.updateFooterState()}),r.push(f.input),u.appendChild(f.label),a=document.createElement("div"),a.className="q__custom",l=document.createElement("input"),l.type="text",l.placeholder="Your answer\u2026",l.setAttribute("aria-label",`Custom answer for: ${t.text}`),l.addEventListener("input",()=>this.updateFooterState()),a.appendChild(l)}e.appendChild(u),a&&e.appendChild(a)}return{slot:t.slot,root:e,question:t,radios:r,customWrap:a,customInput:l,textInput:c}}buildOption(t){let e=document.createElement("label");e.className=`opt${t.other?" opt--other":""}`;let i=document.createElement("input");i.type=t.question.kind==="multi"?"checkbox":"radio",i.name=t.name,i.value=t.value,i.className="st-sr",i.tabIndex=-1,t.question.kind==="multi"&&(i.dataset.multi="true");let o=document.createElement("span");o.className=`opt__mark${t.question.kind==="multi"?" opt__mark--multi":""}`;let s=document.createElement("span");if(s.className="opt__label",s.textContent=t.text,e.append(i,o,s),t.tag){let r=document.createElement("span");r.className="opt__tag",r.textContent=t.tag,e.appendChild(r)}return{label:e,input:i}}closeCustom(t,e){!t||!e||(t.classList.remove("is-open"),e.value="")}syncCheckedStyles(t){for(let e of Array.from(t.querySelectorAll(".opt"))){let o=!!e.querySelector("input")?.checked;e.classList.toggle("is-checked",o),e.classList.toggle("is-selected",o)}}syncConditionalVisibility(){let t=this.collectAnswers();for(let e of this.questions){let i=e.question.condition;if(!i){e.root.dataset.hidden="false";continue}let o=t[i.slot],r=(o===void 0?[]:Array.isArray(o)?o:[o]).some(a=>i.equals.some(l=>String(a).toLowerCase().includes(l.toLowerCase())));if(e.root.dataset.hidden=String(!r),!r){for(let a of e.radios)a.checked=!1;e.textInput&&(e.textInput.value=""),e.customInput&&(e.customInput.value=""),this.syncCheckedStyles(e.root)}}}visibleQuestions(){return this.questions.filter(t=>t.root.dataset.hidden!=="true")}collectAnswers(){let t={};for(let e of this.visibleQuestions()){if(e.textInput){let s=e.textInput.value.trim();s!==""&&(t[e.slot]=s);continue}let i=e.radios.filter(s=>s.checked);if(i.length===0)continue;let o=[];for(let s of i)if(s.value==="__other__"){let r=e.customInput?.value.trim()??"";r!==""&&o.push(r)}else o.push(s.value);o.length!==0&&(t[e.slot]=e.question.kind==="multi"?o:o[0])}return t}updateFooterState(){let t=this.footerEl.querySelector('[data-action="next"]'),e=Object.keys(this.collectAnswers()).length;t&&(t.disabled=this.busy||e===0);let i=this.footerEl.querySelector('[data-role="progress"]');if(!i)return;let o=this.visibleQuestions().length;i.textContent=e===0?`${o} to answer`:`${e} of ${o} answered`}renderQuestionFooter(){this.footerEl.textContent="";let t=document.createElement("span");t.className="footer__info",t.dataset.role="progress",this.updateFooterState();let e=document.createElement("button");e.className="btn btn--ghost",e.textContent="Send original",e.title="Send your message exactly as you typed it",e.addEventListener("click",()=>this.handleSendOriginal());let i=document.createElement("button");i.className="btn btn--primary",i.dataset.action="next",i.textContent=this.round===0?"Continue":"Build prompt",i.disabled=!0,i.addEventListener("click",()=>{this.handleContinue(i)}),this.footerEl.append(t,W(),e,i),this.updateFooterState()}async handleContinue(t){if(this.busy)return;let e=this.collectAnswers();if(Object.keys(e).length===0)return;this.busy=!0,t.disabled=!0,t.textContent="Thinking\u2026";let i=document.createElement("span");i.className="spinner",t.prepend(i),this.answers={...this.answers,...e};try{let o=await this.cb.onNextRound(e,this.askedSlots);if(o.questions.length>0&&this.round<1){this.round+=1,this.askedSlots=Array.from(new Set([...this.askedSlots,...o.questions.map(s=>s.slot)])),this.busy=!1,this.renderClarify(o.questions,!0),o.fallback&&(this.cb.fallback=o.fallback);return}}catch{}finally{this.busy=!1}this.renderSummary()}renderSummary(){this.stage="summary",this.bodyEl.textContent="",this.footerEl.textContent="";let t=document.createElement("div");t.className="stage summary";let e=document.createElement("div");e.className="summary__head";let i=document.createElement("div");i.className="summary__title",i.textContent="What we understood";let o=document.createElement("div");o.className="summary__sub",o.textContent="These are the requirements that will be added to your message. You can edit the final prompt next.",e.append(i,o),t.appendChild(e);let s=document.createElement("div");s.className="summary__list";let r=this.summaryEntries();if(r.length===0){let f=document.createElement("div");f.className="summary__row";let d=document.createElement("div");d.className="summary__val summary__empty",d.textContent="No new requirements \u2014 your original wording will be sent as-is.",f.appendChild(d),s.appendChild(f)}else for(let[f,d]of r){let m=document.createElement("div");m.className="summary__row";let h=document.createElement("div");h.className="summary__key",h.textContent=f;let p=document.createElement("div");p.className="summary__val",p.textContent=d,m.append(h,p),s.appendChild(m)}t.appendChild(s),t.appendChild(this.buildScoreFraming());let a=this.buildMeter(this.cb.result.completeness.score);a.style.marginBottom="4px",a.dataset.role="summary-meter",t.appendChild(a);let l=document.createElement("div");l.className="summary__missing",l.dataset.role="missing",t.appendChild(l),this.missingNoteEl=l,this.bodyEl.appendChild(t),this.refreshScore();let c=document.createElement("button");c.className="btn btn--ghost",c.textContent="Back",c.addEventListener("click",()=>this.renderClarify(this.cb.result.questions,this.round>0));let u=document.createElement("button");u.className="btn",u.textContent="Send original",u.addEventListener("click",()=>this.handleSendOriginal());let g=document.createElement("button");g.className="btn btn--primary",g.textContent="Build prompt",g.addEventListener("click",()=>{this.handleBuild(g)}),this.footerEl.append(c,W(),u,g)}buildScoreFraming(){let t=document.createElement("div");t.className="score-frame",t.dataset.role="score-frame";let e=(i,o,s="")=>{let r=document.createElement("span");return r.className=`score-frame__item${s}`,r.dataset.role=o,r.textContent=i,r};return t.append(e(`Your wording ${this.cb.result.completeness.score}%`,"score-original"),e("\u2192","score-arrow"," score-frame__arrow"),e("Answered \u2014","score-now"," score-frame__item--now"),e("","score-projected"," score-frame__item--projected")),this.scoreFrameEl=t,t}async refreshScore(){let t=this.scoreFrameEl,e=await this.requestScore();if(!t||!t.isConnected)return;let i=t.querySelector('[data-role="score-now"]'),o=t.querySelector('[data-role="score-projected"]');if(!e){i?.remove(),o?.remove();return}if(i&&(i.textContent=`Answered ${e.current.score}%`),this.applyScoreToMeter(e),o){let s=e.projected-e.current.score;o.textContent=s>=3?`Answering all ${e.projected}%`:"",o.title="Projection: what answering every question still on screen would reach."}this.lastScore=e,this.refreshMissingNote(e.missingLabels)}applyScoreToMeter(t){let e=this.bodyEl.querySelector('[data-role="summary-meter"]');if(!e)return;let i=e.querySelector(".meter__value"),o=e.querySelector(".meter__fill");i&&(i.textContent=`${t.current.score}%`),o&&(o.style.width=`${t.current.score}%`);let s=t.current.facets,r=[["Intent",s.intentClarity.score],["Scope",s.scope.score],["Function",s.functional.score],["Output",s.output.score]],a=e.querySelector(".meter__facets");if(!a)return;let l=Array.from(a.querySelectorAll(".meter__facet"));r.forEach(([,c],u)=>{let g=l[u]?.querySelector("b");g&&(g.textContent=`${c}`)})}async requestScore(){if(!this.cb.onScore)return null;try{return await this.cb.onScore(this.answers,this.questions.map(t=>t.slot))}catch{return null}}refreshMissingNote(t){let e=this.missingNoteEl;if(!e)return;if(e.textContent="",t.length===0){let s=document.createElement("span");s.textContent="Everything material about this request is now specified.",e.appendChild(s);return}let i=document.createElement("span");i.className="summary__missing-label",i.textContent="Still unspecified";let o=document.createElement("span");o.textContent=t.slice(0,5).join(" \xB7 ").toLowerCase(),e.append(i,o)}summaryEntries(){return Object.entries(this.answers).map(([t,e])=>{let o=this.findQuestion(t)?.slot??t,s=Array.isArray(e)?e.join(", "):e;return[Dn(o),ze(s,120)]}).filter(([,t])=>t.trim()!=="")}findQuestion(t){return this.questions.find(e=>e.slot===t)?.question??this.cb.result.questions.find(e=>e.slot===t)}async handleBuild(t){if(this.busy)return;this.busy=!0,t.disabled=!0,t.textContent="Composing\u2026";let e=document.createElement("span");e.className="spinner",t.prepend(e);try{let i=await this.cb.onRefine(this.answers);this.outcome=i,this.renderReview(i)}catch(i){this.renderError("Second Thought could not compose the prompt.",i)}finally{this.busy=!1}}renderReview(t){this.stage="review",this.bodyEl.textContent="",this.footerEl.textContent="";let e=document.createElement("div");if(e.className="stage review",e.appendChild(this.buildMeter(t.completeness.score)),t.changes.length>0){let g=document.createElement("ul");g.className="review__changes";for(let f of t.changes.slice(0,7)){let d=document.createElement("li");d.textContent=ze(f,96),g.appendChild(d)}e.appendChild(g)}let i=document.createElement("div");i.className="prompt-box";let o=document.createElement("div");o.className="prompt-box__head";let s=document.createElement("span");s.className="prompt-box__label",s.textContent="Final prompt \u2014 editable";let r=document.createElement("button");r.className="btn btn--sm btn--ghost",r.textContent="Copy",r.addEventListener("click",()=>{navigator.clipboard.writeText(a.value).then(()=>{r.textContent="Copied",window.setTimeout(()=>{r.textContent="Copy"},1400)}).catch(()=>{a.select()})}),o.append(s,r);let a=document.createElement("textarea");a.value=t.prompt,a.setAttribute("aria-label","Final prompt (editable)"),a.spellcheck=!1,i.append(o,a),e.appendChild(i),e.appendChild(this.buildResidual(t.residualGaps)),this.bodyEl.appendChild(e);let l=document.createElement("button");l.className="btn btn--ghost",l.textContent="Back",l.addEventListener("click",()=>{this.outcome=null,this.renderSummary()});let c=document.createElement("button");c.className="btn",c.textContent="Regenerate",c.title="Discard edits and rebuild from your answers",c.addEventListener("click",()=>{this.outcome&&(a.value=this.outcome.prompt)});let u=document.createElement("button");u.className="btn btn--primary",u.textContent="Use this prompt",u.addEventListener("click",()=>{let g=a.value.trim()===""?t.prompt:a.value;this.dispose(),this.cb.onUseRefined(g)}),this.footerEl.append(l,c,W(),u)}buildResidual(t){let e=document.createElement("div"),i=document.createElement("span");i.className="residual__dot",e.appendChild(i);let o=document.createElement("span");if(t.length===0)e.className="residual residual--ok",o.textContent="Everything material is covered.";else{e.className="residual";let s=t.slice(0,3).map(r=>r.label.toLowerCase());o.textContent=s.length===1?`Still unspecified: ${s[0]}. You can add it above, or send as-is.`:`Still unspecified: ${s.slice(0,-1).join(", ")} and ${s[s.length-1]}. You can add it above, or send as-is.`}return e.appendChild(o),e}renderError(t,e){this.stage="error",this.bodyEl.textContent="",this.footerEl.textContent="";let i=document.createElement("div");i.className="stage";let o=document.createElement("div");o.className="err-box";let s=document.createElement("div");s.className="err-box__title",s.textContent=t;let r=document.createElement("div");if(r.className="err-box__body",r.textContent=e instanceof Error&&e.message!==""?e.message:"Your original message is untouched and can still be sent.",o.append(s,r),i.appendChild(o),this.outcome){let c=document.createElement("div");c.className="prompt-box";let u=document.createElement("textarea");u.value=this.outcome.prompt,u.setAttribute("aria-label","Last generated prompt"),c.appendChild(u),i.appendChild(c)}this.bodyEl.appendChild(i);let a=document.createElement("button");a.className="btn",a.textContent="Try again",a.addEventListener("click",()=>{this.outcome?this.renderReview(this.outcome):this.renderSummary()});let l=document.createElement("button");l.className="btn btn--primary",l.textContent="Send original",l.addEventListener("click",()=>this.handleSendOriginal()),this.footerEl.append(a,W(),l)}handleSendOriginal(){this.dispose(),this.cb.onSendOriginal()}handleDismiss(){this.dispose(),this.cb.onDismiss()}};function W(){let n=document.createElement("div");return n.className="footer__spacer",n}function ze(n,t){let e=n.trim();return e.length<=t?e:`${e.slice(0,t-1).trimEnd()}\u2026`}function Dn(n){return n.replace(/[_.]+/g," ").replace(/\b\w/g,t=>t.toUpperCase()).trim()}var j={settings:2e3,analyzeLocal:3e3,analyzeAi:36e3,nextRound:36e3,refine:16e3},te=class{adapter=null;settings={...q};panel=null;suppressUntil=0;destroyed=!1;inFlight=!1;async start(){try{let t=Ne(location.href);try{let i=await this.withTimeout(this.send({type:"st/settings-get"}),j.settings);i?.settings&&(this.settings={...q,...i.settings})}catch{this.settings=await St().catch(()=>({...q}))}let e=ct(t,this.settings.customSites??[]);if(this.adapter=e.adapter,!this.adapter)return;chrome.storage.onChanged.addListener((i,o)=>{if(o!=="sync")return;let s=i.settings?.newValue;s&&(this.settings={...this.settings,...s})}),this.bindGlobalListeners()}catch{}}dispose(){this.destroyed=!0;try{document.removeEventListener("keydown",this.onKeydown,!0),document.removeEventListener("click",this.onClick,!0)}catch{}this.closePanel()}onKeydown=t=>this.handleKeyEvent(t);onClick=t=>this.handleClickEvent(t);bindGlobalListeners(){document.addEventListener("keydown",this.onKeydown,!0),document.addEventListener("click",this.onClick,!0),chrome.runtime.onMessage.addListener((t,e,i)=>{if(t?.type==="st/open-panel")return this.openForCurrentDraft().then(o=>i({ok:o})),!0;if(t?.type==="st/ping"){let o=!1,s=!1;try{o=!!this.adapter?.findInput(),s=!!this.adapter?.findSendButton()}catch{}return i({ok:!0,adapter:this.adapter?.id??null,inputFound:o,sendFound:s}),!1}return!1})}handleKeyEvent(t){try{if(t.key!=="Enter"||t.shiftKey||t.isComposing||t.ctrlKey||t.metaKey||t.altKey)return;let e=this.adapter?.findInput();if(!e||!t.target)return;let i=t.target;if(!(i===e||e.contains(i)))return;this.processSendIntent(t,e,this.shouldPause(t,e))}catch{}}shouldPause(t,e){let i=this.settings,o=this.adapter;if(!o||Date.now()<this.suppressUntil)return!1;if(this.inFlight)return t.preventDefault(),t.stopImmediatePropagation(),!1;let s=o.getText(e).trim();if(s==="")return!1;let r=Ne(location.href);if(At(i.excludedSites??[],r)||!i.enabled||!i.autoIntercept)return!1;if(this.panel?.isOpen)return t.preventDefault(),t.stopImmediatePropagation(),this.panel.flash(),!1;let a;try{a=Ce(s,{maxQuestions:i.maxQuestions})}catch{return!1}return a.isRefinable?(t.preventDefault(),t.stopImmediatePropagation(),!0):!1}handleClickEvent(t){try{let e=this.adapter?.findSendButton();if(!e||!t.target)return;let i=t.target,o=i instanceof Element?i.closest('button, [role="button"]'):null;if(!o||o!==e&&!e.contains(o)&&!o.contains(e))return;let s=this.adapter?.findInput();if(!s)return;this.processSendIntent(t,s,this.shouldPause(t,s))}catch{}}async processSendIntent(t,e,i){let o=this.settings,s=this.adapter;if(!s||!i)return;let r=s.getText(e).trim();this.inFlight=!0;let a=o.analysisEngine==="ai"?j.analyzeAi:j.analyzeLocal,l;try{l=await this.withTimeout(this.send({type:"st/analyze",body:{text:r,url:location.href,providerId:s.id}}),a)}catch{l=void 0}finally{this.inFlight=!1}if(!this.destroyed){if(!l||l.decision==="error"||l.decision==="passthrough"){this.releaseOriginalSend();return}this.openPanel(e,l,{sendOnCancel:!0})}}async openForCurrentDraft(){try{let t=this.adapter;if(!t)return!1;let e=t.findInput();if(!e)return!1;let i=t.getText(e).trim();if(i==="")return!1;if(this.panel?.isOpen)return this.panel.flash(),!0;let o=this.settings.analysisEngine==="ai"?j.analyzeAi:j.analyzeLocal,s=await this.withTimeout(this.send({type:"st/analyze",body:{text:i,url:location.href,providerId:t.id}}),o);return s?s.decision==="passthrough"?(this.showTransientNote("Nothing material to clarify in this draft."),!1):s.decision==="error"?(this.showTransientNote("Second Thought could not analyse this draft."),!1):(this.openPanel(e,s,{sendOnCancel:!1}),!0):!1}catch{return!1}}openPanel(t,e,i){this.adapter&&(this.panel=new ee({result:e.result,analysisId:e.analysisId,engine:e.engine,fallback:e.fallback,onNextRound:async(s,r)=>{let a=await this.withTimeout(this.send({type:"st/next-round",body:{analysisId:e.analysisId,answers:s,askedSlots:r}}),j.nextRound);return!a||!a.ok?{questions:[],hasMore:!1,nextSlots:[],completeness:e.result.completeness}:(a.fallback&&(e.fallback=a.fallback),a.round)},onScore:async(s,r)=>{try{return Le(e.result,s,r)}catch{return null}},onRefine:async s=>{let r=await this.withTimeout(this.send({type:"st/refine",body:{analysisId:e.analysisId,answers:s}}),j.refine);if(!r)throw new Error("Composing the prompt timed out.");if(!r.ok)throw new Error(r.error);return r.outcome},onUseRefined:s=>{this.deliverRefinedPrompt(t,s)},onSendOriginal:()=>{i.sendOnCancel?this.releaseOriginalSend():this.closePanel()},onDismiss:()=>this.closePanel()}),this.panel.open())}releaseOriginalSend(){let t=this.adapter;if(this.closePanel(),!!t){this.suppressUntil=Date.now()+700;try{t.submit()||(this.suppressUntil=0)}catch{this.suppressUntil=0}}}async deliverRefinedPrompt(t,e){this.closePanel();let i=this.adapter;if(!i)return;let o=i.setText(t,e);if(this.suppressUntil=Date.now()+700,!(o&&i.getText(t).trim().length>0&&i.submit())){try{await navigator.clipboard.writeText(e),this.showTransientNote("Prompt copied and placed in the box \u2014 press send.")}catch{this.showTransientNote("Prompt is in the box \u2014 press send.")}this.suppressUntil=0}}showTransientNote(t){try{let e=document.createElement("div"),i=e.attachShadow({mode:"closed"}),o=document.createElement("style");o.textContent=`
        .note {
          position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
          z-index: 2147483647;
          background: #0a0a0a; color: #fff;
          font-family: Inter, system-ui, sans-serif;
          font-size: 12.5px; letter-spacing: -0.01em;
          padding: 10px 16px; border-radius: 999px;
          box-shadow: 0 8px 24px -6px rgba(0,0,0,0.4);
          max-width: min(78vw, 420px); text-align: center;
          animation: note-in 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes note-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `;let s=document.createElement("div");s.className="note",s.textContent=t,i.append(o,s),document.documentElement.appendChild(e),window.setTimeout(()=>e.remove(),4200)}catch{}}closePanel(){try{this.panel?.dispose()}catch{}this.panel=null}send(t){return chrome.runtime.sendMessage(t)}withTimeout(t,e){return new Promise((i,o)=>{let s=setTimeout(()=>o(new Error("timeout")),e);t.then(r=>{clearTimeout(s),i(r)},r=>{clearTimeout(s),o(r)})})}};try{chrome?.runtime?.id&&new te().start()}catch{}})();
