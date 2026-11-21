/**
 * Offline, request-specific multiple-choice questions for the most common
 * "I want to buy X" requests (laptop, phone, TV, headphones) in English, Hindi
 * (Devanagari) and Hinglish.
 *
 * This is the safety net for when no AI key is saved. With a key, the model
 * writes the questions for ANY topic and ANY language; this module only makes
 * sure the no-key experience is still "what budget? how much RAM?" instead of a
 * generic empty text box.
 */

import type { Question } from '@second-thought/core';

export type BuyCategory = 'laptop' | 'phone' | 'tv' | 'headphones' | 'general';
export type BuyLang = 'en' | 'hi' | 'hl';
export type BuyCurrency = 'inr' | 'usd';

export interface BuyDetection {
  category: BuyCategory;
  lang: BuyLang;
  currency: BuyCurrency;
}

type L3 = { en: string; hi: string; hl: string };
const T = (en: string, hi: string, hl: string): L3 => ({ en, hi, hl });

interface QDef {
  slot: string;
  q: L3;
  label: L3;
  /** One list per language, or one neutral list shared by all. */
  opts: string[] | { en: string[]; hi: string[]; hl: string[] } | ((d: BuyDetection) => string[]);
}

const NOT_SURE: L3 = T('Not sure — you suggest', 'पता नहीं — आप सुझाएँ', 'Pata nahi — aap suggest karo');
const NO_PREF: L3 = T('No preference', 'कोई खास पसंद नहीं', 'Koi preference nahi');

function budget(inr: string[], usd: string[]): QDef['opts'] {
  return (d) => (d.currency === 'usd' ? usd : inr);
}

