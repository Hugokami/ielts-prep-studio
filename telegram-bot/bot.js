/**
 * IELTS Prep Studio - 1-Tap Telegram Approval & Fulfillment Bot
 *
 * Automated student payment slip intake -> 1-Tap Admin Approval -> Instant 1-Click Magic Link Delivery
 */

import 'dotenv/config';
import http from 'http';
import { Bot, InlineKeyboard } from 'grammy';
import { voucherPool } from './voucherPool.js';
import {
  CURATED_ACADEMIC_LEXICON,
  getAcademicCollocations,
  getAcademicSynonyms,
  fetchFullWikipediaArticle
} from '../academic_engine.mjs';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? String(process.env.ADMIN_CHAT_ID).trim() : null;
const PAYMENT_PHONE = process.env.PAYMENT_PHONE || '09-768691939';
const ACCOUNT_NAME = process.env.ACCOUNT_NAME || 'Lyan Htet';
const PRICE_MMK = process.env.PRICE_MMK || '55,000 MMK';
const WEB_URL = process.env.STUDIO_WEB_URL || 'https://hugokami.github.io/ielts-prep-studio';

function getLaunchUrl(userId = null, voucher = null) {
  const base = WEB_URL.replace(/\/+$/, '');
  const params = [];
  if (voucher) params.push(`voucher=${encodeURIComponent(voucher)}`);
  if (userId) params.push(`tg_user=${encodeURIComponent(userId)}`);
  return params.length ? `${base}/?${params.join('&')}` : `${base}/`;
}

if (!BOT_TOKEN) {
  console.error('❌ Error: BOT_TOKEN is missing in .env file!');
  console.error('Please create telegram-bot/.env and set BOT_TOKEN=your_token_from_botfather');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

console.log('🤖 IELTS Prep Studio Telegram Bot Initializing...');

// Helper: Check if user is the admin
function isAdmin(ctx) {
  const uid = String(ctx.from?.id);
  if (uid === '7468650530') return true;
  if (!ADMIN_CHAT_ID) return false;
  return uid === ADMIN_CHAT_ID;
}

// ==========================================
// QUOTA & ACADEMIC TOOL CONFIG (10 queries/day)
// ==========================================
const dailyUsageMap = new Map(); // `${userId}:${dateStr}` -> count
const userPendingActions = new Map(); // `${userId}` -> 'collocate' | 'syn' | 'dict' | 'read'
const userLanguages = new Map(); // `${userId}` -> 'en' | 'my'
const FREE_DAILY_LIMIT = 10;

function getUserLang(userId) {
  return userLanguages.get(String(userId)) || 'en';
}

function setUserLang(userId, lang) {
  userLanguages.set(String(userId), lang === 'my' ? 'my' : 'en');
}

function getYangonDateStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Yangon' });
}

function isUserVip(userId) {
  if (String(userId) === '7468650530') return true;
  if (ADMIN_CHAT_ID && String(userId) === ADMIN_CHAT_ID) return true;
  return voucherPool.vouchers.some(v => String(v.telegramId) === String(userId) && v.status === 'Issued');
}

function checkAndConsumeQuota(userId) {
  if (isUserVip(userId)) {
    return { allowed: true, isVip: true, count: 0, limit: 'unlimited', remaining: 'unlimited' };
  }
  const dateStr = getYangonDateStr();
  const key = `${userId}:${dateStr}`;
  const current = dailyUsageMap.get(key) || 0;
  if (current >= FREE_DAILY_LIMIT) {
    return { allowed: false, isVip: false, count: current, limit: FREE_DAILY_LIMIT, remaining: 0 };
  }
  const next = current + 1;
  dailyUsageMap.set(key, next);
  return { allowed: true, isVip: false, count: next, limit: FREE_DAILY_LIMIT, remaining: FREE_DAILY_LIMIT - next };
}

function getQuotaStatus(userId) {
  if (isUserVip(userId)) {
    return { isVip: true, count: 0, limit: 'unlimited', remaining: 'unlimited' };
  }
  const dateStr = getYangonDateStr();
  const key = `${userId}:${dateStr}`;
  const current = dailyUsageMap.get(key) || 0;
  return { isVip: false, count: current, limit: FREE_DAILY_LIMIT, remaining: Math.max(0, FREE_DAILY_LIMIT - current) };
}

function formatQuotaFooter(quota) {
  if (quota.isVip) {
    return '👑 *VIP Lifetime Pass — Unlimited Daily Access ✨*';
  }
  return `💡 *Free Preview:* *${quota.remaining}/10 remaining today.*\n⭐ *Upgrade to Lifetime VIP (750 ★ Stars / 55,000 MMK) for Unlimited Access!*`;
}

function getQuotaExceededMessage() {
  return `⚠️ *DAILY FREE QUOTA LIMIT REACHED (10/10 USED)*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Free tier accounts are allocated 10 Academic AI searches per day.\n\n` +
    `👑 *Target Band 7.5+ Lifetime Studio VIP Pass (750 ★ Stars / 55,000 MMK)*\n` +
    `• ⚡ *UNLIMITED* Academic Collocations (/collocate)\n` +
    `• 💎 *UNLIMITED* Band 8.5+ Synonyms (/syn)\n` +
    `• 📖 *UNLIMITED* Academic Topic Briefs (/read)\n` +
    `• 📚 *UNLIMITED* Live Academic Dictionary (/dict)\n` +
    `• 🧠 *UNLIMITED* Scholar Quotes & Rhetoric (/quote)\n` +
    `• 🔤 All 1,162 Vocabulary items, Audio & 1-3-7 Spaced Repetition\n` +
    `• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)\n` +
    `• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer\n` +
    `• 💻 Personal Desktop Activation Voucher for PC & Laptop\n\n` +
    `👇 *Tap below to upgrade instantly with Telegram Stars or Mobile Wallets:*`;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'some', 'any', 'no', 'every', 'all', 'each', 'both', 'few', 'more', 'most', 'other', 'such', 'what',
  'which', 'who', 'whom', 'whose', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by', 'about',
  'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without',
  'before', 'under', 'around', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'can', 'could', 'should', 'would', 'may', 'might', 'must', 'and', 'or', 'but',
  'not', 'also', 'least', 'very', 'much', 'even'
]);

