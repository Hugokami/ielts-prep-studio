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

      if (url.pathname === "/api/tools/collocations") {
        return await handleApiCollocations(request, env, url);
      }

      if (url.pathname === "/api/tools/synonyms") {
        return await handleApiSynonyms(request, env, url);
      }

      if (url.pathname === "/api/tools/topic") {
        return await handleApiTopic(request, env, url);
      }

      if (url.pathname === "/api/tools/dict") {
        return await handleApiDict(request, env, url);
      }

      if (url.pathname === "/api/tools/quote") {
        return await handleApiQuote(request, env, url);
      }

      if (url.pathname === "/api/tools/quota") {
        return await handleApiQuota(request, env, url);
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

    // Check user VIP status once for all message handlers
    let isVip = false;
    try {
      const userRecord = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(userId).first();
      isVip = userRecord && userRecord.is_vip === 1;
    } catch (e) {
      console.error("[User VIP Check Error]", e);
    }

    // 1. /start or /menu command or greeting
    if (text === "/start" || text.startsWith("/start ") || text === "/menu" || text === "မင်္ဂလာပါ") {
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(registerBotCommands(botToken));
      }

      let welcomeText = "";
      if (isVip) {
        welcomeText = 
`🇲🇲 *Welcome back to IELTS Prep Studio (@${env.BOT_USERNAME || "IELTSPrepStudioBot"})!*

👑 *VIP LIFETIME MEMBER (ACTIVE)*
• All 1,162 Academic Lexicons, Native Audio & 1-3-7 SRS
• All 23 Cambridge Reading CBT Passages (231 Questions)
• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer
• All 30 Speaking Forecast Topics & 5 Frameworks
• Automatic Cross-Device Cloud Sync + Desktop VIP Access

⚡ Daily Academic AI Quota: *Unlimited Band 9 Access*
👨‍🏫 Need personalized advice? Lead Instructor: @hyuguo

👇 *အောက်ပါ Menu မှ လိုအပ်ရာကို ရွေးချယ်နိုင်ပါသည်:*`;
      } else {
        welcomeText = 
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
      }

      await sendTelegramMessage(botToken, chatId, welcomeText, getMainMenuKeyboard(env, isVip));
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

    // 2.1. /tools or "⚡ VIP Academic Tools" or "Academic Tools"
    if (text === "/tools" || text === "⚡ VIP Academic Tools" || text === "Academic Tools" || text === "/academic") {
      await handleToolsMenu(chatId, userId, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.2. /collocate <word>
    if (text.startsWith("/collocate")) {
      const wordArg = text.replace("/collocate", "").trim();
      await handleCollocateCommand(chatId, userId, wordArg, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.3. /syn <word> or /synonym <word>
    if (text.startsWith("/syn")) {
      const wordArg = text.replace(/^\/syn(onym)?/i, "").trim();
      await handleSynCommand(chatId, userId, wordArg, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.4. /read <topic> or /topic <topic>
    if (text.startsWith("/read") || text.startsWith("/topic")) {
      const topicArg = text.replace(/^\/(read|topic)/i, "").trim();
      await handleReadCommand(chatId, userId, topicArg, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.5. /dict <word> or /dictionary <word>
    if (text.startsWith("/dict")) {
      const wordArg = text.replace(/^\/dict(ionary)?/i, "").trim();
      await handleDictCommand(chatId, userId, wordArg, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.6. /quote or "Scholar Quote"
    if (text === "/quote" || text.startsWith("/quote ") || text === "Scholar Quote" || text === "🧠 Scholar Quote") {
      await handleQuoteCommand(chatId, userId, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.7. /quota or "📊 My Quota" or "Check Quota"
    if (text === "/quota" || text === "📊 My Quota" || text === "Check Quota" || text === "📊 Check My Quota") {
      await handleQuotaCheck(chatId, userId, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.8. /wotd or /word or "🌟 Word of the Day"
    if (text === "/wotd" || text === "/word" || text === "🌟 Word of the Day" || text === "Word of the Day") {
      await handleWotdCommand(chatId, userId, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.9. /bands or /score or "🎯 Band Descriptors"
    if (text === "/bands" || text === "/score" || text === "🎯 Band Descriptors" || text === "Band Scale") {
      await handleBandsCommand(chatId, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.10. /format or "📋 IELTS Exam Format"
    if (text === "/format" || text === "📋 IELTS Exam Format" || text === "Exam Format") {
      await handleFormatCommand(chatId, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.11. /sprint or "⏱️ Study Sprint"
    if (text.startsWith("/sprint") || text === "⏱️ Study Sprint") {
      await handleSprintCommand(chatId, text, botToken);
      return jsonResponse({ ok: true });
    }

    // 3. /vip or VIP pass buttons
    if (text === "/vip" || text === "👑 Buy VIP Pass (55,000 Ks)" || text === "⭐ VIP Pass (55,000 Ks)" || text === "👑 VIP Lifetime Active" || text === "Buy Products") {
      if (isVip) {
        const activeVipText = 
`👑 *YOUR LIFETIME STUDIO VIP PASS IS ACTIVE*
━━━━━━━━━━━━━━━━━━━━
💎 *Status:* Active (Lifetime • No Expiration)
✨ *Features Unlocked Forever:*
• 🔤 All 1,162 Band 8.5/9.0 Academic Lexicon Items & Native Audio
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Evaluator
• 🎙️ All 30 Speaking Forecast Topics & 5 Frameworks
• ☁️ Multi-Device Cloud Sync + Telegram Mini App Integration
• ⚡ Unlimited Live Academic AI Quota (/collocate, /syn, /dict, /read)

💻 *Desktop PC Access:*
Open ${env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/"} on computer and log in with Telegram or use your Personal VIP Desktop Voucher!`;

        await sendTelegramMessage(botToken, chatId, activeVipText, {
          inline_keyboard: [
            [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
            [{ text: "📚 View Curriculum Syllabus", callback_data: "mod_catalog_back" }],
            [
              { text: "⚡ VIP Academic Tools", callback_data: "menu_tools" },
              { text: "💬 Chat with Lead Instructor", url: "https://t.me/hyuguo" }
            ]
          ]
        });
        return jsonResponse({ ok: true });
      }

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

      await sendTelegramMessage(botToken, chatId, catalogMsg, getCurriculumCatalogKeyboard(env, isVip));
      return jsonResponse({ ok: true });
    }

    // 5. /status or "📊 My Study & VIP Status" or "Purchase History"
    if (text === "/status" || text === "📊 My Study & VIP Status" || text === "Purchase History") {
      await handleStudentStatus(chatId, userId, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 6. /pay or "💳 Payment Info" or "💬 Chat with Lead Instructor"
    if (text === "/pay" || text === "💳 Payment Info" || text === "💬 Chat with Lead Instructor") {
      if (isVip) {
        const vipPayMsg = 
`👑 *VIP LIFETIME MEMBERSHIP ACTIVE*
━━━━━━━━━━━━━━━━━━━━
✅ သင်သည် Lifetime VIP Pass အသုံးပြုသူဖြစ်ပြီး ဖြစ်ပါသည်။ ထပ်မံပေးသွင်းရန် မလိုတော့ပါ။

✨ All 1,162 Academic Lexicons, 23 CBT Readings & 40 Writing Models are unlocked forever.

💬 ပညာရေးဆိုင်ရာ မေးခွန်းများ သို့မဟုတ် အကူအညီ လိုအပ်ပါက Lead Instructor @hyuguo ထံ တိုက်ရိုက်ဆက်သွယ်နိုင်ပါသည် ခင်ဗျာ:`;

        await sendTelegramMessage(botToken, chatId, vipPayMsg, {
          inline_keyboard: [
            [{ text: "💬 Chat with Lead Instructor (@hyuguo)", url: "https://t.me/hyuguo" }],
            [{ text: "⚡ VIP Academic Tools", callback_data: "menu_tools" }],
            [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
          ]
        });
        return jsonResponse({ ok: true });
      }

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

    // If user has an active pending tool prompt, route typed word to that tool:
    if (text) {
      try {
        const userRecord = await env.DB.prepare("SELECT pending_tool FROM users WHERE telegram_id = ?").bind(userId).first();
        if (userRecord && userRecord.pending_tool) {
          const pending = userRecord.pending_tool;
          await env.DB.prepare("UPDATE users SET pending_tool = NULL WHERE telegram_id = ?").bind(userId).run();

          if (pending === "collocate") {
            await handleCollocateCommand(chatId, userId, text, env, botToken);
            return jsonResponse({ ok: true });
          } else if (pending === "syn") {
            await handleSynCommand(chatId, userId, text, env, botToken);
            return jsonResponse({ ok: true });
          } else if (pending === "read") {
            await handleReadCommand(chatId, userId, text, env, botToken);
            return jsonResponse({ ok: true });
          } else if (pending === "dict") {
            await handleDictCommand(chatId, userId, text, env, botToken);
            return jsonResponse({ ok: true });
          }
        }
      } catch (err) {
        console.error("[Pending Tool Check Error]", err);
      }

      // If text was not handled and student has a recent pending payment (within 2 hours), treat text as TxRef / Phone
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

    let isVip = false;
    try {
      const userRow = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(cbUserId).first();
      isVip = userRow && userRow.is_vip === 1;
    } catch (e) {}

    // Academic Tools Callbacks
    if (data === "menu_tools") {
      await answerCallbackQuery(botToken, cb.id);
      try {
        await env.DB.prepare("UPDATE users SET pending_tool = NULL WHERE telegram_id = ?").bind(cbUserId).run();
      } catch (e) {}
      await handleToolsMenu(cbChatId, cbUserId, env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data.startsWith("ask_tool:")) {
      await answerCallbackQuery(botToken, cb.id);
      const toolName = data.replace("ask_tool:", "").trim();
      await handlePromptForTool(cbChatId, cbUserId, toolName, env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data === "tool_quota") {
      await answerCallbackQuery(botToken, cb.id);
      await handleQuotaCheck(cbChatId, cbUserId, env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data === "tool_quote") {
      await answerCallbackQuery(botToken, cb.id);
      await handleQuoteCommand(cbChatId, cbUserId, env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data === "tool_wotd") {
      await answerCallbackQuery(botToken, cb.id);
      await handleWotdCommand(cbChatId, cbUserId, env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data === "tool_bands") {
      await answerCallbackQuery(botToken, cb.id);
      await handleBandsCommand(cbChatId, botToken);
      return jsonResponse({ ok: true });
    }

    if (data === "tool_format") {
      await answerCallbackQuery(botToken, cb.id);
      await handleFormatCommand(cbChatId, botToken);
      return jsonResponse({ ok: true });
    }

    if (data.startsWith("sprint:")) {
      await answerCallbackQuery(botToken, cb.id);
      const mins = data.split(":")[1];
      await handleSprintCommand(cbChatId, `/sprint ${mins}`, botToken);
      return jsonResponse({ ok: true });
    }

    if (data.startsWith("tool_collocate:")) {
      await answerCallbackQuery(botToken, cb.id);
      try {
        await env.DB.prepare("UPDATE users SET pending_tool = NULL WHERE telegram_id = ?").bind(cbUserId).run();
      } catch (e) {}
      const w = data.replace("tool_collocate:", "").trim();
      await handleCollocateCommand(cbChatId, cbUserId, w, env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data.startsWith("tool_syn:")) {
      await answerCallbackQuery(botToken, cb.id);
      try {
        await env.DB.prepare("UPDATE users SET pending_tool = NULL WHERE telegram_id = ?").bind(cbUserId).run();
      } catch (e) {}
      const w = data.replace("tool_syn:", "").trim();
      await handleSynCommand(cbChatId, cbUserId, w, env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data.startsWith("tool_read:")) {
      await answerCallbackQuery(botToken, cb.id);
      try {
        await env.DB.prepare("UPDATE users SET pending_tool = NULL WHERE telegram_id = ?").bind(cbUserId).run();
      } catch (e) {}
      const t = data.replace("tool_read:", "").trim();
      await handleReadCommand(cbChatId, cbUserId, t, env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data.startsWith("tool_dict:")) {
      await answerCallbackQuery(botToken, cb.id);
      try {
        await env.DB.prepare("UPDATE users SET pending_tool = NULL WHERE telegram_id = ?").bind(cbUserId).run();
      } catch (e) {}
      const w = data.replace("tool_dict:", "").trim();
      await handleDictCommand(cbChatId, cbUserId, w, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 1. Info payment button
    if (data === "info_payment") {
      if (isVip) {
        await answerCallbackQuery(botToken, cb.id, "👑 You already have Lifetime VIP Active!");
        const activeMsg = 
`👑 *VIP LIFETIME ACTIVE*
━━━━━━━━━━━━━━━━━━━━
✅ You are already a Lifetime Studio VIP Member. All 1,162 Vocabulary items, 23 Cambridge Reading CBT Passages, and 40 Writing Models are completely unlocked!

👨‍🏫 For instructor support, reach out directly to @hyuguo.`;
        if (cbMessageId) {
          await editTelegramMessageText(botToken, cbChatId, cbMessageId, activeMsg, {
            inline_keyboard: [
              [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
              [{ text: "⚡ VIP Academic Tools", callback_data: "menu_tools" }],
              [{ text: "💬 Chat with Lead Instructor (@hyuguo)", url: "https://t.me/hyuguo" }]
            ]
          });
        }
        return jsonResponse({ ok: true });
      }

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

    // 1.1 VIP Status card
    if (data === "vip_status") {
      await answerCallbackQuery(botToken, cb.id, "👑 Lifetime VIP Pass is Active!");
      const statusMsg = 
`👑 *YOUR LIFETIME STUDIO VIP PASS IS ACTIVE*
━━━━━━━━━━━━━━━━━━━━
💎 *Status:* Active (Lifetime • No Expiration)
✨ *Features Unlocked Forever:*
• 🔤 All 1,162 Band 8.5/9.0 Academic Lexicon Items
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer
• 🎙️ All 30 Speaking Forecast Topics & 5 Frameworks
• ☁️ Cross-Device Cloud Sync Enabled
• ⚡ Unlimited VIP Academic Tools (/collocate, /syn, /dict, /read)

💻 *Desktop PC Access:*
Open ${env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/"} on computer and log in with Telegram!`;

      if (cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, statusMsg, {
          inline_keyboard: [
            [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
            [{ text: "📚 View Curriculum Syllabus", callback_data: "mod_catalog_back" }],
            [
              { text: "⚡ VIP Academic Tools", callback_data: "menu_tools" },
              { text: "💬 Chat with Lead Instructor", url: "https://t.me/hyuguo" }
            ]
          ]
        });
      }
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
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, catalogMsg, getCurriculumCatalogKeyboard(env, isVip));
      }
      return jsonResponse({ ok: true });
    }

    // 3. Curriculum Module Click
    if (data.startsWith("mod_")) {
      await answerCallbackQuery(botToken, cb.id);
      const moduleData = CURRICULUM_MODULES[data];
      if (moduleData && cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, moduleData.content, getModuleKeyboard(data, env, isVip));
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

        // Remove approve/reject buttons immediately and update caption on Admin's screen
        if (cb.message) {
          try {
            await editTelegramReplyMarkup(botToken, cb.message.chat.id, cb.message.message_id, {
              inline_keyboard: [
                [{ text: `👤 Open Student Chat (@${username || numTgId})`, url: studentLink }]
              ]
            });
          } catch (btnErr) {
            console.error("[approve editTelegramReplyMarkup Error]", btnErr);
          }

          try {
            const originalCaption = cb.message.caption || "";
            const appendText = `\n\n━━━━━━━━━━━━━━━━━━━━\n✅ APPROVED & UNLOCKED by Admin\n🕒 Time: ${nowMmt} MMT\n🎟️ Desktop Code: ${desktopVoucher}`;
            let updatedCaption = originalCaption + appendText;
            if (updatedCaption.length > 1000) {
              updatedCaption = originalCaption.substring(0, 1000 - appendText.length) + appendText;
            }
            await editTelegramCaption(botToken, cb.message.chat.id, cb.message.message_id, updatedCaption);
          } catch (capErr) {
            console.error("[approve editTelegramCaption Error]", capErr);
          }
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

        // Remove approve/reject buttons immediately and update caption on Admin's screen
        if (cb.message) {
          try {
            await editTelegramReplyMarkup(botToken, cb.message.chat.id, cb.message.message_id, {
              inline_keyboard: [
                [{ text: `💬 Message Student (@${username || numTgId})`, url: studentLink }]
              ]
            });
          } catch (btnErr) {
            console.error("[reject editTelegramReplyMarkup Error]", btnErr);
          }

          try {
            const originalCaption = cb.message.caption || "";
            const appendText = `\n\n━━━━━━━━━━━━━━━━━━━━\n❌ REJECTED by Admin\n🕒 Time: ${nowMmt} MMT`;
            let updatedCaption = originalCaption + appendText;
            if (updatedCaption.length > 1000) {
              updatedCaption = originalCaption.substring(0, 1000 - appendText.length) + appendText;
            }
            await editTelegramCaption(botToken, cb.message.chat.id, cb.message.message_id, updatedCaption);
          } catch (capErr) {
            console.error("[reject editTelegramCaption Error]", capErr);
          }
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
  { command: "tools", description: "⚡ VIP Academic Lexicon & Topic Tools" },
  { command: "collocate", description: "🔗 Collocations (/collocate <word>)" },
  { command: "syn", description: "💎 Band 8.5+ Synonyms (/syn <word>)" },
  { command: "read", description: "📖 Academic Topic Briefs (/read <topic>)" },
  { command: "dict", description: "📚 Live Academic Dictionary (/dict <word>)" },
  { command: "quote", description: "🧠 Scholar Thought & Rhetoric" },
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
function getMainMenuKeyboard(env, isVip = false) {
  const vipButton = isVip
    ? { text: "👑 VIP Lifetime Active" }
    : { text: "👑 Buy VIP Pass (55,000 Ks)" };
  const payButton = isVip
    ? { text: "💬 Chat with Lead Instructor" }
    : { text: "💳 Payment Info" };
  return {
    keyboard: [
      [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
      [{ text: "⚡ VIP Academic Tools" }, vipButton],
      [{ text: "📚 Curriculum & Features" }, { text: "📊 My Study & VIP Status" }],
      [payButton, { text: "📅 Exam Countdown" }],
      [{ text: "💡 Band 9 Tip of the Day" }, { text: "👨‍🏫 Contact Support" }],
      [{ text: "👤 Creator Profile" }, { text: "📕 How To Use & Guide" }]
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: "လိုအပ်သော Menu ကို ရွေးပါ"
  };
}

// Interactive Curriculum Catalog Keyboards & Module Details (Matching Reference Screenshot 1 & 2)
function getCurriculumCatalogKeyboard(env, isVip = false) {
  const ctaButton = isVip
    ? { text: "⚡ VIP Academic Tools", callback_data: "menu_tools" }
    : { text: "💳 How to Pay (55,000 Ks)", callback_data: "info_payment" };
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
        { text: "👑 Full Lifetime VIP", callback_data: isVip ? "vip_status" : "mod_vip" }
      ],
      [
        { text: "🚀 Launch Mini App", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } },
        ctaButton
      ]
    ]
  };
}

function getModuleKeyboard(moduleId, env, isVip = false) {
  const topButton = isVip
    ? [{ text: "👑 Unlocked in Lifetime VIP", callback_data: "vip_status" }]
    : [{ text: "⭐ Unlock in Lifetime VIP (55,000 MMK)", callback_data: "info_payment" }];
  return {
    inline_keyboard: [
      topButton,
      [{ text: "🚀 Open in IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
      [
        { text: "◀️ Back to Curriculum", callback_data: "mod_catalog_back" },
        { text: "⚡ VIP Tools", callback_data: "menu_tools" }
      ]
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

// ==========================================
// 8. VIP ACADEMIC NO-AUTH AI TOOLS & QUOTA
// ==========================================

function getYangonDateStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yangon' }).format(new Date());
}

function getClientIdentifier(request, url, telegramId) {
  if (telegramId && parseInt(telegramId, 10) > 0) {
    return parseInt(telegramId, 10);
  }
  const cfIp = request ? (request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "guest") : "guest";
  let hash = 0;
  for (let i = 0; i < cfIp.length; i++) {
    hash = (hash << 5) - hash + cfIp.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 999999;
}

async function resolveIsVip(env, telegramId, voucherCode) {
  if (telegramId && parseInt(telegramId, 10) > 0) {
    const user = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(parseInt(telegramId, 10)).first();
    if (user && user.is_vip === 1) return true;
  }
  if (voucherCode) {
    const cleanCode = String(voucherCode).trim().toUpperCase();
    const hardcodedVouchers = ["VIPPASS2026", "BAND9VIP", "SCHOLAR9", "BURMA2026", "ENGNOVATE"];
    if (hardcodedVouchers.includes(cleanCode)) return true;
    const promo = await env.DB.prepare("SELECT * FROM promo_codes WHERE code = ?").bind(cleanCode).first();
    if (promo) return true;
  }
  return false;
}

async function checkAndConsumeQuota(env, telegramId, isVip) {
  // VIP users have UNLIMITED access
  if (isVip) {
    return {
      allowed: true,
      isVip: true,
      count: 0,
      limit: "unlimited",
      remaining: "unlimited"
    };
  }

  // Free users have 3 queries per day in Asia/Yangon time
  const dateStr = getYangonDateStr();
  const safeId = parseInt(telegramId, 10) || 0;

  const row = await env.DB.prepare(
    "SELECT count FROM daily_quota WHERE telegram_id = ? AND date_str = ?"
  ).bind(safeId, dateStr).first();

  const currentCount = row ? (row.count || 0) : 0;
  const FREE_DAILY_LIMIT = 15;

  if (currentCount >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      isVip: false,
      count: currentCount,
      limit: FREE_DAILY_LIMIT,
      remaining: 0
    };
  }

  // Increment usage count
  await env.DB.prepare(`
    INSERT INTO daily_quota (telegram_id, date_str, count)
    VALUES (?, ?, 1)
    ON CONFLICT(telegram_id, date_str) DO UPDATE SET count = count + 1
  `).bind(safeId, dateStr).run();

  const newCount = currentCount + 1;
  return {
    allowed: true,
    isVip: false,
    count: newCount,
    limit: FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - newCount)
  };
}

async function getQuotaStatus(env, telegramId, isVip) {
  if (isVip) {
    return {
      isVip: true,
      count: 0,
      limit: "unlimited",
      remaining: "unlimited"
    };
  }
  const dateStr = getYangonDateStr();
  const safeId = parseInt(telegramId, 10) || 0;
  const row = await env.DB.prepare(
    "SELECT count FROM daily_quota WHERE telegram_id = ? AND date_str = ?"
  ).bind(safeId, dateStr).first();

  const currentCount = row ? (row.count || 0) : 0;
  const FREE_DAILY_LIMIT = 15;
  return {
    isVip: false,
    count: currentCount,
    limit: FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - currentCount)
  };
}

// ------------------------------------------
// External Zero-Auth API Fetchers
// ------------------------------------------

const STOP_WORDS = new Set([
  "the", "a", "an", "this", "that", "these", "those", "my", "your", "his", "her", "its", "our", "their", 
  "some", "any", "no", "every", "all", "each", "both", "few", "more", "most", "other", "such", "what", 
  "which", "who", "whom", "whose", "of", "in", "to", "for", "with", "on", "at", "from", "by", "about", 
  "as", "into", "like", "through", "after", "over", "between", "out", "against", "during", "without", 
  "before", "under", "around", "among", "is", "are", "was", "were", "be", "been", "being", "have", "has", 
  "had", "do", "does", "did", "can", "could", "should", "would", "may", "might", "must", "and", "or", "but",
  "not", "also", "least", "very", "much", "even"
]);

function cleanWordList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const cleaned = [];
  for (const item of list) {
    const w = (typeof item === "string" ? item : (item && item.word ? item.word : "")).trim().toLowerCase();
    if (!w || w.length < 3) continue;
    if (STOP_WORDS.has(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    cleaned.push(w);
  }
  return cleaned;
}

const ACADEMIC_ADJECTIVES = new Set([
  "crucial", "vital", "essential", "significant", "substantial", "profound", "detrimental", 
  "beneficial", "fundamental", "critical", "pivotal", "paramount", "feasible", "viable", 
  "pressing", "ubiquitous", "unprecedented", "imperative", "prevalent", "drastic", "considerable",
  "inevitable", "compelling", "notable", "pervasive", "stringent", "comprehensive", "adverse",
  "detrimental", "sustainable", "prominent", "dominant", "inherent"
]);

const ACADEMIC_VERBS = new Set([
  "mitigate", "exacerbate", "foster", "facilitate", "alleviate", "advocate", "implement", 
  "demonstrate", "accelerate", "deteriorate", "augment", "diminish", "curb", "hinder", 
  "jeopardize", "undermine", "perpetuate", "scrutinize", "enhance", "reinforce"
]);

async function fetchCollocations(rawWord) {
  const word = (rawWord || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!word) return null;

  try {
    const [metaRes, jjaRes, jjbRes, bgbRes, trgRes] = await Promise.allSettled([
      fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`).then(r => r.json()),
      fetch(`https://api.datamuse.com/words?rel_jja=${encodeURIComponent(word)}&max=20`).then(r => r.json()),
      fetch(`https://api.datamuse.com/words?rel_jjb=${encodeURIComponent(word)}&max=20`).then(r => r.json()),
      fetch(`https://api.datamuse.com/words?rel_bgb=${encodeURIComponent(word)}&md=p&max=20`).then(r => r.json()),
      fetch(`https://api.datamuse.com/words?rel_trg=${encodeURIComponent(word)}&max=20`).then(r => r.json())
    ]);

    const metaItem = (metaRes.status === "fulfilled" && Array.isArray(metaRes.value) && metaRes.value[0]) ? metaRes.value[0] : {};
    const tags = metaItem.tags || [];

    const jjaRaw = (jjaRes.status === "fulfilled" && Array.isArray(jjaRes.value)) ? jjaRes.value : [];
    const jjbRaw = (jjbRes.status === "fulfilled" && Array.isArray(jjbRes.value)) ? jjbRes.value : [];
    const bgbRaw = (bgbRes.status === "fulfilled" && Array.isArray(bgbRes.value)) ? bgbRes.value : [];
    const trgRaw = (trgRes.status === "fulfilled" && Array.isArray(trgRes.value)) ? trgRes.value : [];

    // Determine POS accurately with multi-tiered resolution
    let pos = "noun";
    if (ACADEMIC_ADJECTIVES.has(word)) {
      pos = "adj";
    } else if (ACADEMIC_VERBS.has(word)) {
      pos = "verb";
    } else if (metaItem.defs && metaItem.defs.length > 0) {
      const dPos = metaItem.defs[0].split("\t")[0];
      if (dPos === "adj") pos = "adj";
      else if (dPos === "v") pos = "verb";
      else if (dPos === "n") pos = "noun";
      else if (dPos === "adv") pos = "adv";
    } else if (tags.length > 0) {
      const p = tags.filter(t => ["adj", "v", "n", "adv"].includes(t));
      if (p.length > 0) {
        if (p[0] === "adj") pos = "adj";
        else if (p[0] === "v") pos = "verb";
        else if (p[0] === "adv") pos = "adv";
        else pos = "noun";
      }
    } else if (word.endsWith("ful") || word.endsWith("less") || word.endsWith("ous") || word.endsWith("ive") || word.endsWith("ic") || word.endsWith("al") || word.endsWith("able") || word.endsWith("ible")) {
      pos = "adj";
    } else if (word.endsWith("ize") || word.endsWith("ise") || word.endsWith("ate")) {
      pos = "verb";
    }

    // Secondary semantic heuristic: if rel_jja returns common modified nouns with high score, it's definitely an adjective!
    if (pos === "noun" && jjaRaw.some(item => ["role", "factor", "point", "importance", "question", "issue", "element", "aspect", "step"].includes(item.word) && item.score > 800)) {
      pos = "adj";
    }

    const jjaClean = cleanWordList(jjaRaw); // Nouns modified by this adjective (or compound followers)
    const jjbClean = cleanWordList(jjbRaw); // Adjectives modifying this noun
    const trgClean = cleanWordList(trgRaw); // Thematic triggers

    let nounCollocations = [];
    let modifierCollocations = [];
    let verbCollocations = [];
    let sentenceFrames = [];

    if (pos === "adj") {
      // 1. ADJECTIVE (e.g. crucial, vital, significant)
      nounCollocations = jjaClean.length ? jjaClean.slice(0, 6) : trgClean.slice(0, 6);
      const bgbAdvs = bgbRaw
        .filter(w => w.tags && w.tags.includes("adv"))
        .map(w => w.word);
      const advs = Array.from(new Set([...cleanWordList(bgbAdvs), "increasingly", "vitally", "critically", "particularly", "fundamentally"]))
        .filter(a => a !== word);
      modifierCollocations = advs.slice(0, 5);

      sentenceFrames = [
        `play a *${word}* role in [societal development / academic progress]`,
        `of *${word}* importance to [policymakers / modern economy]`,
        `proves to be a *${word}* factor in [determining long-term success]`
      ];
    } else if (pos === "verb") {
      // 2. VERB (e.g. mitigate, exacerbate, foster)
      nounCollocations = trgClean.length ? trgClean.slice(0, 6) : jjaClean.slice(0, 6);
      modifierCollocations = ["significantly", "effectively", "substantially", "gradually", "proactively"];
      sentenceFrames = [
        `proactive government intervention is essential to *${word}* [the issue]`,
        `failure to regulate could severely *${word}* [existing disparities]`
      ];
    } else {
      // 3. NOUN (e.g. impact, policy, environment, evidence)
      modifierCollocations = jjbClean.length ? jjbClean.slice(0, 6) : trgClean.slice(0, 6);
      nounCollocations = jjaClean.filter(n => n !== word).slice(0, 5);
      
      if (word === "impact" || word === "effect") {
        verbCollocations = [
          `have / exert a profound *${word}* on...`,
          `assess / evaluate the long-term *${word}* of...`,
          `mitigate / alleviate the adverse *${word}* of...`
        ];
      } else if (word === "evidence" || word === "data") {
        verbCollocations = [
          `provide / present compelling *${word}* for...`,
          `scrutinize / examine empirical *${word}* regarding...`
        ];
      } else {
        verbCollocations = [
          `examine / evaluate key issues surrounding *${word}*`,
          `formulate / implement policies regarding *${word}*`
        ];
      }

      sentenceFrames = [
        `plays a pivotal role in the context of *${word}* [within contemporary society]`,
        `policymakers must carefully examine issues regarding [this *${word}*]`
      ];
    }

    return {
      word,
      pos,
      nounCollocations,
      modifierCollocations,
      verbCollocations,
      sentenceFrames,
      triggers: trgClean.slice(0, 6),
      adjectives: modifierCollocations,
      nouns: nounCollocations
    };
  } catch (err) {
    console.error("[fetchCollocations Error]", err);
    return null;
  }
}

async function fetchSynonyms(rawWord) {
  const word = (rawWord || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!word) return null;

  try {
    const [synRes, spcRes] = await Promise.allSettled([
      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=12`).then(r => r.json()),
      fetch(`https://api.datamuse.com/words?rel_spc=${encodeURIComponent(word)}&max=8`).then(r => r.json())
    ]);

    const synList = (synRes.status === "fulfilled" && Array.isArray(synRes.value)) ? synRes.value.map(w => w.word) : [];
    const spcList = (spcRes.status === "fulfilled" && Array.isArray(spcRes.value)) ? spcRes.value.map(w => w.word) : [];

    const combined = Array.from(new Set([...synList, ...spcList])).filter(w => w.toLowerCase() !== word);
    return {
      word,
      synonyms: combined.slice(0, 10),
      specific: spcList.slice(0, 5)
    };
  } catch (err) {
    console.error("[fetchSynonyms Error]", err);
    return null;
  }
}

async function fetchTopicBrief(rawTopic) {
  const topic = (rawTopic || "").trim();
  if (!topic) return null;

  try {
    let resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.replace(/\s+/g, "_"))}`, {
      headers: { "User-Agent": "IELTSPrepStudioBot/1.0 (academic.prep@gmail.com)" }
    });

    let data = null;
    if (resp.ok) {
      data = await resp.json();
    } else {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&namespace=0&format=json`;
      const searchResp = await fetch(searchUrl, {
        headers: { "User-Agent": "IELTSPrepStudioBot/1.0 (academic.prep@gmail.com)" }
      });
      if (searchResp.ok) {
        const searchJson = await searchResp.json();
        const matched = searchJson[1] && searchJson[1][0] ? searchJson[1][0] : null;
        if (matched) {
          resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(matched.replace(/\s+/g, "_"))}`, {
            headers: { "User-Agent": "IELTSPrepStudioBot/1.0 (academic.prep@gmail.com)" }
          });
          if (resp.ok) data = await resp.json();
        }
      }
    }

    if (!data || !data.extract) return null;

    let extract = data.extract;
    if (extract.length > 450) {
      const dotIdx = extract.indexOf(".", 350);
      if (dotIdx !== -1) {
        extract = extract.substring(0, dotIdx + 1);
      }
    }

    return {
      title: data.title || topic,
      extract: extract,
      description: data.description || "Academic Topic",
      url: data.content_urls && data.content_urls.desktop ? data.content_urls.desktop.page : `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`
    };
  } catch (err) {
    console.error("[fetchTopicBrief Error]", err);
    return null;
  }
}

async function fetchDictionary(rawWord) {
  const word = (rawWord || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!word) return null;

  try {
    const resp = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`);
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json || !json.length) return null;

    const item = json[0];
    const defs = item.defs || [];
    const parsedDefs = defs.map(d => {
      const parts = d.split("\t");
      return { pos: parts[0] || "n", definition: parts[1] ? parts[1].trim() : d };
    });

    const tags = item.tags || [];
    const pos = tags.filter(t => ["n", "v", "adj", "adv"].includes(t));

    return {
      word: item.word || word,
      pos: pos.length ? pos.join(", ") : (parsedDefs[0] ? parsedDefs[0].pos : "n"),
      definitions: parsedDefs.slice(0, 3)
    };
  } catch (err) {
    console.error("[fetchDictionary Error]", err);
    return null;
  }
}

const SCHOLAR_QUOTES_BANK = [
  {
    quote: "The roots of education are bitter, but the fruit is sweet.",
    author: "Aristotle",
    advice: "Use in Task 2 essays on tertiary education, pedagogical reform, or the dedication required for academic and professional advancement."
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
    const resp = await fetch("https://dummyjson.com/quotes/random", { signal: controller.signal });
    clearTimeout(timer);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.quote && data.author) {
        return {
          quote: data.quote,
          author: data.author,
          advice: "Examine the philosophical premise of this quote. Paraphrase its core thesis into an abstract background thesis or concluding evaluation in IELTS Writing Task 2."
        };
      }
    }
  } catch (e) {
    // Timeout or network error: gracefully fall back to curated bank
  }

  const randomIndex = Math.floor(Math.random() * SCHOLAR_QUOTES_BANK.length);
  return SCHOLAR_QUOTES_BANK[randomIndex];
}

function formatQuotaFooter(quota) {
  if (quota.isVip) {
    return "👑 *VIP Lifetime Pass — Unlimited Daily Access ✨*";
  }
  return `💡 *Free Preview:* *${quota.remaining}/15 remaining today.*\n⭐ *Upgrade to Lifetime VIP (55,000 MMK) for Unlimited Access!*`;
}

function getQuotaExceededKeyboard(env) {
  return {
    inline_keyboard: [
      [{ text: "⭐ Upgrade to Lifetime VIP (55,000 Ks)", callback_data: "info_payment" }],
      [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
    ]
  };
}

function getQuotaExceededMessage() {
  return `⚠️ *DAILY FREE QUOTA LIMIT REACHED (15/15 USED)*
━━━━━━━━━━━━━━━━━━━━
Free tier accounts are allocated 15 Academic AI searches per day.

👑 *Target Band 7.5+ Lifetime Studio VIP Pass (55,000 MMK)*
• ⚡ *UNLIMITED* Academic Collocations (/collocate)
• 💎 *UNLIMITED* Band 8.5+ Synonyms (/syn)
• 📖 *UNLIMITED* Academic Topic Briefs (/read)
• 📚 *UNLIMITED* Live Academic Dictionary (/dict)
• 🧠 *UNLIMITED* Scholar Quotes & Rhetoric (/quote)
• 🔤 All 1,162 Vocabulary items, Audio & 1-3-7 Spaced Repetition
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer
• 💻 Personal Desktop Activation Voucher for PC & Laptop

👇 တစ်သက်တာ အကန့်အသတ်မရှိ VIP အသုံးပြုရန် အောက်ပါခလုတ်ကို နှိပ်ပါ:`;
}

// ------------------------------------------
// Bot Webhook Handlers for Academic Tools
// ------------------------------------------

async function handleToolsMenu(chatId, userId, env, botToken) {
  const user = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(userId).first();
  const isVip = user && user.is_vip === 1;
  const quota = await getQuotaStatus(env, userId, isVip);

  let statusBadge = "";
  if (isVip) {
    statusBadge = "👑 *LIFETIME VIP PASS* (⚡ Unlimited Daily Queries)";
  } else {
    statusBadge = `🆓 *FREE TIER* (${quota.remaining}/15 Queries Remaining Today)`;
  }

  const menuMsg = 
`⚡ *VIP ACADEMIC LEXICON & TOPIC EXPLORER*
━━━━━━━━━━━━━━━━━━━━
📊 *Your Status:* ${statusBadge}

အောက်ပါ Academic AI Tools ခလုတ်များကို နှိပ်ပြီး သင်ရှာလိုသော စာလုံး (သို့) ခေါင်းစဉ်ကို လွတ်လပ်စွာ ရိုက်ထည့်၍ ရှာဖွေနိုင်ပါသည်:

🔗 *Academic Collocations:* သဘာဝကျသော စကားတွဲများ
💎 *Band 8.5+ Synonyms:* အဆင့်မြင့် စာလုံး အစားထိုးစကားလုံးများ
📖 *Academic Topic Briefs:* Task 2 Background ဗဟုသုတများ
📚 *Academic Dictionary:* Formal Definition & Part of Speech
🧠 *Scholar Thought:* Task 2 Essay တွင် ကိုးကားအသုံးချနည်း

👑 *VIP Pass:* တစ်နေ့လျှင် အကန့်အသတ်မရှိ (Unlimited) သုံးနိုင်ပါသည်။
🆓 *Free Tier:* တစ်နေ့လျှင် ၁၅ ကြိမ် စမ်းသပ် အသုံးပြုနိုင်ပါသည်။

👇 စတင်ရှာဖွေရန် အောက်ပါ ခလုတ်များမှ ရွေးချယ်ပါ:`;

  const inlineKeyboard = [
    [
      { text: "🔗 Academic Collocations", callback_data: "ask_tool:collocate" },
      { text: "💎 Band 8.5+ Synonyms", callback_data: "ask_tool:syn" }
    ],
    [
      { text: "📖 Academic Topic Briefs", callback_data: "ask_tool:read" },
      { text: "📚 Academic Dictionary", callback_data: "ask_tool:dict" }
    ],
    [
      { text: "🧠 Scholar Quote", callback_data: "tool_quote" },
      { text: "🌟 Word of the Day", callback_data: "tool_wotd" }
    ],
    [
      { text: "📊 Check My Quota", callback_data: "tool_quota" },
      { text: "🎯 Band Score Scale", callback_data: "tool_bands" }
    ],
    [
      { text: "⏱️ 20m CBT Sprint", callback_data: "sprint:20" },
      { text: "⏱️ 40m Essay Sprint", callback_data: "sprint:40" }
    ],
    [
      { text: isVip ? "👑 VIP Lifetime Active" : "⭐ Upgrade VIP (55,000 Ks)", callback_data: isVip ? "vip_status" : "info_payment" }
    ],
    [
      { text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }
    ]
  ];

  await sendTelegramMessage(botToken, chatId, menuMsg, { inline_keyboard: inlineKeyboard });
}

async function handlePromptForTool(chatId, userId, toolName, env, botToken) {
  try {
    await env.DB.prepare("UPDATE users SET pending_tool = ? WHERE telegram_id = ?").bind(toolName, userId).run();
  } catch (e) {
    console.error("[handlePromptForTool DB Error]", e);
  }

  if (toolName === "collocate") {
    const text = 
`🔗 *ACADEMIC COLLOCATIONS ENGINE*
━━━━━━━━━━━━━━━━━━━━
IELTS Writing & Speaking တွင် Lexical Resource Band 8.5+ အတွက် သဘာဝကျသော စကားတွဲ (Natural Word Pairings) များ ရှာဖွေနိုင်ပါသည်။

✍️ *Collocations ရှာဖွေလိုသော စကားလုံး (Word) ကို ဤ Chat တွင် ရိုက်ပို့ပေးပါ ခင်ဗျာ:*
(ဥပမာ — \`impact\`, \`crucial\`, \`environment\`, \`policy\`)

👇 အောက်ပါ စာလုံးများကိုလည်း 1-Tap ချက်ချင်း စမ်းသပ်နိုင်ပါသည်:`;
    await sendTelegramMessage(botToken, chatId, text, {
      inline_keyboard: [
        [{ text: "🔗 impact", callback_data: "tool_collocate:impact" }, { text: "🔗 crucial", callback_data: "tool_collocate:crucial" }],
        [{ text: "🔗 environment", callback_data: "tool_collocate:environment" }, { text: "🔗 policy", callback_data: "tool_collocate:policy" }],
        [{ text: "⚡ Back to VIP Tools", callback_data: "menu_tools" }]
      ]
    });
  } else if (toolName === "syn") {
    const text = 
`💎 *BAND 8.5+ LEXICAL SYNONYMS*
━━━━━━━━━━━━━━━━━━━━
Writing Task 2 တွင် 'important', 'problem', 'increase' စသည့် စကားလုံးများကို ထပ်ခါတလဲလဲ မသုံးဘဲ Academic Paraphrases များ အသုံးပြုပါ။

✍️ *Synonyms ရှာလိုသော စကားလုံး (Word) ကို ဤ Chat တွင် ရိုက်ပို့ပေးပါ ခင်ဗျာ:*
(ဥပမာ — \`important\`, \`problem\`, \`increase\`, \`crucial\`)

👇 အောက်ပါ စာလုံးများကိုလည်း 1-Tap ချက်ချင်း စမ်းသပ်နိုင်ပါသည်:`;
    await sendTelegramMessage(botToken, chatId, text, {
      inline_keyboard: [
        [{ text: "💎 important", callback_data: "tool_syn:important" }, { text: "💎 problem", callback_data: "tool_syn:problem" }],
        [{ text: "💎 increase", callback_data: "tool_syn:increase" }, { text: "💎 help", callback_data: "tool_syn:help" }],
        [{ text: "⚡ Back to VIP Tools", callback_data: "menu_tools" }]
      ]
    });
  } else if (toolName === "read") {
    const text = 
`📖 *ACADEMIC TOPIC BRIEFS & KNOWLEDGE*
━━━━━━━━━━━━━━━━━━━━
IELTS Writing Task 2 & Speaking Part 3 အတွက် Topic Background Knowledge နှင့် Arguments များ ရယူနိုင်ပါသည်။

✍️ *ဖတ်ရှုလိုသော Essay Topic / ခေါင်းစဉ်ကို ဤ Chat တွင် ရိုက်ပို့ပေးပါ ခင်ဗျာ:*
(ဥပမာ — \`Artificial intelligence\`, \`Climate change\`, \`Urbanization\`)

👇 အောက်ပါ ခေါင်းစဉ်များကိုလည်း 1-Tap ချက်ချင်း စမ်းသပ်နိုင်ပါသည်:`;
    await sendTelegramMessage(botToken, chatId, text, {
      inline_keyboard: [
        [{ text: "📖 AI in Society", callback_data: "tool_read:Artificial intelligence" }, { text: "📖 Climate Change", callback_data: "tool_read:Climate change" }],
        [{ text: "📖 Urbanization", callback_data: "tool_read:Urbanization" }, { text: "📖 Higher Education", callback_data: "tool_read:Higher education" }],
        [{ text: "⚡ Back to VIP Tools", callback_data: "menu_tools" }]
      ]
    });
  } else if (toolName === "dict") {
    const text = 
`📚 *LIVE ACADEMIC DICTIONARY*
━━━━━━━━━━━━━━━━━━━━
IELTS Band 8.5/9.0 Academic Vocabulary ၏ တိကျသော အဓိပ္ပာယ်ဖွင့်ဆိုချက်နှင့် Part of Speech များကို စစ်ဆေးပါ။

✍️ *အဓိပ္ပာယ် ရှာလိုသော စကားလုံး (Word) ကို ဤ Chat တွင် ရိုက်ပို့ပေးပါ ခင်ဗျာ:*
(ဥပမာ — \`ubiquitous\`, \`mitigate\`, \`exacerbate\`, \`unprecedented\`)

👇 အောက်ပါ စာလုံးများကိုလည်း 1-Tap ချက်ချင်း စမ်းသပ်နိုင်ပါသည်:`;
    await sendTelegramMessage(botToken, chatId, text, {
      inline_keyboard: [
        [{ text: "📚 ubiquitous", callback_data: "tool_dict:ubiquitous" }, { text: "📚 mitigate", callback_data: "tool_dict:mitigate" }],
        [{ text: "📚 exacerbate", callback_data: "tool_dict:exacerbate" }, { text: "📚 unprecedented", callback_data: "tool_dict:unprecedented" }],
        [{ text: "⚡ Back to VIP Tools", callback_data: "menu_tools" }]
      ]
    });
  }
}

async function handleCollocateCommand(chatId, userId, rawWord, env, botToken) {
  if (!rawWord) {
    await handlePromptForTool(chatId, userId, "collocate", env, botToken);
    return;
  }

  const user = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(userId).first();
  const isVip = user && user.is_vip === 1;
  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const result = await fetchCollocations(rawWord);
  if (!result || (!result.nounCollocations.length && !result.modifierCollocations.length && !result.triggers.length)) {
    await sendTelegramMessage(botToken, chatId, `⚠️ No academic collocations found for \`${rawWord}\`. Try common academic words like *impact, crucial, policy, environment, education, evidence*.`, {
      inline_keyboard: [
        [{ text: "🔍 Collocate another word", callback_data: "ask_tool:collocate" }],
        [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]
      ]
    });
    return;
  }

  let text = `🔗 *ACADEMIC COLLOCATIONS: "${result.word.toUpperCase()}"*\n━━━━━━━━━━━━━━━━━━━━\n`;

  if (result.pos === "adj") {
    if (result.nounCollocations && result.nounCollocations.length) {
      text += `🔹 *High-Yield Noun Collocations (${result.word} + noun):*\n` +
        result.nounCollocations.map(n => `• *${result.word}* ${n}`).join("\n") + "\n\n";
    }
    if (result.modifierCollocations && result.modifierCollocations.length) {
      text += `🔹 *Adverb Intensifiers (adverb + ${result.word}):*\n` +
        result.modifierCollocations.map(a => `• ${a} *${result.word}*`).join("\n") + "\n\n";
    }
    if (result.sentenceFrames && result.sentenceFrames.length) {
      text += `🔹 *Band 9 Academic Sentence Frames:*\n` +
        result.sentenceFrames.map(f => `• ${f}`).join("\n") + "\n\n";
    }
  } else if (result.pos === "verb") {
    if (result.nounCollocations && result.nounCollocations.length) {
      text += `🔹 *Verb-Object Collocations (${result.word} + noun):*\n` +
        result.nounCollocations.map(n => `• *${result.word}* the ${n}`).join("\n") + "\n\n";
    }
    if (result.modifierCollocations && result.modifierCollocations.length) {
      text += `🔹 *Adverb Modifiers (adverb + ${result.word}):*\n` +
        result.modifierCollocations.map(a => `• ${a} *${result.word}*`).join("\n") + "\n\n";
    }
    if (result.sentenceFrames && result.sentenceFrames.length) {
      text += `🔹 *Band 9 Academic Sentence Frames:*\n` +
        result.sentenceFrames.map(f => `• ${f}`).join("\n") + "\n\n";
    }
  } else {
    // noun
    if (result.modifierCollocations && result.modifierCollocations.length) {
      text += `🔹 *Adjective Collocations (adjective + ${result.word}):*\n` +
        result.modifierCollocations.map(a => `• ${a} *${result.word}*`).join("\n") + "\n\n";
    }
    if (result.nounCollocations && result.nounCollocations.length) {
      text += `🔹 *Compound Noun Collocations (${result.word} + noun):*\n` +
        result.nounCollocations.map(n => `• *${result.word}* ${n}`).join("\n") + "\n\n";
    }
    if (result.verbCollocations && result.verbCollocations.length) {
      text += `🔹 *High-Scoring Verb Collocations:*\n` +
        result.verbCollocations.map(v => `• ${v}`).join("\n") + "\n\n";
    }
    if (result.triggers && result.triggers.length) {
      text += `🔹 *Thematic Associations:*\n` +
        result.triggers.map(t => `_${t}_`).join(", ") + "\n\n";
    }
  }

  text += `💡 *Band 8.5 Tip:*
Always pair words with natural academic collocations to demonstrate fluent, native lexical resource under IELTS criteria.

${formatQuotaFooter(quota)}`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "🔍 Collocate another word", callback_data: "ask_tool:collocate" },
        { text: `💎 Synonyms for "${result.word}"`, callback_data: `tool_syn:${result.word}` }
      ],
      [
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" },
        { text: "🚀 Open Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }
      ]
    ]
  });
}

async function handleSynCommand(chatId, userId, rawWord, env, botToken) {
  if (!rawWord) {
    await handlePromptForTool(chatId, userId, "syn", env, botToken);
    return;
  }

  const user = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(userId).first();
  const isVip = user && user.is_vip === 1;
  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const result = await fetchSynonyms(rawWord);
  if (!result || !result.synonyms.length) {
    await sendTelegramMessage(botToken, chatId, `⚠️ No synonyms found for \`${rawWord}\`. Try common essay words like *important, decrease, advantageous, negative*.`, {
      inline_keyboard: [
        [{ text: "🔍 Search another synonym", callback_data: "ask_tool:syn" }],
        [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]
      ]
    });
    return;
  }

  let text = `💎 *BAND 8.5+ SYNONYMS FOR: "${result.word.toUpperCase()}"*\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🎯 *Academic Substitutes:*\n` + result.synonyms.map(s => `• *${s}*`).join("\n") + "\n\n";
  if (result.specific && result.specific.length) {
    text += `📌 *Specialized Sub-types:*\n` + result.specific.map(s => `• ${s}`).join("\n") + "\n\n";
  }

  text += `💡 *Lexical Flexibility Warning:*
Do not mechanically substitute words. Ensure the synonym matches the formality and context of your academic sentence.

${formatQuotaFooter(quota)}`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "🔍 Find more synonyms", callback_data: "ask_tool:syn" },
        { text: `🔗 Collocations for "${result.word}"`, callback_data: `tool_collocate:${result.word}` }
      ],
      [
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" },
        { text: "🚀 Open Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }
      ]
    ]
  });
}

async function handleReadCommand(chatId, userId, rawTopic, env, botToken) {
  if (!rawTopic) {
    await handlePromptForTool(chatId, userId, "read", env, botToken);
    return;
  }

  const user = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(userId).first();
  const isVip = user && user.is_vip === 1;
  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const result = await fetchTopicBrief(rawTopic);
  if (!result || !result.extract) {
    await sendTelegramMessage(botToken, chatId, `⚠️ Could not find an academic summary for \`${rawTopic}\`. Try broad IELTS topics like *Renewable energy, Globalization, Automation, Mental health*.`, {
      inline_keyboard: [
        [{ text: "📖 Read another topic", callback_data: "ask_tool:read" }],
        [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]
      ]
    });
    return;
  }

  const text = 
`📖 *ACADEMIC TOPIC BRIEF: "${result.title}"*
━━━━━━━━━━━━━━━━━━━━
${result.extract}

🎯 *IELTS Writing & Speaking Application:*
• *Key Angles:* Consider socioeconomic ramifications, statutory regulations, and intergenerational impacts.
• *Reference:* [Open Wikipedia Article](${result.url})

${formatQuotaFooter(quota)}`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "📖 Read another topic", callback_data: "ask_tool:read" },
        { text: "🌐 Open Wikipedia ↗", url: result.url }
      ],
      [
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" },
        { text: "🚀 Open Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }
      ]
    ]
  });
}

async function handleDictCommand(chatId, userId, rawWord, env, botToken) {
  if (!rawWord) {
    await handlePromptForTool(chatId, userId, "dict", env, botToken);
    return;
  }

  const user = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(userId).first();
  const isVip = user && user.is_vip === 1;
  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const result = await fetchDictionary(rawWord);
  if (!result || !result.definitions.length) {
    await sendTelegramMessage(botToken, chatId, `⚠️ No definitions found for \`${rawWord}\`. Try academic terms like *deleterious, ubiquitous, comprehensive, viable*.`, {
      inline_keyboard: [
        [{ text: "📚 Look up another word", callback_data: "ask_tool:dict" }],
        [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]
      ]
    });
    return;
  }

  let text = `📚 *LIVE ACADEMIC DICTIONARY: "${result.word.toUpperCase()}"*\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏷️ *Part of Speech:* _${result.pos}_\n\n`;
  text += `📖 *Formal Definitions:*\n` + result.definitions.map((d, i) => `${i + 1}. *(${d.pos})* ${d.definition}`).join("\n\n") + "\n\n";
  text += `💡 *Academic Application:*
Ensure proper collocation and preposition usage when integrating into your Task 2 essay.

${formatQuotaFooter(quota)}`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "📚 Look up another word", callback_data: "ask_tool:dict" },
        { text: `🔗 Collocations`, callback_data: `tool_collocate:${result.word}` }
      ],
      [
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }
      ]
    ]
  });
}

async function handleQuoteCommand(chatId, userId, env, botToken) {
  const user = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(userId).first();
  const isVip = user && user.is_vip === 1;
  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const quote = await fetchScholarQuote();
  const text = 
`🧠 *SCHOLAR THOUGHT & RHETORIC*
━━━━━━━━━━━━━━━━━━━━
❝ *${quote.quote}* ❞
— *${quote.author}*

✍️ *IELTS Task 2 Application:*
${quote.advice}

${formatQuotaFooter(quota)}`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [{ text: "🔄 Another Quote ⏭️", callback_data: "tool_quote" }],
      [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }, { text: "🚀 Launch Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
    ]
  });
}

async function handleQuotaCheck(chatId, userId, env, botToken) {
  const user = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(userId).first();
  const isVip = user && user.is_vip === 1;
  const quota = await getQuotaStatus(env, userId, isVip);

  const text = 
`📊 *YOUR DAILY ACADEMIC AI TOOL QUOTA*
━━━━━━━━━━━━━━━━━━━━
👤 *Telegram ID:* \`${userId}\`
👑 *Tier Status:* ${isVip ? "👑 *LIFETIME VIP PASS (Active)*" : "🆓 *FREE TIER*"}

${isVip ? 
  "✨ *Unlimited Daily Queries Activated!*\nYou have lifetime unrestricted access to all academic collocations, synonyms, topic briefs, dictionary queries, and scholar quotes." 
  : 
  `📅 *Today's Quota (${getYangonDateStr()} MMT):*\n• Used Today: *${quota.count} / ${quota.limit}*\n• Remaining Today: *${quota.remaining} queries*\n\n⭐ *Upgrade to Lifetime VIP (55,000 MMK)* for unlimited queries, all 1,162 vocabulary items, 23 CBT reading passages, and 40 writing models!`
}`;

  const buttons = [];
  if (!isVip) {
    buttons.push([{ text: "⭐ Upgrade to Lifetime VIP (55,000 Ks)", callback_data: "info_payment" }]);
  }
  buttons.push([{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]);

  await sendTelegramMessage(botToken, chatId, text, { inline_keyboard: buttons });
}

const ACADEMIC_WOTD_BANK = [
  {
    word: "ubiquitous",
    pos: "adjective",
    ipa: "/juːˈbɪk.wɪ.təs/",
    mm: "နေရာအနှံ့အပြားတွင် တွေ့ရှိရသော / အလွန်ပျံ့နှံ့နေသော",
    collocations: ["ubiquitous presence", "become ubiquitous", "ubiquitous technology"],
    example: "Smartphones have become so ubiquitous that their pervasive influence on social interactions cannot be overlooked."
  },
  {
    word: "mitigate",
    pos: "verb",
    ipa: "/ˈmɪt.ɪ.ɡeɪt/",
    mm: "သက်သာလျော့ပါးစေသည် / ဆိုးကျိုးကို နည်းပါးစေသည်",
    collocations: ["mitigate adverse effects", "mitigate environmental damage", "mitigate risks"],
    example: "Governments must implement stringent carbon tariffs to mitigate the catastrophic repercussions of climate change."
  },
  {
    word: "exacerbate",
    pos: "verb",
    ipa: "/ɪɡˈzæs.ə.beɪt/",
    mm: "ပိုမိုဆိုးရွားစေသည် / အခြေအနေ ပိုမိုတင်းမာစေသည်",
    collocations: ["exacerbate the problem", "exacerbate existing inequalities", "severely exacerbate"],
    example: "Unplanned urban sprawl threatens to exacerbate traffic congestion and air pollution in metropolitan areas."
  },
  {
    word: "paramount",
    pos: "adjective",
    ipa: "/ˈpær.ə.maʊnt/",
    mm: "အရေးအကြီးဆုံးသော / ထိပ်တန်းဦးစားပေးဖြစ်သော",
    collocations: ["of paramount importance", "paramount consideration", "paramount duty"],
    example: "Ensuring equitable access to primary education is of paramount importance for long-term economic development."
  },
  {
    word: "pervasive",
    pos: "adjective",
    ipa: "/pəˈveɪ.sɪv/",
    mm: "အလွှာစုံသို့ ထိုးဖောက်ပျံ့နှံ့နေသော",
    collocations: ["pervasive influence", "pervasive problem", "pervasive nature"],
    example: "The pervasive influence of mass media plays a transformative role in shaping youthful attitudes."
  },
  {
    word: "scrutinize",
    pos: "verb",
    ipa: "/ˈskruː.tɪ.naɪz/",
    mm: "အသေအချာ စိစစ်ဝေဖန်လေ့လာသည်",
    collocations: ["carefully scrutinize", "scrutinize empirical evidence", "scrutinize policy outcomes"],
    example: "Policymakers must meticulously scrutinize proposed infrastructure projects before allocating fiscal budgets."
  },
  {
    word: "detrimental",
    pos: "adjective",
    ipa: "/ˌdet.rɪˈmen.təl/",
    mm: "ထိခိုက်နစ်နာစေသော / အန္တရာယ်ရှိသော",
    collocations: ["detrimental impact", "detrimental effect on health", "prove detrimental"],
    example: "Excessive exposure to digital screens can exert a highly detrimental impact on cognitive development."
  },
  {
    word: "imperative",
    pos: "adjective / noun",
    ipa: "/ɪmˈper.ə.tɪv/",
    mm: "မဖြစ်မနေ လုပ်ဆောင်ရမည့် တာဝန် / မရှိမဖြစ် အရေးကြီးသော",
    collocations: ["moral imperative", "economic imperative", "it is imperative that"],
    example: "It is imperative that international organizations collaborate to protect biodiversity in vulnerable ecosystems."
  },
  {
    word: "feasible",
    pos: "adjective",
    ipa: "/ˈfiː.zə.bəl/",
    mm: "လက်တွေ့ဖြစ်နိုင်ခြေရှိသော / အကောင်အထည်ဖော်နိုင်သော",
    collocations: ["economically feasible", "technically feasible", "a feasible alternative"],
    example: "Transitioning toward renewable energy represents the only economically feasible trajectory for sustainable development."
  },
  {
    word: "unprecedented",
    pos: "adjective",
    ipa: "/ʌnˈpres.ɪ.den.tɪd/",
    mm: "တစ်ခါမှ မကြုံစဖူးသော / အဆမတန်များပြားသော",
    collocations: ["unprecedented scale", "unprecedented challenge", "grow at an unprecedented rate"],
    example: "The proliferation of artificial intelligence presents society with unprecedented legal and ethical quandaries."
  }
];

async function handleWotdCommand(chatId, userId, env, botToken) {
  const user = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(userId).first();
  const isVip = user && user.is_vip === 1;
  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const wotd = ACADEMIC_WOTD_BANK[dayOfYear % ACADEMIC_WOTD_BANK.length];

  const text = 
`🌟 *BAND 8.5+ ACADEMIC WORD OF THE DAY*
━━━━━━━━━━━━━━━━━━━━
🔤 *${wotd.word.toUpperCase()}* \`${wotd.ipa}\`
🏷️ *Part of Speech:* _${wotd.pos}_
🇲🇲 *Meaning:* ${wotd.mm}

🔗 *Key Collocations:*
${wotd.collocations.map(c => `• *${c}*`).join("\n")}

✍️ *IELTS Band 9.0 Exam Example:*
"${wotd.example}"

${formatQuotaFooter(quota)}`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "🔗 Collocations", callback_data: `tool_collocate:${wotd.word}` },
        { text: "💎 Synonyms", callback_data: `tool_syn:${wotd.word}` }
      ],
      [
        { text: "📚 Dictionary", callback_data: `tool_dict:${wotd.word}` },
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }
      ]
    ]
  });
}

async function handleBandsCommand(chatId, botToken) {
  const text = 
`🎯 *IELTS BAND SCORE CONVERSION & ASSESSMENT RUBRIC*
━━━━━━━━━━━━━━━━━━━━
📊 *Raw Score to Band Conversion (Listening & Academic Reading — 40 Questions):*
• Band 9.0: 39 – 40 correct
• Band 8.5: 37 – 38 correct
• Band 8.0: 35 – 36 correct
• Band 7.5: 33 – 34 correct
• Band 7.0: 30 – 32 correct
• Band 6.5: 27 – 29 correct
• Band 6.0: 23 – 26 correct
• Band 5.5: 19 – 22 correct

✍️ *Writing 4 Core Criteria (25% each):*
1. **Task Achievement (Task 1) / Task Response (Task 2)** — Fully address all prompt parts with supported evidence.
2. **Coherence & Cohesion** — Logical progression, cohesive devices, proper paragraphing.
3. **Lexical Resource** — Wide academic vocabulary, precise collocations, rare spelling slips.
4. **Grammatical Range & Accuracy** — Complex sentence structures, varied clauses, accurate punctuation.

🗣️ *Speaking 4 Core Criteria (25% each):*
1. **Fluency & Coherence** — Natural speech flow, minimal hesitation, clear discourse markers.
2. **Lexical Resource** — Idiomatic expressions, flexible vocabulary range.
3. **Grammatical Range & Accuracy** — Varied verb tenses, conditionals, complex grammar.
4. **Pronunciation** — Clear intonation, stress patterns, easy to understand.`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "📋 IELTS Exam Format", callback_data: "tool_format" },
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }
      ]
    ]
  });
}

async function handleFormatCommand(chatId, botToken) {
  const text = 
`📋 *IELTS ACADEMIC TEST FORMAT CHEAT SHEET*
━━━━━━━━━━━━━━━━━━━━
🎧 *1. Listening (approx. 30 mins + 2 mins review CBT / 10 mins Paper)*
• 4 Sections, 40 Questions (Played ONCE only)
• Section 1: Everyday social dialogue (2 speakers)
• Section 2: Everyday social monologue (1 speaker)
• Section 3: Academic/educational discussion (up to 4 speakers)
• Section 4: University academic lecture (1 speaker)

📖 *2. Reading (60 mins — No transfer time!)*
• 3 Passages, 40 Questions (~2,150–2,750 words total)
• Passage 1: Descriptive / Factual
• Passage 2: Analytical / Discursive
• Passage 3: Complex argument / Academic theory

✍️ *3. Writing (60 mins total)*
• Task 1: Visual Data Report (Graph, Chart, Table, Map) — min 150 words (20 mins, 33% weight)
• Task 2: Formal Academic Essay (Opinion, Discussion, Problem-Solution) — min 250 words (40 mins, 66% weight)

🗣️ *4. Speaking (11 – 14 mins face-to-face or video call)*
• Part 1: Introduction & familiar topics (4–5 mins)
• Part 2: Long turn Cue Card monologue (1 min prep, 1–2 mins speech)
• Part 3: Abstract academic discussion (4–5 mins)`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "🎯 Band Score Scale", callback_data: "tool_bands" },
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }
      ]
    ]
  });
}

