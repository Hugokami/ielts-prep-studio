/**
 * Cloudflare Worker for IELTS Prep Studio Telegram Mini App
 * Zero LLM / Zero External Paid APIs / Serverless D1 SQLite + KV
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return handleCors();
    }

    try {
      if (url.pathname === "/api/sync" && request.method === "POST") {
        return await handleSync(request, env);
      }

      if (url.pathname === "/api/redeem-code" && request.method === "POST") {
        return await handleRedeemCode(request, env);
      }

      if (url.pathname === "/api/auth/telegram-widget" && request.method === "POST") {
        return await handleTelegramWidgetAuth(request, env);
      }

      if (url.pathname === "/api/setup-commands") {
        const res = await registerBotCommands(env.BOT_TOKEN);
        return jsonResponse({ success: true, commands: BOT_COMMANDS, result: res });
      }

      if (url.pathname === "/webhook" && request.method === "POST") {
        return await handleWebhook(request, env, ctx);
      }

      if (url.pathname === "/api/health") {
        return jsonResponse({ status: "ok", time: new Date().toISOString() });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders() });
    } catch (err) {
      console.error("[Worker Unhandled Error]", err);
      return jsonResponse({ error: err.message }, 500);
    }
  },

  // Daily Scheduled Cron Trigger (13:00 UTC = 19:30 MMT)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleDailyReminders(env));
  }
};

// ==========================================
// 1. CORS HELPERS
// ==========================================
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

function handleCors() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

// ==========================================
// 2. TELEGRAM HMAC-SHA256 VERIFICATION
// ==========================================
async function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");

    // Sort parameters alphabetically
    const items = [];
    for (const [key, value] of params.entries()) {
      items.push(`${key}=${value}`);
    }
    items.sort();
    const dataCheckString = items.join("\n");

    const enc = new TextEncoder();
    // 1. secret_key = HMAC_SHA256("WebAppData", botToken)
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKeyBytes = await crypto.subtle.sign("HMAC", keyMaterial, enc.encode(botToken));

    // 2. signature = HMAC_SHA256(secret_key, dataCheckString)
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBytes = await crypto.subtle.sign("HMAC", secretKey, enc.encode(dataCheckString));
    const calculatedHash = Array.from(new Uint8Array(sigBytes))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (calculatedHash !== hash) {
      console.warn("[Auth] Hash mismatch in initData");
      return null;
    }

    // Parse user object
    const userRaw = params.get("user");
    if (!userRaw) return null;
    return JSON.parse(userRaw);
  } catch (err) {
    console.warn("[Auth Error]", err);
    return null;
  }
}

// Cryptographic verification for Telegram Login Widget
// Secret Key = SHA256(botToken)
async function verifyTelegramWidgetData(authData, botToken) {
  if (!authData || !authData.hash || !botToken) return null;

  try {
    const { hash, ...data } = authData;

    // Check freshness: reject if auth_date is older than 24 hours
    const now = Math.floor(Date.now() / 1000);
    const authDate = parseInt(data.auth_date, 10);
    if (!authDate || Math.abs(now - authDate) > 86400) {
      console.warn("[Telegram Widget] auth_date expired or invalid:", data.auth_date);
      return null;
    }

    const items = [];
    for (const key of Object.keys(data).sort()) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
        items.push(`${key}=${data[key]}`);
      }
    }
    const dataCheckString = items.join("\n");

    const enc = new TextEncoder();
    // 1. secret_key = SHA256(botToken)
    const secretKeyDigest = await crypto.subtle.digest("SHA-256", enc.encode(botToken));

    // 2. HMAC-SHA256(secret_key, dataCheckString)
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      secretKeyDigest,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigBytes = await crypto.subtle.sign("HMAC", hmacKey, enc.encode(dataCheckString));
    const calculatedHash = Array.from(new Uint8Array(sigBytes))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (calculatedHash.toLowerCase() !== String(hash).toLowerCase()) {
      console.warn("[Telegram Widget] Hash signature mismatch");
      return null;
    }

    return {
      id: parseInt(data.id, 10),
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      username: data.username || "",
      photo_url: data.photo_url || ""
    };
  } catch (err) {
    console.warn("[Telegram Widget Auth Exception]", err);
    return null;
  }
}

// Handler for Telegram Login Widget Auth
async function handleTelegramWidgetAuth(request, env) {
  const body = await request.json();
  const authData = body || {};
  const botToken = env.BOT_TOKEN;

  if (!botToken) {
    return jsonResponse({ success: false, error: "BOT_TOKEN is not configured on server" }, 500);
  }

  const user = await verifyTelegramWidgetData(authData, botToken);
  if (!user || !user.id) {
    return jsonResponse({ success: false, error: "Invalid Telegram authentication signature or expired session." }, 401);
  }

  // Look up user in D1
  const existing = await env.DB.prepare(`
    SELECT * FROM users WHERE telegram_id = ?
  `).bind(user.id).first();

  let isVip = 0;
  if (existing) {
    isVip = existing.is_vip || 0;
    // Update profile info in D1
    await env.DB.prepare(`
      UPDATE users SET username = ?, first_name = ?, updated_at = unixepoch() WHERE telegram_id = ?
    `).bind(user.username || null, user.first_name || null, user.id).run();
  } else {
    // Insert initial user record
    await env.DB.prepare(`
      INSERT INTO users (telegram_id, username, first_name, is_vip, updated_at)
      VALUES (?, ?, ?, 0, unixepoch())
    `).bind(user.id, user.username || null, user.first_name || null).run();
  }

  // If user is VIP, load VIP bundle from KV
  let vipData = null;
  if (isVip === 1 && env.VIP_KV) {
    vipData = await env.VIP_KV.get("VIP_BUNDLE_JSON", "json");
  }

  return jsonResponse({
    success: true,
    isVip: isVip === 1,
    savedProgress: existing && existing.progress_json ? JSON.parse(existing.progress_json) : null,
    vipData: vipData,
    user: user
  });
}

// ==========================================
// 3. API: POST /api/sync
// ==========================================
async function handleSync(request, env) {
  const body = await request.json();
  const { initData, progress, srsDueCount } = body || {};

  const user = await verifyTelegramInitData(initData, env.BOT_TOKEN);
  if (!user || !user.id) {
    return jsonResponse({ error: "Unauthorized initData" }, 401);
  }

  const telegramId = user.id;
  const username = user.username || "";
  const firstName = user.first_name || "";
  const progressJson = progress ? JSON.stringify(progress) : "{}";
  const dueCount = typeof srsDueCount === "number" ? srsDueCount : 0;

  // Upsert user progress into D1
  await env.DB.prepare(`
    INSERT INTO users (telegram_id, username, first_name, is_vip, srs_due_count, progress_json, updated_at)
    VALUES (?, ?, ?, 0, ?, ?, unixepoch())
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      srs_due_count = excluded.srs_due_count,
      progress_json = excluded.progress_json,
      updated_at = unixepoch()
  `).bind(telegramId, username, firstName, dueCount, progressJson).run();

  // Query VIP status
  const userRow = await env.DB.prepare(`
    SELECT is_vip, progress_json FROM users WHERE telegram_id = ?
  `).bind(telegramId).first();

  const isVip = userRow && userRow.is_vip === 1;
  let vipData = null;

  if (isVip && env.VIP_KV) {
    try {
      vipData = await env.VIP_KV.get("VIP_BUNDLE_JSON", "json");
    } catch (e) {
      console.error("[KV Fetch Error]", e);
    }
  }

  return jsonResponse({
    success: true,
    telegramId,
    isVip: !!isVip,
    vipData: vipData
  });
}

// ==========================================
// 4. API: POST /api/redeem-code
// ==========================================
async function handleRedeemCode(request, env) {
  const body = await request.json();
  const { initData, code } = body || {};

  const cleanCode = (code || "").trim().toUpperCase();
  if (!cleanCode) {
    return jsonResponse({ success: false, error: "Promo code is required" }, 400);
  }

  // Telegram user auth if available
  let telegramId = 0;
  if (initData) {
    const user = await verifyTelegramInitData(initData, env.BOT_TOKEN);
    if (user && user.id) telegramId = user.id;
  }

  // Check code validity in D1
  const promo = await env.DB.prepare(`
    SELECT * FROM promo_codes WHERE code = ? AND is_used = 0
  `).bind(cleanCode).first();

  if (!promo) {
    return jsonResponse({ success: false, error: "Invalid or already used activation code." }, 400);
  }

  // Mark code used
  await env.DB.prepare(`
    UPDATE promo_codes SET is_used = 1, used_by_tg_id = ?, used_at = unixepoch() WHERE code = ?
  `).bind(telegramId || null, cleanCode).run();

  // If inside Telegram, elevate user to VIP in D1
  if (telegramId) {
    await env.DB.prepare(`
      INSERT INTO users (telegram_id, is_vip, vip_activated_at, updated_at)
      VALUES (?, 1, unixepoch(), unixepoch())
      ON CONFLICT(telegram_id) DO UPDATE SET
        is_vip = 1,
        vip_activated_at = unixepoch(),
        updated_at = unixepoch()
    `).bind(telegramId).run();
  }

  // Fetch VIP bundle from KV
  let vipData = null;
  if (env.VIP_KV) {
    vipData = await env.VIP_KV.get("VIP_BUNDLE_JSON", "json");
  }

  return jsonResponse({
    success: true,
    isVip: true,
    message: "Lifetime VIP Pass activated successfully!",
    vipData: vipData
  });
}

// ==========================================
// 5. TELEGRAM BOT WEBHOOK (POST /webhook)
// ==========================================
async function handleWebhook(request, env, ctx = null) {
  const update = await request.json();
  const botToken = env.BOT_TOKEN;
  const adminId = env.ADMIN_TG_ID;

  if (!botToken) {
    return jsonResponse({ error: "BOT_TOKEN not configured" }, 500);
  }

  // A. Message handler
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const userId = msg.from ? msg.from.id : chatId;
    const text = (msg.text || "").trim();

    // Auto-register student in D1 on incoming message
    if (msg.from && msg.from.id) {
      try {
        await env.DB.prepare(`
          INSERT INTO users (telegram_id, username, first_name, updated_at)
          VALUES (?, ?, ?, unixepoch())
          ON CONFLICT(telegram_id) DO UPDATE SET
            username = excluded.username,
            first_name = excluded.first_name,
            updated_at = unixepoch()
        `).bind(msg.from.id, msg.from.username || "", msg.from.first_name || "").run();
      } catch (e) {
        console.error("[User Auto-Register Error]", e);
      }
    }

    // 1. /start or /menu command or greeting
    if (text === "/start" || text.startsWith("/start ") || text === "/menu" || text === "မင်္ဂလာပါ") {
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(registerBotCommands(botToken));
      }

      const welcomeText = 
`🇲🇲 *Welcome to IELTS Prep Studio (@${env.BOT_USERNAME || "IELTSPrepStudioBot"})!*

🎯 *Cambridge CBT Mocks • Band 8.5/9.0 Lexicon • Task 1 & 2 Models*
Study anytime with 0-latency, offline support, and interactive audio.

👑 *Target Band 7.5+ Lifetime Studio VIP Pass (55,000 MMK)*
• All 1,162 Vocabulary Items, Traps & 1-3-7 Day SRS
• All 23 Reading CBT Passages (231 Questions) with Burmese citations
• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer
• All 30 Speaking Forecast Topics & 5 Frameworks
• Automatic Cross-Device Cloud Sync + Desktop Activation Voucher

💳 *Payment Information:*
• KBZPay / WavePay: \`${env.PAYMENT_PHONE || "09-768691939"}\`
• Account Name: *${env.ACCOUNT_NAME || "Lyan Htet"}*
• Amount: *55,000 MMK* (One-Time Lifetime • No Monthly Fees)

📸 *To Activate VIP:*
Transfer 55,000 MMK and *send your payment slip screenshot directly to this chat*. Our admin will approve your lifetime access immediately!

👇 *အောက်ပါ Menu မှ လိုအပ်ရာကို ရွေးချယ်နိုင်ပါသည်:*`;

      await sendTelegramMessage(botToken, chatId, welcomeText, getMainMenuKeyboard(env));
      return jsonResponse({ ok: true });
    }

    // 2. /app or "🚀 Launch IELTS Prep Studio"
    if (text === "/app" || text === "🚀 Launch IELTS Prep Studio") {
      await sendTelegramMessage(botToken, chatId,
`🎯 *IELTS PREP STUDIO — FULLSCREEN MINI APP*
━━━━━━━━━━━━━━━━━━━━
Interactive Cambridge CBT reader, Spaced Repetition flashcards, native audio pronunciation, and essay evaluator are ready.

👇 အောက်ပါခလုတ်ကို နှိပ်၍ Fullscreen Studio သို့ ဝင်ရောက်လေ့လာပါ:`, {
        inline_keyboard: [
          [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
          [{ text: "🌐 Open on Computer / Laptop ↗", url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 3. /vip or "👑 Buy VIP Pass (55,000 Ks)" or "⭐ VIP Pass (55,000 Ks)" or "Buy Products"
    if (text === "/vip" || text === "👑 Buy VIP Pass (55,000 Ks)" || text === "⭐ VIP Pass (55,000 Ks)" || text === "Buy Products") {
      const vipText = 
`👑 *TARGET BAND 7.5+ LIFETIME STUDIO VIP PASS*
━━━━━━━━━━━━━━━━━━━━
💎 *One-Time Investment:* *55,000 MMK* (တစ်သက်တာ အသုံးပြုခွင့် • No Monthly Fees)

🎁 *What You Unlock Forever:*
• 🔤 All 1,162 Vocabulary Items, Native Audio & 1-3-7 SRS
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Analyzer
• 🎙️ All 30 Speaking Forecast Topics & 5 Frameworks
• ☁️ Multi-Device Cloud Sync + Desktop PC VIP Voucher Code

📱 *Payment Accounts (KBZPay / WavePay):*
• ဖုန်းနံပါတ်: \`${env.PAYMENT_PHONE || "09-768691939"}\` _(Click to copy)_
• အကောင့်အမည်: *${env.ACCOUNT_NAME || "Lyan Htet"}*
• Amount: *55,000 MMK*

📸 *အသက်သွင်းနည်း:*
ငွေ 55,000 MMK လွှဲပြီး ရရှိသော **ငွေလွှဲစလစ် (Screenshot)** ကို ဤ Chat သို့ ပို့ပေးပါ။ Admin မှ စစ်ဆေးပြီး မိနစ်ပိုင်းအတွင်း VIP ဖွင့်ပေးပါမည်! 🚀`;

      await sendTelegramMessage(botToken, chatId, vipText, {
        inline_keyboard: [
          [{ text: "💳 How to Pay (55,000 Ks)", callback_data: "info_payment" }],
          [{ text: "📚 View Curriculum Syllabus", callback_data: "mod_catalog_back" }],
          [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 4. /curriculum or "📚 Curriculum & Features" or "Products List"
    if (text === "/curriculum" || text === "📚 Curriculum & Features" || text === "Products List") {
      const catalogMsg = 
`📚 *IELTS PREP STUDIO — CURRICULUM CATALOG*
━━━━━━━━━━━━━━━━━━━━
Choose a module below to inspect full syllabus details, practice questions, and Band 9 strategies:`;

      await sendTelegramMessage(botToken, chatId, catalogMsg, getCurriculumCatalogKeyboard(env));
      return jsonResponse({ ok: true });
    }

    // 5. /status or "📊 My Study & VIP Status" or "Purchase History"
    if (text === "/status" || text === "📊 My Study & VIP Status" || text === "Purchase History") {
      await handleStudentStatus(chatId, userId, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 6. /pay or "💳 Payment Info"
    if (text === "/pay" || text === "💳 Payment Info") {
      const payMsg = 
`💳 *KBZPAY / WAVEPAY PAYMENT DETAILS*
━━━━━━━━━━━━━━━━━━━━
👑 *Lifetime Studio VIP Pass:* *55,000 MMK* (တစ်သက်တာလုံး အကန့်အသတ်မရှိ)

📱 *Payment Numbers (1-Tap Copy):*
• KBZPay / WavePay: \`${env.PAYMENT_PHONE || "09-768691939"}\`
• Account Name: *${env.ACCOUNT_NAME || "Lyan Htet"}*

📝 *Payment Instructions:*
1. 55,000 MMK ကို အထက်ပါ နံပါတ်သို့ လွှဲပေးပါ။
2. ငွေလွှဲအောင်မြင်သည့် **Screenshot (စလစ်)** ကို ဤ Bot သို့ တိုက်ရိုက် ပေးပို့ပါ။
3. ပေးပို့ပြီးပါက အတည်ပြုရ မြန်ဆန်စေရန် သင်၏ **Transaction ID နောက်ဆုံး ၄ လုံး (သို့) ဖုန်းနံပါတ်** ကို စာပို့ပေးပါ။
4. Admin မှ အတည်ပြုပြီးသည်နှင့် ချက်ချင်း VIP စတင် အသုံးပြုနိုင်ပါပြီ! 👑`;

      await sendTelegramMessage(botToken, chatId, payMsg, {
        inline_keyboard: [
          [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
          [{ text: "💬 Contact Instructor (@hyuguo)", url: "https://t.me/hyuguo" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 7. /exam or "📅 Exam Countdown"
    if (text.startsWith("/exam") || text === "📅 Exam Countdown") {
      const dateArg = text.replace("/exam", "").trim();
      await handleExamCountdown(chatId, userId, dateArg, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 8. /tip or "💡 Band 9 Tip of the Day"
    if (text === "/tip" || text === "💡 Band 9 Tip of the Day") {
      const tipData = getRandomTip();
      const tipMsg = formatTipMessage(tipData);
      await sendTelegramMessage(botToken, chatId, tipMsg, {
        inline_keyboard: [
          [{ text: "💡 Next Band 9 Tip ⏭️", callback_data: `tip:${tipData.nextIndex}` }],
          [{ text: "🚀 Practice in Mini App", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 9. /support or "👨‍🏫 Contact Support" or "Support"
    if (text === "/support" || text === "👨‍🏫 Contact Support" || text === "Support") {
      const supportMsg = 
`👨‍🏫 *IELTS PREP STUDIO SUPPORT & HELP DESK*
━━━━━━━━━━━━━━━━━━━━
ကျွန်ုပ်တို့၏ Lead Instructor နှင့် Academic Support Team မှ ကျောင်းသားများ၏ မေးခွန်းများကို ကူညီဖြေကြားပေးရန် အသင့်ရှိပါသည်။

💬 *Direct Support:*
• Instructor Telegram: @hyuguo
• Bot Support: @${env.BOT_USERNAME || "IELTSPrepStudioBot"}
• Working Hours: 9:00 AM – 10:00 PM MMT (7 Days a Week)

❓ *Quick FAQ:*
• **Desktop Chrome/Edge တွင် မည်သို့သုံးရမည်နည်း?**
  VIP အတည်ပြုပြီးပါက သင့်ထံသို့ Personal Desktop Activation Voucher (\`VIP-XXXX-XXXX\`) ပေးပို့ပါမည်။ Computer Browser တွင် Studio ကိုဖွင့်ပြီး **⭐ VIP Pass** တွင် ထိုကုဒ်ထည့်သွင်းရုံဖြင့် တစ်ပြိုင်နက် သုံးနိုင်ပါသည်။

• **စလစ် ပို့ပြီး မည်မျှကြာစောင့်ရမည်နည်း?**
  စလစ်ပေးပို့ပြီး ၁၀ မိနစ်မှ ၁၅ မိနစ်အတွင်း Admin မှ စစ်ဆေးအတည်ပြုပေးပါသည်။`;

      await sendTelegramMessage(botToken, chatId, supportMsg, {
        inline_keyboard: [
          [{ text: "💬 Chat with Lead Instructor (@hyuguo)", url: "https://t.me/hyuguo" }],
          [{ text: "💳 How to Pay (55,000 Ks)", callback_data: "info_payment" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 10. /profile or "👤 Creator Profile" or "Owner"
    if (text === "/profile" || text === "👤 Creator Profile" || text === "Owner") {
      const profileMsg = 
`👤 *CREATOR & INSTRUCTOR PROFILE*
━━━━━━━━━━━━━━━━━━━━
🇲🇲 *IELTS Prep Studio* ကို မြန်မာကျောင်းသား/သူများ နိုင်ငံတကာ ပညာသင်ဆုများနှင့် နိုင်ငံရပ်ခြား အခွင့်အလမ်းများ လျှောက်ထားရာတွင် အဓိက အတားအဆီးဖြစ်နေသော IELTS Band 7.5+ ကို ကိုယ်တိုင်လေ့လာမှုဖြင့် အောင်မြင်စွာ ရယူနိုင်စေရန် တည်ဆောက်ထားခြင်း ဖြစ်ပါသည်။

👨‍🏫 *Lead Instructor & Developer:*
• IELTS Academic Band 8.5 Scorer
• Full-Stack EdTech & Spaced Repetition Architect
• Dedicated to high-yield, zero-fluff IELTS test preparation

🎯 *Our Core Philosophy:*
အလွတ်ကျက်မှတ်ခြင်းထက် Spaced Repetition System (SRS) နှင့် Official Cambridge CBT Testing ပုံစံအတိုင်း လက်တွေ့လေ့ကျင့်ခြင်းသည် အမှတ်မြင့်စေသော အဓိကသော့ချက် ဖြစ်ပါသည်။`;

      await sendTelegramMessage(botToken, chatId, profileMsg, {
        inline_keyboard: [
          [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
          [{ text: "💬 Chat with Instructor (@hyuguo)", url: "https://t.me/hyuguo" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 11. /help or "📕 How To Use & Guide" or "How To Use"
    if (text === "/help" || text === "📕 How To Use & Guide" || text === "How To Use") {
      const helpMsg = 
`📕 *IELTS PREP STUDIO — HOW TO USE & STUDY GUIDE*
━━━━━━━━━━━━━━━━━━━━
1️⃣ *Vocabulary & SRS:*
• Vocabulary ကတ်များကို ဖတ်ရှုပြီး Native Audio ကို နားထောင်ပါ။
• နေ့စဉ် Spaced Repetition System (1-3-7 Curve) ဖြင့် မေ့လွယ်သော စာလုံးများကို မနက်/ည ပြန်လည် နွှေးပါ။

2️⃣ *Cambridge Reading CBT:*
• Computer စာမေးပွဲပုံစံအတိုင်း Split-screen reader ဖြင့် ဖြေဆိုပါ။
• အဖြေတိုင်းအတွက် စာပိုဒ်ထဲမှ မျက်မြင်သက်သေ (Evidence Citation) နှင့် မြန်မာပြန်ကို ချက်ချင်း စစ်ဆေးနိုင်ပါသည်။

3️⃣ *Writing Lab 2.0:*
• Band 9 Model Essays ၄၀ ကို လေ့လာပြီး Scaffold Generator ဖြင့် အကြမ်းရေးဆွဲပါ။
• CEFR 90/10 Evaluator ဖြင့် သင့်စာစီစာကုံး၏ Vocabulary level ကို တိုင်းတာပါ။

4️⃣ *Computer / Laptop တွင် အသုံးပြုနည်း:*
• ${env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/"} ကို Desktop Chrome / Edge တွင် ဖွင့်ပါ။
• Telegram Login (သို့) VIP Desktop Voucher Code ဖြင့် အကောင့်ကို ချိတ်ဆက်ပါ။`;

      await sendTelegramMessage(botToken, chatId, helpMsg, {
        inline_keyboard: [
          [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
          [{ text: "💡 Band 9 Tip of the Day", callback_data: "next_tip" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // Admin Commands: broadcast, setup_commands, gen_codes, stats, lookup, vip
    if (String(msg.from.id) === String(adminId)) {
      if (text.startsWith("/broadcast")) {
        await handleAdminBroadcast(chatId, adminId, text, env, botToken);
        return jsonResponse({ ok: true });
      }

      if (text === "/setup_commands") {
        const res = await registerBotCommands(botToken);
        await sendTelegramMessage(botToken, chatId, `⚙️ Telegram Bot Commands registered:\n\`${JSON.stringify(res)}\``);
        return jsonResponse({ ok: true });
      }

      if (text.startsWith("/gen_codes")) {
        const parts = text.split(" ");
        const count = Math.min(Math.max(parseInt(parts[1], 10) || 5, 1), 50);
        const generated = [];

        for (let i = 0; i < count; i++) {
          const rnd = generateRandomCode();
          await env.DB.prepare("INSERT INTO promo_codes (code, is_used) VALUES (?, 0)").bind(rnd).run();
          generated.push(rnd);
        }

        await sendTelegramMessage(botToken, chatId, `🎟️ *Generated ${count} VIP Activation Codes:*\n\n` + generated.map(c => `• \`${c}\``).join("\n"));
        return jsonResponse({ ok: true });
      }

      if (text === "/stats" || text === "/admin") {
        const userStats = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total_users,
            SUM(CASE WHEN is_vip = 1 THEN 1 ELSE 0 END) as vip_users,
            SUM(CASE WHEN is_vip = 0 THEN 1 ELSE 0 END) as free_users
          FROM users
        `).first();

        const paymentStats = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total_slips,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_slips,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_slips,
            SUM(CASE WHEN status = 'approved' THEN amount_mmk ELSE 0 END) as total_revenue
          FROM payments
        `).first();

        const voucherStats = await env.DB.prepare(`
          SELECT COUNT(*) as unused_vouchers FROM promo_codes WHERE is_used = 0
        `).first();

        const totalUsers = userStats ? (userStats.total_users || 0) : 0;
        const vipUsers = userStats ? (userStats.vip_users || 0) : 0;
        const freeUsers = userStats ? (userStats.free_users || 0) : 0;
        const conversionRate = totalUsers > 0 ? ((vipUsers / totalUsers) * 100).toFixed(1) : "0.0";
        const totalRevenue = paymentStats && paymentStats.total_revenue ? Number(paymentStats.total_revenue).toLocaleString() : "0";
        const pendingSlips = paymentStats ? (paymentStats.pending_slips || 0) : 0;
        const approvedSlips = paymentStats ? (paymentStats.approved_slips || 0) : 0;
        const unusedVouchers = voucherStats ? (voucherStats.unused_vouchers || 0) : 0;

        const statsMsg = 
`📊 *IELTS PREP STUDIO — EXECUTIVE DASHBOARD*
━━━━━━━━━━━━━━━━━━━━
👥 *Student Base:*
• Total Students: *${totalUsers}*
• 👑 VIP Subscribers: *${vipUsers}*
• 🆓 Free Tier: *${freeUsers}*
• Conversion Rate: *${conversionRate}%*

💰 *Financials (KBZPay / WavePay):*
• Total Revenue: *${totalRevenue} MMK*
• Approved Slips: *${approvedSlips}*
• ⏳ Pending Verifications: *${pendingSlips}*

🎟️ *Voucher Pool:*
• Available Unused Codes: *${unusedVouchers}*

⚡ *Admin Utilities:*
• \`/broadcast <msg>\` — Broadcast to all
• \`/broadcast_vip <msg>\` — Broadcast to VIPs
• \`/broadcast_free <msg>\` — Broadcast to Free
• \`/gen_codes 10\` — Generate 10 Lifetime codes
• \`/lookup <id or username>\` — Search student profile
• \`/vip <id> on/off\` — Toggle VIP for user`;

        await sendTelegramMessage(botToken, chatId, statsMsg);
        return jsonResponse({ ok: true });
      }

      if (text.startsWith("/lookup")) {
        const query = text.replace("/lookup", "").trim().replace("@", "");
        if (!query) {
          await sendTelegramMessage(botToken, chatId, "Usage: `/lookup <telegram_id or username>`");
          return jsonResponse({ ok: true });
        }

        let user = null;
        if (/^\d+$/.test(query)) {
          user = await env.DB.prepare("SELECT * FROM users WHERE telegram_id = ?").bind(parseInt(query, 10)).first();
        } else {
          user = await env.DB.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)").bind(query).first();
        }

        if (!user) {
          await sendTelegramMessage(botToken, chatId, `❌ No student found matching \`${query}\`.`);
          return jsonResponse({ ok: true });
        }

        const isVip = user.is_vip === 1;
        const vipDate = user.vip_activated_at ? new Date(user.vip_activated_at * 1000).toLocaleDateString("en-GB") : "N/A";
        const srsDue = user.srs_due_count || 0;
        const targetBand = user.target_band || 7.5;
        const examDate = user.exam_date || "None";

        const profileMsg = 
`👤 *STUDENT PROFILE*
• Name: *${user.first_name || "N/A"}*
• Username: @${user.username || "None"}
• Telegram ID: \`${user.telegram_id}\`
• Status: *${isVip ? "👑 VIP PASS (Lifetime)" : "🆓 Free Tier"}*
• VIP Activated: ${vipDate}
• Target Band: Band ${targetBand}
• Exam Date: ${examDate}
• SRS Due Words: ${srsDue}`;

        await sendTelegramMessage(botToken, chatId, profileMsg, {
          inline_keyboard: [
            [
              { text: isVip ? "🚫 Revoke VIP" : "👑 Grant VIP", callback_data: `toggle_vip:${user.telegram_id}:${isVip ? 0 : 1}` },
              { text: "👤 Chat", url: user.username ? `https://t.me/${user.username}` : `tg://user?id=${user.telegram_id}` }
            ]
          ]
        });
        return jsonResponse({ ok: true });
      }

      if (text.startsWith("/vip ")) {
        const parts = text.split(" ");
        const targetId = parseInt(parts[1], 10);
        const action = (parts[2] || "on").toLowerCase();
        if (!targetId) {
          await sendTelegramMessage(botToken, chatId, "Usage: `/vip <telegram_id> on|off`");
          return jsonResponse({ ok: true });
        }
        const setVip = action === "on" ? 1 : 0;
        await env.DB.prepare(`
          INSERT INTO users (telegram_id, is_vip, vip_activated_at, updated_at)
          VALUES (?, ?, unixepoch(), unixepoch())
          ON CONFLICT(telegram_id) DO UPDATE SET
            is_vip = excluded.is_vip,
            vip_activated_at = CASE WHEN excluded.is_vip = 1 THEN unixepoch() ELSE 0 END,
            updated_at = unixepoch()
        `).bind(targetId, setVip).run();

        await sendTelegramMessage(botToken, chatId, `Done! User \`${targetId}\` VIP set to *${setVip ? "ON (VIP)" : "OFF (Free)"}*.`);
        return jsonResponse({ ok: true });
      }
    }

    // Student Photo Submission (Payment Receipt Slip)
    if (msg.photo && msg.photo.length > 0) {
      const highestPhoto = msg.photo[msg.photo.length - 1];
      const fileId = highestPhoto.file_id;
      const caption = msg.caption || "";

      const insertResult = await env.DB.prepare(`
        INSERT INTO payments (telegram_id, username, file_id, caption_note, amount_mmk, status, created_at)
        VALUES (?, ?, ?, ?, 55000, 'pending', unixepoch())
      `).bind(msg.from.id, msg.from.username || "", fileId, caption).run();

      const paymentId = insertResult.meta ? insertResult.meta.last_row_id : "pending";

      // Acknowledge receipt to student & request TxRef / Phone
      await sendTelegramMessage(botToken, chatId,
`✅ *ငွေလွှဲစလစ် လက်ခံရရှိပါသည်!*
Screenshot received! Admin မှ 55,000 MMK စလစ်ကို စစ်ဆေးအတည်ပြုနေပါသည်။

📝 *အမြန်ဆုံး အတည်ပြုနိုင်ရန်:*
သင်၏ KBZPay / WavePay **Transaction ID နောက်ဆုံး ၄ လုံး** (သို့မဟုတ်) **ငွေလွှဲခဲ့သည့် ဖုန်းနံပါတ်** ကို ဤနေရာတွင် စာတိုအဖြစ် ပေးပို့ပေးပါ ခင်ဗျာ။`,
        getMainMenuKeyboard(env)
      );

      // Forward slip photo to Admin for 1-Tap Approval
      if (adminId) {
        const adminCaption = 
`💳 *NEW PAYMENT SUBMISSION (55,000 MMK)*
• Student: @${msg.from.username || "NoUsername"} (\`${msg.from.id}\`)
• Name: ${msg.from.first_name || ""} ${msg.from.last_name || ""}
• Payment ID: #${paymentId}
• Notes: ${caption || "None"}`;

        await sendTelegramPhoto(botToken, adminId, fileId, adminCaption, {
          inline_keyboard: [
            [
              { text: "✅ Approve VIP (55,000 MMK)", callback_data: `approve:${msg.from.id}:${paymentId}` },
              { text: "❌ Reject", callback_data: `reject:${msg.from.id}:${paymentId}` }
            ]
          ]
        });
      }

      return jsonResponse({ ok: true });
    }

    // If text was not handled and student has a recent pending payment (within 2 hours), treat text as TxRef / Phone
    if (text) {
      const recentPendingPayment = await env.DB.prepare(`
        SELECT id, caption_note FROM payments 
        WHERE telegram_id = ? AND status = 'pending' AND created_at >= (unixepoch() - 7200)
        ORDER BY created_at DESC LIMIT 1
      `).bind(msg.from.id).first();

      if (recentPendingPayment) {
        const currentNote = recentPendingPayment.caption_note || "";
        const updatedNote = currentNote ? `${currentNote} | Ref/Phone: ${text}` : `Ref/Phone: ${text}`;
        await env.DB.prepare(`
          UPDATE payments SET caption_note = ? WHERE id = ?
        `).bind(updatedNote, recentPendingPayment.id).run();

        await sendTelegramMessage(botToken, chatId,
`✅ *Transaction Reference မှတ်သားပြီးပါပြီ!*
Ref / Phone: \`${text}\`

Admin မှ အချက်အလက်များ တိုက်ဆိုင်စစ်ဆေးပြီးသည်နှင့် VIP Pass ချက်ချင်း ပွင့်သွားပါမည်။ ခဏစောင့်ဆိုင်းပေးပါ ခင်ဗျာ! 👑`,
          getMainMenuKeyboard(env)
        );

        if (adminId) {
          const studentUsername = msg.from.username ? `@${msg.from.username}` : `Student`;
          await sendTelegramMessage(botToken, adminId,
`📝 *TRANSACTION REFERENCE SUBMITTED*
• Student: ${studentUsername} (\`${msg.from.id}\`)
• Payment ID: #${recentPendingPayment.id}
• Ref / Phone: *${text}*`
          );
        }
        return jsonResponse({ ok: true });
      }

      // Default fallback
      await sendTelegramMessage(botToken, chatId,
`🇲🇲 *မင်္ဂလာပါ! IELTS Prep Studio Bot မှ ကြိုဆိုပါသည်။*
အောက်ပါ Menu ခလုတ်များမှ သင်လေ့လာလိုသည့် အပိုင်းကို ရွေးချယ်နိုင်ပါသည် ခင်ဗျာ။`,
        getMainMenuKeyboard(env)
      );
      return jsonResponse({ ok: true });
    }
  }

  // B. Callback Query handler
  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || "";
    const cbUserId = cb.from ? cb.from.id : 0;
    const cbChatId = cb.message ? cb.message.chat.id : cbUserId;
    const cbMessageId = cb.message ? cb.message.message_id : null;

    // 1. Info payment button
    if (data === "info_payment") {
      await answerCallbackQuery(botToken, cb.id, "KBZPay / WavePay: 09-768691939 (Lyan Htet)");
      const payMsg = 
`💳 *LIFETIME STUDIO VIP PASS — 55,000 MMK*
━━━━━━━━━━━━━━━━━━━━
📱 *KBZPay / WavePay:* \`${env.PAYMENT_PHONE || "09-768691939"}\`
👤 *Account Name:* *${env.ACCOUNT_NAME || "Lyan Htet"}*
💰 *Amount:* *55,000 MMK* (Lifetime Access)

ငွေလွှဲပြီးပါက စလစ် Screenshot ကို ဤ Chat သို့ ပို့ပေးပါ ခင်ဗျာ!`;
      await sendTelegramMessage(botToken, cbChatId, payMsg, {
        inline_keyboard: [
          [{ text: "💬 Contact Instructor (@hyuguo)", url: "https://t.me/hyuguo" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 2. Curriculum Catalog Back Button
    if (data === "mod_catalog_back") {
      await answerCallbackQuery(botToken, cb.id);
      const catalogMsg = 
`📚 *IELTS PREP STUDIO — CURRICULUM CATALOG*
━━━━━━━━━━━━━━━━━━━━
Choose a module below to inspect full syllabus details, practice questions, and Band 9 strategies:`;
      if (cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, catalogMsg, getCurriculumCatalogKeyboard(env));
      }
      return jsonResponse({ ok: true });
    }

    // 3. Curriculum Module Click
    if (data.startsWith("mod_")) {
      await answerCallbackQuery(botToken, cb.id);
      const moduleData = CURRICULUM_MODULES[data];
      if (moduleData && cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, moduleData.content, getModuleKeyboard(data, env));
      }
      return jsonResponse({ ok: true });
    }

    // 4. Band 9 Tip of the Day Next Button
    if (data.startsWith("tip:") || data === "next_tip") {
      await answerCallbackQuery(botToken, cb.id);
      const reqIndex = data.startsWith("tip:") ? parseInt(data.replace("tip:", ""), 10) : -1;
      const tipData = getRandomTip(reqIndex);
      const tipMsg = formatTipMessage(tipData);
      if (cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, tipMsg, {
          inline_keyboard: [
            [{ text: "💡 Next Band 9 Tip ⏭️", callback_data: `tip:${tipData.nextIndex}` }],
            [{ text: "🚀 Practice in Mini App", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
          ]
        });
      }
      return jsonResponse({ ok: true });
    }

    // 5. Exam Countdown Buttons
    if (data === "view_exam") {
      await answerCallbackQuery(botToken, cb.id);
      await handleExamCountdown(cbChatId, cbUserId, "", env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data.startsWith("set_exam:")) {
      await answerCallbackQuery(botToken, cb.id, "Exam date updated!");
      const days = parseInt(data.replace("set_exam:", ""), 10) || 30;
      const targetDate = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
      await env.DB.prepare("UPDATE users SET exam_date = ? WHERE telegram_id = ?").bind(targetDate, cbUserId).run();
      const updatedUser = await env.DB.prepare("SELECT * FROM users WHERE telegram_id = ?").bind(cbUserId).first();
      const countdownCard = formatCountdown(updatedUser, days, updatedUser.target_band || 7.5);
      if (cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, countdownCard, {
          inline_keyboard: [
            [{ text: "✏️ Change Exam Date", callback_data: "reset_exam_prompt" }],
            [{ text: "🎯 Target: Band 7.5", callback_data: "set_band:7.5" }, { text: "🎯 Target: Band 8.0+", callback_data: "set_band:8.0" }],
            [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
          ]
        });
      }
      return jsonResponse({ ok: true });
    }

    if (data === "reset_exam_prompt") {
      await answerCallbackQuery(botToken, cb.id);
      const promptMsg = 
`📅 *SELECT YOUR IELTS EXAM TARGET TIMELINE*
━━━━━━━━━━━━━━━━━━━━
ရက်သတ်မှတ်ရန် အောက်ပါ ခလုတ်များမှ ရွေးချယ်ပါ (သို့မဟုတ် Chat တွင် \`/exam YYYY-MM-DD\` ဟု ပို့ပေးပါ):`;
      if (cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, promptMsg, {
          inline_keyboard: [
            [{ text: "🗓️ 1 Month (30 Days)", callback_data: "set_exam:30" }, { text: "🗓️ 2 Months (60 Days)", callback_data: "set_exam:60" }],
            [{ text: "🗓️ 3 Months (90 Days)", callback_data: "set_exam:90" }, { text: "🗓️ 6 Months (180 Days)", callback_data: "set_exam:180" }],
            [{ text: "🎯 Change Target Band", callback_data: "target_band_menu" }]
          ]
        });
      }
      return jsonResponse({ ok: true });
    }

    if (data.startsWith("set_band:")) {
      const band = parseFloat(data.replace("set_band:", "")) || 7.5;
      await env.DB.prepare("UPDATE users SET target_band = ? WHERE telegram_id = ?").bind(band, cbUserId).run();
      await answerCallbackQuery(botToken, cb.id, `Target Band set to ${band}! 🎯`);
      const user = await env.DB.prepare("SELECT * FROM users WHERE telegram_id = ?").bind(cbUserId).first();
      let daysRemaining = 60;
      if (user && user.exam_date) {
        const diffMs = new Date(user.exam_date).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));
      }
      const countdownCard = formatCountdown(user, daysRemaining, band);
      if (cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, countdownCard, {
          inline_keyboard: [
            [{ text: "✏️ Change Exam Date", callback_data: "reset_exam_prompt" }],
            [{ text: "🎯 Target: Band 7.5", callback_data: "set_band:7.5" }, { text: "🎯 Target: Band 8.0+", callback_data: "set_band:8.0" }],
            [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
          ]
        });
      }
      return jsonResponse({ ok: true });
    }

    if (data === "target_band_menu") {
      await answerCallbackQuery(botToken, cb.id);
      const bandMsg = 
`🎯 *CHOOSE YOUR TARGET IELTS BAND SCORE*
━━━━━━━━━━━━━━━━━━━━
Select your required score to optimize your daily study quota:`;
      if (cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, bandMsg, {
          inline_keyboard: [
            [{ text: "🎯 Band 6.5", callback_data: "set_band:6.5" }, { text: "🎯 Band 7.0", callback_data: "set_band:7.0" }],
            [{ text: "🎯 Band 7.5 (Standard)", callback_data: "set_band:7.5" }, { text: "🎯 Band 8.0+", callback_data: "set_band:8.0" }],
            [{ text: "⏪ Back to Countdown", callback_data: "reset_exam_prompt" }]
          ]
        });
      }
      return jsonResponse({ ok: true });
    }

    // Admin Approval & Rejection
    if (String(cb.from.id) === String(adminId)) {
      if (data.startsWith("approve:")) {
        const [, targetTgId, paymentId] = data.split(":");
        const numTgId = parseInt(targetTgId, 10);

        // Check if payment was already processed
        if (paymentId && paymentId !== "pending") {
          const payment = await env.DB.prepare("SELECT status FROM payments WHERE id = ?").bind(paymentId).first();
          if (payment && payment.status !== "pending") {
            await answerCallbackQuery(botToken, cb.id, `⚠️ Already ${payment.status.toUpperCase()}!`);
            if (cb.message) {
              await editTelegramReplyMarkup(botToken, cb.message.chat.id, cb.message.message_id, { inline_keyboard: [] });
            }
            return jsonResponse({ ok: true });
          }
        }

        // Generate a personal Desktop VIP voucher code for the student
        const desktopVoucher = generateRandomCode();
        await env.DB.prepare(`
          INSERT INTO promo_codes (code, is_used, used_by_tg_id, used_at)
          VALUES (?, 1, ?, unixepoch())
        `).bind(desktopVoucher, numTgId).run();

        // Update D1: users and payments
        await env.DB.prepare(`
          INSERT INTO users (telegram_id, is_vip, vip_activated_at, updated_at)
          VALUES (?, 1, unixepoch(), unixepoch())
          ON CONFLICT(telegram_id) DO UPDATE SET
            is_vip = 1,
            vip_activated_at = unixepoch(),
            updated_at = unixepoch()
        `).bind(numTgId).run();

        if (paymentId && paymentId !== "pending") {
          await env.DB.prepare("UPDATE payments SET status = 'approved' WHERE id = ?").bind(paymentId).run();
        }

        // Get target student info for admin quick link
        const targetUser = await env.DB.prepare("SELECT username FROM users WHERE telegram_id = ?").bind(numTgId).first();
        const username = targetUser && targetUser.username ? targetUser.username : "";
        const studentLink = username ? `https://t.me/${username}` : `tg://user?id=${numTgId}`;
        const nowMmt = new Date().toLocaleString("en-GB", { timeZone: "Asia/Yangon" });

        // Remove approve/reject buttons and update caption on Admin's screen
        if (cb.message) {
          const originalCaption = cb.message.caption || "";
          const updatedCaption = `${originalCaption}\n\n━━━━━━━━━━━━━━━━━━━━\n✅ *APPROVED & UNLOCKED* by Admin\n🕒 Time: ${nowMmt} MMT\n🎟️ Desktop Code: \`${desktopVoucher}\``;
          await editTelegramCaption(botToken, cb.message.chat.id, cb.message.message_id, updatedCaption, {
            inline_keyboard: [
              [{ text: `👤 Open Student Chat (@${username || numTgId})`, url: studentLink }]
            ]
          });
        }

        await answerCallbackQuery(botToken, cb.id, "✅ User upgraded to Lifetime VIP!");
        
        // Notify Student with Telegram unlock + Desktop Voucher
        await sendTelegramMessage(botToken, numTgId,
`🎉 *Congratulations! Your Lifetime VIP Pass is ACTIVE!*

Your 55,000 MMK payment has been verified.
All 1,162 Vocabulary items, 23 Cambridge Reading CBT Passages, 40 Writing Models, and Speaking Forecasts are now unlocked forever! 🚀

💻 *Study on Computer / Laptop (Chrome or Edge):*
Your Personal Desktop Activation Pass:
\`${desktopVoucher}\`

Visit: ${env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/"}
Click **⭐ VIP Pass** > Enter Voucher: \`${desktopVoucher}\` > Unlock Instantly!`,
          {
            inline_keyboard: [
              [{ text: "👑 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
              [{ text: "🌐 Open on Web Browser ↗", url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" }]
            ]
          }
        );

        return jsonResponse({ ok: true });
      }

      if (data.startsWith("reject:")) {
        const [, targetTgId, paymentId] = data.split(":");
        const numTgId = parseInt(targetTgId, 10);

        if (paymentId && paymentId !== "pending") {
          const payment = await env.DB.prepare("SELECT status FROM payments WHERE id = ?").bind(paymentId).first();
          if (payment && payment.status !== "pending") {
            await answerCallbackQuery(botToken, cb.id, `⚠️ Already ${payment.status.toUpperCase()}!`);
            if (cb.message) {
              await editTelegramReplyMarkup(botToken, cb.message.chat.id, cb.message.message_id, { inline_keyboard: [] });
            }
            return jsonResponse({ ok: true });
          }
          await env.DB.prepare("UPDATE payments SET status = 'rejected' WHERE id = ?").bind(paymentId).run();
        }

        const targetUser = await env.DB.prepare("SELECT username FROM users WHERE telegram_id = ?").bind(numTgId).first();
        const username = targetUser && targetUser.username ? targetUser.username : "";
        const studentLink = username ? `https://t.me/${username}` : `tg://user?id=${numTgId}`;
        const nowMmt = new Date().toLocaleString("en-GB", { timeZone: "Asia/Yangon" });

        // Remove approve/reject buttons and update caption on Admin's screen
        if (cb.message) {
          const originalCaption = cb.message.caption || "";
          const updatedCaption = `${originalCaption}\n\n━━━━━━━━━━━━━━━━━━━━\n❌ *REJECTED* by Admin\n🕒 Time: ${nowMmt} MMT`;
          await editTelegramCaption(botToken, cb.message.chat.id, cb.message.message_id, updatedCaption, {
            inline_keyboard: [
              [{ text: `💬 Message Student (@${username || numTgId})`, url: studentLink }]
            ]
          });
        }

        await answerCallbackQuery(botToken, cb.id, "Payment marked as rejected.");
        await sendTelegramMessage(botToken, numTgId,
`⚠️ *Payment Verification Notice*
We were unable to verify your 55,000 MMK transaction slip.
Please ensure the transaction ID and amount are clearly visible and resend the screenshot directly here, or contact @${env.BOT_USERNAME || "IELTSPrepStudioBot"} support.`
        );
        return jsonResponse({ ok: true });
      }

      if (data.startsWith("toggle_vip:")) {
        const [, targetIdStr, newStatusStr] = data.split(":");
        const targetId = parseInt(targetIdStr, 10);
        const newStatus = parseInt(newStatusStr, 10);
        await env.DB.prepare(`
          UPDATE users SET is_vip = ?, vip_activated_at = CASE WHEN ? = 1 THEN unixepoch() ELSE 0 END, updated_at = unixepoch()
          WHERE telegram_id = ?
        `).bind(newStatus, newStatus, targetId).run();

        await answerCallbackQuery(botToken, cb.id, `User VIP set to ${newStatus === 1 ? "ACTIVE" : "FREE"}`);
        if (cb.message) {
          await editTelegramReplyMarkup(botToken, cb.message.chat.id, cb.message.message_id, {
            inline_keyboard: [
              [
                { text: newStatus === 1 ? "🚫 Revoke VIP" : "👑 Grant VIP", callback_data: `toggle_vip:${targetId}:${newStatus === 1 ? 0 : 1}` },
                { text: "👤 Chat", url: `tg://user?id=${targetId}` }
              ]
            ]
          });
        }
        return jsonResponse({ ok: true });
      }
    }
  }

  return jsonResponse({ ok: true });
}

// ==========================================
// 6. DAILY CRON REMINDER (7:30 PM MMT)
// ==========================================
async function handleDailyReminders(env) {
  const botToken = env.BOT_TOKEN;
  if (!botToken) return;

  try {
    const { results } = await env.DB.prepare(`
      SELECT telegram_id, srs_due_count FROM users WHERE srs_due_count > 0 LIMIT 100
    `).all();

    if (!results || results.length === 0) return;

    const tipData = getRandomTip();

    for (const row of results) {
      const msg = 
`🔔 *DAILY IELTS SRS & STRATEGY REMINDER*
━━━━━━━━━━━━━━━━━━━━
🧠 You have *${row.srs_due_count}* vocabulary items due for spaced repetition review today!

💡 *Band 9 Tip of the Day:*
*${tipData.tip.rule}*
${tipData.tip.explanation}`;

      await sendTelegramMessage(botToken, row.telegram_id, msg, {
        inline_keyboard: [
          [{ text: "🧠 Review SRS Cards Now", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
          [{ text: "💡 More Band 9 Tips", callback_data: `tip:${tipData.nextIndex}` }]
        ]
      });
    }
  } catch (err) {
    console.error("[Cron Error]", err);
  }
}

// ==========================================
// 7. TELEGRAM BOT API CALLS
// ==========================================
async function sendTelegramMessage(botToken, chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown"
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function sendTelegramPhoto(botToken, chatId, photoFileId, caption, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    photo: photoFileId,
    caption: caption,
    parse_mode: "Markdown"
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  return fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function answerCallbackQuery(botToken, callbackQueryId, text) {
  return fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text })
  });
}

function generateRandomCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VIP-${part1}-${part2}`;
}

async function editTelegramCaption(botToken, chatId, messageId, caption, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      caption: caption,
      parse_mode: "Markdown"
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    } else {
      payload.reply_markup = { inline_keyboard: [] };
    }
    return await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("[editTelegramCaption Error]", err);
  }
}

async function editTelegramReplyMarkup(botToken, chatId, messageId, replyMarkup = { inline_keyboard: [] }) {
  try {
    return await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: replyMarkup
      })
    });
  } catch (err) {
    console.error("[editTelegramReplyMarkup Error]", err);
  }
}

async function editTelegramMessageText(botToken, chatId, messageId, text, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "Markdown"
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    return await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("[editTelegramMessageText Error]", err);
  }
}

// Telegram Bot Command Menu specifications
const BOT_COMMANDS = [
  { command: "start", description: "🚀 Main Menu & Launch Studio" },
  { command: "app", description: "⚡ Open Telegram Mini App" },
  { command: "vip", description: "👑 Lifetime VIP Pass (55,000 MMK)" },
  { command: "curriculum", description: "📚 Cambridge CBT & Lexicon Catalog" },
  { command: "pay", description: "💳 KBZPay / WavePay Payment Info" },
  { command: "status", description: "📊 My Study Progress & VIP Status" },
  { command: "exam", description: "📅 Exam Countdown & Target Pacing" },
  { command: "tip", description: "💡 Band 9 IELTS Trap & Collocation" },
  { command: "support", description: "👨‍🏫 Instructor Support & Help" },
  { command: "help", description: "📕 How to Use & Study Guide" }
];

async function registerBotCommands(botToken) {
  if (!botToken) return { ok: false, error: "No bot token" };
  try {
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: BOT_COMMANDS })
    });
    return await resp.json();
  } catch (err) {
    console.error("[registerBotCommands Error]", err);
    return { ok: false, error: err.message };
  }
}

// Persistent Reply Keyboard (Matching Reference Screenshot 1)
function getMainMenuKeyboard(env) {
  return {
    keyboard: [
      [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
      [{ text: "👑 Buy VIP Pass (55,000 Ks)" }, { text: "📚 Curriculum & Features" }],
      [{ text: "📊 My Study & VIP Status" }, { text: "💳 Payment Info" }],
      [{ text: "📅 Exam Countdown" }, { text: "💡 Band 9 Tip of the Day" }],
      [{ text: "👨‍🏫 Contact Support" }, { text: "👤 Creator Profile" }],
      [{ text: "📕 How To Use & Guide" }]
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: "လိုအပ်သော Menu ကို ရွေးပါ"
  };
}

// Interactive Curriculum Catalog Keyboards & Module Details (Matching Reference Screenshot 1 & 2)
function getCurriculumCatalogKeyboard(env) {
  return {
    inline_keyboard: [
      [
        { text: "🔤 8.5/9.0 Lexicon", callback_data: "mod_lexicon" },
        { text: "📖 Reading CBT (23)", callback_data: "mod_reading" }
      ],
      [
        { text: "✍️ Writing Lab 2.0", callback_data: "mod_writing" },
        { text: "🎙️ Speaking Forecasts", callback_data: "mod_speaking" }
      ],
      [
        { text: "⚡ CEFR 90/10 AI", callback_data: "mod_cefr" },
        { text: "🧠 1-3-7 Spaced Rep", callback_data: "mod_srs" }
      ],
      [
        { text: "☁️ Multi-Device Sync", callback_data: "mod_sync" },
        { text: "👑 Full Lifetime VIP", callback_data: "mod_vip" }
      ],
      [
        { text: "🚀 Launch Mini App", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } },
        { text: "💳 How to Pay (55,000 Ks)", callback_data: "info_payment" }
      ]
    ]
  };
}

function getModuleKeyboard(moduleId, env) {
  return {
    inline_keyboard: [
      [{ text: "⭐ Unlock in Lifetime VIP (55,000 MMK)", callback_data: "info_payment" }],
      [{ text: "🚀 Open in IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
      [{ text: "⏪ Back to Modules", callback_data: "mod_catalog_back" }]
    ]
  };
}

const CURRICULUM_MODULES = {
  mod_lexicon: {
    title: "🔤 Band 8.5/9.0 Lexicon Engine",
    content: 
`🔤 *Band 8.5/9.0 Lexicon Engine (1,162 Items)*
━━━━━━━━━━━━━━━━━━━━
🎯 *Full Syllabus Coverage:*
• 1,162 Academic & High-Yield Topic Items (Environment, Tech, Society, Education, Art, Economy)
• Authentic IPA Phonetic Transcriptions (UK & US)
• Crystal-Clear Native Audio Pronunciations
• Contextual Example Sentences & Collocations
• Myanmar Meanings & Common False Friend Traps
• 1-3-7 Day Spaced Repetition (SRS) Integration

💡 *Sample Trap:*
"Economic" (ငွေကြေး/စီးပွားရေးဆိုင်ရာ) vs "Economical" (ခြိုးခြံချွေတာသော/အကုန်အကျသက်သာသော)`
  },
  mod_reading: {
    title: "📖 Cambridge Reading CBT",
    content: 
`📖 *Cambridge Reading CBT (23 Passages / 231 Questions)*
━━━━━━━━━━━━━━━━━━━━
🎯 *Official Exam Simulation:*
• 23 Complete Academic Passages (Cambridge 15-19)
• 231 Interactive CBT Questions (True/False/Not Given, Headings, Matching, Summary Completion)
• Split-screen responsive reader matching official IELTS on Computer
• Countdown test timer & instant automated band scoring
• Line-by-line evidence citations with Burmese translations for every question`
  },
  mod_writing: {
    title: "✍️ Writing Lab 2.0",
    content: 
`✍️ *Writing Lab 2.0 (40 Model Essays & Scaffolds)*
━━━━━━━━━━━━━━━━━━━━
🎯 *Band 9 Mastery:*
• 40 Full Band 9 Model Essays (Task 1: Line graphs, Bar charts, Maps, Processes; Task 2: Opinion, Discussion, Problem-Solution, Double Question)
• Interactive Essay Scaffold Generator (Outline essays in < 5 mins)
• Color-coded lexical resource highlights & grammatical breakdowns
• Built-in CEFR 90/10 automated evaluation engine`
  },
  mod_speaking: {
    title: "🎙️ Speaking Forecasts & Frameworks",
    content: 
`🎙️ *Speaking Forecasts & High-Scoring Frameworks*
━━━━━━━━━━━━━━━━━━━━
🎯 *Band 8.0+ Delivery:*
• 30 Actual Exam Forecast Topics across Parts 1, 2, and 3
• 5 Universal Response Frameworks (P.E.E.L, 5W1H, Past-Present-Future, Pros vs Cons)
• Native British & American audio models
• Intonation guides & discourse marker templates`
  },
  mod_cefr: {
    title: "⚡ CEFR 90/10 AI Evaluator",
    content: 
`⚡ *CEFR 90/10 AI Vocabulary Evaluator*
━━━━━━━━━━━━━━━━━━━━
🎯 *Instant Lexical Analysis:*
• Instant evaluation of any IELTS essay draft
• Classifies vocabulary into CEFR bands (A1-C2)
• Flags low-level repetitions and suggests Band 8.5+ substitutions
• Evaluates Coherence, Cohesion & Lexical Resource
• Runs 100% locally with zero latency`
  },
  mod_srs: {
    title: "🧠 1-3-7 Spaced Repetition System",
    content: 
`🧠 *1-3-7 Spaced Repetition Memory System*
━━━━━━━━━━━━━━━━━━━━
🎯 *Long-Term Retention:*
• Ebbinghaus Forgetting Curve algorithm
• Automatically schedules daily reviews for difficult vocabulary
• Automatically categorizes words into Learning, Review, and Mastered
• Daily Telegram review reminders at 7:30 PM MMT`
  },
  mod_sync: {
    title: "☁️ Multi-Device Cloud Sync Engine",
    content: 
`☁️ *Multi-Device Cloud Sync Engine*
━━━━━━━━━━━━━━━━━━━━
🎯 *Seamless Cross-Platform Study:*
• Instant progress sync between Telegram Mini App (Mobile) and Web Browser (Desktop PC/Laptop)
• Preserves all mastered words, error logs, and mock test scores
• Cloudflare D1 encrypted database persistence
• Never lose your learning trajectory across devices`
  },
  mod_vip: {
    title: "👑 Target Band 7.5+ Lifetime Studio VIP Pass",
    content: 
`👑 *Target Band 7.5+ Lifetime Studio VIP Pass*
━━━━━━━━━━━━━━━━━━━━
💎 *One-Time Investment:* *55,000 MMK* (Lifetime Unlimited • No Monthly Subscription)

🎁 *What You Unlock Forever:*
• All 1,162 Vocabulary Items, Native Audio & 1-3-7 SRS
• All 23 Cambridge Reading CBT Passages & 231 Questions
• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Analyzer
• All 30 Speaking Forecast Topics & 5 Frameworks
• Multi-Device Cloud Sync + Desktop PC VIP Voucher Code

💳 *To Activate:*
Transfer 55,000 MMK to KBZPay/WavePay: \`09-768691939\` (Lyan Htet) and send your slip screenshot here!`
  }
};

const IELTS_TIPS = [
  {
    category: "Vocabulary Trap ⚠️",
    rule: "Economic vs Economical",
    error: "The government should enforce economical reforms to boost trade.",
    band9: "The government should implement comprehensive economic reforms to stimulate fiscal growth.",
    explanation: "Economic သည် ငွေကြေး/စီးပွားရေးနှင့် ဆိုင်သော (relating to the economy) ဖြစ်ပြီး၊ Economical သည် ခြိုးခြံချွေတာသော/အကုန်အကျသက်သာသော (saving money / resource-efficient) ဖြစ်ပါသည်။ မှားယွင်း မသုံးမိစေရန် သတိပြုပါ။"
  },
  {
    category: "Academic Collocation 💎",
    rule: "Solving Problems vs Mitigating Effects",
    error: "The city council needs to fix the bad traffic problem.",
    band9: "Municipal authorities must urgently mitigate the adverse repercussions of urban congestion.",
    explanation: "IELTS Writing Task 2 တွင် 'fix the problem' ကဲ့သို့ ရိုးစင်းသော စကားလုံးများအစား 'mitigate adverse repercussions' သို့မဟုတ် 'remedy the situation' စသော academic collocations များကို အသုံးပြုပါက Lexical Resource အမှတ် 8.0+ သို့ တက်လှမ်းနိုင်ပါသည်။"
  },
  {
    category: "Task 2 Grammar ✍️",
    rule: "Subordinated Concession Clauses",
    error: "Online education has advantages. Moreover, it has some big disadvantages.",
    band9: "Although digital pedagogy affords unprecedented spatial flexibility, it arguably compromises interpersonal discourse.",
    explanation: "'Moreover' / 'Furthermore' များကို စာပိုဒ်တိုင်းတွင် ထပ်ခါတလဲလဲ မသုံးပါနှင့်။ 'Although / While / Whereas' ဖြင့် စတင်သော Concession Clauses များကို အသုံးပြုခြင်းဖြင့် Grammatical Range & Accuracy (Complex Sentences) အတွက် Band 8.5+ ရရှိစေပါသည်။"
  },
  {
    category: "Vocabulary Precision 🎯",
    rule: "Ubiquitous vs Common",
    error: "Smartphones are very common in the modern world.",
    band9: "Handheld smart devices have become ubiquitous across virtually all contemporary demographic cohorts.",
    explanation: "'Common' အစား 'Ubiquitous' (နေရာတကာတွင် ပျံ့နှံ့တွေ့ရှိရသော) သို့မဟုတ် 'Omnipresent' ကို အသုံးပြုပါ။ Academic register ကို သိသိသာသာ မြှင့်တင်ပေးပါသည်။"
  },
  {
    category: "Reading CBT Strategy 📖",
    rule: "False vs Not Given Distinction",
    error: "Marking 'False' because you couldn't find the comparison mentioned in the text.",
    band9: "False requires DIRECT factual contradiction. If the comparison or relationship is simply absent, it is strictly NOT GIVEN.",
    explanation: "Cambridge Reading CBT တွင် အဖြစ်အများဆုံး အမှားမှာ False နှင့် Not Given ရောထွေးခြင်း ဖြစ်သည်။ စာပိုဒ်ထဲတွင် တိုက်ရိုက်ဆန့်ကျင်ဘက် အချက်အလက် (Direct Contradiction) မပါရှိဘဲ အချက်အလက် မပြည့်စုံပါက မုချ 'NOT GIVEN' ဖြစ်ပါသည်။"
  },
  {
    category: "Academic Hedging 🛡️",
    rule: "Avoiding Over-Generalization",
    error: "Social media causes severe mental depression among teenagers.",
    band9: "Excessive consumption of social media is arguably correlated with heightened vulnerability to psychological distress.",
    explanation: "IELTS Examiners များသည် 'All', 'Every', 'Always', 'Causes' ကဲ့သို့သော Absolute Claims များကို အမှတ်လျှော့တတ်ပါသည်။ 'Arguably', 'Tends to', 'Correlated with' စသော Hedging Language ကို သုံးစွဲခြင်းသည် Band 8.5+ Academic Tone ၏ လျှို့ဝှက်ချက် ဖြစ်ပါသည်။"
  },
  {
    category: "Writing Task 1 Overview 📊",
    rule: "The 2-Sentence Golden Overview Rule",
    error: "Starting the overview with specific numbers like 'In 1990 it was 45% and rose to 80%'.",
    band9: "Overall, renewable energy consumption witnessed an upward trajectory, whereas fossil fuel reliance plummeted dramatically.",
    explanation: "Task 1 Overview တွင် ကိန်းဂဏန်း (Data figures) လုံးဝ မထည့်ပါနှင့်။ အဓိက အပြောင်းအလဲ (Overall Trend) နှင့် အမြင့်ဆုံး/အနိမ့်ဆုံး ခြားနားချက် (Main Contrast) ကိုသာ စာကြောင်း ၂ ကြောင်းဖြင့် ယေဘုယျ ခြုံငုံရေးသားရပါမည်။"
  },
  {
    category: "Speaking Part 3 🎙️",
    rule: "The P.E.E.L Framework",
    error: "Giving a 1-sentence answer or drifting off-topic with personal stories.",
    band9: "State Point clearly -> Explain underlying mechanism -> Provide Societal Example -> Link back to broad trend.",
    explanation: "Speaking Part 3 သည် လူမှုရေးရာ ဆွေးနွေးမှု ဖြစ်သည်။ မိမိကိုယ်ရေးကိုယ်တာ အကြောင်းများအစား P.E.E.L (Point, Explanation, Example, Link) စနစ်ဖြင့် ၄၅-၆၀ စက္ကန့် စနစ်တကျ ဖြေဆိုပါ။"
  },
  {
    category: "Grammar Inversion ⚡",
    rule: "Negative Inversion for Emphasis",
    error: "Governments should not only fund universities but also upgrade schools.",
    band9: "Not only should governments allocate capital to tertiary institutions, but they must also modernize primary education infrastructure.",
    explanation: "'Not only [auxiliary] [subject]...' ဖြင့် အစချီသော Inversion ပုံစံသည် စာစစ်သူ (Examiner) ကို Advanced Grammatical Structures ကျွမ်းကျင်ကြောင်း ချက်ချင်း သက်သေပြနိုင်ပါသည်။"
  },
  {
    category: "Vocabulary Contrast 🔤",
    rule: "Exacerbate vs Alleviate",
    error: "Pollution makes the health problems worse, while green parks make them better.",
    band9: "Unchecked toxic emissions inevitably exacerbate respiratory ailments, whereas urban green spaces significantly alleviate civic stress.",
    explanation: "'Make worse' အစား 'Exacerbate' (ပိုမိုဆိုးရွားစေသည်) နှင့် 'Make better' အစား 'Alleviate' (သက်သာလျော့ပါးစေသည်) ကို အသုံးပြုပါ။ အလွန်အသုံးဝင်သော Band 9 Pair ဖြစ်ပါသည်။"
  },
  {
    category: "Coherence & Cohesion 🔗",
    rule: "Banning Informal Signposts",
    error: "Using 'In a nutshell' or 'At the end of the day' in Academic Task 2 conclusions.",
    band9: "In conclusion, while technological automation presents undeniable economic incentives, its social disruption warrants rigorous regulation.",
    explanation: "'In a nutshell', 'To wrap it up' စသော စကားများသည် စကားပြော (Spoken) အသုံးအနှုန်းများ ဖြစ်သဖြင့် Academic Task 2 တွင် အသုံးမပြုရပါ။ 'In conclusion' သို့မဟုတ် 'To recapitulate' ကိုသာ သုံးပါ။"
  },
  {
    category: "Reading Keyword Trap 🔍",
    rule: "Synonym Substitution Scanner",
    error: "Looking for the exact words from the question inside the reading passage.",
    band9: "Expect conceptual paraphrasing: 'annual rainfall' -> 'yearly precipitation'; 'declined' -> 'diminished substantially'.",
    explanation: "Cambridge Reading စာမေးပွဲတွင် မေးခွန်းထဲမှ စာလုံးအတိုင်း စာပိုဒ်ထဲတွင် ဘယ်တော့မှ ထပ်တူမတွေ့ရပါ။ အဓိပ္ပာယ်တူ စကားလုံး (Synonyms / Paraphrases) များကိုသာ ရှာဖွေဖတ်ရှုရပါမည်။"
  },
  {
    category: "Vocabulary Precision 💎",
    rule: "Detrimental vs Deleterious",
    error: "Smoking has very bad impacts on health.",
    band9: "Tobacco consumption exerts unequivocally deleterious repercussions on pulmonary longevity.",
    explanation: "'Bad impact' အစား 'Deleterious repercussion' သို့မဟုတ် 'Detrimental consequence' ကို အသုံးပြုပါ။ အဆိပ်အတောက်နှင့် အန္တရာယ်ကြီးမားသော သက်ရောက်မှုများကို ဖော်ပြရာတွင် အထိရောက်ဆုံး ဖြစ်ပါသည်။"
  },
  {
    category: "Speaking Part 1 Rhythm 🗣️",
    rule: "Natural Idiomatic Phrasal Verbs",
    error: "Reciting heavy memorized GRE vocabulary like 'plethora' or 'inordinate' for simple hometown questions.",
    band9: "Part 1 prioritizes natural native flow: use phrasal verbs like 'grown on me', 'steer clear of', 'wind down after work'.",
    explanation: "Speaking Part 1 တွင် ခက်ခဲလွန်းသော စာအုပ်ကြီးစကားလုံးများကို အလွတ်ကျက်ပြောခြင်းထက် သဘာဝကျသော Phrasal Verbs များနှင့် ချောမွေ့သော စကားပြောစည်းဝါး (Natural Rhythm) ကိုသာ Examiner များက ပိုမို အမှတ်ပေးပါသည်။"
  },
  {
    category: "Task 2 Conclusion Strategy 🎯",
    rule: "No New Arguments in Conclusion",
    error: "Introducing a brand new idea or solution in the final paragraph.",
    band9: "The conclusion should solely synthesize previously substantiated arguments and offer a forward-looking recommendation.",
    explanation: "Conclusion (နိဂုံး) စာပိုဒ်ထဲတွင် အစောပိုင်း Body Paragraphs များတွင် မဖော်ပြခဲ့သော အယူအဆအသစ် (New Argument) များကို လုံးဝ မထည့်ပါနှင့်။ Task Achievement အမှတ် အပြတ် လျော့ကျနိုင်ပါသည်။"
  },
  {
    category: "Listening CBT Traps 🎧",
    rule: "Distractor & Self-Correction Trap",
    error: "Writing down the first date or phone number mentioned by the speaker.",
    band9: "Always listen for subsequent negation: 'Actually, let me double check... no, it's flat 14B, not 12A.'",
    explanation: "Listening Part 1 တွင် ပထမဦးဆုံး ပြောလိုက်သော အချက်အလက်ကို ချက်ချင်း မရေးပါနှင့်။ ချက်ချင်း 'Oh wait, actually...' ဟုဆိုကာ ပြင်ပြောလေ့ရှိသော Distractor Trap ကို အထူးသတိထား နားထောင်ပါ။"
  },
  {
    category: "Academic Referencing 🔗",
    rule: "Cohesive Demonstratives & Pronouns",
    error: "Repeating 'the government policy' five times across one paragraph.",
    band9: "Alternate with cohesive reference markers: 'this legislative intervention', 'such statutory measures', 'the aforementioned framework'.",
    explanation: "နာမ်တစ်ခုတည်းကို ထပ်ခါတလဲလဲ မသုံးဘဲ 'this intervention', 'such measures', 'the aforementioned' စသော Cohesive Devices များ သုံးစွဲခြင်းသည် Coherence & Cohesion တွင် Band 8.0+ ရရှိစေသည့် နည်းလမ်း ဖြစ်ပါသည်။"
  },
  {
    category: "Speaking Part 2 Secret ⏱️",
    rule: "The 1-Minute Chronological Bullet Map",
    error: "Writing full sentences on paper during the 60-second preparation time.",
    band9: "Jot only 5-6 power keywords in chronological sequence: Background -> Crisis -> Breakthrough -> Life Lesson.",
    explanation: "Speaking Part 2 ပြင်ဆင်ချိန် ၁ မိနစ်တွင် စာကြောင်းအရှည်များ လုံးဝမရေးပါနှင့်။ အချိန်မလောက်ပါ။ အဓိက Key words ၅ လုံးကို ဇာတ်လမ်းဆန်ဆန် (Timeline အလိုက်) အစ၊ အလယ်၊ အဆုံး ချရေးပြီး ၂ မိနစ်ပြည့်အောင် ပြောဆိုပါ။"
  }
];

function getRandomTip(index = -1) {
  if (index >= 0 && index < IELTS_TIPS.length) {
    return { tip: IELTS_TIPS[index], nextIndex: (index + 1) % IELTS_TIPS.length };
  }
  const idx = Math.floor(Math.random() * IELTS_TIPS.length);
  return { tip: IELTS_TIPS[idx], nextIndex: (idx + 1) % IELTS_TIPS.length };
}

function formatTipMessage(tipObj) {
  const { tip } = tipObj;
  return `💡 *BAND 9 IELTS TRAP & STRATEGY OF THE DAY*
━━━━━━━━━━━━━━━━━━━━
🏷️ *Category:* ${tip.category}
🎯 *Target:* Band 7.5 - 9.0

📌 *The Core Rule:*
${tip.rule}

❌ *Common Error (Band 6.0):*
${tip.error}

✅ *Band 9 Model Structure:*
${tip.band9}

🇲🇲 *Burmese Explanation:*
${tip.explanation}`;
}

function formatCountdown(user, daysRemaining, targetBand = 7.5) {
  const weeks = Math.floor(daysRemaining / 7);
  const days = daysRemaining % 7;
  const vocabPace = Math.ceil(1162 / Math.max(daysRemaining, 14));
  const readingPace = Math.max(1, Math.floor(daysRemaining / 23));

  return `📅 *IELTS EXAM COUNTDOWN & STUDY PACING*
━━━━━━━━━━━━━━━━━━━━
🎯 *Target Band:* Band ${targetBand}
🗓️ *Exam Date:* ${user.exam_date}
⏳ *Time Remaining:* *${daysRemaining} Days* (${weeks} Weeks, ${days} Days)

📊 *Recommended Daily Pacing:*
• 🔤 Vocabulary: *${vocabPace} items / day* (1-3-7 SRS Review)
• 📖 Reading CBT: *1 passage every ${readingPace} days*
• ✍️ Writing: *2 complete essays / week* (with CEFR 90/10 analysis)
• 🎙️ Speaking: *1 forecast topic / day* (record & compare)

💡 *Instructor Note:*
နေ့စဉ် ၁၅-၃၀ မိနစ် စာလုပ်ခြင်းသည် စာမေးပွဲနီးမှ အသည်းအသန်ကျက်ခြင်းထက် Band Score ၁ မှတ်ကျော် ပိုမိုမြင့်မားစေပါသည်။ Keep up the momentum! 🔥`;
}

async function handleStudentStatus(chatId, userId, env, botToken) {
  const user = await env.DB.prepare("SELECT * FROM users WHERE telegram_id = ?").bind(userId).first();
  const latestPayment = await env.DB.prepare("SELECT * FROM payments WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1").bind(userId).first();

  let vipVoucher = "";
  if (user && user.is_vip === 1) {
    const promo = await env.DB.prepare("SELECT code FROM promo_codes WHERE used_by_tg_id = ? ORDER BY used_at DESC LIMIT 1").bind(userId).first();
    if (promo) vipVoucher = promo.code;
  }

  const isVip = user && user.is_vip === 1;
  const targetBand = user && user.target_band ? user.target_band : 7.5;
  const srsDue = user && typeof user.srs_due_count === "number" ? user.srs_due_count : 0;
  const examDate = user && user.exam_date ? user.exam_date : null;

  let paymentText = "တင်သွင်းထားသော စလစ် မရှိသေးပါ (No Slip Submitted)";
  if (latestPayment) {
    if (latestPayment.status === "pending") {
      paymentText = `⏳ *စလစ် စစ်ဆေးဆဲ (Pending Verification)*\n  _Payment #${latestPayment.id} — Admin မှ မကြာမီ အတည်ပြုပေးပါမည်_`;
    } else if (latestPayment.status === "approved") {
      paymentText = `✅ *ငွေလွှဲ အတည်ပြုပြီး (Approved)*\n  _55,000 MMK Lifetime Access Granted_`;
    } else if (latestPayment.status === "rejected") {
      paymentText = `❌ *စလစ် မမှန်ကန်ပါ (Rejected)*\n  _ကျေးဇူးပြု၍ စလစ်အမှန်ကို Resend လုပ်ပေးပါ_`;
    }
  }

  let statusCard = 
`📊 *MY IELTS PREP STUDIO DASHBOARD*
━━━━━━━━━━━━━━━━━━━━
👤 *Student Account:*
• Name: *${(user && user.first_name) || "IELTS Scholar"}*
• Telegram ID: \`${userId}\`
• Target Band: *Band ${targetBand}*

👑 *VIP Membership:*
• Status: *${isVip ? "👑 LIFETIME VIP PASS (Active)" : "🆓 FREE TIER"}*
${isVip && vipVoucher ? `• 💻 Personal Desktop Code: \`${vipVoucher}\`\n  _(Computer Chrome/Edge တွင် ဤကုဒ်ထည့်၍ VIP သုံးနိုင်ပါသည်)_` : ""}
${user && user.vip_activated_at ? `• Activated: ${new Date(user.vip_activated_at * 1000).toLocaleDateString("en-GB")}` : ""}

💳 *Payment Status:*
• ${paymentText}

📈 *Study Metrics:*
• 🧠 SRS Due Cards Today: *${srsDue} items*
• 📅 Exam Date: *${examDate ? examDate : "Not Set Yet (Click Exam Countdown)"}*`;

  const inlineKeyboard = [];
  if (!isVip) {
    inlineKeyboard.push([{ text: "👑 Upgrade to Lifetime VIP (55,000 MMK)", callback_data: "info_payment" }]);
  }
  inlineKeyboard.push([
    { text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } },
    { text: "📅 Exam Countdown", callback_data: "view_exam" }
  ]);
  inlineKeyboard.push([
    { text: "💡 Band 9 Tip of the Day", callback_data: "next_tip" },
    { text: "📚 Curriculum Catalog", callback_data: "mod_catalog_back" }
  ]);

  await sendTelegramMessage(botToken, chatId, statusCard, { inline_keyboard: inlineKeyboard });
}

async function handleExamCountdown(chatId, userId, dateArg, env, botToken) {
  let user = await env.DB.prepare("SELECT * FROM users WHERE telegram_id = ?").bind(userId).first();

  if (dateArg) {
    const cleanDate = dateArg.trim();
    if (cleanDate === "clear" || cleanDate === "reset") {
      await env.DB.prepare("UPDATE users SET exam_date = NULL WHERE telegram_id = ?").bind(userId).run();
      await sendTelegramMessage(botToken, chatId, "✅ Exam date cleared. Click below to set a new date.", {
        inline_keyboard: [
          [{ text: "🗓️ 1 Month (30d)", callback_data: "set_exam:30" }, { text: "🗓️ 2 Months (60d)", callback_data: "set_exam:60" }],
          [{ text: "🗓️ 3 Months (90d)", callback_data: "set_exam:90" }, { text: "🗓️ 6 Months (180d)", callback_data: "set_exam:180" }]
        ]
      });
      return;
    }

    const parsed = new Date(cleanDate);
    if (isNaN(parsed.getTime()) || parsed.getTime() < Date.now()) {
      await sendTelegramMessage(botToken, chatId, "⚠️ Invalid date. Please enter a valid future date in `YYYY-MM-DD` format (e.g., `/exam 2026-11-20`).");
      return;
    }

    const isoDate = cleanDate.split("T")[0];
    await env.DB.prepare("UPDATE users SET exam_date = ? WHERE telegram_id = ?").bind(isoDate, userId).run();
    user = await env.DB.prepare("SELECT * FROM users WHERE telegram_id = ?").bind(userId).first();
  }

  if (!user || !user.exam_date) {
    const promptMsg = 
`📅 *IELTS EXAM COUNTDOWN & STUDY PACING*
━━━━━━━━━━━━━━━━━━━━
🎯 *Target Band:* Band ${user && user.target_band ? user.target_band : "7.5"}
🗓️ *Exam Date:* မသတ်မှတ်ရသေးပါ (Not Set)

သင်၏ စာမေးပွဲ ဖြေဆိုမည့်ရက်ကို သတ်မှတ်ထားခြင်းဖြင့် ကျန်ရှိသော ရက်အရေအတွက်နှင့် နေ့စဉ် လေ့လာသင့်သည့် နှုန်းထား (Daily Study Pace) ကို စနစ်တကျ တွက်ချက်နိုင်ပါသည်။

👇 အောက်ပါ ခလုတ်များမှ ရွေးချယ်ပါ (သို့) \`/exam YYYY-MM-DD\` (ဥပမာ \`/exam 2026-12-15\`) ဟု စာပို့ပေးပါ:`;

    await sendTelegramMessage(botToken, chatId, promptMsg, {
      inline_keyboard: [
        [{ text: "🗓️ 1 Month (30 Days)", callback_data: "set_exam:30" }, { text: "🗓️ 2 Months (60 Days)", callback_data: "set_exam:60" }],
        [{ text: "🗓️ 3 Months (90 Days)", callback_data: "set_exam:90" }, { text: "🗓️ 6 Months (180 Days)", callback_data: "set_exam:180" }],
        [{ text: "🎯 Change Target Band", callback_data: "target_band_menu" }]
      ]
    });
    return;
  }

  const examTime = new Date(user.exam_date).getTime();
  const now = Date.now();
  const diffMs = examTime - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const countdownCard = formatCountdown(user, daysRemaining, user.target_band || 7.5);

  await sendTelegramMessage(botToken, chatId, countdownCard, {
    inline_keyboard: [
      [{ text: "✏️ Change Exam Date", callback_data: "reset_exam_prompt" }],
      [{ text: "🎯 Target: Band 7.5", callback_data: "set_band:7.5" }, { text: "🎯 Target: Band 8.0+", callback_data: "set_band:8.0" }],
      [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
    ]
  });
}

async function handleAdminBroadcast(chatId, adminId, text, env, botToken) {
  let targetTier = "all";
  let broadcastMsg = "";

  if (text.startsWith("/broadcast_vip ")) {
    targetTier = "vip";
    broadcastMsg = text.replace("/broadcast_vip ", "").trim();
  } else if (text.startsWith("/broadcast_free ")) {
    targetTier = "free";
    broadcastMsg = text.replace("/broadcast_free ", "").trim();
  } else if (text.startsWith("/broadcast ")) {
    targetTier = "all";
    broadcastMsg = text.replace("/broadcast ", "").trim();
  }

  if (!broadcastMsg) {
    await sendTelegramMessage(botToken, chatId, "Usage:\n`/broadcast <msg>`\n`/broadcast_vip <msg>`\n`/broadcast_free <msg>`");
    return;
  }

  let query = "SELECT telegram_id FROM users";
  if (targetTier === "vip") query += " WHERE is_vip = 1";
  if (targetTier === "free") query += " WHERE is_vip = 0";

  const { results } = await env.DB.prepare(query).all();
  if (!results || results.length === 0) {
    await sendTelegramMessage(botToken, chatId, `⚠️ No target students found for tier: *${targetTier}*.`);
    return;
  }

  await sendTelegramMessage(botToken, chatId, `📡 Starting broadcast to *${results.length}* students (${targetTier})...`);

  let sent = 0;
  let failed = 0;

  for (const user of results) {
    try {
      const resp = await sendTelegramMessage(botToken, user.telegram_id, `📢 *ANNOUNCEMENT FROM IELTS PREP STUDIO*\n━━━━━━━━━━━━━━━━━━━━\n${broadcastMsg}\n\n_— IELTS Prep Studio Academic Team_`, {
        inline_keyboard: [
          [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
        ]
      });
      if (resp && resp.ok) sent++;
      else failed++;
    } catch (e) {
      failed++;
    }
  }

  await sendTelegramMessage(botToken, chatId, 
`✅ *BROADCAST COMPLETED!*
━━━━━━━━━━━━━━━━━━━━
• Target Group: *${targetTier.toUpperCase()}*
• Total Sent: *${sent}*
• Failed / Blocked: *${failed}*`
  );
}