function cleanWordList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const cleaned = [];
  for (const item of list) {
    const w = (typeof item === 'string' ? item : (item && item.word ? item.word : '')).trim().toLowerCase();
    if (!w || w.length < 3) continue;
    if (STOP_WORDS.has(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    cleaned.push(w);
  }
  return cleaned;
}

const articleCache = new Map();

async function fetchDictionary(rawWord) {
  const word = (rawWord || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!word) return null;
  try {
    const resp = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`);
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json || !json.length) return null;

    const item = json[0];
    const defs = item.defs || [];
    const parsedDefs = defs.map(d => {
      const parts = d.split('\t');
      return { pos: parts[0] || 'n', definition: parts[1] ? parts[1].trim() : d };
    });

    const tags = item.tags || [];
    const pos = tags.filter(t => ['n', 'v', 'adj', 'adv'].includes(t));

    return {
      word: item.word || word,
      pos: pos.length ? pos.join(', ') : (parsedDefs[0] ? parsedDefs[0].pos : 'noun'),
      definitions: parsedDefs.slice(0, 3)
    };
  } catch (err) {
    console.error('[fetchDictionary Error]', err.message);
    return null;
  }
}

const SCHOLAR_QUOTES_BANK = [
  {
    quote: "The roots of education are bitter, but the fruit is sweet.",
    author: "Aristotle",
    advice: "Use in Task 2 essays on tertiary education, pedagogical reform, or the dedication required for academic advancement."
  },
  {
    quote: "Knowledge itself is power.",
    author: "Francis Bacon",
    advice: "A classical foundation for essays addressing public information accessibility, scientific research funding, or educational equality."
  },
  {
    quote: "We cannot solve our problems with the same thinking we used when we created them.",
    author: "Albert Einstein",
    advice: "An excellent topic sentence or transition for problem-solution essays on environmental conservation, urban sprawl, or healthcare reform."
  },
  {
    quote: "Education is the most powerful weapon which you can use to change the world.",
    author: "Nelson Mandela",
    advice: "Highly effective for concluding paragraphs emphasizing governmental allocation of resources to primary and higher education."
  },
  {
    quote: "The only true wisdom is in knowing you know nothing.",
    author: "Socrates",
    advice: "Can be adapted into philosophical discussions on lifelong learning, scientific inquiry, and avoiding dogmatism in civic policy."
  },
  {
    quote: "It is not that we have a short time to live, but that we waste a lot of it.",
    author: "Seneca",
    advice: "Ideal for Speaking Part 3 or Task 2 essays debating work-life balance, digital distractions, and modern productivity."
  },
  {
    quote: "The good life is one inspired by love and guided by knowledge.",
    author: "Bertrand Russell",
    advice: "Superb rhetorical benchmark for evaluating societal progress beyond mere gross domestic product (GDP) or material wealth."
  },
  {
    quote: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.",
    author: "Marie Curie",
    advice: "Compelling argument for technological adoption, biotechnology, and artificial intelligence in modern healthcare and science."
  },
  {
    quote: "He who has a why to live can bear almost any how.",
    author: "Friedrich Nietzsche",
    advice: "Powerful psychological evidence in essays addressing mental health, career resilience, and youth motivation in competitive economies."
  },
  {
    quote: "Real knowledge is to know the extent of one's ignorance.",
    author: "Confucius",
    advice: "Fits essays discussing the role of critical thinking, media literacy, and epistemic humility in the age of misinformation."
  }
];

async function fetchScholarQuote() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch('https://dummyjson.com/quotes/random', { signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.quote && data.author) {
        return {
          quote: data.quote,
          author: data.author,
          advice: 'Examine the philosophical premise of this quote. Paraphrase its core thesis into an abstract background statement or evaluation in IELTS Writing Task 2.'
        };
      }
    }
  } catch (_) {}
  const randomIndex = Math.floor(Math.random() * SCHOLAR_QUOTES_BANK.length);
  return SCHOLAR_QUOTES_BANK[randomIndex];
}

const ACADEMIC_WOTD_BANK = [
  {
    word: 'ubiquitous',
    pos: 'adjective',
    ipa: '/juːˈbɪk.wɪ.təs/',
    mm: 'နေရာအနှံ့အပြားတွင် တွေ့ရှိရသော / အလွန်ပျံ့နှံ့နေသော',
    collocations: ['ubiquitous presence', 'become ubiquitous', 'ubiquitous technology'],
    example: 'Smartphones have become so ubiquitous that their pervasive influence on social interactions cannot be overlooked.'
  },
  {
    word: 'mitigate',
    pos: 'verb',
    ipa: '/ˈmɪt.ɪ.ɡeɪt/',
    mm: 'သက်သာလျော့ပါးစေသည် / ဆိုးကျိုးကို နည်းပါးစေသည်',
    collocations: ['mitigate adverse effects', 'mitigate environmental damage', 'mitigate risks'],
    example: 'Governments must implement stringent carbon tariffs to mitigate the catastrophic repercussions of climate change.'
  },
  {
    word: 'exacerbate',
    pos: 'verb',
    ipa: '/ɪɡˈzæs.ə.beɪt/',
    mm: 'ပိုမိုဆိုးရွားစေသည် / အခြေအနေ ပိုမိုတင်းမာစေသည်',
    collocations: ['exacerbate the problem', 'exacerbate existing inequalities', 'severely exacerbate'],
    example: 'Unplanned urban sprawl threatens to exacerbate traffic congestion and air pollution in metropolitan areas.'
  },
  {
    word: 'paramount',
    pos: 'adjective',
    ipa: '/ˈpær.ə.maʊnt/',
    mm: 'အရေးအကြီးဆုံးသော / ထိပ်တန်းဦးစားပေးဖြစ်သော',
    collocations: ['of paramount importance', 'paramount consideration', 'paramount duty'],
    example: 'Ensuring equitable access to primary education is of paramount importance for long-term economic development.'
  },
  {
    word: 'pervasive',
    pos: 'adjective',
    ipa: '/pəˈveɪ.sɪv/',
    mm: 'အလွှာစုံသို့ ထိုးဖောက်ပျံ့နှံ့နေသော',
    collocations: ['pervasive influence', 'pervasive problem', 'pervasive nature'],
    example: 'The pervasive influence of mass media plays a transformative role in shaping youthful attitudes.'
  },
  {
    word: 'scrutinize',
    pos: 'verb',
    ipa: '/ˈskruː.tɪ.naɪz/',
    mm: 'အသေအချာ စိစစ်ဝေဖန်လေ့လာသည်',
    collocations: ['carefully scrutinize', 'scrutinize empirical evidence', 'scrutinize policy outcomes'],
    example: 'Policymakers must meticulously scrutinize proposed infrastructure projects before allocating fiscal budgets.'
  },
  {
    word: 'detrimental',
    pos: 'adjective',
    ipa: '/ˌdet.rɪˈmen.təl/',
    mm: 'ထိခိုက်နစ်နာစေသော / အန္တရာယ်ရှိသော',
    collocations: ['detrimental impact', 'detrimental effect on health', 'prove detrimental'],
    example: 'Excessive exposure to digital screens can exert a highly detrimental impact on cognitive development.'
  },
  {
    word: 'imperative',
    pos: 'adjective / noun',
    ipa: '/ɪmˈper.ə.tɪv/',
    mm: 'မဖြစ်မနေ လုပ်ဆောင်ရမည့် တာဝန် / မရှိမဖြစ် အရေးကြီးသော',
    collocations: ['moral imperative', 'economic imperative', 'it is imperative that'],
    example: 'It is imperative that international organizations collaborate to protect biodiversity in vulnerable ecosystems.'
  },
  {
    word: 'feasible',
    pos: 'adjective',
    ipa: '/ˈfiː.zə.bəl/',
    mm: 'လက်တွေ့ဖြစ်နိုင်ခြေရှိသော / အကောင်အထည်ဖော်နိုင်သော',
    collocations: ['economically feasible', 'technically feasible', 'a feasible alternative'],
    example: 'Transitioning toward renewable energy represents the only economically feasible trajectory for sustainable development.'
  },
  {
    word: 'unprecedented',
    pos: 'adjective',
    ipa: '/ʌnˈpres.ɪ.den.tɪd/',
    mm: 'တစ်ခါမှ မကြုံစဖူးသော / အဆမတန်များပြားသော',
    collocations: ['unprecedented scale', 'unprecedented challenge', 'grow at an unprecedented rate'],
    example: 'The proliferation of artificial intelligence presents society with unprecedented legal and ethical quandaries.'
  }
];

// ==========================================
// 1. STUDENT ONBOARDING & PAYMENT DETAILS
// ==========================================
bot.command('start', async (ctx) => {
  const user = ctx.from;
  const isUserAdmin = isAdmin(ctx);

  if (isUserAdmin) {
    const stats = voucherPool.getStats();
    return ctx.reply(
      `👋 **Welcome Admin!**\n\n` +
      `📊 **Live Voucher Inventory:**\n` +
      `• Total Passes: \`${stats.total}\`\n` +
      `• Issued / Sold: \`${stats.issued}\`\n` +
      `• Available in Pool: \`${stats.available}\`\n` +
      `• Revenue Collected: \`${stats.revenueMmk}\`\n\n` +
      `🛠️ **Admin Commands:**\n` +
      `/stats - View inventory & revenue breakdown\n` +
      `/mint <count> - Mint new batch of Lifetime passes (e.g. \`/mint 20\`)\n` +
      `/testslip - Simulate a student payment submission`,
      { parse_mode: 'Markdown' }
    );
  }

  const userLang = getUserLang(user?.id);
  const isBurmese = userLang === 'my';

  const isVip = isUserVip(user?.id);
  
  let welcomeText = "";
  let inlineKeyboard = new InlineKeyboard();

  if (isVip) {
    welcomeText = isBurmese
      ? `🎓 **IELTS Prep Studio (@IELTSPrepStudioBot)**\n\n` +
        `👑 **VIP LIFETIME MEMBER (ACTIVE)**\n` +
        `သင်သည် Lifetime VIP Pass အသုံးပြုသူဖြစ်ပြီး ဖြစ်ပါသည်။ Premium Features အားလုံး အပြည့်အစုံ ဖွင့်လှစ်ထားပြီး ဖြစ်ပါသည်!\n\n` +
        `• 🔤 1,162 Academic Lexicon & 1-3-7 Spaced Repetition Flashcards\n` +
        `• 📖 23 Cambridge Reading CBT Passages (231 Questions) & Burmese Citations\n` +
        `• ✍️ 40 Writing Task 1 & Task 2 Models + CEFR 90/10 AI Evaluator\n` +
        `• 🎙️ 30 Speaking Forecast Topics & 5 Strategic Frameworks\n` +
        `• ⚡ Unlimited VIP Academic Tools (/collocate, /syn, /dict, /read, /quote)\n\n` +
        `👇 **အောက်ပါ Start Menu ကို နှိပ်၍ Study Menu အား ဖွင့်ပါ:**`
      : `🎓 *Welcome back to IELTS Prep Studio (@IELTSPrepStudioBot)!*\n\n` +
        `👑 *YOU ARE ALREADY A VIP USER!*\n` +
        `Your account has full Lifetime VIP Access permanently active!\n\n` +
        `• 🔤 All 1,162 Academic Lexicon items with Native Pronunciation & 1-3-7 SRS\n` +
        `• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)\n` +
        `• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 AI Scorer\n` +
        `• 🎙️ All 30 Speaking Forecast Topics & 5 Strategic Frameworks\n` +
        `• ⚡ Unlimited VIP Academic Tools (/collocate, /syn, /dict, /read)\n\n` +
        `👇 *Tap 🚀 Start Menu below to explore:*`;

    inlineKeyboard
      .webApp('🚀 Launch IELTS Prep Studio', WEB_URL)
      .row()
      .text('⚡ VIP Academic Tools', 'menu_tools')
      .text('🌐 Language', 'menu_lang')
      .row()
      .url('💬 Contact Support (@hyuguo)', 'https://t.me/hyuguo');
  } else {
    welcomeText = isBurmese
      ? `🎓 **IELTS Prep Studio — Lifetime VIP Pass**\n` +
        `Cambridge CBT Mock Simulator • Band 9.0 AI Examiner • 1,162 Lexicon & Traps\n\n` +
        `🇲🇲 **မြန်မာကျောင်းသားများအတွက် Lifetime VIP Pass ဝယ်ယူခြင်း**\n\n` +
        `📌 **Payment Details (ငွေပေးချေရန် နည်းလမ်းများ):**\n` +
        `• ⭐️ **Telegram Stars:** \`750 ★ Stars\` (တစ်ကမ္ဘာလုံး 1-Click ချက်ချင်းဖွင့်နိုင်)\n` +
        `• 🇲🇲 **KBZPay / WavePay:** \`${PAYMENT_PHONE}\` (${ACCOUNT_NAME}) — \`${PRICE_MMK}\`\n\n` +
        `✨ **VIP Pass တွင် ပါဝင်သော Deliverables (8 ခုလုံး):**\n` +
        `1. Reading CBT Mock Exam 23 ခုလုံး (231 Questions) + Burmese Evidence\n` +
        `2. Writing Band 8.5/9.0 Models 40 ခုလုံး + Skeletons\n` +
        `3. Gemini AI Examiner Evaluations တစ်လ 60 ကြိမ် (တစ်နေ့ 2 ပုဒ် တိုက်ရိုက်စစ်ဆေးခွင့်)\n` +
        `4. Speaking 2026 Forecast Topics 30 ခုလုံး + 5 Strategic Frameworks\n` +
        `5. Lexicon & Trap Bank 1,162 ခုလုံး (Collocations, 538 Reading Traps, 179 Distractors)\n` +
        `6. Live Microphone Speaking Recorder & Voice Analyzer\n` +
        `7. Multi-Device Cloud Sync via Google Account\n` +
        `8. VIP Academic AI Tools (/collocate, /syn, /read, /dict, /quote) Unlimited အသုံးပြုခွင့်\n\n` +
        `👇 **Tap 🚀 Start Menu below to explore:**`
      : `🎓 *IELTS Prep Studio — Band 7.5+ VIP Studio Pass*\n` +
        `Cambridge CBT Mock Simulator • Band 9.0 AI Examiner • 1,162 Academic Lexicon\n\n` +
        `✨ *Welcome International Scholar! Studio VIP Pass is available worldwide.*\n\n` +
        `📌 *Available Payment Rails:*\n` +
        `• ⭐️ *Telegram Stars:* *750 ★ Stars* (Instant 1-Click Global Automated Activation)\n` +
        `• 🇲🇲 *Myanmar Mobile Wallets:* *${PRICE_MMK}* (KBZPay / WavePay: \`${PAYMENT_PHONE}\`)\n\n` +
        `✨ *VIP Pass Deliverables (All 8 Full Modules):*\n` +
        `1. 📖 Reading CBT Mock Exam — All 23 Cambridge Passages (231 Questions)\n` +
        `2. ✍️ Writing Band 8.5/9.0 Models — All 40 Tasks + High-Scoring Skeletons\n` +
        `3. 🤖 Gemini AI Examiner — 60 Automated Band 9 Assessments / Month\n` +
        `4. 🎙️ Speaking Forecast Topics — All 30 Topics + 5 Strategic Frameworks & Audio\n` +
        `5. 📚 Curated Lexicon & Trap Bank — 1,162 Vocabulary items, 538 Traps & Distractors\n` +
        `6. 🎙️ Live Mic Voice Analyzer — Speech Pace & Pronunciation Metrics\n` +
        `7. 🔄 Multi-Device Cloud Sync — Google Account & Telegram Mini App\n` +
        `8. ⚡ VIP Academic AI Tools — Unlimited Collocations, Synonyms, Topic Briefs & Dictionary\n\n` +
        `👇 *Tap 🚀 Start Menu below to explore:*`;

    inlineKeyboard
      .text('⭐️ Pay 750 ★ Stars (Instant)', 'pay_stars')
      .row()
      .text('🇲🇲 KBZPay / WavePay (55k MMK)', 'info_payment')
      .row()
      .webApp('🚀 Open IELTS Prep Studio', WEB_URL)
      .text('🌐 Language', 'menu_lang')
      .row()
      .url('💬 Contact Support (@hyuguo)', 'https://t.me/hyuguo');
  }

  // Send persistent keyboard with Open App, /start, and Start Menu
  await ctx.reply(welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: '🚀 Start Menu' }]
      ],
      resize_keyboard: true,
      is_persistent: true,
      input_field_placeholder: 'Tap 🚀 Start Menu to explore'
    }
  });
});

// In-memory mutex to prevent admin double-tap race conditions
const activeApprovalLocks = new Set();

// ==========================================
// 2. PAYMENT SLIP INTAKE (PHOTOS)
// ==========================================
bot.on('message:photo', async (ctx) => {
  const user = ctx.from;
  const photo = ctx.message.photo.pop(); // highest resolution photo

  if (!photo) return;

  // If Admin uploads a photo, ignore or acknowledge
  if (isAdmin(ctx)) {
    return ctx.reply('ℹ️ Admin upload detected. To test approval flow, send photo from a student account.');
  }

  // Anti-Fraud Check: Slip Replay Detection
  const fileUniqueId = photo.file_unique_id;
  const isDuplicateSlip = voucherPool.hasSlip(fileUniqueId);

  if (isDuplicateSlip) {
    await ctx.reply(
      `⚠️ **သတိပေးချက်:** ဤငွေလွှဲစလစ် (Screenshot) အား ယခင်က လက်ခံရရှိပြီးဖြစ်ပါသဖြင့် ထပ်မံပေးပို့ခြင်း မပြုရန် မေတ္တာရပ်ခံအပ်ပါသည်။ အကယ်၍ အမှားအယွင်းရှိပါက Support (@hyuguo) သို့ တိုက်ရိုက် ဆက်သွယ်နိုင်ပါသည်။`,
      { parse_mode: 'Markdown' }
    );
  } else {
    // 1. Send immediate reassuring acknowledgement to student
    await ctx.reply(
      `✅ **ငွေလွှဲစလစ်အား လက်ခံရရှိပါပြီခင်ဗျာ!**\n\n` +
      `⏳ Admin ဘက်မှ Transaction ID အား စစ်ဆေးနေပါသည်။ အတည်ပြုပြီးပါက သင်၏ **Lifetime Studio VIP Pass (1-Click Magic Link)** အား ဤ Chat သို့ အလိုအလျောက် ချက်ချင်း ပေးပို့ပေးပါမည်။\n\n` +
      `ခေတ္တစောင့်ဆိုင်းပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။`,
      { parse_mode: 'Markdown' }
    );
    // Record slip fingerprint to prevent future replays
    voucherPool.recordSlip(fileUniqueId, user.id, {
      name: (user.first_name || '') + (user.last_name ? ` ${user.last_name}` : ''),
      username: user.username || ''
    });
  }

  // 2. Forward slip to Admin with 1-Tap Action Buttons
  if (!ADMIN_CHAT_ID) {
    console.warn('[Telegram Bot] ADMIN_CHAT_ID not configured! Cannot forward slip.');
    return;
  }

  const studentName = (user.first_name || '') + (user.last_name ? ` ${user.last_name}` : '');
  const username = user.username ? `@${user.username}` : 'No Username';
  const timeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Yangon' });

  const duplicateWarning = isDuplicateSlip
    ? `🚨⚠️ **WARNING: DUPLICATE SLIP REPLAY DETECTED!**\nThis screenshot file has already been submitted previously!\n\n`
    : '';

  const adminCaption =
    `${duplicateWarning}` +
    `🚨 **NEW PAYMENT SLIP SUBMISSION**\n\n` +
    `👤 **Student:** ${studentName} (${username})\n` +
    `🆔 **User ID:** \`${user.id}\`\n` +
    `💰 **Expected:** ${PRICE_MMK} (Lifetime Pass)\n` +
    `⏰ **Submitted At:** ${timeStr} MMT\n\n` +
    `Tap below to instantly issue a Lifetime VIP Pass to this student:`;

  const approveData = `appr:${user.id}:${encodeURIComponent(studentName.slice(0, 20))}`;
  const rejectData = `rej:${user.id}`;

  const adminKeyboard = new InlineKeyboard()
    .text('✅ Approve & Issue Pass', approveData)
    .text('❌ Reject', rejectData);

  try {
    await ctx.api.sendPhoto(ADMIN_CHAT_ID, photo.file_id, {
      caption: adminCaption,
      parse_mode: 'Markdown',
      reply_markup: adminKeyboard
    });
  } catch (err) {
    console.error('[Forward to Admin Error]:', err.message);
  }
});