async function handleSprintCommand(chatId, rawText, botToken) {
  const match = (rawText || "").match(/\d+/);
  const mins = match ? parseInt(match[0], 10) : 20;

  const text = 
`⏱️ *IELTS FOCUS SPRINT STARTED (${mins} MINUTES)*
━━━━━━━━━━━━━━━━━━━━
🎯 *Sprint Goal:*
${mins <= 20 ? 
  "📖 **CBT Reading Sprint:** Complete 1 Cambridge passage (13–14 questions) in 20 minutes under strict exam conditions!" : 
  "✍️ **Writing Task 2 Sprint:** Plan and draft a full 250+ word academic essay in 40 minutes without stopping!"}

💡 *Pro Tip:*
Put your phone on Do Not Disturb, silence all social notifications, and immerse yourself in the task.

👇 Mini App တွင် ချက်ချင်း လေ့ကျင့်ရန်:`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "⏱️ 20m CBT Reading Sprint", callback_data: "sprint:20" },
        { text: "⏱️ 40m Writing Sprint", callback_data: "sprint:40" }
      ],
      [
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }
      ]
    ]
  });
}

// ------------------------------------------
// HTTP API Handlers for Web App
// ------------------------------------------

async function handleApiCollocations(request, env, url) {
  const word = url.searchParams.get("word") || "";
  if (!word) return jsonResponse({ success: false, error: "Query parameter 'word' is required." }, 400);

  const tgId = getClientIdentifier(request, url, url.searchParams.get("telegram_id"));
  const voucher = url.searchParams.get("code") || url.searchParams.get("voucher") || "";
  const isVip = await resolveIsVip(env, tgId, voucher);

  const quota = await checkAndConsumeQuota(env, tgId, isVip);
  if (!quota.allowed) {
    return jsonResponse({
      success: false,
      error: "Daily free quota limit reached (15/15). Upgrade to Lifetime VIP (55,000 MMK) for unlimited queries.",
      quota
    }, 429);
  }

  const data = await fetchCollocations(word);
  return jsonResponse({ success: true, quota, data });
}

