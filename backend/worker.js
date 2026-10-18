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

      if (url.pathname === "/webhook" && request.method === "POST") {
        return await handleWebhook(request, env);
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
async function handleWebhook(request, env) {
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
    const text = (msg.text || "").trim();

    // 1. /start command
    if (text === "/start" || text.startsWith("/start vip_55k")) {
      const welcomeText = 
`🇲🇲 *Welcome to IELTS Prep Studio (@${env.BOT_USERNAME || "IELTSPrepStudioBot"})!*

🎯 *Cambridge CBT Mocks • Band 8.5/9.0 Lexicon • Task 1 & 2 Models*
Study anytime with 0-latency, offline support, and interactive audio.

👑 *Target Band 7.5+ Lifetime Studio VIP Pass (55,000 MMK)*
• All 1,162 Vocabulary Items, Traps & 1-3-7 Day SRS
• All 23 Reading CBT Passages (231 Questions) with Burmese citations
• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer
• All 30 Speaking Forecast Topics & 5 Frameworks
• Automatic Cross-Device Cloud Sync

💳 *Payment Information:*
• KBZPay / WavePay: \`${env.PAYMENT_PHONE || "09-768691939"}\`
• Account Name: *${env.ACCOUNT_NAME || "Lyan Htet"}*
• Amount: *55,000 MMK* (One-Time Lifetime)

📸 *To Activate VIP:*
Transfer 55,000 MMK and *send your payment slip screenshot directly to this chat*. Our admin will approve your lifetime access immediately!`;

      await sendTelegramMessage(botToken, chatId, welcomeText, {
        inline_keyboard: [
          [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }],
          [{ text: "💳 How to Pay (55,000 MMK)", callback_data: "info_payment" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 2. Admin Command: /gen_codes <count>
    if (text.startsWith("/gen_codes") && String(msg.from.id) === String(adminId)) {
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

    // 3. Student Photo Submission (Payment Receipt Slip)
    if (msg.photo && msg.photo.length > 0) {
      const highestPhoto = msg.photo[msg.photo.length - 1];
      const fileId = highestPhoto.file_id;
      const caption = msg.caption || "";

      // Record pending payment in D1
      const insertResult = await env.DB.prepare(`
        INSERT INTO payments (telegram_id, username, file_id, caption_note, amount_mmk, status, created_at)
        VALUES (?, ?, ?, ?, 55000, 'pending', unixepoch())
      `).bind(msg.from.id, msg.from.username || "", fileId, caption).run();

      const paymentId = insertResult.meta ? insertResult.meta.last_row_id : "pending";

      // Acknowledge receipt to student
      await sendTelegramMessage(botToken, chatId,
`✅ *ငွေလွှဲစလစ် လက်ခံရရှိပါသည်!*
Screenshot received! Our admin is verifying your 55,000 MMK payment.

Your Lifetime VIP Pass will unlock shortly. You will receive an instant notification here once approved! 👑`
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
  }

  // B. Callback Query handler (Admin 1-Tap Actions)
  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || "";

    // Info payment button
    if (data === "info_payment") {
      await answerCallbackQuery(botToken, cb.id, "KBZPay / WavePay: 09-768691939 (Lyan Htet)");
      return jsonResponse({ ok: true });
    }

    // Admin Approval & Rejection
    if (String(cb.from.id) === String(adminId)) {
      if (data.startsWith("approve:")) {
        const [, targetTgId, paymentId] = data.split(":");
        const numTgId = parseInt(targetTgId, 10);

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

        await answerCallbackQuery(botToken, cb.id, "✅ User upgraded to Lifetime VIP!");
        
        // Notify Student
        await sendTelegramMessage(botToken, numTgId,
`🎉 *Congratulations! Your Lifetime VIP Pass is ACTIVE!*

Your 55,000 MMK payment has been verified.
All 1,162 Vocabulary items, 23 Cambridge Reading CBT Passages, 40 Writing Models, and Speaking Forecasts are now unlocked forever! 🚀`,
          {
            inline_keyboard: [
              [{ text: "👑 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
            ]
          }
        );

        return jsonResponse({ ok: true });
      }

      if (data.startsWith("reject:")) {
        const [, targetTgId, paymentId] = data.split(":");
        if (paymentId && paymentId !== "pending") {
          await env.DB.prepare("UPDATE payments SET status = 'rejected' WHERE id = ?").bind(paymentId).run();
        }

        await answerCallbackQuery(botToken, cb.id, "Payment marked as rejected.");
        await sendTelegramMessage(botToken, parseInt(targetTgId, 10),
`⚠️ *Payment Verification Notice*
We were unable to verify your 55,000 MMK transaction slip. Please ensure the transaction ID is clearly visible and resend the screenshot, or contact support.`
        );
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

    for (const row of results) {
      const msg = `🔔 *Daily IELTS SRS Reminder*\nYou have *${row.srs_due_count}* vocabulary items due for spaced repetition review today! Keep your memory retention at Band 8.5+ 🎯`;
      await sendTelegramMessage(botToken, row.telegram_id, msg, {
        inline_keyboard: [
          [{ text: "🧠 Review SRS Cards Now", web_app: { url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" } }]
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