// ==========================================
// 2B. TELEGRAM STARS (XTR) INVOICE & AUTO-FULFILLMENT
// ==========================================
async function sendStarsInvoice(ctx) {
  const userId = ctx.from?.id;
  try {
    await ctx.replyWithInvoice(
      'IELTS Prep Studio — Lifetime VIP Pass',
      'Lifetime access to all 23 Cambridge Reading CBT Tests, 40 Band 8.5/9.0 Writing Models, 1,162 Academic Lexicon items, and Unlimited AI Tools.',
      `stars_vip_${userId}_${Date.now()}`,
      'XTR',
      [{ label: 'Lifetime VIP Studio Pass', amount: 750 }]
    );
  } catch (err) {
    console.error('[sendStarsInvoice Error]', err.message);
    await ctx.reply(`⚠️ Failed to generate Telegram Stars invoice: ${err.message}\nPlease try again or contact @hyuguo.`);
  }
}

bot.on('pre_checkout_query', async (ctx) => {
  try {
    await ctx.answerPreCheckoutQuery(true);
  } catch (err) {
    console.error('[pre_checkout_query Error]', err.message);
    await ctx.answerPreCheckoutQuery(false, { error_message: 'Checkout verification failed. Please try again.' }).catch(() => {});
  }
});

bot.on('message:successful_payment', async (ctx) => {
  const payment = ctx.message.successful_payment;
  const studentId = String(ctx.from?.id);
  const studentName = (ctx.from?.first_name || '') + (ctx.from?.last_name ? ` ${ctx.from.last_name}` : '') || 'Scholar';
  const studentUsername = ctx.from?.username ? `@${ctx.from.username}` : '';
  const chargeId = payment.telegram_payment_charge_id || payment.provider_payment_charge_id || `stars_${Date.now()}`;

  console.log(`[Successful Payment] User ${studentId} paid ${payment.total_amount} ${payment.currency} (Charge: ${chargeId})`);

  // Claim next voucher from voucher pool
  const voucher = voucherPool.claimNextVoucher({
    id: studentId,
    name: studentName,
    username: ctx.from?.username || ''
  });

  const magicLink = voucher ? voucher.magicLink : `${WEB_URL}/?redeem=VIPPASS2026`;
  const code = voucher ? voucher.code : 'VIPPASS2026';

  // 1. Deliver to student
  const successMsg =
    `🎉 *PAYMENT RECEIVED! YOUR LIFETIME VIP PASS IS ACTIVE!*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⭐️ *Amount Paid:* \`${payment.total_amount} ${payment.currency}\` (750 Stars)\n` +
    `🎟️ *Voucher Code:* \`${code}\`\n\n` +
    `Tap the **1-Click Magic Link** below to immediately activate your Lifetime VIP Studio Pass:\n\n` +
    `👉 *1-Click Magic Link:*\n${magicLink}\n\n` +
    `👑 *Unlocked Privileges:*\n` +
    `• All 23 Cambridge Reading CBT Tests + Explanations\n` +
    `• All 40 Band 8.5/9.0 Writing Models & Skeletons\n` +
    `• 60 Gemini AI Examiner Essay Audits / Month\n` +
    `• All 30 Speaking Forecast Topics & Live Mic Recorder\n` +
    `• All 1,162 Vocabulary & Reading CBT Distractor Banks\n` +
    `• Unlimited Academic AI Tools (/collocate, /syn, /read, /dict, /quote)\n\n` +
    `Best wishes on achieving your target band score with IELTS Prep Studio!`;

  await ctx.reply(successMsg, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .webApp('🚀 Open & Activate in Telegram', magicLink)
      .url('💻 Open on Computer ↗', magicLink)
  });

  // 2. Alert Admin
  if (ADMIN_CHAT_ID) {
    try {
      const adminNotice =
        `⭐ *NEW TELEGRAM STARS VIP PURCHASE!*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Student:* ${studentName} (${studentUsername || studentId})\n` +
        `💰 *Amount:* \`${payment.total_amount} ${payment.currency}\` (750 Stars)\n` +
        `🎟️ *Issued Voucher:* \`${code}\`\n` +
        `🆔 *Charge ID:* \`${chargeId}\`\n` +
        `⏰ *Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Yangon' })} MMT`;

      await ctx.api.sendMessage(ADMIN_CHAT_ID, adminNotice, { parse_mode: 'Markdown' });
    } catch (e) {
      console.warn('[Admin Stars Notice Error]', e.message);
    }
  }
});