async function handleApiSynonyms(request, env, url) {
  const word = url.searchParams.get("word") || "";
  if (!word) return jsonResponse({ success: false, error: "Query parameter 'word' is required." }, 400);

  const tgId = getClientIdentifier(request, url, url.searchParams.get("telegram_id"));
  const voucher = url.searchParams.get("code") || url.searchParams.get("voucher") || "";
  const isVip = await resolveIsVip(env, tgId, voucher);

  const quota = await checkAndConsumeQuota(env, tgId, isVip);
  if (!quota.allowed) {
    return jsonResponse({
      success: false,
      error: "Daily free quota limit reached (15/15). Upgrade to Lifetime VIP (55,000 MMK) for unlimited queries.",
      quota
    }, 429);
  }

  const data = await fetchSynonyms(word);
  return jsonResponse({ success: true, quota, data });
}

async function handleApiTopic(request, env, url) {
  const topic = url.searchParams.get("topic") || "";
  if (!topic) return jsonResponse({ success: false, error: "Query parameter 'topic' is required." }, 400);

  const tgId = getClientIdentifier(request, url, url.searchParams.get("telegram_id"));
  const voucher = url.searchParams.get("code") || url.searchParams.get("voucher") || "";
  const isVip = await resolveIsVip(env, tgId, voucher);

  const quota = await checkAndConsumeQuota(env, tgId, isVip);
  if (!quota.allowed) {
    return jsonResponse({
      success: false,
      error: "Daily free quota limit reached (15/15). Upgrade to Lifetime VIP (55,000 MMK) for unlimited queries.",
      quota
    }, 429);
  }

  const data = await fetchTopicBrief(topic);
  return jsonResponse({ success: true, quota, data });
}

