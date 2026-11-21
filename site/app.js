/* Second Thought — landing page behaviour.
   Loaded as an external file so the page can run under a strict CSP (no inline script).
   All dynamic text is written with textContent; there is no innerHTML anywhere. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  // cinematic open
  window.addEventListener('load', function () { setTimeout(function () { document.body.classList.add('ready'); }, 120); });
  setTimeout(function () { document.body.classList.add('ready'); }, 1800); // never leave the page covered

  // nav background
  var nav = $('nav');
  function onScroll() { nav.classList.toggle('solid', window.scrollY > 40); }
  onScroll();

  // reveal on scroll
  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach(function (n) { io.observe(n); });
  } else {
    revealables.forEach(function (n) { n.classList.add('is-in'); });
  }

  // parallax plates
  var plates = Array.prototype.slice.call(document.querySelectorAll('.plate'));
  var ticking = false;
  function parallax() {
    var vh = window.innerHeight;
    plates.forEach(function (p) {
      var r = p.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var speed = parseFloat(p.getAttribute('data-speed') || '0.2');
      var offset = (r.top + r.height / 2 - vh / 2) * -speed;
      p.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    onScroll();
    if (!reduce && !ticking) { ticking = true; requestAnimationFrame(parallax); }
  }, { passive: true });
  if (!reduce) parallax();

  // hero typing line, cycling languages
  var lines = [
    ['EN', 'i want a laptop'],
    ['HI', 'मुझे एक लैपटॉप चाहिए'],
    ['ZH', '我想要一台笔记本电脑'],
    ['ES', 'quiero un portátil'],
    ['FR', 'je veux un ordinateur portable']
  ];
  var tText = $('typeText'), tLang = $('typeLang');
  if (reduce) { tLang.textContent = lines[0][0]; tText.textContent = lines[0][1]; }
  else {
    var li = 0;
    (function cycle() {
      var item = lines[li % lines.length]; li += 1;
      var chars = Array.from(item[1]); var i = 0;
      tLang.textContent = item[0]; tText.textContent = '';
      var typer = setInterval(function () {
        i += 1; tText.textContent = chars.slice(0, i).join('');
        if (i >= chars.length) { clearInterval(typer); setTimeout(erase, 1700); }
      }, 70);
      function erase() {
        var eraser = setInterval(function () {
          i -= 1; tText.textContent = chars.slice(0, Math.max(i, 0)).join('');
          if (i <= 0) { clearInterval(eraser); setTimeout(cycle, 350); }
        }, 28);
      }
    })();
  }

  // interactive demo ---------------------------------------------------------
  var DEMOS = [
    { id: 'en', tab: 'English', request: 'i want a laptop', questions: [
      { q: 'What will you mainly use the laptop for?', o: ['Coding & development', 'Gaming', 'College & office work', 'Video editing & design'] },
      { q: 'What is your budget?', o: ['Under ₹40,000', '₹40,000–70,000', '₹70,000–1,20,000', 'Above ₹1,20,000'] },
      { q: 'What matters most to you?', o: ['Battery & light weight', 'Raw performance', 'A big display', 'A balance of all'] },
      { q: 'Preferred operating system?', o: ['Windows', 'macOS', 'Linux', 'No preference'] }
    ], build: function (r, a) { return '“' + r + '”\n\nMy requirements:\n• Main use: ' + a[0] + '\n• Budget: ' + a[1] + '\n• Priority: ' + a[2] + '\n• Operating system: ' + a[3] + '\n\nRecommend the 3 best laptops for this. For each give the model, key specs, pros and cons, and the approximate price within my budget. End with one clear recommendation. If anything is unknown, state your assumption in one line and continue.'; } },
    { id: 'hi', tab: 'हिन्दी', request: 'मुझे एक लैपटॉप चाहिए', questions: [
      { q: 'आप लैपटॉप मुख्य रूप से किस काम के लिए इस्तेमाल करेंगे?', o: ['कोडिंग और डेवलपमेंट', 'गेमिंग', 'पढ़ाई और ऑफ़िस का काम', 'वीडियो एडिटिंग और डिज़ाइन'] },
      { q: 'आपका बजट कितना है?', o: ['₹40,000 से कम', '₹40,000–70,000', '₹70,000–1,20,000', '₹1,20,000 से ज़्यादा'] },
      { q: 'आपके लिए सबसे ज़रूरी क्या है?', o: ['बैटरी और हल्का वज़न', 'तेज़ परफ़ॉर्मेंस', 'बड़ी स्क्रीन', 'सबका संतुलन'] },
      { q: 'कौन-सा ऑपरेटिंग सिस्टम पसंद है?', o: ['Windows', 'macOS', 'Linux', 'कोई पसंद नहीं'] }
    ], build: function (r, a) { return '“' + r + '”\n\nमेरी ज़रूरतें:\n• उपयोग: ' + a[0] + '\n• बजट: ' + a[1] + '\n• प्राथमिकता: ' + a[2] + '\n• ऑपरेटिंग सिस्टम: ' + a[3] + '\n\nकृपया 3 सबसे अच्छे लैपटॉप सुझाएँ। हर एक के लिए मॉडल, मुख्य स्पेक्स, फ़ायदे-नुकसान और मेरे बजट में अनुमानित कीमत बताएँ। अंत में एक स्पष्ट सिफ़ारिश दें। कोई जानकारी अनिश्चित हो तो एक पंक्ति में अपनी मान्यता बताकर आगे बढ़ें।'; } },
    { id: 'zh', tab: '中文', request: '我想要一台笔记本电脑', questions: [
      { q: '你主要用这台笔记本电脑做什么？', o: ['编程开发', '玩游戏', '学习和办公', '视频剪辑与设计'] },
      { q: '你的预算是多少？', o: ['3,000 元以下', '3,000–6,000 元', '6,000–10,000 元', '10,000 元以上'] },
      { q: '哪一点对你最重要？', o: ['续航和轻便', '强劲性能', '大屏幕', '各方面均衡'] },
      { q: '偏好哪种操作系统？', o: ['Windows', 'macOS', 'Linux', '无所谓'] }
    ], build: function (r, a) { return '“' + r + '”\n\n我的需求：\n• 用途：' + a[0] + '\n• 预算：' + a[1] + '\n• 优先考虑：' + a[2] + '\n• 操作系统：' + a[3] + '\n\n请推荐 3 款最合适的笔记本电脑，并说明型号、核心配置、优缺点和预算内的大致价格，最后给出一个明确的推荐。如有不确定的信息，请用一句话说明你的假设后继续。'; } }
  ];

  var tabs = $('tabs'), body = $('panelBody'), bar = $('bar'), stepLabel = $('stepLabel'), req = $('demoReq');
  var cur = DEMOS[0], idx = 0, picks = [];

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  DEMOS.forEach(function (d, n) {
    var b = el('button', 'tab', d.tab); b.type = 'button'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', n === 0 ? 'true' : 'false');
    b.addEventListener('click', function () {
      tabs.querySelectorAll('.tab').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
      b.setAttribute('aria-selected', 'true'); cur = d; start();
    });
    tabs.appendChild(b);
  });

  function start() { idx = 0; picks = []; req.textContent = cur.request; render(); }

  function render() {
    body.textContent = '';
    var total = cur.questions.length;
    bar.style.width = Math.round((idx / total) * 100) + '%';
    if (idx < total) {
      var item = cur.questions[idx];
      var box = el('div', 'q');
      box.appendChild(el('p', 'mono qn', (idx + 1) + ' / ' + total));
      box.appendChild(el('h4', null, item.q));
      var chips = el('div', 'chips');
      item.o.forEach(function (label) {
        var c = el('button', 'chip', label); c.type = 'button'; c.setAttribute('aria-pressed', 'false');
        c.addEventListener('click', function () {
          chips.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          c.setAttribute('aria-pressed', 'true'); picks[idx] = label;
          setTimeout(function () { idx += 1; render(); }, reduce ? 0 : 380);
        });
        chips.appendChild(c);
      });
      box.appendChild(chips); body.appendChild(box);
      stepLabel.textContent = 'Question ' + (idx + 1) + ' of ' + total;
    } else {
      bar.style.width = '100%';
      var res = el('div', 'result', cur.build(cur.request, picks));
      body.appendChild(res);
      var line = el('p', 'sendline'); line.appendChild(el('span', 'ok', '✓ ')); line.appendChild(document.createTextNode('Inserted into the chat and sent'));
      body.appendChild(line);
      stepLabel.textContent = 'Done';
    }
  }
  $('restart').addEventListener('click', start);
  start();
})();