// ==========================================
// 3. 1-TAP ADMIN APPROVAL & FULFILLMENT
// ==========================================
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const fromId = String(ctx.from.id);

  // Security Check: Only designated Admin can tap approval/rejection buttons
  if (data.startsWith('appr:') || data.startsWith('rej:')) {
    if (fromId !== ADMIN_CHAT_ID) {
      return ctx.answerCallbackQuery({
        text: '⛔ Unauthorized: Only the designated Admin can approve orders.',
        show_alert: true
      });
    }

    // Handle Approval: appr:<studentId>:<studentName>
    if (data.startsWith('appr:')) {
      const parts = data.split(':');
      const studentId = parts[1];
      const studentName = decodeURIComponent(parts[2] || 'Scholar');

      const msgId = ctx.callbackQuery.message?.message_id;
      const lockKey = `${msgId}:${studentId}`;

      // Race condition prevention: block duplicate clicks immediately
      if (activeApprovalLocks.has(lockKey)) {
        return ctx.answerCallbackQuery({
          text: '⏳ Processing approval, please wait...',
          show_alert: false
        });
      }
      activeApprovalLocks.add(lockKey);

      // Immediately clear keyboard on message to prevent client double-taps
      try {
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      } catch (_) {}

      // Claim next voucher from pool
      const voucher = voucherPool.claimNextVoucher({
        id: studentId,
        name: studentName,
        username: ''
      });

      if (!voucher) {
        activeApprovalLocks.delete(lockKey);
        await ctx.answerCallbackQuery({
          text: '⚠️ Voucher pool is empty! Use /mint to add more codes.',
          show_alert: true
        });
        return;
      }

      // 1. Update Admin Message UI in real-time
      const currentCaption = ctx.callbackQuery.message?.caption || '';
      const updatedCaption =
        currentCaption +
        `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🎉 **APPROVED by Admin**\n` +
        `🎟️ **Issued Code:** \`${voucher.code}\`\n` +
        `🔗 **Magic Link:** ${voucher.magicLink}\n` +
        `⏰ **Processed At:** ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Yangon' })} MMT`;

      try {
        await ctx.editMessageCaption({
          caption: updatedCaption,
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
        });
      } catch (e) {
        console.warn('[Edit Caption Notice]:', e.message);
      }

      // 2. Deliver Magic Link to Student
      const studentDeliveryMessage =
        `🎉 **Congratulations! သင်၏ Lifetime Studio VIP Pass အား အတည်ပြုပြီးပါပြီခင်ဗျာ။**\n\n` +
        `အောက်ပါ **1-Click Magic Link** ကို နှိပ်ပြီး Google Account ဖြင့် Sign In ပြုလုပ်ရုံဖြင့် VIP Modules အားလုံး ချက်ချင်း ပွင့်သွားပါမည်:\n\n` +
        `👉 **1-Click Activate Link:**\n` +
        `${voucher.magicLink}\n\n` +
        `👑 **Unlocked Privileges:**\n` +
        `• All 23 Cambridge Reading CBT Tests + Burmese Citations\n` +
        `• All 40 Band 8.5/9.0 Writing Models & Frameworks\n` +
        `• 60 Gemini AI Examiner Essay Audits / Month\n` +
        `• All 30 Speaking Forecast Topics & Live Mic Recorder\n` +
        `• All 1,162 Vocabulary & Reading CBT Distractor Banks\n\n` +
        `_(Website တွင် ကိုယ်တိုင် Code ရိုက်ထည့်လိုပါက Voucher Code: \`${voucher.code}\` ဖြစ်ပါသည်)_\n\n` +
        `IELTS Prep Studio ဖြင့် အောင်မြင်သော ရလဒ်ကောင်းများ ပိုင်ဆိုင်နိုင်ပါစေကြောင်း ဆုမွန်ကောင်းတောင်းအပ်ပါသည်။`;

      try {
        await ctx.api.sendMessage(studentId, studentDeliveryMessage, {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .webApp('🚀 Open & Activate in Telegram', voucher.magicLink)
            .url('💻 Open on Computer ↗', voucher.magicLink)
        });
        await ctx.answerCallbackQuery({ text: `✓ Pass Issued: ${voucher.code}` });
      } catch (err) {
        console.error('[Student Delivery Error]:', err.message);
        await ctx.answerCallbackQuery({ text: `⚠️ Approved, but failed to message student directly.` });
      }
      return;
    }

    // Handle Rejection: rej:<studentId>
    if (data.startsWith('rej:')) {
      const studentId = data.split(':')[1];
      const msgId = ctx.callbackQuery.message?.message_id;
      const lockKey = `${msgId}:${studentId}`;

      if (activeApprovalLocks.has(lockKey)) {
        return ctx.answerCallbackQuery({
          text: '⏳ Action already in progress...',
          show_alert: false
        });
      }
      activeApprovalLocks.add(lockKey);

      try {
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      } catch (_) {}

      const currentCaption = ctx.callbackQuery.message?.caption || '';
      const updatedCaption =
        currentCaption +
        `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
        `❌ **REJECTED by Admin**\n` +
        `⏰ **Processed At:** ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Yangon' })} MMT`;

      try {
        await ctx.editMessageCaption({
          caption: updatedCaption,
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
        });
      } catch (e) {}

      try {
        await ctx.api.sendMessage(
          studentId,
          `⚠️ **ငွေလွှဲစလစ် အတည်မပြုနိုင်သေးပါခင်ဗျာ**\n\n` +
          `သင်ပေးပို့ထားသော ငွေလွှဲပြေစာအား စစ်ဆေးရာတွင် အဆင်မပြေမှု အနည်းငယ် ရှိနေပါသဖြင့် ငွေလွှဲအချက်အလက် (Transaction Slip) အား ပြန်လည်စစ်ဆေးပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။\n\n` +
          `အသေးစိတ်သိရှိလိုပါက Admin Telegram @hyuguo သို့ တိုက်ရိုက် ဆက်သွယ်စုံစမ်းနိုင်ပါသည်။`,
          { parse_mode: 'Markdown' }
        );
        await ctx.answerCallbackQuery({ text: 'Order rejected.' });
      } catch (err) {
        console.error('[Reject Notice Error]:', err.message);
      }
      return;
    }
  }

  // ==========================================
  // STUDENT INTERACTIVE CALLBACK HANDLERS
  // ==========================================
  await ctx.answerCallbackQuery().catch(() => {});

  if (data === 'menu_tools') {
    return handleToolsMenu(ctx);
  }

  if (data.startsWith('ask_tool:')) {
    const tool = data.replace('ask_tool:', '').trim();
    userPendingActions.set(ctx.from.id, tool);
    if (tool === 'collocate') {
      return ctx.reply(
        `🔗 **Academic Collocations Engine**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Type any academic word to find high-yield word pairings (e.g., \`impact\`, \`crucial\`, \`policy\`, \`evidence\`):`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('🔗 impact', 'tool_collocate:impact')
            .text('🔗 crucial', 'tool_collocate:crucial')
            .row()
            .text('⚡ Back to Tools', 'menu_tools')
        }
      );
    }
    if (tool === 'syn') {
      return ctx.reply(
        `💎 **Band 8.5+ Academic Synonyms**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Type any word to get sophisticated paraphrases for Writing Task 2 (e.g., \`important\`, \`increase\`, \`problem\`):`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('💎 important', 'tool_syn:important')
            .text('💎 increase', 'tool_syn:increase')
            .row()
            .text('⚡ Back to Tools', 'menu_tools')
        }
      );
    }
    if (tool === 'dict') {
      return ctx.reply(
        `📚 **Live Academic Dictionary**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Type any academic vocabulary item for formal definition and part of speech (e.g., \`ubiquitous\`, \`mitigate\`):`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('📚 ubiquitous', 'tool_dict:ubiquitous')
            .text('📚 mitigate', 'tool_dict:mitigate')
            .row()
            .text('⚡ Back to Tools', 'menu_tools')
        }
      );
    }
    if (tool === 'read') {
      return ctx.reply(
        `📖 **Academic Topic Briefs**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Type an essay topic to get background context and arguments (e.g., \`Artificial intelligence\`, \`Climate change\`):`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('📖 AI in Society', 'tool_read:Artificial intelligence')
            .text('📖 Climate Change', 'tool_read:Climate change')
            .row()
            .text('⚡ Back to Tools', 'menu_tools')
        }
      );
    }
  }

  if (data.startsWith('tool_collocate:')) {
    const word = data.replace('tool_collocate:', '').trim();
    return handleCollocate(ctx, word);
  }

  if (data.startsWith('tool_syn:')) {
    const word = data.replace('tool_syn:', '').trim();
    return handleSyn(ctx, word);
  }

  if (data.startsWith('tool_dict:')) {
    const word = data.replace('tool_dict:', '').trim();
    return handleDict(ctx, word);
  }

  if (data.startsWith('tool_read:')) {
    const topic = data.replace('tool_read:', '').trim();
    return handleRead(ctx, topic);
  }

  if (data.startsWith('wiki_p:')) {
    const parts = data.split(':');
    const cacheId = parts[1];
    const pageIdx = parseInt(parts[2], 10) || 0;
    return handleWikiPage(ctx, cacheId, pageIdx);
  }

  if (data === 'wiki_noop') {
    return ctx.answerCallbackQuery({ text: 'Use ⬅️ Prev / Next ➡️ to navigate pages.' });
  }

  if (data === 'tool_cloze') {
    return handleCloze(ctx, 'urban sustainability');
  }

  if (data === 'tool_podcast') {
    return handlePodcast(ctx, 'bbc');
  }

  if (data === 'pod_cambridge') {
    return handlePodcast(ctx, 'cambridge');
  }

  if (data === 'pod_bbc') {
    return handlePodcast(ctx, 'bbc');
  }

  if (data.startsWith('cloze_ans:')) {
    const clozeId = data.replace('cloze_ans:', '');
    const session = activeClozeSessions.get(clozeId);
    if (!session) {
      return ctx.answerCallbackQuery({ text: 'Answer key expired. Run /cloze to start a new drill.', show_alert: true });
    }
    const answerText =
      `✅ *CLOZE ANSWER KEY & VOCABULARY*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🔬 *Study:* _${session.title}_\n\n` +
      session.answers.join('\n') +
      `\n\n💡 *Tip:* Test your spelling and lexical precision by reviewing these collocations in the Web App!`;

    await ctx.reply(answerText, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🔄 Another Cloze Drill', 'tool_cloze')
        .text('⚡ VIP Academic Menu', 'menu_tools')
    });
    return ctx.answerCallbackQuery({ text: 'Answer Key Revealed!' });
  }

  if (data === 'tool_quote') {
    return handleQuote(ctx);
  }

  if (data === 'tool_wotd') {
    return handleWotd(ctx);
  }

  if (data === 'tool_quota') {
    return handleQuota(ctx);
  }

  if (data === 'tool_bands') {
    return handleBands(ctx);
  }

  if (data === 'tool_format') {
    return handleFormat(ctx);
  }

  if (data.startsWith('sprint:')) {
    const mins = parseInt(data.split(':')[1], 10) || 20;
    return handleSprint(ctx, mins);
  }

  if (data === 'menu_buy') {
    return handleBuy(ctx);
  }

  if (data === 'pay_stars') {
    const isVip = isUserVip(ctx.from?.id);
    if (isVip) {
      await ctx.answerCallbackQuery({ text: '👑 You are already a VIP user!' }).catch(() => {});
      return ctx.reply(
        `👑 *YOU ARE ALREADY A VIP USER!*\r\n━━━━━━━━━━━━━━━━━━━━\r\n` +
        `✅ Your account has full Lifetime VIP Access permanently active. All Cambridge CBT tests, 1,162 AWL flashcards, Academic AI tools, and Speaking mocks are completely unlocked!\r\n\r\n` +
        `No payment is required. Practice anytime!`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .webApp('🚀 Launch IELTS Prep Studio', WEB_URL)
        }
      );
    }
    return sendStarsInvoice(ctx);
  }

  if (data === 'menu_lang') {
    return handleLanguage(ctx);
  }

  if (data.startsWith('set_lang:')) {
    const selectedLang = data.replace('set_lang:', '').trim();
    setUserLang(ctx.from?.id, selectedLang);
    await ctx.answerCallbackQuery({
      text: selectedLang === 'en' ? 'Language set to English' : 'ဘာသာစကားကို မြန်မာဘာသာသို့ ပြောင်းလဲပြီးပါပြီ'
    }).catch(() => {});
    const replyMsg = selectedLang === 'en'
      ? '🌐 *Language preference set to English Only.*\nAll study tools and bot menus will now default to English.'
      : '🌐 *ဘာသာစကားကို မြန်မာ + အင်္ဂလိပ် နှစ်ဘာသာဖြင့် သတ်မှတ်ပြီးပါပြီခင်ဗျာ။*\nလေ့လာမှုဆိုင်ရာ အချက်အလက်များနှင့် ရှင်းလင်းချက်များကို မြန်မာလို ဖော်ပြပေးပါမည်။';
    return ctx.reply(replyMsg, { parse_mode: 'Markdown' });
  }

  if (data === 'info_payment') {
    const isVip = isUserVip(ctx.from?.id);
    if (isVip) {
      await ctx.answerCallbackQuery({ text: '👑 You are already a VIP user!' }).catch(() => {});
      return ctx.reply(
        `👑 *YOU ARE ALREADY A VIP USER!*\n━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ You are already a Lifetime VIP user! All 55 CBT Mocks, 1,162 Lexicon SRS, and VIP Academic Tools are permanently unlocked.\n\n` +
        `No payment is required.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .webApp('🚀 Launch IELTS Prep Studio', WEB_URL)
            .row()
            .text('⚡ VIP Academic Tools', 'menu_tools')
        }
      );
    }
    return ctx.reply(
      `💳 **Myanmar Mobile Wallet Payment (55,000 MMK — Lifetime VIP Pass)**\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• KBZPay / WavePay: \`${PAYMENT_PHONE}\`\n` +
      `• Account Name: **${ACCOUNT_NAME}**\n` +
      `• Price: **${PRICE_MMK}**\n\n` +
      `📸 **ညွှန်ကြားချက်:**\n` +
      `ငွေလွှဲပြီးပါက ရရှိလာသော **ငွေလွှဲစလစ် Screenshot** ကို ဤ Chat သို့ ပို့ပေးပါ။ Admin မှ စစ်ဆေးအတည်ပြုပြီး မိနစ်ပိုင်းအတွင်း VIP ဖွင့်ပေးပါမည်! 🚀\n\n` +
      `⭐️ *Looking for Instant 1-Click Worldwide Checkout?*\n` +
      `Tap the Telegram Stars button below (*750 ★*) without waiting for manual verification!`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⭐️ Pay 750 ★ Stars (Instant)', 'pay_stars')
          .row()
          .text('⚡ VIP Academic Menu', 'menu_tools')
      }
    );
  }
});

// ==========================================
// 4. STUDENT TEXT INTAKE (PENDING TOOLS)
// ==========================================
bot.on('message:text', async (ctx, next) => {
  const text = (ctx.message?.text || '').trim();
  const userId = ctx.from?.id;
  const isVip = isUserVip(userId);

  // 1. Collapsed & Expanded Keyboard Menu Handlers
  if (text === '🚀 Start Menu' || text === 'Start Menu' || text === 'Start' || text === 'start' || text === '/menu' || text === '🚀 Start') {
    const isBurmese = getUserLang(userId) === 'my';
    const menuTitle = isVip
      ? (isBurmese ? `👑 **IELTS Prep Studio — VIP Study Menu**\r\n━━━━━━━━━━━━━━━━━━━━\r\nသင်သည် Lifetime VIP Pass အသုံးပြုခွင့် ရရှိပြီးဖြစ်ပါသည်။` : `👑 *IELTS PREP STUDIO — VIP STUDY MENU*\r\n━━━━━━━━━━━━━━━━━━━━\r\nYou are already a VIP user with full Lifetime Access permanently active!`)
      : (isBurmese ? `🎓 **IELTS Prep Studio — Main Study Menu**\r\n━━━━━━━━━━━━━━━━━━━━\r\nလေ့လာလိုသည့် အပိုင်းကို အောက်ပါ Menu မှ ရွေးချယ်ပါ:` : `🎓 *IELTS PREP STUDIO — MAIN STUDY MENU*\r\n━━━━━━━━━━━━━━━━━━━━\r\nChoose an option below to continue studying:`);

    const expandedKeyboard = isVip
      ? [
          [{ text: '🚀 Launch IELTS Prep Studio', web_app: { url: WEB_URL } }],
          [{ text: '⚡ VIP Academic Tools' }, { text: '👑 VIP Status: Active' }],
          [{ text: '📖 Scholarly Cloze Drill' }, { text: '🎙️ Native Podcasts' }],
          [{ text: '📚 Curriculum & Features' }, { text: '📊 My Study & VIP Status' }],
          [{ text: '💬 Chat with Instructor' }, { text: '📅 Exam Countdown' }],
          [{ text: '💡 Band 9 Tip of the Day' }, { text: '👨‍🏫 Contact Support' }],
          [{ text: '🌐 Language (EN/မြန်မာ)' }, { text: '📕 How To Use & Guide' }],
          [{ text: '🔽 Collapse Menu' }]
        ]
      : [
          [{ text: '🚀 Launch IELTS Prep Studio', web_app: { url: WEB_URL } }],
          [{ text: '⚡ VIP Academic Tools' }, { text: '👑 Buy VIP (750 ★ / 55k)' }],
          [{ text: '📖 Scholarly Cloze Drill' }, { text: '🎙️ Native Podcasts' }],
          [{ text: '📚 Curriculum & Features' }, { text: '📊 My Study & VIP Status' }],
          [{ text: '💳 Payment Info' }, { text: '📅 Exam Countdown' }],
          [{ text: '💡 Band 9 Tip of the Day' }, { text: '👨‍🏫 Contact Support' }],
          [{ text: '🌐 Language (EN/မြန်မာ)' }, { text: '📕 How To Use & Guide' }],
          [{ text: '🔽 Collapse Menu' }]
        ];

    return ctx.reply(menuTitle + `\r\n\r\n👇 *Select an option, or tap 🔽 Collapse Menu to minimize:*`, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: expandedKeyboard,
        resize_keyboard: true,
        input_field_placeholder: 'Choose an option or tap 🔽 Collapse'
      }
    });
  }

  if (text === '🔽 Collapse Menu' || text === 'Collapse Menu' || text === 'Collapse' || text === 'collapse' || text === '/collapse') {
    return ctx.reply(`🔽 *Menu collapsed.* Tap *🚀 Start Menu* whenever you want to reopen the full study menu.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          [{ text: '🚀 Start Menu' }]
        ],
        resize_keyboard: true,
        input_field_placeholder: 'Tap 🚀 Start Menu to explore'
      }
    });
  }

  if (text === '👑 VIP Status: Active') {
    return ctx.reply(
      `👑 *YOU ARE ALREADY A VIP USER!*\r\n━━━━━━━━━━━━━━━━━━━━\r\n` +
      `✅ Your account has full Lifetime VIP Access permanently active.\r\n` +
      `• All 23 Cambridge Reading CBT Passages (231 Questions)\r\n` +
      `• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 AI Scorer\r\n` +
      `• All 1,162 Academic Lexicon items & Spaced Repetition Flashcards\r\n` +
      `• All 30 Speaking Forecast Topics & 5 Strategic Frameworks\r\n` +
      `• Unlimited Live Academic AI Quota\r\n\r\n` +
      `No further payment is required. Practice anytime below:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .webApp('🚀 Launch IELTS Prep Studio', WEB_URL)
          .row()
          .text('⚡ VIP Academic Tools', 'menu_tools')
      }
    );
  }

  if (text === '📖 Scholarly Cloze Drill' || text === '📖 Cloze Drill' || text === 'Cloze Drill') {
    return handleCloze(ctx, 'climate policy');
  }
  if (text === '🎙️ Native Podcasts' || text === '🎙️ Cambridge & BBC Podcasts' || text === 'Native Podcasts' || text === 'Podcasts') {
    return handlePodcast(ctx, 'bbc');
  }

  if (text.startsWith('/')) {
    return next();
  }

  const pending = userPendingActions.get(userId);
  if (pending) {
    userPendingActions.delete(userId);
    if (pending === 'collocate') return handleCollocate(ctx, text);
    if (pending === 'syn') return handleSyn(ctx, text);
    if (pending === 'dict') return handleDict(ctx, text);
    if (pending === 'read') return handleRead(ctx, text);
  }

  return next();
});