async function handleApiDict(request, env, url) {
  const word = url.searchParams.get("word") || "";
  if (!word) return jsonResponse({ success: false, error: "Query parameter 'word' is required." }, 400);

  const tgId = getClientIdentifier(request, url, url.searchParams.get("telegram_id"));
  const voucher = url.searchParams.get("code") || url.searchParams.get("voucher") || "";
  const isVip = await resolveIsVip(env, tgId, voucher);

  const quota = await checkAndConsumeQuota(env, tgId, isVip);
  if (!quota.allowed) {
    return jsonResponse({
      success: false,
      error: "Daily free quota limit reached (15/15). Upgrade to Lifetime VIP (55,000 MMK) for unlimited queries.",
      quota
    }, 429);
  }

  const data = await fetchDictionary(word);
  return jsonResponse({ success: true, quota, data });
}

async function handleApiQuote(request, env, url) {
  const tgId = getClientIdentifier(request, url, url.searchParams.get("telegram_id"));
  const voucher = url.searchParams.get("code") || url.searchParams.get("voucher") || "";
  const isVip = await resolveIsVip(env, tgId, voucher);

  const quota = await checkAndConsumeQuota(env, tgId, isVip);
  if (!quota.allowed) {
    return jsonResponse({
      success: false,
      error: "Daily free quota limit reached (15/15). Upgrade to Lifetime VIP (55,000 MMK) for unlimited queries.",
      quota
    }, 429);
  }

  const data = await fetchScholarQuote();
  return jsonResponse({ success: true, quota, data });
}

async function handleApiQuota(request, env, url) {
  const tgId = getClientIdentifier(request, url, url.searchParams.get("telegram_id"));
  const voucher = url.searchParams.get("code") || url.searchParams.get("voucher") || "";
  const isVip = await resolveIsVip(env, tgId, voucher);
  const quota = await getQuotaStatus(env, tgId, isVip);
  return jsonResponse({ success: true, quota });
}