const CATEGORIES: Record<BuyCategory, { keywords: RegExp; noun: L3; questions: QDef[]; closer?: L3 }> = {
  laptop: {
    keywords: /laptops?|notebook|macbook|लैपटॉप|लैपटाप/i,
    noun: T('laptops', 'लैपटॉप', 'laptops'),
    questions: [
      {
        slot: 'main_use',
        q: T('What will you mainly use the laptop for?', 'आप लैपटॉप मुख्य रूप से किस काम के लिए इस्तेमाल करेंगे?', 'Aap laptop mainly kis kaam ke liye use karoge?'),
        label: T('Main use', 'मुख्य उपयोग', 'Main use'),
        opts: {
          en: ['Coding & development', 'Gaming', 'Study & office work', 'Video editing & design', 'Everyday browsing & streaming'],
          hi: ['कोडिंग और डेवलपमेंट', 'गेमिंग', 'पढ़ाई और ऑफ़िस का काम', 'वीडियो एडिटिंग और डिज़ाइन', 'रोज़मर्रा का इस्तेमाल'],
          hl: ['Coding & development', 'Gaming', 'Padhai & office work', 'Video editing & design', 'Daily use (browsing/movies)'],
        },
      },
      {
        slot: 'budget_range',
        q: T('What is your budget?', 'आपका बजट कितना है?', 'Aapka budget kitna hai?'),
        label: T('Budget', 'बजट', 'Budget'),
        opts: budget(
          ['Under ₹40,000', '₹40,000–60,000', '₹60,000–90,000', '₹90,000–1,50,000', 'Above ₹1,50,000'],
          ['Under $500', '$500–800', '$800–1,200', '$1,200–2,000', 'Above $2,000'],
        ),
      },
      {
        slot: 'ram',
        q: T('How much RAM do you want?', 'कितनी RAM चाहिए?', 'Kitni RAM chahiye?'),
        label: T('RAM', 'RAM', 'RAM'),
        opts: {
          en: ['8 GB', '16 GB', '32 GB or more', NOT_SURE.en],
          hi: ['8 GB', '16 GB', '32 GB या ज़्यादा', NOT_SURE.hi],
          hl: ['8 GB', '16 GB', '32 GB ya zyada', NOT_SURE.hl],
        },
      },
      {
        slot: 'storage',
        q: T('How much storage do you need?', 'कितनी स्टोरेज चाहिए?', 'Kitni storage chahiye?'),
        label: T('Storage', 'स्टोरेज', 'Storage'),
        opts: {
          en: ['256 GB SSD', '512 GB SSD', '1 TB SSD or more', NOT_SURE.en],
          hi: ['256 GB SSD', '512 GB SSD', '1 TB SSD या ज़्यादा', NOT_SURE.hi],
          hl: ['256 GB SSD', '512 GB SSD', '1 TB SSD ya zyada', NOT_SURE.hl],
        },
      },
      {
        slot: 'screen_weight',
        q: T('Which screen size and weight suits you?', 'स्क्रीन साइज़ और वज़न कैसा चाहिए?', 'Screen size aur weight kaisa chahiye?'),
        label: T('Screen & weight', 'स्क्रीन और वज़न', 'Screen & weight'),
        opts: {
          en: ['13–14" light & portable', '15–16" balanced', '17" big screen', NO_PREF.en],
          hi: ['13–14" हल्का और पोर्टेबल', '15–16" संतुलित', '17" बड़ी स्क्रीन', NO_PREF.hi],
          hl: ['13–14" light & portable', '15–16" balanced', '17" big screen', NO_PREF.hl],
        },
      },
      {
        slot: 'operating_system',
        q: T('Preferred operating system?', 'कौन-सा ऑपरेटिंग सिस्टम पसंद है?', 'Konsa operating system pasand hai?'),
        label: T('Operating system', 'ऑपरेटिंग सिस्टम', 'Operating system'),
        opts: { en: ['Windows', 'macOS', 'Linux', NO_PREF.en], hi: ['Windows', 'macOS', 'Linux', NO_PREF.hi], hl: ['Windows', 'macOS', 'Linux', NO_PREF.hl] },
      },
    ],
  },

  phone: {
    keywords: /\b(phones?|mobiles?|smartphones?|iphone|android)\b|फ़ोन|फोन|मोबाइल|स्मार्टफोन/i,
    noun: T('smartphones', 'स्मार्टफोन', 'smartphones'),
    questions: [
      {
        slot: 'main_use',
        q: T('What will you mainly use the phone for?', 'आप फ़ोन मुख्य रूप से किस काम के लिए इस्तेमाल करेंगे?', 'Aap phone mainly kis kaam ke liye use karoge?'),
        label: T('Main use', 'मुख्य उपयोग', 'Main use'),
        opts: {
          en: ['Calls & social media', 'Photography & video', 'Gaming', 'Work & multitasking'],
          hi: ['कॉल और सोशल मीडिया', 'फ़ोटो और वीडियो', 'गेमिंग', 'काम और मल्टीटास्किंग'],
          hl: ['Calls & social media', 'Photo & video', 'Gaming', 'Work & multitasking'],
        },
      },
      {
        slot: 'budget_range',
        q: T('What is your budget?', 'आपका बजट कितना है?', 'Aapka budget kitna hai?'),
        label: T('Budget', 'बजट', 'Budget'),
        opts: budget(
          ['Under ₹15,000', '₹15,000–25,000', '₹25,000–40,000', '₹40,000–70,000', 'Above ₹70,000'],
          ['Under $200', '$200–400', '$400–700', '$700–1,000', 'Above $1,000'],
        ),
      },
      {
        slot: 'ram',
        q: T('How much RAM do you want?', 'कितनी RAM चाहिए?', 'Kitni RAM chahiye?'),
        label: T('RAM', 'RAM', 'RAM'),
        opts: {
          en: ['6 GB', '8 GB', '12 GB or more', NOT_SURE.en],
          hi: ['6 GB', '8 GB', '12 GB या ज़्यादा', NOT_SURE.hi],
          hl: ['6 GB', '8 GB', '12 GB ya zyada', NOT_SURE.hl],
        },
      },
      {
        slot: 'storage',
        q: T('How much storage do you need?', 'कितनी स्टोरेज चाहिए?', 'Kitni storage chahiye?'),
        label: T('Storage', 'स्टोरेज', 'Storage'),
        opts: {
          en: ['128 GB', '256 GB', '512 GB or more', NOT_SURE.en],
          hi: ['128 GB', '256 GB', '512 GB या ज़्यादा', NOT_SURE.hi],
          hl: ['128 GB', '256 GB', '512 GB ya zyada', NOT_SURE.hl],
        },
      },
      {
        slot: 'top_priority',
        q: T('What matters most to you?', 'आपके लिए सबसे ज़रूरी क्या है?', 'Aapke liye sabse zaroori kya hai?'),
        label: T('Top priority', 'सबसे ज़रूरी', 'Top priority'),
        opts: {
          en: ['Camera quality', 'Battery & fast charging', 'Performance', 'Display quality'],
          hi: ['कैमरा क्वालिटी', 'बैटरी और फ़ास्ट चार्जिंग', 'परफ़ॉर्मेंस', 'डिस्प्ले क्वालिटी'],
          hl: ['Camera quality', 'Battery & fast charging', 'Performance', 'Display quality'],
        },
      },
      {
        slot: 'operating_system',
        q: T('Android or iPhone?', 'Android या iPhone?', 'Android ya iPhone?'),
        label: T('Operating system', 'ऑपरेटिंग सिस्टम', 'Operating system'),
        opts: { en: ['Android', 'iPhone (iOS)', NO_PREF.en], hi: ['Android', 'iPhone (iOS)', NO_PREF.hi], hl: ['Android', 'iPhone (iOS)', NO_PREF.hl] },
      },
    ],
  },

  tv: {
    keywords: /\b(tv|tvs|television|smart tv)\b|टीवी|टेलीविज़न|टेलीविजन/i,
    noun: T('TVs', 'टीवी', 'TVs'),
    questions: [
      {
        slot: 'screen_size',
        q: T('Which screen size do you want?', 'कितने इंच की स्क्रीन चाहिए?', 'Kitne inch ki screen chahiye?'),
        label: T('Screen size', 'स्क्रीन साइज़', 'Screen size'),
        opts: {
          en: ['32"–43"', '50"–55"', '65" or bigger', NOT_SURE.en],
          hi: ['32"–43"', '50"–55"', '65" या बड़ी', NOT_SURE.hi],
          hl: ['32"–43"', '50"–55"', '65" ya bada', NOT_SURE.hl],
        },
      },
      {
        slot: 'budget_range',
        q: T('What is your budget?', 'आपका बजट कितना है?', 'Aapka budget kitna hai?'),
        label: T('Budget', 'बजट', 'Budget'),
        opts: budget(['Under ₹20,000', '₹20,000–40,000', '₹40,000–70,000', 'Above ₹70,000'], ['Under $300', '$300–600', '$600–1,200', 'Above $1,200']),
      },
      {
        slot: 'main_use',
        q: T('What will you watch or do the most?', 'आप टीवी पर सबसे ज़्यादा क्या करेंगे?', 'Aap TV par sabse zyada kya karoge?'),
        label: T('Main use', 'मुख्य उपयोग', 'Main use'),
        opts: {
          en: ['Movies & OTT', 'Gaming / console', 'Sports', 'Everyday TV'],
          hi: ['फ़िल्में और OTT', 'गेमिंग / कंसोल', 'स्पोर्ट्स', 'रोज़ का टीवी'],
          hl: ['Movies & OTT', 'Gaming / console', 'Sports', 'Daily TV'],
        },
      },
      {
        slot: 'panel_type',
        q: T('Which display type?', 'कौन-सा डिस्प्ले टाइप?', 'Konsa display type?'),
        label: T('Display type', 'डिस्प्ले टाइप', 'Display type'),
        opts: { en: ['LED', 'QLED / Mini-LED', 'OLED', NOT_SURE.en], hi: ['LED', 'QLED / Mini-LED', 'OLED', NOT_SURE.hi], hl: ['LED', 'QLED / Mini-LED', 'OLED', NOT_SURE.hl] },
      },
    ],
  },

  headphones: {
    keywords: /headphones?|earphones?|earbuds?|airpods?|neckband|हेडफ़ोन|हेडफोन|इयरफ़ोन|इयरफोन|इयरबड/i,
    noun: T('headphones/earbuds', 'हेडफ़ोन/इयरबड्स', 'headphones/earbuds'),
    questions: [
      {
        slot: 'headphone_type',
        q: T('Which type do you prefer?', 'कौन-सा टाइप पसंद है?', 'Konsa type pasand hai?'),
        label: T('Type', 'टाइप', 'Type'),
        opts: {
          en: ['True wireless earbuds', 'Over-ear headphones', 'Neckband', 'Wired'],
          hi: ['ट्रू वायरलेस इयरबड्स', 'ओवर-ईयर हेडफ़ोन', 'नेकबैंड', 'वायर्ड'],
          hl: ['True wireless earbuds', 'Over-ear headphones', 'Neckband', 'Wired'],
        },
      },
      {
        slot: 'budget_range',
        q: T('What is your budget?', 'आपका बजट कितना है?', 'Aapka budget kitna hai?'),
        label: T('Budget', 'बजट', 'Budget'),
        opts: budget(['Under ₹1,500', '₹1,500–4,000', '₹4,000–10,000', 'Above ₹10,000'], ['Under $25', '$25–75', '$75–200', 'Above $200']),
      },
      {
        slot: 'main_use',
        q: T('What will you use them for most?', 'आप इन्हें सबसे ज़्यादा किस लिए इस्तेमाल करेंगे?', 'Aap inhe sabse zyada kis liye use karoge?'),
        label: T('Main use', 'मुख्य उपयोग', 'Main use'),
        opts: {
          en: ['Music', 'Calls & meetings', 'Gaming', 'Gym & running'],
          hi: ['म्यूज़िक', 'कॉल और मीटिंग', 'गेमिंग', 'जिम और रनिंग'],
          hl: ['Music', 'Calls & meetings', 'Gaming', 'Gym & running'],
        },
      },
      {
        slot: 'noise_cancelling',
        q: T('Do you need noise cancellation?', 'क्या नॉइज़ कैंसलेशन चाहिए?', 'Kya noise cancellation chahiye?'),
        label: T('Noise cancellation', 'नॉइज़ कैंसलेशन', 'Noise cancellation'),
        opts: {
          en: ['Must have', 'Nice to have', 'Not needed'],
          hi: ['ज़रूर चाहिए', 'हो तो अच्छा', 'ज़रूरी नहीं'],
          hl: ['Must have', 'Ho to accha', 'Zaroori nahi'],
        },
      },
    ],
  },
  general: {
    keywords: /(?!)/,
    noun: T('answer', 'जवाब', 'answer'),
    closer: T(
      'Please answer with all of this in mind. If anything is still unclear, state your assumption in one line and continue.',
      'कृपया इन सब बातों को ध्यान में रखकर जवाब दें। कुछ भी अस्पष्ट हो तो एक पंक्ति में अपनी मान्यता बताकर आगे बढ़ें।',
      'Please in sab baaton ko dhyaan mein rakhkar jawab do. Kuch bhi unclear ho to ek line mein apni assumption batakar aage badho.',
    ),
    questions: [
      {
        slot: 'goal',
        q: T('What do you want to get out of this?', 'आप इससे क्या हासिल करना चाहते हैं?', 'Aap isse kya hasil karna chahte ho?'),
        label: T('Goal', 'लक्ष्य', 'Goal'),
        opts: {
          en: ['Understand / learn it', 'Decide between options', 'Create something (write, build, design)', 'Solve a specific problem', 'Just quick information'],
          hi: ['समझना / सीखना', 'विकल्पों में से चुनना', 'कुछ बनाना (लिखना, बनाना, डिज़ाइन)', 'कोई खास समस्या हल करना', 'बस जल्दी जानकारी'],
          hl: ['Samajhna / seekhna', 'Options mein se choose karna', 'Kuch banana (likhna, build, design)', 'Koi specific problem solve karna', 'Bas quick info'],
        },
      },
      {
        slot: 'audience',
        q: T('Who is this for?', 'यह किसके लिए है?', 'Ye kiske liye hai?'),
        label: T('Audience', 'किसके लिए', 'Audience'),
        opts: {
          en: ['Just me', 'Student / beginner', 'Work / professional use', 'Clients or the public'],
          hi: ['सिर्फ़ मेरे लिए', 'छात्र / शुरुआती', 'काम / प्रोफ़ेशनल इस्तेमाल', 'क्लाइंट या आम लोग'],
          hl: ['Sirf mere liye', 'Student / beginner', 'Work / professional use', 'Clients ya public'],
        },
      },
      {
        slot: 'detail_level',
        q: T('How detailed should the answer be?', 'जवाब कितना विस्तृत चाहिए?', 'Answer kitna detailed chahiye?'),
        label: T('Detail level', 'विस्तार', 'Detail level'),
        opts: {
          en: ['Short and to the point', 'Step-by-step detailed', 'Expert-level depth'],
          hi: ['छोटा और सीधा', 'स्टेप-बाय-स्टेप विस्तार से', 'एक्सपर्ट-लेवल गहराई'],
          hl: ['Short aur seedha', 'Step-by-step detail mein', 'Expert-level depth'],
        },
      },
      {
        slot: 'format',
        q: T('Which format works best?', 'कौन-सा फ़ॉर्मेट बेहतर रहेगा?', 'Kaunsa format best rahega?'),
        label: T('Format', 'फ़ॉर्मेट', 'Format'),
        opts: {
          en: ['Bullet points', 'Short paragraphs', 'Table / comparison', 'Examples or code'],
          hi: ['बुलेट पॉइंट्स', 'छोटे पैराग्राफ़', 'टेबल / तुलना', 'उदाहरण या कोड'],
          hl: ['Bullet points', 'Short paragraphs', 'Table / comparison', 'Examples ya code'],
        },
      },
    ],
  },
};