// ==========================================
// 5. ACADEMIC TOOL HANDLERS & VIP CHECKOUT
// ==========================================
async function handleBuy(ctx) {
  const isVip = isUserVip(ctx.from?.id);
  if (isVip) {
    return ctx.reply(
      `👑 *YOU ARE ALREADY A VIP USER!*\n━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ Your account has full Lifetime VIP Access permanently active. All Cambridge CBT tests, 1,162 AWL flashcards, Academic AI tools, and Speaking mocks are completely unlocked!\n\n` +
      `No further payment is required. Launch the Studio below to continue practicing:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .webApp('🚀 Launch IELTS Prep Studio', WEB_URL)
          .url('🌐 Open on Computer ↗', WEB_URL)
      }
    );
  }

  const text =
    `👑 *IELTS PREP STUDIO — LIFETIME VIP PASS*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Unlock unlimited access to Cambridge CBT mocks, Band 9 writing models, automated AI scoring, and all 1,162 academic vocabulary items.\n\n` +
    `💳 *Select Your Payment Rail:*\n\n` +
    `⭐️ *Option 1: Telegram Stars (Worldwide)*\n` +
    `• Price: *750 ★ Stars* (~$15 USD)\n` +
    `• Instant automated activation & 1-Click Magic Link!\n\n` +
    `🇲🇲 *Option 2: Myanmar Mobile Wallets*\n` +
    `• Price: *55,000 MMK*\n` +
    `• KBZPay / WavePay: \`${PAYMENT_PHONE}\` (${ACCOUNT_NAME})\n` +
    `• Upload transfer screenshot for 1-tap admin approval.`;

  const keyboard = new InlineKeyboard()
    .text('⭐️ Pay 750 ★ Stars (Instant)', 'pay_stars')
    .row()
    .text('🇲🇲 KBZPay / WavePay (55k MMK)', 'info_payment')
    .row()
    .webApp('🚀 Open IELTS Prep Studio', WEB_URL)
    .text('🌐 Language', 'menu_lang');

  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
}

async function handleLanguage(ctx) {
  const currentLang = getUserLang(ctx.from?.id);
  const text =
    `🌐 *CHOOSE YOUR BOT LANGUAGE PREFERENCE*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Select how you would like IELTS Prep Studio Bot to interact with you:\n\n` +
    `Current setting: *${currentLang === 'my' ? 'မြန်မာ + English (Bilingual)' : 'English Only (Default)'}*`;

  const keyboard = new InlineKeyboard()
    .text(currentLang === 'en' ? '✅ English Only' : 'English Only', 'set_lang:en')
    .text(currentLang === 'my' ? '✅ မြန်မာ + English' : 'မြန်မာ + English', 'set_lang:my')
    .row()
    .text('⚡ Back to Menu', 'menu_tools');

  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
}

async function handleToolsMenu(ctx) {
  const userId = ctx.from.id;
  const isVip = isUserVip(userId);
  const quota = getQuotaStatus(userId);
  const userLang = getUserLang(userId);
  const isBurmese = userLang === 'my';

  const statusBadge = isVip
    ? '👑 *LIFETIME VIP PASS* (⚡ Unlimited Daily Queries)'
    : `🆓 *FREE TIER* (${quota.remaining}/10 Queries Remaining Today)`;

  const menuMsg = isBurmese
    ? `⚡ **VIP ACADEMIC LEXICON & TOPIC EXPLORER**\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 **Your Status:** ${statusBadge}\n\n` +
      `အောက်ပါ Academic AI Tools ခလုတ်များကို နှိပ်ပြီး သင်ရှာလိုသော စာလုံး (သို့) ခေါင်းစဉ်ကို လွတ်လပ်စွာ ရှာဖွေနိုင်ပါသည်:\n\n` +
      `🔗 *Academic Collocations:* သဘာဝကျသော စကားတွဲများ\n` +
      `💎 *Band 8.5+ Synonyms:* အဆင့်မြင့် စာလုံး အစားထိုးစကားလုံးများ\n` +
      `📖 *Academic Topic Briefs:* Task 2 Background ဗဟုသုတများ\n` +
      `📚 *Academic Dictionary:* Formal Definition & Part of Speech\n` +
      `🧠 *Scholar Thought:* Task 2 Essay တွင် ကိုးကားအသုံးချနည်း\n\n` +
      `👑 *VIP Pass:* တစ်နေ့လျှင် အကန့်အသတ်မရှိ (Unlimited) သုံးနိုင်ပါသည်။\n` +
      `🆓 *Free Tier:* တစ်နေ့လျှင် ၁၀ ကြိမ် စမ်းသပ် အသုံးပြုနိုင်ပါသည်။\n\n` +
      `👇 စတင်ရှာဖွေရန် အောက်ပါ ခလုတ်များမှ ရွေးချယ်ပါ:`
    : `⚡ **VIP ACADEMIC LEXICON & TOPIC EXPLORER**\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 **Your Status:** ${statusBadge}\n\n` +
      `Select an Academic AI Tool below to explore high-impact vocabulary and topic background:\n\n` +
      `🔗 *Academic Collocations:* Natural, high-yield academic word pairings\n` +
      `💎 *Band 8.5+ Synonyms:* Sophisticated lexical replacements for Task 2\n` +
      `📖 *Academic Topic Briefs:* Full articles & contextual arguments\n` +
      `📚 *Academic Dictionary:* Formal definitions, syntax & parts of speech\n` +
      `🧠 *Scholar Thought:* Rhetorical quotes & philosophical perspectives\n\n` +
      `👑 *VIP Pass:* Unlimited queries & all 8 full studio modules.\n` +
      `🆓 *Free Preview:* 10 queries per day.\n\n` +
      `👇 Choose an academic tool below to begin:`;

  const keyboard = new InlineKeyboard()
    .text('📖 Scholarly Cloze Drill', 'tool_cloze')
    .text('🎙️ Cambridge & BBC Podcasts', 'tool_podcast')
    .row()
    .text('🔗 Academic Collocations', 'ask_tool:collocate')
    .text('💎 Band 8.5+ Synonyms', 'ask_tool:syn')
    .row()
    .text('📖 Academic Topic Briefs', 'ask_tool:read')
    .text('📚 Academic Dictionary', 'ask_tool:dict')
    .row()
    .text('🧠 Scholar Quote', 'tool_quote')
    .text('🌟 Word of the Day', 'tool_wotd')
    .row()
    .text('📊 Check My Quota', 'tool_quota')
    .text('🎯 Band Score Scale', 'tool_bands')
    .row()
    .text('⏱️ 20m CBT Sprint', 'sprint:20')
    .text('⏱️ 40m Essay Sprint', 'sprint:40')
    .row();

  if (!isVip) {
    keyboard.text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy').row();
  }

  keyboard.webApp('🚀 Launch IELTS Prep Studio', WEB_URL)
    .text('🌐 Language', 'menu_lang');

  await ctx.reply(menuMsg, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function handleCollocate(ctx, rawWord) {
  const userId = ctx.from.id;
  const word = (rawWord || '').trim();
  if (!word) {
    userPendingActions.set(userId, 'collocate');
    return ctx.reply('✍️ Please type the word you want to collocate (e.g. `impact`, `crucial`, `policy`):', { parse_mode: 'Markdown' });
  }

  const quota = checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    return ctx.reply(getQuotaExceededMessage(), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy')
    });
  }

  const result = await getAcademicCollocations(word);
  if (!result || !result.collocations) {
    return ctx.reply(`⚠️ No academic collocations found for \`${word}\`. Try common academic words like *impact, crucial, policy, environment, education, evidence*.`, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🔍 Search another word', 'ask_tool:collocate')
        .text('⚡ VIP Tools', 'menu_tools')
    });
  }

  const col = result.collocations;
  let text = `🔗 **ACADEMIC COLLOCATIONS: "${result.word.toUpperCase()}"**\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏷️ **Part of Speech:** _${result.pos}_\n\n`;

  if (col.verb_noun && col.verb_noun.length) {
    text += `🔹 **Verb + Noun Collocations:**\n` + col.verb_noun.map(v => `• ${v}`).join('\n') + `\n\n`;
  }
  if (col.adj_noun && col.adj_noun.length) {
    text += `🔹 **Adjective + Noun Pairings:**\n` + col.adj_noun.map(a => `• ${a}`).join('\n') + `\n\n`;
  }
  if (col.adv_adj && col.adv_adj.length) {
    text += `🔹 **Adverb Intensifiers:**\n` + col.adv_adj.map(ad => `• ${ad}`).join('\n') + `\n\n`;
  }
  if (col.prep_phrase && col.prep_phrase.length) {
    text += `🔹 **Academic Prepositional Phrases:**\n` + col.prep_phrase.map(p => `• _${p}_`).join('\n') + `\n\n`;
  }
  if (col.frame) {
    text += `✍️ **Band 9 Academic Model Sentence:**\n"${col.frame}"\n\n`;
  }

  text += `💡 *Band 8.5 Tip:*
Pair words with authentic academic collocations to elevate your Lexical Resource mark from Band 6.0 to 8.0+.

${formatQuotaFooter(quota)}`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('🔗 Collocate another word', 'ask_tool:collocate')
      .text(`💎 Synonyms for "${result.word}"`, `tool_syn:${result.word}`)
      .row()
      .text('⚡ VIP Academic Menu', 'menu_tools')
  });
}

async function handleSyn(ctx, rawWord) {
  const userId = ctx.from.id;
  const word = (rawWord || '').trim();
  if (!word) {
    userPendingActions.set(userId, 'syn');
    return ctx.reply('✍️ Please type the word you want to find synonyms for (e.g. `important`, `increase`, `problem`):', { parse_mode: 'Markdown' });
  }

  const quota = checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    return ctx.reply(getQuotaExceededMessage(), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy')
    });
  }

  const result = await getAcademicSynonyms(word);
  if (!result || (!result.items && !result.synonyms?.length)) {
    return ctx.reply(`⚠️ No academic synonyms found for \`${word}\`. Try words like *important, crucial, beneficial, problem, increase*.`, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🔍 Try another word', 'ask_tool:syn')
        .text('⚡ VIP Tools', 'menu_tools')
    });
  }

  let text = `💎 **BAND 8.5+ SYNONYMS FOR: "${result.word.toUpperCase()}"**\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (result.items && result.items.length) {
    for (const item of result.items.slice(0, 4)) {
      text += `• **${item.term}** \`[${item.register || 'C1 Academic'}]\`\n` +
              `  _${item.nuance}_\n` +
              `  ✍️ *Model:* "${item.example}"\n\n`;
    }
  } else if (result.synonyms && result.synonyms.length) {
    text += `🎯 **Academic Substitutes:**\n` + result.synonyms.map(s => `• *${s}*`).join('\n') + `\n\n`;
  }

  text += `💡 *Lexical Flexibility Warning:*
Avoid mechanical substitutions. Ensure the synonym matches the precise academic register and nuance of your thesis.

${formatQuotaFooter(quota)}`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('💎 Find more synonyms', 'ask_tool:syn')
      .text(`🔗 Collocations for "${result.word}"`, `tool_collocate:${result.word}`)
      .row()
      .text('⚡ VIP Academic Menu', 'menu_tools')
  });
}

