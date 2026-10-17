/**
 * IELTS Prep Studio - 1-Tap Telegram Approval & Fulfillment Bot
 *
 * Automated student payment slip intake -> 1-Tap Admin Approval -> Instant 1-Click Magic Link Delivery
 */

import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';
import { voucherPool } from './voucherPool.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? String(process.env.ADMIN_CHAT_ID).trim() : null;
const PAYMENT_PHONE = process.env.PAYMENT_PHONE || '09-768691939';
const ACCOUNT_NAME = process.env.ACCOUNT_NAME || 'Lyan Htet';
const PRICE_MMK = process.env.PRICE_MMK || '55,000 MMK';
const WEB_URL = process.env.STUDIO_WEB_URL || 'https://ielts-prep-studio.web.app';

if (!BOT_TOKEN) {
  console.error('❌ Error: BOT_TOKEN is missing in .env file!');
  console.error('Please create telegram-bot/.env and set BOT_TOKEN=your_token_from_botfather');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

console.log('🤖 IELTS Prep Studio Telegram Bot Initializing...');

// Helper: Check if user is the admin
function isAdmin(ctx) {
  if (!ADMIN_CHAT_ID) return false;
  return String(ctx.from?.id) === ADMIN_CHAT_ID;
}

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

  const welcomeText =
    `🎓 **IELTS Prep Studio — Lifetime VIP Pass**\n` +
    `Cambridge CBT Mock Simulator • Band 9.0 AI Examiner • 1,162 Lexicon & Traps\n\n` +
    `🇲🇲 **မြန်မာကျောင်းသားများအတွက် Lifetime VIP Pass ဝယ်ယူခြင်း**\n\n` +
    `📌 **Payment Details (ငွေပေးချေရန် အချက်အလက်များ):**\n` +
    `• KBZPay / WavePay Phone: \`${PAYMENT_PHONE}\`\n` +
    `• Account Name: **${ACCOUNT_NAME}**\n` +
    `• Investment: **${PRICE_MMK}** (တစ်ကြိမ်ပေး တစ်သက်တာအသုံးပြုခွင့်)\n\n` +
    `✨ **VIP Pass တွင် ပါဝင်သော Deliverables (7 ခုလုံး):**\n` +
    `1. Reading CBT Mock Exam 23 ခုလုံး (231 Questions) + Burmese Evidence\n` +
    `2. Writing Band 8.5/9.0 Models 40 ခုလုံး + Skeletons\n` +
    `3. Gemini AI Examiner Evaluations တစ်လ 60 ကြိမ် (တစ်နေ့ 2 ပုဒ် တိုက်ရိုက်စစ်ဆေးခွင့်)\n` +
    `4. Speaking 2026 Forecast Topics 30 ခုလုံး + 5 Strategic Frameworks\n` +
    `5. Lexicon & Trap Bank 1,162 ခုလုံး (Collocations, 538 Reading Traps, 179 Distractors)\n` +
    `6. Live Microphone Speaking Recorder & Voice Analyzer\n` +
    `7. Multi-Device Cloud Sync via Google Account\n\n` +
    `📸 **အတည်ပြုရန် လုပ်ဆောင်ချက်:**\n` +
    `KBZPay သို့မဟုတ် WavePay ဖြင့် **${PRICE_MMK}** လွှဲပြီးပါက ရရှိလာသော **Transaction Screenshot (ငွေလွှဲစလစ်)** အား ဤ Chat သို့ ချက်ချင်း ပေးပို့ပေးပါခင်ဗျာ။ Admin ဘက်မှ အတည်ပြုပြီးပါက **1-Click Magic Activation Link** ကို ချက်ချင်း ပေးပို့ပေးပါမည်!`;

  const keyboard = new InlineKeyboard()
    .url('🌐 Open IELTS Prep Studio', WEB_URL)
    .url('💬 Contact Support (@hyuguo)', 'https://t.me/hyuguo');

  await ctx.reply(welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

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

  // 1. Send immediate reassuring acknowledgement to student
  await ctx.reply(
    `✅ **ငွေလွှဲစလစ်အား လက်ခံရရှိပါပြီခင်ဗျာ!**\n\n` +
    `⏳ Admin ဘက်မှ Transaction ID အား စစ်ဆေးနေပါသည်။ အတည်ပြုပြီးပါက သင်၏ **Lifetime Studio VIP Pass (1-Click Magic Link)** အား ဤ Chat သို့ အလိုအလျောက် ချက်ချင်း ပေးပို့ပေးပါမည်။\n\n` +
    `ခေတ္တစောင့်ဆိုင်းပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။`,
    { parse_mode: 'Markdown' }
  );

  // 2. Forward slip to Admin with 1-Tap Action Buttons
  if (!ADMIN_CHAT_ID) {
    console.warn('[Telegram Bot] ADMIN_CHAT_ID not configured! Cannot forward slip.');
    return;
  }

  const studentName = (user.first_name || '') + (user.last_name ? ` ${user.last_name}` : '');
  const username = user.username ? `@${user.username}` : 'No Username';
  const timeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Yangon' });

  const adminCaption =
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
// 3. 1-TAP ADMIN APPROVAL & FULFILLMENT
// ==========================================
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const fromId = String(ctx.from.id);

  // Security Check: Only designated Admin can tap buttons
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

    // Claim next voucher from pool
    const voucher = voucherPool.claimNextVoucher({
      id: studentId,
      name: studentName,
      username: ''
    });

    if (!voucher) {
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
        reply_markup: new InlineKeyboard() // Clear buttons to prevent double-click
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
      `• All 1,162 Vocabulary, Reading & Listening Distractor Banks\n\n` +
      `_(Website တွင် ကိုယ်တိုင် Code ရိုက်ထည့်လိုပါက Voucher Code: \`${voucher.code}\` ဖြစ်ပါသည်)_\n\n` +
      `IELTS Prep Studio ဖြင့် အောင်မြင်သော ရလဒ်ကောင်းများ ပိုင်ဆိုင်နိုင်ပါစေကြောင်း ဆုမွန်ကောင်းတောင်းအပ်ပါသည်။`;

    try {
      await ctx.api.sendMessage(studentId, studentDeliveryMessage, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().url('🚀 Open & Activate VIP Pass', voucher.magicLink)
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
  }
});

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
  onStart: (botInfo) => {
    console.log(`🚀 Telegram Bot is LIVE! Logged in as @${botInfo.username}`);
    console.log(`👉 Student Entrypoint: https://t.me/${botInfo.username}`);
    if (ADMIN_CHAT_ID) {
      console.log(`🛡️ Admin Chat ID bound to: ${ADMIN_CHAT_ID}`);
    } else {
      console.warn(`⚠️ Warning: ADMIN_CHAT_ID is not set in .env! Slips will not be forwarded.`);
    }
  }
});