// ── detection ───────────────────────────────────────────────────────────────

const REPAIR = /\b(fix|repair|slow|broken|not working|install|error|problem|crash|format|hang|hanging|update|setup|set up|review|vs)\b|ठीक|खराब|समस्या|रिपेयर|धीमा/i;
const BUY =
  /\b(want|wants|need|buy|purchase|looking for|looking to|suggest|recommend|best|which|good|get me|show me|choose|pick|chahiye|chaiye|chahie|lena|leni|lun|lunga|loonga|khareed\w*|kharid\w*|dikhao|batao|bataiye|dilao|konsa|kaunsa|sasta)\b|चाहिए|चाहिये|खरीद|लेना|लेनी|सुझाव|बताओ|बताइए|दिखाओ|सबसे अच्छा|कौन सा|कौन-सा/i;
const HINGLISH =
  /\b(mujhe|mera|meri|mere|chahiye|chaiye|chahie|kitna|kitne|ke liye|ke lie|karo|krdo|kro|batao|bataiye|dikhao|lena|khareed\w*|kharid\w*|konsa|kaunsa|accha|achha|sasta|wala|wali|nahi|nhi|hai)\b/i;
const DEVANAGARI = /[\u0900-\u097f]/;

function wordsIn(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function detectLang(text: string): BuyLang {
  return DEVANAGARI.test(text) ? 'hi' : HINGLISH.test(text) ? 'hl' : 'en';
}

/** Multiple-choice fallback for any request that is not a recognised purchase. */
export function generalDetection(text: string): BuyDetection {
  return { category: 'general', lang: detectLang(text), currency: 'inr' };
}

export function detectBuyRequest(text: string): BuyDetection | null {
  const t = text.trim();
  if (t === '' || wordsIn(t) > 24 || REPAIR.test(t)) return null;

  let category: BuyCategory | null = null;
  // Pick the category whose keyword appears earliest; "laptop bag" etc. still counts as the laptop family.
  let earliest = Infinity;
  for (const key of Object.keys(CATEGORIES) as BuyCategory[]) {
    const m = CATEGORIES[key].keywords.exec(t);
    if (m && m.index < earliest) {
      earliest = m.index;
      category = key;
    }
  }
  if (!category) return null;

  const short = wordsIn(t) <= 3;
  if (!short && !BUY.test(t)) return null;

  const lang = detectLang(t);
  const currency: BuyCurrency = lang === 'en' && /(\$|\busd\b|dollars?)/i.test(t) ? 'usd' : 'inr';
  return { category, lang, currency };
}

// ── questions ───────────────────────────────────────────────────────────────

function optionsFor(def: QDef, d: BuyDetection): string[] {
  if (typeof def.opts === 'function') return def.opts(d);
  if (Array.isArray(def.opts)) return def.opts;
  return def.opts[d.lang];
}

export function buildBuyQuestions(d: BuyDetection): Question[] {
  const defs = CATEGORIES[d.category].questions;
  return defs.map((def, i) => ({
    id: def.slot,
    slot: def.slot,
    text: def.q[d.lang],
    kind: 'single' as const,
    options: optionsFor(def, d).map((label) => ({ value: label, label })),
    suggestions: [],
    allowCustom: true,
    priority: defs.length - i,
  }));
}

export function buyQuestionTexts(d: BuyDetection): Record<string, string> {
  return Object.fromEntries(CATEGORIES[d.category].questions.map((def) => [def.slot, def.q[d.lang]]));
}

// ── prompt ──────────────────────────────────────────────────────────────────

const HEAD: L3 = T('My requirements:', 'मेरी ज़रूरतें:', 'Meri requirements:');
const GENERAL_HEAD: L3 = T('Context:', 'संदर्भ:', 'Context:');

function closing(noun: string): L3 {
  return T(
    `Recommend the 3 best ${noun} that fit this. For each give the model, key specs, pros and cons, and the approximate price within my budget. End with one clear recommendation. If anything is unknown, state your assumption in one line and continue.`,
    `कृपया इन ज़रूरतों के हिसाब से 3 सबसे अच्छे ${noun} सुझाएँ। हर एक के लिए मॉडल, मुख्य स्पेक्स, फ़ायदे-नुकसान और मेरे बजट में अनुमानित कीमत बताएँ। अंत में एक स्पष्ट सिफ़ारिश दें। कोई जानकारी अनिश्चित हो तो एक पंक्ति में अपनी मान्यता बताकर आगे बढ़ें।`,
    `Please in requirements ke hisaab se 3 best ${noun} suggest karo. Har ek ke liye model, main specs, pros-cons aur mere budget ke andar approx price batao. End mein ek clear recommendation do. Agar koi info missing ho to ek line mein apni assumption batakar aage badho.`,
  );
}

export function buildBuyPrompt(
  d: BuyDetection,
  original: string,
  answers: Record<string, string | string[]>,
): string {
  const cat = CATEGORIES[d.category];
  const lines: string[] = [];
  for (const def of cat.questions) {
    const raw = answers[def.slot];
    const value = Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
    if (String(value).trim() === '') continue;
    lines.push(`• ${def.label[d.lang]}: ${String(value).trim()}`);
  }
  const parts = [`“${original.replace(/\s+/g, ' ').trim()}”`];
  if (lines.length > 0) parts.push(`${d.category === 'general' ? GENERAL_HEAD[d.lang] : HEAD[d.lang]}\n${lines.join('\n')}`);
  parts.push((cat.closer ?? closing(cat.noun[d.lang]))[d.lang]);
  return parts.join('\n\n');
}

/** Slots this category can still ask about (used for the follow-up round). */
export function buySlots(d: BuyDetection): string[] {
  return CATEGORIES[d.category].questions.map((q) => q.slot);
}