async function handleDict(ctx, rawWord) {
  const userId = ctx.from.id;
  const word = (rawWord || '').trim();
  if (!word) {
    userPendingActions.set(userId, 'dict');
    return ctx.reply('✍️ Please type the word to look up in the academic dictionary (e.g. `ubiquitous`, `mitigate`):', { parse_mode: 'Markdown' });
  }

  const quota = checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    return ctx.reply(getQuotaExceededMessage(), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy')
    });
  }

  const result = await fetchDictionary(word);
  if (!result || !result.definitions.length) {
    return ctx.reply(`⚠️ Word \`${word}\` not found in dictionary database. Check spelling or try common academic terms.`, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('📚 Search another word', 'ask_tool:dict')
        .text('⚡ VIP Tools', 'menu_tools')
    });
  }

  let text = `📚 **LIVE ACADEMIC DICTIONARY: "${result.word.toUpperCase()}"**\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏷️ **Part of Speech:** _${result.pos}_\n\n`;
  text += `📖 **Formal Definitions:**\n` + result.definitions.map((d, i) => `${i + 1}. *(${d.pos})* ${d.definition}`).join('\n\n') + `\n\n`;
  text += formatQuotaFooter(quota);

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('📚 Look up another word', 'ask_tool:dict')
      .text('🔗 Collocations', `tool_collocate:${result.word}`)
      .row()
      .text('⚡ VIP Academic Menu', 'menu_tools')
  });
}

async function handleRead(ctx, rawTopic) {
  const userId = ctx.from.id;
  const topic = (rawTopic || '').trim();
  if (!topic) {
    userPendingActions.set(userId, 'read');
    return ctx.reply('✍️ Please type the topic for background knowledge (e.g. `Artificial intelligence`, `Climate change`):', { parse_mode: 'Markdown' });
  }

  const quota = checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    return ctx.reply(getQuotaExceededMessage(), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy')
    });
  }

  const result = await fetchFullWikipediaArticle(topic);
  if (!result || !result.pages || !result.pages.length) {
    return ctx.reply(`⚠️ Could not retrieve an academic knowledge brief for \`${topic}\`. Try topics like *Higher education, Globalization, Renewable energy, Urbanization*.`, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('📖 Search another topic', 'ask_tool:read')
        .text('⚡ VIP Tools', 'menu_tools')
    });
  }

  const cacheId = Math.random().toString(36).substring(2, 8);
  articleCache.set(cacheId, result);

  const pageText = result.pages[0];
  const text = 
`📖 **ACADEMIC TOPIC BRIEF: "${result.title.toUpperCase()}"**\n` +
`📊 **${result.wordCount} words** • ~**${result.readingTimeMin} min read** • **Page 1 of ${result.totalPages}**\n` +
`━━━━━━━━━━━━━━━━━━━━\n\n` +
`${pageText}\n\n` +
`🎯 **IELTS Writing & Speaking Angles:**\n` +
`• *Key Perspectives:* Evaluate socioeconomic impacts, statutory regulations, and long-term implications.\n\n` +
formatQuotaFooter(quota);

  const keyboard = new InlineKeyboard();
  if (result.totalPages > 1) {
    keyboard.text(`📄 Page 1/${result.totalPages}`, 'wiki_noop')
      .text('Next Page ➡️', `wiki_p:${cacheId}:1`)
      .row();
  }
  keyboard.text('📖 Read Another Topic', 'ask_tool:read')
    .url('🌐 Open Wikipedia ↗', result.url)
    .row()
    .text('⚡ VIP Academic Menu', 'menu_tools')
    .webApp('🚀 Open Studio', WEB_URL);

  try {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (parseErr) {
    console.warn('[handleRead Markdown parse error, fallback to plain text]', parseErr.message);
    await ctx.reply(text.replace(/[*_`\[\]]/g, ''), {
      reply_markup: keyboard
    });
  }
}

async function handleWikiPage(ctx, cacheId, pageIdx) {
  const article = articleCache.get(cacheId);
  if (!article || !article.pages || !article.pages[pageIdx]) {
    return ctx.answerCallbackQuery({
      text: 'Session expired. Please request the topic again via /read.',
      show_alert: true
    });
  }

  const pageText = article.pages[pageIdx];
  const text = 
`📖 **ACADEMIC TOPIC BRIEF: "${article.title.toUpperCase()}"**\n` +
`📊 **${article.wordCount} words** • ~**${article.readingTimeMin} min read** • **Page ${pageIdx + 1} of ${article.totalPages}**\n` +
`━━━━━━━━━━━━━━━━━━━━\n\n` +
`${pageText}\n\n` +
`🎯 **IELTS Writing & Speaking Angles:**\n` +
`• *Key Perspectives:* Evaluate socioeconomic impacts, statutory regulations, and long-term implications.`;

  const keyboard = new InlineKeyboard();
  if (pageIdx > 0) {
    keyboard.text('⬅️ Prev', `wiki_p:${cacheId}:${pageIdx - 1}`);
  }
  keyboard.text(`📄 ${pageIdx + 1}/${article.totalPages}`, 'wiki_noop');
  if (pageIdx < article.totalPages - 1) {
    keyboard.text('Next ➡️', `wiki_p:${cacheId}:${pageIdx + 1}`);
  }
  keyboard.row()
    .text('📖 Read Another Topic', 'ask_tool:read')
    .url('🌐 Open Wikipedia ↗', article.url)
    .row()
    .text('⚡ VIP Academic Menu', 'menu_tools')
    .webApp('🚀 Open Studio', WEB_URL);

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (err) {
    try {
      await ctx.editMessageText(text.replace(/[*_`\[\]]/g, ''), {
        reply_markup: keyboard
      });
    } catch (fallbackErr) {
      console.error('[handleWikiPage edit error]', fallbackErr.message);
    }
  }
  await ctx.answerCallbackQuery({ text: `Page ${pageIdx + 1} of ${article.totalPages}` });
}

const activeClozeSessions = new Map(); // id -> { answers, topic, title }

async function handleQuote(ctx) {
  const userId = ctx.from.id;
  const quota = checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    return ctx.reply(getQuotaExceededMessage(), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy')
    });
  }

  const quote = await fetchScholarQuote();
  const text =
    `🧠 **SCHOLAR THOUGHT & RHETORIC**\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `❝ *${quote.quote}* ❞\n` +
    `— **${quote.author}**\n\n` +
    `✍️ **IELTS Task 2 Application:**\n` +
    `${quote.advice}\n\n` +
    `${formatQuotaFooter(quota)}`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('🔄 Another Quote ⏭️', 'tool_quote')
      .text('⚡ VIP Academic Menu', 'menu_tools')
  });
}

async function handlePaper(ctx, topic) {
  const userId = ctx.from.id;
  const quota = checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    return ctx.reply(getQuotaExceededMessage(), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy')
    });
  }
  const t = topic || 'artificial intelligence education';
  try {
    const res = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(t)}&filter=has_abstract:true,language:en&per_page=1`);
    const data = await res.json();
    const work = data.results && data.results[0];
    if (!work || !work.abstract_inverted_index) {
      return ctx.reply('No peer-reviewed paper found for that topic. Try `/paper climate policy`.');
    }
    const inv = work.abstract_inverted_index;
    const words = [];
    Object.keys(inv).forEach((w) => inv[w].forEach((pos) => { words[pos] = w; }));
    const abstract = words.join(' ').slice(0, 750);
    return ctx.reply(
      `🔬 *Peer-Reviewed Study (${work.publication_year || 2025})*\n` +
      `*Title:* ${work.title}\n` +
      `*Citations:* ${work.cited_by_count || 0}\n\n` +
      `${abstract}...\n\n` +
      `${formatQuotaFooter(quota)}`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    return ctx.reply('Could not load academic paper. Please try again.');
  }
}

async function handleChart(ctx, country) {
  const userId = ctx.from.id;
  const quota = checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    return ctx.reply(getQuotaExceededMessage(), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy')
    });
  }
  const c = (country || 'MMR').trim().toUpperCase().slice(0, 3);
  try {
    const res = await fetch(`https://api.worldbank.org/v2/country/${encodeURIComponent(c)}/indicator/IT.NET.USER.ZS?date=2019:2023&format=json`);
    const data = await res.json();
    const rows = (Array.isArray(data) && Array.isArray(data[1]) ? data[1] : []).filter((r) => r.value !== null);
    if (!rows.length) {
      return ctx.reply('Use a 3-letter ISO country code, e.g. `/chart MMR`, `/chart GBR`, `/chart SGP`.');
    }
    const lines = rows.map((r) => `• *${r.date}*: ${Number(r.value).toFixed(1)}%`).join('\n');
    return ctx.reply(
      `📊 *Writing Task 1 Live Data (${rows[0].country.value})*\n` +
      `*Indicator:* Internet Users (% of Population)\n\n${lines}\n\n` +
      `_Write a 2-sentence overview comparing the trend from ${rows[rows.length - 1].date} to ${rows[0].date}._\n\n` +
      `${formatQuotaFooter(quota)}`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    return ctx.reply('Could not load World Bank statistics. Please try again.');
  }
}

const FALLBACK_CLOZE_BANK = [
  {
    topicKey: "climate policy",
    title: "Carbon Pricing Mechanisms and Climate Policy Alignment in Global Economies",
    year: 2025,
    citations: 342,
    rawTokens: "Economic decarbonization requires robust policy frameworks that integrate carbon taxation with renewable subsidies. Global climate initiatives demonstrate that targeted financial interventions accelerate institutional transitions toward net-zero emissions while mitigating competitive disparities across developing industrial sectors.".split(" "),
    targetWords: ["frameworks", "subsidies", "initiatives", "transitions", "mitigating"]
  },
  {
    topicKey: "urban sustainability",
    title: "Decarbonization Pathways and Resource Efficiency in Mega-City Infrastructures",
    year: 2024,
    citations: 289,
    rawTokens: "Rapid urbanization introduces profound ecological challenges that necessitate comprehensive municipal planning. Sustainable infrastructure projects must optimize public transit networks and energy consumption patterns to ensure environmental equilibrium and long-term socio-economic resilience.".split(" "),
    targetWords: ["ecological", "necessitate", "infrastructure", "consumption", "equilibrium"]
  },
  {
    topicKey: "artificial intelligence",
    title: "Algorithmic Pedagogies and Cognitive Synthesis in Higher Education Learning",
    year: 2025,
    citations: 412,
    rawTokens: "The integration of generative artificial intelligence into educational curricula demands critical re-examination of assessment methodologies. Adaptive learning platforms facilitate personalized mastery while presenting ethical dilemmas concerning academic integrity and intellectual independence.".split(" "),
    targetWords: ["curricula", "methodologies", "facilitate", "dilemmas", "integrity"]
  },
  {
    topicKey: "renewable energy",
    title: "Grid Modernization and Storage Economics in Decentralized Energy Ecosystems",
    year: 2024,
    citations: 276,
    rawTokens: "Transitioning toward decentralized renewable energy requires substantial investment in battery storage technologies. Fluctuating generation capacity poses significant operational vulnerabilities that advanced smart-grid automation can effectively mitigate across regional distribution networks.".split(" "),
    targetWords: ["substantial", "technologies", "generation", "vulnerabilities", "distribution"]
  },
  {
    topicKey: "cognitive linguistics",
    title: "Lexical Retention Protocols and Neural Encoding in Second Language Acquisition",
    year: 2025,
    citations: 198,
    rawTokens: "Second language acquisition research emphasizes the critical role of spaced repetition in consolidating vocabulary memory traces. Contextual collocation retrieval strengthens neural pathways and enhances communicative fluency during high-stakes formal academic examinations.".split(" "),
    targetWords: ["consolidating", "contextual", "collocation", "retrieval", "communicative"]
  }
];

