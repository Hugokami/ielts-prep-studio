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
          [{ text: "🌐 Open in Web Browser (Full Desktop) ↗", url: env.STUDIO_WEB_URL || "https://hugokami.github.io/ielts-prep-studio/" }],
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

    // 2b. Admin Command: /stats or /admin
    if ((text === "/stats" || text === "/admin") && String(msg.from.id) === String(adminId)) {
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
• \`/gen_codes 10\` — Generate 10 Lifetime codes
• \`/lookup <id or username>\` — Search student profile
• \`/vip <id> on/off\` — Toggle VIP for user`;

      await sendTelegramMessage(botToken, chatId, statsMsg);
      return jsonResponse({ ok: true });
    }

    // 2c. Admin Command: /lookup <username_or_id>
    if (text.startsWith("/lookup") && String(msg.from.id) === String(adminId)) {
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

      const profileMsg = 
`👤 *STUDENT PROFILE*
• Name: *${user.first_name || "N/A"}*
• Username: @${user.username || "None"}
• Telegram ID: \`${user.telegram_id}\`
• Status: *${isVip ? "👑 VIP PASS (Lifetime)" : "🆓 Free Tier"}*
• VIP Activated: ${vipDate}
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

    // 2d. Admin Command: /vip <id> on/off
    if (text.startsWith("/vip ") && String(msg.from.id) === String(adminId)) {
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