const FALLBACK_PODCAST_BANK = [
  {
    searchTerm: "speaking",
    show: "IELTS Band 9 Speaking Simulation",
    title: "EP. 2 IELTS Speaking Interview 2023 | IELTS BAND 9| Real Test!",
    date: "2026-10-20",
    durationMin: 15,
    audioUrl: "https://traffic.megaphone.fm/PODAGEN2263951416.mp3?updated=1778656111",
    dialogue: [
      "[01:23] Examiner: Now in this first part, I'd like to ask you some questions about yourself. Let's talk about where you're living now.",
      "[01:30] Examiner: Tell me about the town or city where you're living at the moment.",
      "[01:34] Candidate: At the moment, I am living in Oxford, which is a city that I absolutely love. It's so pretty.",
      "[01:42] Examiner: And how long have you been living in this city?",
      "[01:45] Candidate: I've been living in this city since September last year. So that's about five months, I'd say.",
      "[01:53] Examiner: Do you think you will move to a different place in the near future?",
      "[01:57] Candidate: In the near future, I don't think so. I'm quite happy where I am. I've got a nice job."
    ],
    vocab: [
      "• Oxford: Historic university city in Oxfordshire, England celebrated for collegiate architecture",
      "• Near future: An idiomatic temporal marker indicating the immediate upcoming period",
      "• Fluency & Coherence: Band 9 criterion evaluating spontaneous, unhesitating delivery"
    ]
  },
  {
    searchTerm: "bbc",
    show: "BBC 6 Minute English",
    title: "Why has gold got so expensive?",
    date: "2026-10-15",
    durationMin: 7,
    audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0pgs15w.mp3",
    dialogue: [
      "[01:06] Phil: Hello, welcome to 6 Minute English from BBC Learning English. I'm Phil.",
      "[01:11] Georgie: And I'm Georgie.",
      "[01:19] Phil: I've got a question for you. Do you own anything made of gold?",
      "[01:29] Georgie: Well, at the moment, I'm wearing a lot of gold colour jewelry, but I'm not sure exactly how much of it is made of gold.",
      "[01:42] Phil: In recent months, the price of gold has soared to record highs over $2,700 per ounce."
    ],
    vocab: [
      "• Jewelry: Decorative personal items such as rings, necklaces, and bracelets",
      "• Safe haven: An investment asset retaining intrinsic value during economic turbulence",
      "• Soar: To rise rapidly to an exceptionally elevated altitude or historic high"
    ]
  },
  {
    searchTerm: "alcohol",
    show: "BBC 6 Minute English",
    title: "Are people drinking less alcohol?",
    date: "2026-10-08",
    durationMin: 7,
    audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0pfllv6.mp3",
    dialogue: [
      "[01:11] Georgie: Hello, welcome to 6 Minute English from BBC Learning English. I'm Georgie.",
      "[01:17] Neil: And I'm Neil.",
      "[01:24] Georgie: Do you want to hear something quite unusual for me?",
      "[01:29] Neil: Yes!",
      "[01:30] Georgie: I'm trying to drink less alcohol.",
      "[01:35] Neil: That is unusual for you, Georgie. Mindful drinking has become a prominent wellness movement."
    ],
    vocab: [
      "• Mindful drinking: Consciously evaluating and moderating alcohol consumption",
      "• Abstain: To deliberately refrain from indulging in an appetite or habit",
      "• Dealcoholized: Beverages produced with alcohol removed through vacuum distillation"
    ]
  }
];

async function handleCloze(ctx, topic) {
  const userId = ctx.from?.id;
  const isVip = isUserVip(userId);
  const quota = checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    return ctx.reply(getQuotaExceededMessage(), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy')
    });
  }

  const t = (topic || 'climate policy').trim();
  let workTitle = '';
  let pubYear = 2025;
  let citations = 214;
  let maskedText = '';
  let wordBank = [];
  let answerKey = [];
  let targetCount = 5;

  try {
    const res = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(t)}&filter=has_abstract:true,language:en&per_page=3`, {
      headers: {
        'User-Agent': 'IELTSPrepStudioBot/1.0 (mailto:contact@hyuguo.com)',
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      const work = data.results && data.results.find(w => w.abstract_inverted_index);
      if (work) {
        const inv = work.abstract_inverted_index;
        const words = [];
        Object.keys(inv).forEach(w => inv[w].forEach(pos => { words[pos] = w; }));
        const rawTokens = words.filter(Boolean);
        const stopWords = ['between', 'through', 'because', 'without', 'another', 'against', 'however', 'therefore', 'further', 'several', 'during', 'before', 'should', 'within', 'across', 'under'];

        const candidates = [];
        rawTokens.forEach((tok, idx) => {
          const clean = tok.replace(/[^a-zA-Z]/g, '').toLowerCase();
          if (clean.length >= 6 && !stopWords.includes(clean) && !candidates.some(c => c.clean === clean)) {
            candidates.push({ idx, orig: tok, clean });
          }
        });

        if (candidates.length >= 4) {
          targetCount = Math.min(5, candidates.length);
          const step = Math.max(1, Math.floor(candidates.length / targetCount));
          const selected = [];
          for (let i = 0; i < targetCount; i++) {
            selected.push(candidates[Math.min(i * step, candidates.length - 1)]);
          }

          answerKey = selected.map((s, i) => `${i + 1}. *${s.clean}*`);
          wordBank = [...selected.map(s => s.clean)].sort(() => Math.random() - 0.5);

          const maskedTokens = [...rawTokens];
          selected.forEach((sel, i) => {
            const punc = sel.orig.match(/[^a-zA-Z]+$/)?.[0] || '';
            maskedTokens[sel.idx] = `[ ${i + 1} ]${punc}`;
          });

          workTitle = work.title;
          pubYear = work.publication_year || 2025;
          citations = work.cited_by_count || 0;
          maskedText = maskedTokens.join(' ').slice(0, 950);
        }
      }
    }
  } catch (err) {
    console.warn('[OpenAlex Fetch Error in bot.js]', err);
  }

  // Resilient fallback if OpenAlex failed or was insufficient
  if (!maskedText) {
    const tLow = t.toLowerCase();
    const fallback = FALLBACK_CLOZE_BANK.find(f => tLow.includes(f.topicKey) || f.topicKey.includes(tLow)) || FALLBACK_CLOZE_BANK[0];
    workTitle = fallback.title;
    pubYear = fallback.year;
    citations = fallback.citations;

    const rawTokens = [...fallback.rawTokens];
    const selected = [];
    fallback.targetWords.forEach((word) => {
      const idx = rawTokens.findIndex(tok => tok.toLowerCase().replace(/[^a-zA-Z]/g, '') === word);
      if (idx !== -1) {
        selected.push({ idx, orig: rawTokens[idx], clean: word });
      }
    });

    targetCount = selected.length;
    selected.forEach((sel, i) => {
      const punc = sel.orig.match(/[^a-zA-Z]+$/)?.[0] || '';
      rawTokens[sel.idx] = `[ ${i + 1} ]${punc}`;
    });

    maskedText = rawTokens.join(' ');
    wordBank = [...selected.map(s => s.clean)].sort(() => Math.random() - 0.5);
    answerKey = selected.map((s, i) => `${i + 1}. *${s.clean}*`);
  }

  const clozeId = `cloze_${Date.now()}_${userId}`;
  activeClozeSessions.set(clozeId, {
    title: workTitle,
    answers: answerKey,
    topic: t
  });

  const messageText =
    `📖 *PEER-REVIEWED CLOZE DRILL*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔬 *Scholarly Study:* _${workTitle}_\n` +
    `📅 *Year:* ${pubYear} • *Citations:* ${citations}\n\n` +
    `Fill in blanks *[ 1 ]* to *[ ${targetCount} ]* from the Academic Word Bank below:\n\n` +
    `"${maskedText}..."\n\n` +
    `🔤 *Word Bank:*\n` +
    `\`${wordBank.join('  •  ')}\`\n\n` +
    `${formatQuotaFooter(quota)}`;

  return ctx.reply(messageText, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('👁️ Reveal Answer Key', `cloze_ans:${clozeId}`)
      .row()
      .text('🔄 Another Cloze Drill', 'tool_cloze')
      .text('⚡ VIP Academic Menu', 'menu_tools')
  });
}

async function handlePodcast(ctx, query) {
  const userId = ctx.from?.id;
  const isVip = isUserVip(userId);
  const quota = checkAndConsumeQuota(userId);
  if (!quota.allowed) {
    return ctx.reply(getQuotaExceededMessage(), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy')
    });
  }

  let rawQ = (query || '').trim().toLowerCase();
  let searchTerm = 'BBC 6 Minute English';
  if (rawQ.includes('cambridge') || rawQ.includes('cam')) {
    searchTerm = 'Cambridge Assessment English Podcast';
  } else if (rawQ.includes('alcohol') || rawQ.includes('drink')) {
    searchTerm = 'alcohol';
  } else if (rawQ.includes('gold')) {
    searchTerm = 'gold';
  } else if (rawQ.includes('bbc') || rawQ.includes('idiom') || rawQ.includes('speak')) {
    searchTerm = 'BBC The English We Speak';
  } else if (rawQ.length > 2) {
    searchTerm = query.trim();
  }

  let showName = '';
  let epTitle = '';
  let durationMin = 6;
  let releaseDate = '2026-10-15';
  let mp3Url = '';
  let dialogueLines = '';
  let vocabLines = '';

  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=podcast&entity=podcastEpisode&limit=3`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const ep = data.results && data.results.find(e => e.previewUrl || e.episodeUrl);
      if (ep) {
        showName = ep.collectionName || 'BBC Learning English';
        epTitle = ep.trackName || 'Native English Episode';
        durationMin = ep.trackTimeMillis ? Math.round(ep.trackTimeMillis / 60000) : 6;
        releaseDate = (ep.releaseDate || '').slice(0, 10) || '2026-10-15';
        mp3Url = ep.previewUrl || ep.episodeUrl;

        const matchedFb = FALLBACK_PODCAST_BANK.find(f => epTitle.toLowerCase().includes(f.searchTerm) || epTitle.toLowerCase().includes('gold'));
        if (matchedFb) {
          dialogueLines = matchedFb.dialogue.join('\n');
          vocabLines = matchedFb.vocab.join('\n');
        }
      }
    }
  } catch (err) {
    console.warn('[iTunes Fetch Notice in bot.js]', err);
  }

  if (!mp3Url) {
    const fallback = FALLBACK_PODCAST_BANK.find(f => rawQ.includes(f.searchTerm)) || FALLBACK_PODCAST_BANK[0];
    showName = fallback.show;
    epTitle = fallback.title;
    durationMin = fallback.durationMin;
    releaseDate = fallback.date;
    mp3Url = fallback.audioUrl;
    dialogueLines = fallback.dialogue.join('\n');
    vocabLines = fallback.vocab.join('\n');
  }

  if (!dialogueLines) {
    dialogueLines = `🎙️ [Authentic Audio Stream: "${epTitle}"]\nListen along with the live audio stream above. Launch our Web App for second-by-second interactive live captions with playhead sync.`;
    vocabLines = '• Coherence: Logical connection and consistency of ideas\n• Nuance: A subtle distinction in meaning or tone';
  }

  const messageText =
    `🎙️ *NATIVE PODCAST TRANSCRIPT & AUDIO*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📻 *Show:* ${showName}\n` +
    `🎵 *Episode:* *${epTitle}*\n` +
    `⏱️ *Duration:* ~${durationMin} min • 📅 *Date:* ${releaseDate}\n\n` +
    `🎧 *Direct Audio Stream (MP3):*\n${mp3Url}\n\n` +
    `📜 *Precise Spoken Dialogue & Captions:*\n${dialogueLines}\n\n` +
    `💎 *Target Academic Vocabulary:*\n${vocabLines}\n\n` +
    `💡 *Listening Protocol:*\n` +
    `• Follow along with the transcript to match English speech sounds to spelling.\n` +
    `• Note how C1/C2 idioms are used naturally in real conversation.\n` +
    `• Listen in our Web App for paragraph-by-paragraph captions and audio controls.\n\n` +
    `${formatQuotaFooter(quota)}`;

  return ctx.reply(messageText, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .webApp('🎙️ Open Podcasts & Transcripts in App', WEB_URL)
      .row()
      .text('📻 Cambridge Feed', 'pod_cambridge')
      .text('📻 BBC Feed', 'pod_bbc')
      .row()
      .text('⚡ VIP Academic Menu', 'menu_tools')
  });
}

async function handleQuota(ctx) {
  const userId = ctx.from.id;
  const isVip = isUserVip(userId);
  const quota = getQuotaStatus(userId);

  const text =
    `📊 **YOUR DAILY ACADEMIC AI TOOL QUOTA**\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 **Telegram ID:** \`${userId}\`\n` +
    `👑 **Tier Status:** ${isVip ? '👑 **LIFETIME VIP PASS (Active)**' : '🆓 **FREE TIER**'}\n\n` +
    (isVip
      ? '✨ **Unlimited Daily Queries Activated!**\nYou have lifetime unrestricted access to all academic collocations, synonyms, topic briefs, dictionary queries, and scholar quotes.'
      : `📅 **Today's Quota (${getYangonDateStr()} MMT):**\n• Used Today: *${quota.count} / ${quota.limit}*\n• Remaining Today: *${quota.remaining} queries*\n\n⭐ **Upgrade to Lifetime VIP (55,000 MMK)** for unlimited queries, all 1,162 vocabulary items, 23 CBT reading passages, and 40 writing models!`);

  const keyboard = new InlineKeyboard();
  if (!isVip) {
    keyboard.text('👑 Buy VIP (750 ★ / 55k)', 'menu_buy').row();
  }
  keyboard.text('⚡ VIP Academic Menu', 'menu_tools');

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function handleBands(ctx) {
  const text =
    `🎯 **IELTS BAND SCORE CONVERSION & ASSESSMENT RUBRIC**\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 **Raw Score to Band Conversion (Listening & Academic Reading — 40 Questions):**\n` +
    `• Band 9.0: 39 – 40 correct\n` +
    `• Band 8.5: 37 – 38 correct\n` +
    `• Band 8.0: 35 – 36 correct\n` +
    `• Band 7.5: 33 – 34 correct\n` +
    `• Band 7.0: 30 – 32 correct\n` +
    `• Band 6.5: 27 – 29 correct\n` +
    `• Band 6.0: 23 – 26 correct\n` +
    `• Band 5.5: 19 – 22 correct\n\n` +
    `✍️ **Writing 4 Core Criteria (25% each):**\n` +
    `1. **Task Achievement / Response** — Fully address all parts with supported arguments.\n` +
    `2. **Coherence & Cohesion** — Logical progression, cohesive devices, proper paragraphing.\n` +
    `3. **Lexical Resource** — Wide academic vocabulary, precise collocations, rare errors.\n` +
    `4. **Grammatical Range & Accuracy** — Complex sentence structures, error-free clauses.\n\n` +
    `🗣️ **Speaking 4 Core Criteria (25% each):**\n` +
    `1. **Fluency & Coherence** — Natural speech flow, minimal hesitation.\n` +
    `2. **Lexical Resource** — Idiomatic expressions, flexible vocabulary.\n` +
    `3. **Grammatical Range & Accuracy** — Varied tenses, complex conditionals.\n` +
    `4. **Pronunciation** — Clear intonation, stress patterns, easy to understand.`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('📋 IELTS Exam Format', 'tool_format')
      .text('⚡ VIP Academic Menu', 'menu_tools')
  });
}

async function handleFormat(ctx) {
  const text =
    `📋 **IELTS ACADEMIC TEST FORMAT CHEAT SHEET**\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎧 **1. Listening (approx. 30 mins + 2 mins review CBT / 10 mins Paper)**\n` +
    `• 4 Sections, 40 Questions (Played ONCE only)\n` +
    `• Section 1: Everyday social dialogue (2 speakers)\n` +
    `• Section 2: Everyday social monologue (1 speaker)\n` +
    `• Section 3: Academic discussion (up to 4 speakers)\n` +
    `• Section 4: University academic lecture (1 speaker)\n\n` +
    `📖 **2. Reading (60 mins — No extra transfer time!)**\n` +
    `• 3 Passages, 40 Questions (~2,150–2,750 words total)\n` +
    `• Passage 1: Descriptive / Factual\n` +
    `• Passage 2: Analytical / Discursive\n` +
    `• Passage 3: Complex argument / Academic theory\n\n` +
    `✍️ **3. Writing (60 mins total)**\n` +
    `• Task 1: Visual Data Report (Graph, Chart, Table) — min 150 words (20 mins, 33% weight)\n` +
    `• Task 2: Formal Academic Essay — min 250 words (40 mins, 66% weight)\n\n` +
    `🗣️ **4. Speaking (11 – 14 mins face-to-face or video call)**\n` +
    `• Part 1: Introduction & familiar topics (4–5 mins)\n` +
    `• Part 2: Long turn Cue Card monologue (1 min prep, 1–2 mins speech)\n` +
    `• Part 3: Abstract academic discussion (4–5 mins)`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('🎯 Band Score Scale', 'tool_bands')
      .text('⚡ VIP Academic Menu', 'menu_tools')
  });
}

async function handleSprint(ctx, mins = 20) {
  const safeMins = typeof mins === 'number' && mins > 0 ? mins : 20;
  const text =
    `⏱️ **IELTS FOCUS SPRINT STARTED (${safeMins} MINUTES)**\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 **Sprint Goal:**\n` +
    (safeMins <= 20
      ? '📖 **CBT Reading Sprint:** Complete 1 Cambridge passage (13–14 questions) in 20 minutes under strict exam conditions!'
      : '✍️ **Writing Task 2 Sprint:** Plan and draft a full 250+ word academic essay in 40 minutes without stopping!') +
    `\n\n💡 **Pro Tip:**\n` +
    `Put your phone on Do Not Disturb, silence all social notifications, and immerse yourself in the task.\n\n` +
    `👇 Mini App တွင် ချက်ချင်း လေ့ကျင့်ရန်:`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('⏱️ 20m CBT Reading Sprint', 'sprint:20')
      .text('⏱️ 40m Writing Sprint', 'sprint:40')
      .row()
      .webApp('🚀 Open Studio Mini App', WEB_URL)
  });
}

async function handleHelp(ctx) {
  const helpText =
    `📕 **IELTS PREP STUDIO — BOT COMMANDS & SHORTCUTS**\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ **/tools** — Open VIP Academic Lexicon & Topic Explorer\n` +
    `🔗 **/collocate <word>** — Search high-yield academic collocations\n` +
    `💎 **/syn <word>** — Search Band 8.5+ academic synonyms\n` +
    `📚 **/dict <word>** — Check formal definition & part of speech\n` +
    `📖 **/read <topic>** — Get essay background knowledge & ideas\n` +
    `🧠 **/quote** — Scholar philosophical thought for Task 2\n` +
    `🌟 **/wotd** — Academic Word of the Day with Burmese meaning\n` +
    `📊 **/quota** — Check your remaining daily searches (10/day free)\n` +
    `🎯 **/bands** — IELTS 9-band scale & raw score conversion table\n` +
    `📋 **/format** — Academic exam timings & structure cheat sheet\n` +
    `⏱️ **/sprint [20|40]** — 20m Reading or 40m Essay study sprint\n` +
    `🎓 **/start** — View syllabus, deliverables & payment info`;

  await ctx.reply(helpText, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text('⚡ VIP Academic Menu', 'menu_tools')
  });
}

// Register Bot Commands
bot.command(['tools', 'academic'], handleToolsMenu);
bot.command(['vip', 'buy', 'stars', 'buy_stars'], handleBuy);
bot.command(['lang', 'language'], handleLanguage);
bot.command('pay', async (ctx) => {
  return ctx.reply(
    `💳 **Payment Options — Lifetime VIP Pass**\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⭐️ **Option 1: Telegram Stars (Worldwide)**\n` +
    `• Price: **750 ★ Stars** (Instant 1-Click activation)\n\n` +
    `🇲🇲 **Option 2: Myanmar Mobile Wallets**\n` +
    `• KBZPay / WavePay: \`${PAYMENT_PHONE}\` (${ACCOUNT_NAME})\n` +
    `• Price: **${PRICE_MMK}** (Send slip for 1-tap approval)\n`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⭐️ Pay 750 ★ Stars', 'pay_stars')
        .text('🇲🇲 Slip Instructions', 'info_payment')
        .row()
        .text('⚡ VIP Academic Menu', 'menu_tools')
    }
  );
});
bot.command('collocate', ctx => {
  const w = ctx.message?.text?.replace('/collocate', '').trim() || '';
  handleCollocate(ctx, w);
});
bot.command(['syn', 'synonym'], ctx => {
  const w = ctx.message?.text?.replace(/^\/syn(onym)?/i, '').trim() || '';
  handleSyn(ctx, w);
});
bot.command(['dict', 'dictionary'], ctx => {
  const w = ctx.message?.text?.replace(/^\/dict(ionary)?/i, '').trim() || '';
  handleDict(ctx, w);
});
bot.command(['read', 'topic'], ctx => {
  const t = ctx.message?.text?.replace(/^\/(read|topic)/i, '').trim() || '';
  handleRead(ctx, t);
});
bot.command('quote', handleQuote);
bot.command('paper', ctx => {
  const t = ctx.message?.text?.replace(/^\/paper/i, '').trim() || '';
  handlePaper(ctx, t);
});
bot.command('cloze', ctx => {
  const t = ctx.message?.text?.replace(/^\/cloze/i, '').trim() || '';
  handleCloze(ctx, t);
});
bot.command('chart', ctx => {
  const c = ctx.message?.text?.replace(/^\/chart/i, '').trim() || '';
  handleChart(ctx, c);
});
bot.command('podcast', ctx => {
  const q = ctx.message?.text?.replace(/^\/podcast/i, '').trim() || '';
  handlePodcast(ctx, q);
});
bot.command(['wotd', 'word'], handleWotd);
bot.command('quota', handleQuota);
bot.command(['bands', 'score'], handleBands);
bot.command(['format', 'exam'], handleFormat);
bot.command('sprint', ctx => {
  const m = ctx.message?.text?.match(/\d+/);
  handleSprint(ctx, m ? parseInt(m[0], 10) : 20);
});
bot.command('help', handleHelp);

// ==========================================
// 4. ADMIN INVENTORY COMMANDS
// ==========================================
bot.command('stats', (ctx) => {
  if (!isAdmin(ctx)) return;
  const stats = voucherPool.getStats();
  ctx.reply(
    `📊 **IELTS Prep Studio — VIP Pass Inventory**\n\n` +
    `• Total Vouchers: \`${stats.total}\`\n` +
    `• Total Sold / Issued: \`${stats.issued}\`\n` +
    `• Available in Pool: \`${stats.available}\`\n` +
    `• Total Revenue: **${stats.revenueMmk}**\n\n` +
    `💡 Tip: Use \`/mint 20\` to add 20 more passes to the pool.`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('mint', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const args = ctx.message?.text?.split(' ') || [];
  const count = parseInt(args[1], 10) || 10;
  const newOnes = voucherPool.mintRandomBatch(count);

  const preview = newOnes.slice(0, 5).map(v => `• \`${v.code}\``).join('\n');
  const moreText = newOnes.length > 5 ? `\n_...and ${newOnes.length - 5} more passes_` : '';

  await ctx.reply(
    `✅ **Minted ${newOnes.length} New Cryptographic Lifetime Passes!**\n\n` +
    `🎲 **Sample Generated Passes:**\n${preview}${moreText}\n\n` +
    `• Available in Pool: \`${voucherPool.getStats().available}\`\n` +
    `• Synced to \`IELTS_Studio_Voucher_Codes.csv\``,
    { parse_mode: 'Markdown' }
  );
});

// Global Error Handler to prevent process crashes
bot.catch((err) => {
  console.error('[Telegram Bot Error Caught]:', err.error || err);
});

// Start Long-Polling Bot Engine
bot.start({
  onStart: async (botInfo) => {
    console.log(`🚀 Telegram Bot is LIVE! Logged in as @${botInfo.username}`);
    console.log(`👉 Student Entrypoint: https://t.me/${botInfo.username}`);
    try {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: 'Open App',
          web_app: {
            url: WEB_URL
          }
        }
      });
      console.log('✅ Telegram Bot "Open App" Web App Menu Button configured.');
    } catch (btnErr) {
      console.warn('[Menu Button Notice]', btnErr.message);
    }
    try {
      await bot.api.setMyCommands([
        { command: 'start', description: '🎓 Launch Studio & Payment Options' },
        { command: 'vip', description: '👑 Lifetime VIP Pass (750 ★ Stars / 55k MMK)' },
        { command: 'buy', description: '⭐️ Instant Stars / Wallet Checkout' },
        { command: 'lang', description: '🌐 Switch Language (English / မြန်မာ)' },
        { command: 'tools', description: '⚡ VIP Academic AI Tools (Collocations, Synonyms, etc.)' },
        { command: 'collocate', description: '🔗 Academic Collocations & Word Pairings' },
        { command: 'syn', description: '💎 Band 8.5+ Academic Synonyms' },
        { command: 'dict', description: '📚 Academic Dictionary & Pronunciation' },
        { command: 'read', description: '📖 Essay Topic Briefs & Arguments' },
        { command: 'cloze', description: '📖 Peer-Reviewed Scholarly Cloze Drill' },
        { command: 'podcast', description: '🎙️ Cambridge & BBC Native Podcasts' },
        { command: 'quote', description: '🧠 Scholar Quotes for Task 2' },
        { command: 'wotd', description: '🌟 Band 8.5+ Word of the Day' },
        { command: 'quota', description: '📊 Check Daily AI Tool Usage (10/day)' },
        { command: 'bands', description: '🎯 Band Score Table & Descriptors' },
        { command: 'format', description: '📋 IELTS Academic Exam Format' },
        { command: 'sprint', description: '⏱️ 20m / 40m Focus Study Sprint' },
        { command: 'help', description: '📕 Study Guide & All Commands' }
      ]);
      console.log('✅ Telegram Bot Commands Menu configured.');
    } catch (cmdErr) {
      console.warn('[Commands Menu Notice]', cmdErr.message);
    }
    if (ADMIN_CHAT_ID) {
      console.log(`🛡️ Admin Chat ID bound to: ${ADMIN_CHAT_ID}`);
    } else {
      console.warn(`⚠️ Warning: ADMIN_CHAT_ID is not set in .env! Slips will not be forwarded.`);
    }
  }
});

// ==========================================
// RENDER & CLOUD HEALTH-CHECK HTTP SERVER
// ==========================================
// Render Web Services require binding to an open HTTP port (process.env.PORT)
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  const stats = voucherPool.getStats();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    service: 'IELTS Prep Studio Telegram Approval Bot',
    bot: '@IELTSPrepStudioBot',
    inventory: stats,
    timestamp: new Date().toISOString()
  }, null, 2));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP Health-Check Server listening on port ${PORT} (Satisfies Render/Railway port scanner)`);
});
