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

      if (url.pathname === "/api/create-stars-invoice" && request.method === "POST") {
        return await handleCreateStarsInvoice(request, env);
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



      if (url.pathname === "/api/tools/podcast" || url.pathname === "/api/tools/podcasts") {
        const chan = resolvePodcastChannel(url.searchParams.get("channel") || url.searchParams.get("show") || url.searchParams.get("q") || "ielts");
        const eps = await fetchLatestPodcastEpisodes(chan);
        return jsonResponse({
          ok: true,
          channel: chan,
          info: PODCAST_CHANNELS[chan],
          episodes: eps
        });
      }

      if (url.pathname === "/api/ai/chat" && request.method === "POST") {
        return await handleAiChat(request, env);
      }

      if (url.pathname === "/api/health") {
        return jsonResponse({ status: "ok", time: new Date().toISOString() });
      }

      if ((url.pathname === "/api/telegram-avatar" || url.pathname === "/api/avatar") && request.method === "GET") {
        return await handleTelegramAvatar(request, env);
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


async function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b))
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

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
// CRYPTOGRAPHIC HELPERS & SESSION TOKENS
// ==========================================
async function sha256Hex(str) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return atob(b64);
}

async function createSessionToken(payload, secretKeyStr) {
  const enc = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + (30 * 86400) }; // 30-day token
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKeyStr || "ips-default-signing-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const signature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureBytes)));
  return `${data}.${signature}`;
}

async function verifySessionToken(token, secretKeyStr) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secretKeyStr || "ips-default-signing-secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = Uint8Array.from(base64UrlDecode(signature), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(data));
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch (e) {
    return null;
  }
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
  let vipExpiresAt = 0;
  if (existing) {
    isVip = existing.is_vip || 0;
    vipExpiresAt = existing.vip_expires_at || 0;
    if (isVip === 1 && vipExpiresAt > 0 && Date.now() > vipExpiresAt) {
      isVip = 0;
      await env.DB.prepare("UPDATE users SET is_vip = 0, updated_at = unixepoch() WHERE telegram_id = ?").bind(user.id).run();
    }
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
    vipExpiresAt: vipExpiresAt,
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
  const authHeader = request.headers.get("Authorization") || "";
  const { initData, progress, srsDueCount, deviceId, voucher, telegramId: bodyTgId } = body || {};

  let telegramId = 0;
  let username = "";
  let firstName = "";
  let isVip = false;

  const signingKey = env.SESSION_SIGNING_KEY || env.BOT_TOKEN || "ips-secret-key-2026";

  // 1. Verify Telegram WebApp initData
  if (initData) {
    const user = await verifyTelegramInitData(initData, env.BOT_TOKEN);
    if (user && user.id) {
      telegramId = user.id;
      username = user.username || "";
      firstName = user.first_name || "";
    }
  } else if (bodyTgId && typeof bodyTgId === "number") {
    telegramId = bodyTgId;
  }

  // 2. Verify Bearer session token
  let sessionPayload = null;
  if (authHeader.startsWith("Bearer ")) {
    sessionPayload = await verifySessionToken(authHeader.slice(7), signingKey);
    if (sessionPayload && sessionPayload.tier === "vip") {
      isVip = true;
    }
  }

  // Admin override
  const adminId = env.ADMIN_TG_ID || env.ADMIN_CHAT_ID || "";
  if (telegramId && adminId && String(telegramId) === String(adminId)) {
    isVip = true;
  }

  // Query D1 user record
  let userRow = null;
  let vipExpiresAt = 0;
  let savedProgress = null;

  if (telegramId) {
    userRow = await env.DB.prepare("SELECT is_vip, vip_expires_at, progress_json FROM users WHERE telegram_id = ?").bind(telegramId).first();
    if (userRow && userRow.is_vip === 1) {
      vipExpiresAt = userRow.vip_expires_at || 0;
      if (vipExpiresAt > 0 && Date.now() > vipExpiresAt) {
        // Expired 7-day pass
        isVip = false;
        await env.DB.prepare("UPDATE users SET is_vip = 0 WHERE telegram_id = ?").bind(telegramId).run();
      } else {
        isVip = true;
      }
    }
    if (userRow && userRow.progress_json) {
      try { savedProgress = JSON.parse(userRow.progress_json); } catch (e) {}
    }
  }

  // Multi-tier cloud persistence: D1 for Telegram + KV for voucher/deviceId
  const cleanVoucher = voucher ? String(voucher).trim().toUpperCase() : "";
  const cleanDeviceId = deviceId ? String(deviceId).trim() : "";
  const progressJson = progress ? JSON.stringify(progress) : null;
  const dueCount = typeof srsDueCount === "number" ? srsDueCount : 0;

  if (telegramId) {
    if (progressJson) {
      await env.DB.prepare(`
        INSERT INTO users (telegram_id, username, first_name, srs_due_count, progress_json, updated_at)
        VALUES (?, ?, ?, ?, ?, unixepoch())
        ON CONFLICT(telegram_id) DO UPDATE SET
          username = CASE WHEN excluded.username != '' THEN excluded.username ELSE users.username END,
          first_name = CASE WHEN excluded.first_name != '' THEN excluded.first_name ELSE users.first_name END,
          srs_due_count = excluded.srs_due_count,
          progress_json = excluded.progress_json,
          updated_at = unixepoch()
      `).bind(telegramId, username, firstName, dueCount, progressJson).run();
      if (env.VIP_KV) {
        try { await env.VIP_KV.put("SYNC_TG_" + telegramId, progressJson, { expirationTtl: 86400 * 90 }); } catch (e) {}
      }
    }
  } else {
    // Non-Telegram / Web / BYOK cloud sync via KV
    if (env.VIP_KV) {
      const syncKey = cleanVoucher ? ("SYNC_VCH_" + cleanVoucher) : (cleanDeviceId ? ("SYNC_DEV_" + cleanDeviceId) : null);
      if (syncKey) {
        if (progressJson) {
          try { await env.VIP_KV.put(syncKey, progressJson, { expirationTtl: 86400 * 90 }); } catch (e) {}
        } else if (!savedProgress) {
          try {
            const kvSaved = await env.VIP_KV.get(syncKey, "json");
            if (kvSaved) savedProgress = kvSaved;
          } catch (e) {}
        }
      }
    }
  }

  // Issue signed session token for VIP users
  let sessionToken = null;
  if (isVip) {
    sessionToken = await createSessionToken({ sub: telegramId || "vip-desktop", tier: "vip" }, signingKey);
  }

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
    telegramId: telegramId || null,
    isVip: !!isVip,
    vipExpiresAt: vipExpiresAt,
    sessionToken: sessionToken,
    savedProgress: savedProgress,
    vipData: vipData
  });
}


// ==========================================
// 4. API: POST /api/redeem-code
// ==========================================
async function handleRedeemCode(request, env) {
  const body = await request.json();
  const { initData, code, deviceId } = body || {};

  const cleanCode = (code || "").trim().toUpperCase();
  if (!cleanCode) {
    return jsonResponse({ success: false, error: "Voucher code is required" }, 400);
  }

  const codeHash = await sha256Hex(cleanCode);
  const devId = (deviceId || "web-client").trim().slice(0, 64);
  const nowMs = Date.now();
  const bonusMs = 7 * 24 * 60 * 60 * 1000;
  let isSprint = cleanCode.includes("SPRINT");

  // 1. Check in vouchers table
  let voucher = await env.DB.prepare("SELECT * FROM vouchers WHERE code_hash = ?").bind(codeHash).first();

  // Backward-compat check in promo_codes table
  let legacyPromo = null;
  if (!voucher) {
    legacyPromo = await env.DB.prepare("SELECT * FROM promo_codes WHERE code = ?").bind(cleanCode).first();
    if (legacyPromo) {
      if (legacyPromo.plan_type === "sprint") isSprint = true;
      const expAt = isSprint ? (nowMs + bonusMs) : 0;
      await env.DB.prepare("INSERT OR IGNORE INTO vouchers (code_hash, tier, max_devices, revoked, created_at, expires_at) VALUES (?, ?, 3, 0, unixepoch(), ?)").bind(codeHash, isSprint ? "sprint" : "vip", expAt).run();
      voucher = { code_hash: codeHash, tier: isSprint ? "sprint" : "vip", max_devices: 3, revoked: 0, expires_at: expAt };
    }
  }

  if (!voucher || voucher.revoked === 1) {
    return jsonResponse({ success: false, error: "Invalid, expired, or revoked voucher code." }, 400);
  }

  if (voucher.tier === "sprint") isSprint = true;

  // Check voucher expiration if any
  if (voucher.expires_at && voucher.expires_at > 0 && nowMs > voucher.expires_at) {
    return jsonResponse({ success: false, error: "This 7-Day Sprint Pass has expired." }, 400);
  }

  const vipExpiresAt = isSprint ? (nowMs + bonusMs) : 0;

  // 2. Multi-device tracking in voucher_devices table (max 3 devices)
  const existingDev = await env.DB.prepare("SELECT * FROM voucher_devices WHERE code_hash = ? AND device_id = ?").bind(codeHash, devId).first();
  if (!existingDev) {
    const countRes = await env.DB.prepare("SELECT COUNT(*) as dev_count FROM voucher_devices WHERE code_hash = ?").bind(codeHash).first();
    const currentCount = countRes ? countRes.dev_count : 0;
    if (currentCount >= (voucher.max_devices || 3)) {
      return jsonResponse({ success: false, error: "Device limit reached for this voucher (max 3 devices allowed)." }, 403);
    }
    await env.DB.prepare("INSERT INTO voucher_devices (code_hash, device_id, first_seen) VALUES (?, ?, unixepoch())").bind(codeHash, devId).run();
  }

  // 3. Telegram user linkage if available
  let telegramId = 0;
  if (initData) {
    const user = await verifyTelegramInitData(initData, env.BOT_TOKEN);
    if (user && user.id) {
      telegramId = user.id;
      if (isSprint) {
        await env.DB.prepare(`
          INSERT INTO users (telegram_id, is_vip, vip_activated_at, vip_expires_at, updated_at)
          VALUES (?, 1, unixepoch(), ?, unixepoch())
          ON CONFLICT(telegram_id) DO UPDATE SET
            is_vip = 1,
            vip_activated_at = COALESCE(vip_activated_at, unixepoch()),
            vip_expires_at = CASE WHEN vip_expires_at > ? THEN vip_expires_at + ? ELSE ? + ? END,
            updated_at = unixepoch()
        `).bind(telegramId, nowMs + bonusMs, nowMs, bonusMs, nowMs, bonusMs).run();
      } else {
        await env.DB.prepare(`
          INSERT INTO users (telegram_id, is_vip, vip_activated_at, vip_expires_at, updated_at)
          VALUES (?, 1, unixepoch(), 0, unixepoch())
          ON CONFLICT(telegram_id) DO UPDATE SET
            is_vip = 1,
            vip_activated_at = COALESCE(vip_activated_at, unixepoch()),
            vip_expires_at = 0,
            updated_at = unixepoch()
        `).bind(telegramId).run();
      }
      await env.DB.prepare("UPDATE vouchers SET telegram_id = ? WHERE code_hash = ?").bind(telegramId, codeHash).run();
    }
  }

  if (legacyPromo) {
    try {
      await env.DB.prepare("UPDATE promo_codes SET is_used = 1, used_by_tg_id = ?, used_at = unixepoch() WHERE code = ?").bind(telegramId || 0, cleanCode).run();
    } catch (e) {}
  }

  // 4. Issue signed session token
  const signingKey = env.SESSION_SIGNING_KEY || env.BOT_TOKEN || "ips-secret-key-2026";
  const expSeconds = isSprint ? Math.floor((nowMs + bonusMs) / 1000) : Math.floor(nowMs / 1000) + (30 * 24 * 3600);
  const sessionToken = await createSessionToken({ sub: telegramId || devId, tier: "vip", plan: isSprint ? "sprint" : "lifetime", exp: expSeconds }, signingKey);

  let vipData = null;
  if (env.VIP_KV) {
    try {
      vipData = await env.VIP_KV.get("VIP_BUNDLE_JSON", "json");
    } catch (e) {}
  }

  return jsonResponse({
    success: true,
    isVip: true,
    plan: isSprint ? "sprint" : "lifetime",
    days: isSprint ? 7 : "lifetime",
    vipExpiresAt: vipExpiresAt,
    sessionToken: sessionToken,
    message: isSprint ? "7-Day Sprint VIP Pass activated successfully!" : "Lifetime VIP Pass activated successfully!",
    vipData: vipData
  });
}

async function handleWebhook(request, env, ctx = null) {
  // Verify Telegram Webhook Secret Token if configured
  if (env.WEBHOOK_SECRET) {
    const headerToken = request.headers.get("x-telegram-bot-api-secret-token") || "";
    const isSecretValid = await safeEqual(headerToken, env.WEBHOOK_SECRET);
    if (!isSecretValid) {
      console.warn("[Webhook] Unauthorized webhook request: invalid or missing secret token");
      return new Response("Unauthorized", { status: 403 });
    }
  }
  const update = await request.json();
  const botToken = env.BOT_TOKEN;
  const adminId = env.ADMIN_TG_ID;

  if (!botToken) {
    return jsonResponse({ error: "BOT_TOKEN not configured" }, 500);
  }

  // 1. Telegram Stars Pre-Checkout Query (Must answer within 10s)
  if (update.pre_checkout_query) {
    const pcq = update.pre_checkout_query;
    await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pre_checkout_query_id: pcq.id,
        ok: true
      })
    });
    return jsonResponse({ ok: true });
  }

  // A. Message handler
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const userId = msg.from ? msg.from.id : chatId;
    const from = msg.from || {};
    const text = (msg.text || "").trim();

    // Handle Telegram Stars Successful Payment (Auto-Provisioning)
    if (msg.successful_payment) {
      const sp = msg.successful_payment;
      const chargeId = sp.telegram_payment_charge_id;
      const username = from.username || "";
      const fullName = (from.first_name || "") + (from.last_name ? " " + from.last_name : "");

      let existingTx = null;
      try {
        existingTx = await env.DB.prepare("SELECT id FROM payments WHERE stars_charge_id = ?").bind(chargeId).first();
      } catch (e) {}

      if (!existingTx) {
        let payloadData = {};
        try { payloadData = JSON.parse(sp.invoice_payload || "{}"); } catch (e) {}
        const isSprint = (payloadData.plan === "sprint" || payloadData.type === "vip_sprint" || sp.total_amount === 75);
        const nowMs = Date.now();
        const bonusMs = 7 * 24 * 60 * 60 * 1000;
        const expiresAt = isSprint ? (nowMs + bonusMs) : 0;
        const starsAmount = isSprint ? 75 : (sp.total_amount || 1350);

        try {
          if (isSprint) {
            await env.DB.prepare(`
              INSERT INTO users (telegram_id, username, first_name, is_vip, vip_activated_at, vip_expires_at, updated_at)
              VALUES (?, ?, ?, 1, unixepoch(), ?, unixepoch())
              ON CONFLICT(telegram_id) DO UPDATE SET
                is_vip = 1,
                vip_activated_at = COALESCE(vip_activated_at, unixepoch()),
                vip_expires_at = CASE WHEN vip_expires_at > ? THEN vip_expires_at + ? ELSE ? + ? END,
                updated_at = unixepoch()
            `).bind(userId, username, fullName, nowMs + bonusMs, nowMs, bonusMs, nowMs, bonusMs).run();
          } else {
            await env.DB.prepare(`
              INSERT INTO users (telegram_id, username, first_name, is_vip, vip_activated_at, vip_expires_at, updated_at)
              VALUES (?, ?, ?, 1, unixepoch(), 0, unixepoch())
              ON CONFLICT(telegram_id) DO UPDATE SET
                is_vip = 1,
                vip_activated_at = COALESCE(vip_activated_at, unixepoch()),
                vip_expires_at = 0,
                updated_at = unixepoch()
            `).bind(userId, username, fullName).run();
          }
        } catch (e) {
          console.error("[Stars User Activation Error]", e);
        }

        const voucherCode = isSprint ? `IPS-SPRINT-${Math.floor(100 + Math.random() * 900)}` : generateRandomCode();
        try {
          await env.DB.prepare("INSERT INTO promo_codes (code, is_used, used_by_tg_id, used_at, plan_type) VALUES (?, 1, ?, unixepoch(), ?)").bind(voucherCode, userId, isSprint ? "sprint" : "lifetime").run();
        } catch (e) {
          console.error("[Stars Voucher Mint Error]", e);
        }

        try {
          await env.DB.prepare(`
            INSERT INTO payments (telegram_id, username, caption_note, amount_mmk, stars_amount, currency, payment_method, stars_charge_id, status, plan_tier, created_at)
            VALUES (?, ?, ?, ?, ?, 'XTR', 'stars', ?, 'approved', ?, unixepoch())
          `).bind(userId, username, isSprint ? "Telegram Stars 7-Day Sprint Pass" : "Telegram Stars Lifetime VIP Pass", isSprint ? 5000 : 97000, starsAmount, chargeId, isSprint ? "sprint" : "lifetime").run();
        } catch (e) {
          console.error("[Stars Payment Insert Error]", e);
        }

        const magicUrl = `${env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app"}/?voucher=${voucherCode}`;
        const expiryDateStr = isSprint ? new Date(nowMs + bonusMs).toLocaleDateString("en-GB", { timeZone: "Asia/Yangon" }) : "Never (Lifetime)";

        const confirmMsg = isSprint ?
`🎉 *PAYMENT SUCCESSFUL! 75 TELEGRAM STARS RECEIVED*
━━━━━━━━━━━━━━━━━━━━
⚡ *7-Day VIP Sprint Pass Activated!*

Thank you for your enrollment, *${fullName || "Scholar"}*! Your account now has 7 full days of unrestricted access to the entire IELTS Prep Studio curriculum.

📅 *Valid Until:* ${expiryDateStr} (7 Full Days)
✨ *What is now unlocked for you:*
• 🔤 All 1,162 Vocabulary items, Native Audio & 1-3-7 Spaced Repetition (SRS)
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 AI Evaluator
• 🎙️ All 30 Speaking Forecast Topics & 5 Strategic Frameworks
• ⚡ Unlimited VIP Academic Tools (/collocate, /syn, /read, /dict, /quote)

💻 *Your Desktop / PC Activation Voucher:*
Code: \`${voucherCode}\`

🔗 *1-Click Magic Activation Link:*
[Click to Launch Studio on Mobile or PC](${magicUrl})

_Need assistance? Lead Instructor: @hyuguo_`
:
`🎉 *PAYMENT SUCCESSFUL! ${starsAmount} TELEGRAM STARS RECEIVED*
━━━━━━━━━━━━━━━━━━━━
👑 *Lifetime VIP Studio Pass Activated!*

Thank you for your enrollment, *${fullName || "Scholar"}*! Your account now has permanent, unrestricted access to the entire IELTS Prep Studio curriculum.

✨ *What is now unlocked for you:*
• 🔤 All 1,162 Vocabulary items, Native Audio & 1-3-7 Spaced Repetition (SRS)
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 AI Evaluator
• 🎙️ All 30 Speaking Forecast Topics & 5 Strategic Frameworks
• ⚡ Unlimited VIP Academic Tools (/collocate, /syn, /read, /dict, /quote)

💻 *Your Desktop / PC Activation Voucher:*
Code: \`${voucherCode}\`

🔗 *1-Click Magic Activation Link:*
[Click to Launch Studio on Mobile or PC](${magicUrl})

_Need assistance? Lead Instructor: @hyuguo_`;

        await sendTelegramMessage(botToken, chatId, confirmMsg, {
          inline_keyboard: [
            [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: magicUrl } }],
            [{ text: "🌐 Open on Computer / Laptop ↗", url: magicUrl }],
            [{ text: "💬 Chat with Lead Instructor", url: "https://t.me/hyuguo" }]
          ]
        });

        if (env.ADMIN_CHAT_ID) {
          const adminLog =
`⭐️ *NEW TELEGRAM STARS PAYMENT RECEIVED!*
━━━━━━━━━━━━━━━━━━━━
👤 *Student:* ${fullName} (@${username || "no_username"})
🆔 *User ID:* \`${userId}\`
⭐️ *Amount:* ${starsAmount} XTR (${isSprint ? "7-Day Sprint" : "Lifetime"})
🔖 *Charge ID:* \`${chargeId}\`
🎟️ *Minted Voucher:* \`${voucherCode}\`
✅ *Status:* Auto-Approved & VIP Activated`;
          await sendTelegramMessage(botToken, env.ADMIN_CHAT_ID, adminLog);
        }
      }
      return jsonResponse({ ok: true });
    }

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

    // Check user VIP status and language preference once for all message handlers
    let isVip = false;
    let userLang = "en";
    try {
      const userRecord = await env.DB.prepare("SELECT is_vip, preferred_lang FROM users WHERE telegram_id = ?").bind(userId).first();
      if (userRecord) {
        isVip = userRecord.is_vip === 1;
        if (userRecord.preferred_lang) userLang = userRecord.preferred_lang;
      }
    } catch (e) {
      console.error("[User Check Error]", e);
    }

    // Direct Telegram Stars Checkout Shortcut
    
    // 🔑 BYOK (Bring Your Own API Key) Commands & Direct Key Paste for Free Tier Unlimited AI Mentor
    const rawByokMatch = text.match(/^(?:\/(?:byok|apikey|key)(?:@\w+)?\s+)?["']?((?:AIza[0-9A-Za-z_-]{30,50}|AQ\.[0-9A-Za-z_.-]{30,70}))["']?$/i);
    if (rawByokMatch) {
      const userApiKey = rawByokMatch[1].trim();
      await setTelegramByokKey(env, userId, userApiKey);
      await sendTelegramMessage(botToken, chatId,
`🔑 *PERSONAL BYOK API KEY ACTIVATED (100% FREE TIER)*
━━━━━━━━━━━━━━━━━━━━
✅ Your Google Gemini API key has been securely linked to your Telegram ID!

🚀 *What is now unlocked for you on the Free Tier:*
• *Unlimited 24/7 AI Mentor Queries* in this Telegram bot (zero daily quota limit!)
• Powered directly by *Google Gemini Flash*

💡 *Try asking right now:*
• \`/ai Write a Band 9 Task 2 essay outline on renewable energy\`
• Or simply type any IELTS question directly in the chat!
• To remove your key anytime, type \`/byok clear\``,
        {
          inline_keyboard: [
            [{ text: "🤖 Ask AI Mentor Now", callback_data: "prompt_tool:ai" }],
            [{ text: "🚀 Open IELTS Prep Studio Web App", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.web.app" } }]
          ]
        }
      );
      return jsonResponse({ ok: true });
    }

    if (text === "/byok clear" || text === "/apikey clear" || text === "/key clear") {
      await setTelegramByokKey(env, userId, "");
      await sendTelegramMessage(botToken, chatId, "🗑️ *Personal BYOK API Key Removed.* Your account has reverted to the standard daily free quota (10 queries/day).");
      return jsonResponse({ ok: true });
    }

    if (text.startsWith("/byok") || text.startsWith("/apikey") || text === "🔑 Free BYOK API Key") {
      await sendTelegramByokSetupPrompt(botToken, chatId, userId, env);
      return jsonResponse({ ok: true });
    }

    // 🤖 Cambridge AI Mentor Commands (/mentor, /ai, /ask, or menu tap)
    if (text.startsWith("/mentor") || text.startsWith("/ai") || text.startsWith("/ask") || text === "🤖 Cambridge AI Mentor" || text === "🤖 AI Mentor") {
      let query = text.replace(/^\/(mentor|ai|ask)(@\w+)?\s*/i, "").replace(/^🤖\s*(Cambridge\s*)?AI\s*Mentor/i, "").trim();
      if (!query) {
        await sendTelegramMessage(botToken, chatId,
`🤖 *CAMBRIDGE AI MENTOR & IN-APP COPILOT*
━━━━━━━━━━━━━━━━━━━━
Your personal Cambridge Band 8.5+ IELTS Tutor powered by Cloudflare Serverless AI.

*Ask any IELTS question:*
• \`/ai How do I score Band 8.0 in Speaking Part 2?\`
• \`/ai Write a Band 9 outline for: Should university education be free?\`
• \`/ai Explain the 4 scoring criteria of Writing Task 2 with examples\`
• \`/ai What are the best tactics for True / False / Not Given?\`

_Or simply reply directly with any IELTS question below!_`,
          {
            inline_keyboard: [
              [{ text: "🔑 Use Free BYOK Key (100% Free Unlimited)", callback_data: "byok_setup" }],
              [{ text: "🚀 Open AI Mentor in Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.web.app" } }]
            ]
          }
        );
        return jsonResponse({ ok: true });
      }

      await handleTelegramAiMentorQuery(env, botToken, chatId, userId, query);
      return jsonResponse({ ok: true });
    }

    // 1-Click Desktop Browser Login Handshake (/login or /start desktop_login)
    if (text === "/login" || text.startsWith("/start desktop_login") || text.startsWith("/start web_login") || text.startsWith("/start login")) {
      const voucher = (await getUserVipVoucher(env, userId)) || "";
      const studioBase = (env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app").replace(/\/+$/, "");
      const params = new URLSearchParams();
      params.set("tg_user", String(userId));
      if (msg.from && msg.from.first_name) params.set("name", msg.from.first_name);
      if (msg.from && msg.from.username) params.set("username", msg.from.username);
      if (voucher) params.set("voucher", voucher);
      if (isVip) params.set("vip", "1");
      const magicLoginUrl = `${studioBase}/?${params.toString()}`;

      const scholarName = (msg.from && msg.from.first_name) ? msg.from.first_name : "Scholar";
      let vipNote = "";
      if (isVip) {
        vipNote = "👑 *VIP Status:* Active (Lifetime VIP Pass)\n";
        if (voucher) {
          vipNote += "🔑 *Your Voucher Code:* `" + voucher + "`\n\n";
        } else {
          vipNote += "\n";
        }
      }

      const loginMsg =
`🚀 *1-Click Instant Desktop Browser Login*

Hello *${scholarName}*! Tap the button below to authenticate your account.

${vipNote}💻 *For Desktop Computer (Chrome / Edge / Firefox):*
Copy and paste this direct 1-click login link into your computer's browser:
\`${magicLoginUrl}\`

📱 *Opening on iPhone / Android Phone?*
When Telegram opens its in-app browser:
• Tap the **🧭 Compass / Safari icon** at the top right to switch to real Safari / Chrome (keeps your session synced across devices).
• _(Tip: In Telegram Settings ➔ Data and Storage ➔ Open Links In ➔ Safari / Chrome to always open externally.)_`;

      await sendTelegramMessage(botToken, chatId, loginMsg, {
        inline_keyboard: [
          [{ text: "🚀 Open & Log In on Desktop Chrome", url: magicLoginUrl }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    if (text === "/buy_stars" || text.startsWith("/start buy_stars")) {
      await sendStarsInvoice(botToken, chatId, userId);
      return jsonResponse({ ok: true });
    }

    // Language switcher command
    if (text === "/lang" || text === "/language" || text === "🌐 Language" || text === "🌐 Language (EN/မြန်မာ)") {
      const langMsg =
`🌐 *CHOOSE YOUR BOT LANGUAGE PREFERENCE*
━━━━━━━━━━━━━━━━━━━━
Select how you would like IELTS Prep Studio Bot to interact with you:

• 🇬🇧 *English Only (Default):* Clean, examiner-grade academic English. Recommended for international test takers.
• 🇲🇲 *Bilingual (English + မြန်မာ):* Includes Burmese explanations, exam traps citations, and Myanmar mobile wallet details.`;

      await sendTelegramMessage(botToken, chatId, langMsg, {
        inline_keyboard: [
          [{ text: "🇬🇧 English Only (Default)", callback_data: "set_lang:en" }],
          [{ text: "🇲🇲 Bilingual (EN + မြန်မာ)", callback_data: "set_lang:my" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // Referral Engine: Handle /start ref_<referrerId>
    if (text && text.startsWith("/start ref_")) {
      const parts = text.split("ref_");
      const referrerId = parseInt(parts[1], 10);
      if (referrerId && referrerId !== userId) {
        try {
          // Check if already registered
          const existing = await env.DB.prepare("SELECT telegram_id, referred_by FROM users WHERE telegram_id = ?").bind(userId).first();
          if (!existing || !existing.referred_by) {
            const bonusMs = 7 * 86400000;
            const nowMs = Date.now();
            await env.DB.prepare(`
              INSERT INTO referrals (referrer_id, referee_id, bonus_days, created_at)
              VALUES (?, ?, 7, unixepoch())
            `).bind(referrerId, userId).run();

            // Grant 7 VIP days to referee
            await env.DB.prepare(`
              INSERT INTO users (telegram_id, username, first_name, is_vip, vip_expires_at, referred_by, updated_at)
              VALUES (?, ?, ?, 1, ?, ?, unixepoch())
              ON CONFLICT(telegram_id) DO UPDATE SET
                is_vip = 1,
                referred_by = ?,
                vip_expires_at = CASE WHEN vip_expires_at > ? THEN vip_expires_at + ? ELSE ? + ? END,
                updated_at = unixepoch()
            `).bind(userId, username, firstName, nowMs + bonusMs, referrerId, referrerId, nowMs, bonusMs, nowMs, bonusMs).run();

            // Grant 7 VIP days to referrer
            await env.DB.prepare(`
              UPDATE users 
              SET is_vip = 1,
                  vip_expires_at = CASE WHEN vip_expires_at > ? THEN vip_expires_at + ? ELSE ? + ? END,
                  updated_at = unixepoch()
              WHERE telegram_id = ?
            `).bind(nowMs, bonusMs, nowMs, bonusMs, referrerId).run();

            // Notify referrer
            await sendTelegramMessage(botToken, referrerId, 
              `🎁 *REFERRAL BONUS ACTIVATED!*\n━━━━━━━━━━━━━━━━━━━━\nA new student (@${username || "Candidate"}) joined using your invite link! You have both earned *+7 Days of Full VIP Access*.`
            );
          }
        } catch (e) {
          console.error("[Referral Error]", e);
        }
      }
    }

    // 0.1: /referral & /invite command (Referral Engine: +7 VIP Days)
    if (text === "/referral" || text.startsWith("/referral") || text === "/invite" || text.startsWith("/invite") || text === "🎁 Referral Program" || text === "🎁 Referral (+7d VIP)" || text === "👥 Invite Friends (+7d VIP)") {
      const refLink = `https://t.me/${env.BOT_USERNAME || "IELTSPrepStudioBot"}?start=ref_${userId}`;
      let count = 0;
      try {
        const res = await env.DB.prepare("SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ?").bind(userId).first();
        count = (res && res.c) || 0;
      } catch (e) {}
      const bonusDays = count * 7;
      const inviteMsg =
`🎁 *INVITE CANDIDATES & EARN +7 VIP DAYS FREE!*
━━━━━━━━━━━━━━━━━━━━
Share IELTS Prep Studio with your friends or study groups!
When any student opens the app using your referral link, *BOTH OF YOU instantly receive +7 Days of Full VIP Access*.

🔗 *Your Personal Referral Link:*
\`${refLink}\`

📊 *Your Referral Telemetry:*
• Candidates Joined: *${count}*
• Total Bonus VIP Days Earned: *+${bonusDays} Days*

💡 *How it works:*
1. Send your link to fellow test-takers.
2. When they tap Start, our Cloudflare edge automatically provisions +7 VIP days to both accounts.
3. No limits! Refer 4 candidates to unlock 28 days of free VIP access!`;

      await sendTelegramMessage(botToken, chatId, inviteMsg, {
        inline_keyboard: [
          [{ text: "📤 Share Link via Telegram", url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Join IELTS Prep Studio for Cambridge CBT mocks, Band 8.5 Collocations & AI writing diagnostics! Use my invite link to get +7 Days Free VIP Access:")}` }],
          [{ text: "🚀 Open Studio Mini App", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.pages.dev" } }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 0.2: /streak command (Daily Consistency Coach)
    if (text === "/streak" || text === "🔥 Study Streak") {
      let streak = 1;
      let lastDate = "Today";
      try {
        const row = await env.DB.prepare("SELECT streak_days, last_active_date FROM users WHERE telegram_id = ?").bind(userId).first();
        if (row) {
          streak = row.streak_days || 1;
          lastDate = row.last_active_date || "Today";
        }
      } catch (e) {}

      const streakMsg =
`🔥 *YOUR IELTS STUDY STREAK COACH*
━━━━━━━━━━━━━━━━━━━━
Current Streak: *${streak} Day${streak > 1 ? 's' : ''} Active*
Last Active Session: *${lastDate}*

🎯 *The 25-Minute Rule:*
IELTS examiners report that candidates studying *25 minutes daily* achieve Band 7.5+ in half the calendar time of weekend crammers. Daily active recall locks syntactic structures into long-term working memory.

Complete today's 4 prescribed drills to extend your streak to *${streak + 1} Days*!`;

      await sendTelegramMessage(botToken, chatId, streakMsg, {
        inline_keyboard: [
          [{ text: "⚡ Launch Today's 25-Min Circuit", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.pages.dev" } }],
          [{ text: "🧠 3-Question Daily Quiz", callback_data: "cmd_quiz" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 0.3: /quiz command (Daily Academic Drill)
    if (text === "/quiz" || text === "🧠 Daily Quiz") {
      const qId = Math.floor(Math.random() * 3);
      const quizzes = [
        {
          q: "📚 *Academic Collocation Drill (Lexical Resource):*\n\n\"The municipal council agreed to implement ________ regulations to combat urban air pollution.\"\n\nWhich C2 academic adjective achieves Band 8.5+ precision?",
          opts: [
            { t: "A) strict", c: "quiz_eval:0:0" },
            { t: "B) stringent", c: "quiz_eval:0:1" },
            { t: "C) hard", c: "quiz_eval:0:2" },
            { t: "D) tough", c: "quiz_eval:0:3" }
          ]
        },
        {
          q: "📖 *Reading TFNG Decisive Arbiter Drill:*\n\n*Passage text:* \"Dr. Roberts suggested that the preliminary experimental data might indicate a modest reduction in emissions.\"\n\n*Question:* \"Dr. Roberts proved that the technique was effective.\"\n\nWhat is the correct answer according to Cambridge standards?",
          opts: [
            { t: "A) TRUE", c: "quiz_eval:1:0" },
            { t: "B) FALSE", c: "quiz_eval:1:1" },
            { t: "C) NOT GIVEN", c: "quiz_eval:1:2" }
          ]
        },
        {
          q: "⚖️ *Live Band Surgery (Grammatical Range):*\n\nWhich negative inverted structure is grammatically flawless for IELTS Task 2 body paragraphs?",
          opts: [
            { t: "A) Seldom people realize the consequences...", c: "quiz_eval:2:0" },
            { t: "B) Seldom do people realize the consequences...", c: "quiz_eval:2:1" },
            { t: "C) Seldom people do realize the consequences...", c: "quiz_eval:2:2" }
          ]
        }
      ];

      const sel = quizzes[qId];
      await sendTelegramMessage(botToken, chatId, sel.q, {
        inline_keyboard: sel.opts.map(o => [{ text: o.t, callback_data: o.c }])
      });
      return jsonResponse({ ok: true });
    }

    // 1. /start or /menu command or greeting
    if (text === "/start" || text.startsWith("/start ") || text === "/menu" || text === "မင်္ဂလာပါ") {
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(registerBotCommands(botToken));
      }

      let welcomeText = "";
      if (isVip) {
        welcomeText = userLang === "my"
          ? `🇲🇲 *Welcome back to IELTS Prep Studio (@${env.BOT_USERNAME || "IELTSPrepStudioBot"})!*

👑 *VIP LIFETIME MEMBER (ACTIVE)*
• All 1,162 Academic Lexicons, Native Audio & 1-3-7 SRS
• All 23 Cambridge Reading CBT Passages (231 Questions)
• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer
• All 30 Speaking Forecast Topics & 5 Frameworks
• Automatic Cross-Device Cloud Sync + Desktop VIP Access

⚡ Daily Academic AI Quota: *Unlimited Band 9 Access*
👨‍🏫 Need personalized advice? Lead Instructor: @hyuguo

👇 *အောက်ပါ Menu မှ လိုအပ်ရာကို ရွေးချယ်နိုင်ပါသည်:*`
          : `🎓 *Welcome back to IELTS Prep Studio (@${env.BOT_USERNAME || "IELTSPrepStudioBot"})!*

👑 *VIP LIFETIME MEMBER (ACTIVE)*
• All 1,162 Academic Lexicons, Native Audio & 1-3-7 SRS
• All 23 Cambridge Reading CBT Passages (231 Questions)
• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer
• All 30 Speaking Forecast Topics & 5 Frameworks
• Automatic Cross-Device Cloud Sync + Desktop VIP Access

⚡ Daily Academic AI Quota: *Unlimited Band 9 Access*
👨‍🏫 Need personalized advice? Lead Instructor: @hyuguo

👇 *Select any module below to continue studying:*`;
      } else {
        welcomeText = userLang === "my"
          ? `🇲🇲 *Welcome to IELTS Prep Studio (@${env.BOT_USERNAME || "IELTSPrepStudioBot"})!*

🎯 *Cambridge CBT Mocks • Band 8.5/9.0 Lexicon • Task 1 & 2 Models*
Study anytime with 0-latency, offline support, and interactive audio.

👑 *Target Band 7.5+ Lifetime Studio VIP Pass (97,000 MMK (Lifetime) / 1,350 ★ Stars (or 5,000 MMK / 75 ★ Stars 7-Day Sprint))*
• All 1,162 Vocabulary Items, Traps & 1-3-7 Day SRS
• All 23 Reading CBT Passages (231 Questions) with Burmese citations
• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer
• All 30 Speaking Forecast Topics & 5 Frameworks
• Automatic Cross-Device Cloud Sync + Desktop Activation Voucher

💳 *Payment Information:*
• Telegram Stars: *1,350 ★ Stars (Lifetime) / 75 ★ Stars (7-Day Sprint)* (Instant Worldwide 1-Click)
• KBZPay / WavePay: \`${env.PAYMENT_PHONE || "09-768691939"}\` (*97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)*)

📸 *To Activate VIP:*
Telegram Stars ဖြင့် ချက်ချင်းဝယ်ယူနိုင်ပြီး KBZPay / WavePay ဖြင့် လွှဲပါက စလစ် screenshot ပို့ပေးပါက Admin မှ ဖွင့်ပေးပါမည်။

👇 *အောက်ပါ Menu မှ လိုအပ်ရာကို ရွေးချယ်နိုင်ပါသည်:*`
          : `🎓 *Welcome to IELTS Prep Studio (@${env.BOT_USERNAME || "IELTSPrepStudioBot"})!*

🎯 *Cambridge CBT Mocks • Band 8.5/9.0 Lexicon • Task 1 & 2 Models*
Master the official test format with examiner-grade interactive scoring.

👑 *Target Band 7.5+ Lifetime Studio VIP Pass*
• All 1,162 Vocabulary Items, Traps & 1-3-7 Day SRS
• All 23 Reading CBT Passages (231 Questions) + Evidence Notes
• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Scorer
• All 30 Speaking Forecast Topics & 5 Strategic Frameworks
• Automatic Cross-Device Cloud Sync + Desktop Activation Voucher

⭐ *Pricing & Instant Activation:*
• Global: *1,350 ★ Stars (Lifetime) / 75 ★ Stars (Sprint)* (Instant 1-Click Activation)
• Myanmar: *97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)* (KBZPay / WavePay Mobile Wallets)

👇 *Select an option from the menu below to begin:*`;
      }

      const vipVoucher = isVip ? await getUserVipVoucher(env, userId) : null;
      await sendTelegramMessage(botToken, chatId, welcomeText, getPrimaryKeyboard(env, userId, vipVoucher));
      return jsonResponse({ ok: true });
    }

    // 1.1. "🚀 Start Menu" or "Start" or "/menu" -> Expand full interactive menu
    if (text === "🚀 Start Menu" || text === "Start Menu" || text === "Start" || text === "start" || text === "/menu" || text === "🚀 Start") {
      const isVip = await resolveIsVip(env, userId);
      const vipVoucher = isVip ? await getUserVipVoucher(env, userId) : null;
      const menuText = isVip
        ? `👑 *IELTS PREP STUDIO — VIP STUDY MENU*
━━━━━━━━━━━━━━━━━━━━
✨ Full Lifetime VIP Pass is permanently active on your account!
All 23 CBT Reading tests, 1,162 Vocabulary SRS items, 40 Model Essays, and VIP Academic Tools are unlocked.

👇 *Select an option below, or tap 🔽 Collapse Menu to minimize:*`
        : `🎓 *IELTS PREP STUDIO — MAIN STUDY MENU*
━━━━━━━━━━━━━━━━━━━━
Cambridge CBT Mock Simulator • Band 9.0 AI Examiner • 1,162 Academic Lexicon

👇 *Select an option below, or tap 🔽 Collapse Menu to minimize:*`;

      await sendTelegramMessage(botToken, chatId, menuText, getMainMenuKeyboard(env, isVip, userId, vipVoucher));
      return jsonResponse({ ok: true });
    }

    // 1.2. "🔽 Collapse Menu" or "Collapse" or "/collapse" -> Collapse back to single Start button
    if (text === "🔽 Collapse Menu" || text === "Collapse Menu" || text === "Collapse" || text === "collapse" || text === "/collapse") {
      await sendTelegramMessage(botToken, chatId,
        `🔽 *Menu collapsed.* Tap *🚀 Start Menu* whenever you want to reopen the menu.`,
        getPrimaryKeyboard(env, userId)
      );
      return jsonResponse({ ok: true });
    }

    // 1.3. "👑 VIP Status: Active" -> Remind VIP user of active status
    if (text === "👑 VIP Status: Active") {
      const isVip = await resolveIsVip(env, userId);
      const vipVoucher = isVip ? await getUserVipVoucher(env, userId) : null;
      const launchUrl = getStudioLaunchUrl(env, userId, vipVoucher);
      await sendTelegramMessage(botToken, chatId,
`👑 *YOU ARE ALREADY A VIP USER!*
━━━━━━━━━━━━━━━━━━━━
✅ Your account has full Lifetime VIP Access permanently active.
• 🔤 All 1,162 Academic Lexicon items with Native Pronunciation & 1-3-7 SRS
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 AI Scorer
• 🎙️ All 30 Speaking Forecast Topics & 5 Strategic Frameworks
• ⚡ Unlimited Live Academic AI Quota (/collocate, /syn, /dict, /read)
• ☁️ Multi-Device Cloud Sync + Desktop PC VIP Voucher Code

No further payment is required. Practice anytime!`, {
        inline_keyboard: [
          [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: launchUrl } }],
          [{ text: "⚡ VIP Academic Tools", callback_data: "menu_tools" }],
          [{ text: "💬 Chat with Lead Instructor (@hyuguo)", url: "https://t.me/hyuguo" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // 2. /app or "🚀 Launch IELTS Prep Studio"
    if (text === "/app" || text === "🚀 Launch IELTS Prep Studio") {
      const isVip = await resolveIsVip(env, userId);
      const vipVoucher = isVip ? await getUserVipVoucher(env, userId) : null;
      const launchUrl = getStudioLaunchUrl(env, userId, vipVoucher);
      await sendTelegramMessage(botToken, chatId,
`🎯 *IELTS PREP STUDIO — FULLSCREEN MINI APP*
━━━━━━━━━━━━━━━━━━━━
Interactive Cambridge CBT reader, Spaced Repetition flashcards, native audio pronunciation, and essay evaluator are ready.

👇 အောက်ပါခလုတ်ကို နှိပ်၍ Fullscreen Studio သို့ ဝင်ရောက်လေ့လာပါ:`, {
        inline_keyboard: [
          [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: launchUrl } }],
          [{ text: "🌐 Open on Computer / Laptop ↗", url: launchUrl }]
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

    // 2.6a. /paper <topic>
    if (text === "/paper" || text.startsWith("/paper ")) {
      const topic = text.replace(/^\/paper\s*/i, "").trim() || "artificial intelligence education";
      await handlePaperCommand(chatId, userId, topic, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.6a2. /cloze <topic> or button
    if (text === "/cloze" || text.startsWith("/cloze ") || text === "📖 Scholarly Cloze Drill" || text === "📖 Cloze Drill" || text === "Cloze Drill") {
      let topic = text.replace(/^\/cloze\s*/i, "").trim();
      if (!topic || topic === "📖 Scholarly Cloze Drill" || topic === "📖 Cloze Drill" || topic === "Cloze Drill") {
        topic = "climate policy";
      }
      await handleClozeCommand(chatId, userId, topic, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.6b. /chart <country>
    if (text === "/chart" || text.startsWith("/chart ")) {
      const country = text.replace(/^\/chart\s*/i, "").trim() || "MMR";
      await handleChartCommand(chatId, userId, country, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.6c. /podcast [source] or button
    if (text === "/podcast" || text.startsWith("/podcast ") || text === "🎙️ Native Podcasts" || text === "🎙️ Cambridge & BBC Podcasts" || text === "Native Podcasts" || text === "Podcasts") {
      let query = text.replace(/^\/podcast\s*/i, "").trim();
      if (!query || query === "🎙️ Native Podcasts" || query === "🎙️ Cambridge & BBC Podcasts" || query === "Native Podcasts" || query === "Podcasts") {
        query = "ielts";
      }
      await handlePodcastCommand(chatId, userId, query, env, botToken);
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

    // 2.10b. /redeem <code>
    if (text.startsWith("/redeem")) {
      const code = text.replace(/^\/redeem\s*/i, "").trim().toUpperCase();
      if (!code) {
        await sendTelegramMessage(botToken, chatId, "🎟️ *Please provide a voucher code.*\n\nUsage: `/redeem IPS-SPRINT-701` or `/redeem IPS-VIP-101`");
        return jsonResponse({ ok: true });
      }
      await handleTelegramBotRedeem(chatId, userId, from, code, env, botToken);
      return jsonResponse({ ok: true });
    }

    // 2.11. /sprint or "⏱️ Study Sprint"
    if (text.startsWith("/sprint") || text === "⏱️ Study Sprint") {
      await handleSprintCommand(chatId, text, botToken);
      return jsonResponse({ ok: true });
    }

    // 3. /vip or /buy or VIP pass buttons
    if (text === "/vip" || text === "/buy" || text === "👑 Buy VIP Pass (97,000 Ks (Lifetime) / 5,000 Ks (Sprint))" || text === "👑 Buy VIP (750 ★ / 55k)" || text === "⭐ VIP Pass (97,000 Ks (Lifetime) / 5,000 Ks (Sprint))" || text === "👑 VIP Lifetime Active" || text === "Buy Products") {
      if (isVip) {
        const activeVipText = 
`👑 *YOU ARE ALREADY A VIP USER!*
━━━━━━━━━━━━━━━━━━━━
💎 *Status:* Active (Lifetime • No Expiration)
✨ *All Premium Features Unlocked Permanently:*
• 🔤 All 1,162 Band 8.5/9.0 Academic Lexicon Items & Native Audio
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Evaluator
• 🎙️ All 30 Speaking Forecast Topics & 5 Frameworks
• ☁️ Multi-Device Cloud Sync + Telegram Mini App Integration
• ⚡ Unlimited Live Academic AI Quota (/collocate, /syn, /dict, /read)

No further payment is required. Practice anytime!

💻 *Desktop PC Access:*
Open ${env.STUDIO_WEB_URL || "https://ielts-prep-studio.web.app"} on computer and log in with Telegram or use your Personal VIP Desktop Voucher!`;

        await sendTelegramMessage(botToken, chatId, activeVipText, {
          inline_keyboard: [
            [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.web.app" } }],
            [{ text: "📚 View Curriculum Syllabus", callback_data: "mod_catalog_back" }],
            [
              { text: "⚡ VIP Academic Tools", callback_data: "menu_tools" },
              { text: "💬 Chat with Lead Instructor", url: "https://t.me/hyuguo" }
            ]
          ]
        });
        return jsonResponse({ ok: true });
      }

      const isMy = userLang === "my";
      const vipText = isMy
        ? `👑 *TARGET BAND 7.5+ LIFETIME STUDIO VIP PASS*
━━━━━━━━━━━━━━━━━━━━
💎 *One-Time Investment:* *97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)* သို့မဟုတ် *750 ★ Telegram Stars* (တစ်သက်တာ အသုံးပြုခွင့် • No Monthly Fees)

🎁 *ပါဝင်သော အချက်များ:*
• 🔤 All 1,162 Vocabulary Items, Native Audio & 1-3-7 SRS
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Analyzer
• 🎙️ All 30 Speaking Forecast Topics & 5 Frameworks
• ⚡ Unlimited VIP Academic Tools (/collocate, /syn, /read, /dict, /quote)
• ☁️ Multi-Device Cloud Sync + Desktop PC VIP Voucher Code

👇 *ငွေပေးချေမှု စနစ်ကို အောက်ပါ Menu မှ ရွေးချယ်နိုင်ပါသည်:*`
        : `🎓 *IELTS PREP STUDIO — LIFETIME VIP PASS*
━━━━━━━━━━━━━━━━━━━━
Examiner-Grade CBT Mocks • Band 9 Models • 1,162 Academic Lexicon & Traps

⭐ *Worldwide Investment:* *1,350 ★ Stars (Lifetime) / 75 ★ Stars (Sprint)*
🇲🇲 *Myanmar Local Price:* *97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)* (KBZPay / WavePay)
_One-Time Investment • Lifetime Access • Zero Subscriptions_

🎁 *Everything You Unlock Forever:*
• 🔤 All 1,162 Vocabulary Items, Native Audio & 1-3-7 SRS
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Analyzer
• 🎙️ All 30 Speaking Forecast Topics & 5 Frameworks
• ⚡ Unlimited VIP Academic Tools (/collocate, /syn, /read, /dict, /quote)
• ☁️ Multi-Device Cloud Sync + Desktop PC VIP Voucher Code

👇 *Choose your preferred checkout method below:*`;

      await sendTelegramMessage(botToken, chatId, vipText, {
        inline_keyboard: [
          [{ text: "⭐️ Pay with Telegram Stars (750 ★ Instant Worldwide)", callback_data: "pay_stars" }],
          [{ text: "🇲🇲 KBZPay / WavePay Slip (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint) — Myanmar)", callback_data: "info_payment" }],
          [
            { text: "🎟️ Redeem Voucher Code", callback_data: "menu_redeem" },
            { text: "🌐 Switch Language", callback_data: "menu_lang" }
          ],
          [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.web.app" } }]
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
`👑 *YOU ARE ALREADY A VIP USER!*
━━━━━━━━━━━━━━━━━━━━
✅ You are already a Lifetime VIP user! All 55 CBT Mocks, 1,162 Lexicon SRS, and VIP Academic Tools are permanently unlocked.

သင်သည် Lifetime VIP Pass အသုံးပြုသူဖြစ်ပြီး ဖြစ်ပါသဖြင့် ထပ်မံပေးသွင်းရန် မလိုတော့ပါ။

💬 For questions or study guidance, contact Lead Instructor @hyuguo directly:`;

        await sendTelegramMessage(botToken, chatId, vipPayMsg, {
          inline_keyboard: [
            [{ text: "💬 Chat with Lead Instructor (@hyuguo)", url: "https://t.me/hyuguo" }],
            [{ text: "⚡ VIP Academic Tools", callback_data: "menu_tools" }],
            [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
          ]
        });
        return jsonResponse({ ok: true });
      }

      const payMsg = 
`💳 *KBZPAY / WAVEPAY PAYMENT DETAILS*
━━━━━━━━━━━━━━━━━━━━
👑 *Lifetime Studio VIP Pass:* *97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)* (တစ်သက်တာလုံး အကန့်အသတ်မရှိ)

📱 *Payment Numbers (1-Tap Copy):*
• KBZPay / WavePay: \`${env.PAYMENT_PHONE || "09-768691939"}\`
• Account Name: *${env.ACCOUNT_NAME || "Lyan Htet"}*

📝 *Payment Instructions:*
1. 97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint) ကို အထက်ပါ နံပါတ်သို့ လွှဲပေးပါ။
2. ငွေလွှဲအောင်မြင်သည့် **Screenshot (စလစ်)** ကို ဤ Bot သို့ တိုက်ရိုက် ပေးပို့ပါ။
3. ပေးပို့ပြီးပါက အတည်ပြုရ မြန်ဆန်စေရန် သင်၏ **Transaction ID နောက်ဆုံး ၄ လုံး (သို့) ဖုန်းနံပါတ်** ကို စာပို့ပေးပါ။
4. Admin မှ အတည်ပြုပြီးသည်နှင့် ချက်ချင်း VIP စတင် အသုံးပြုနိုင်ပါပြီ! 👑`;

      await sendTelegramMessage(botToken, chatId, payMsg, {
        inline_keyboard: [
          [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }],
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
          [{ text: "🚀 Practice in Mini App", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
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
          [{ text: "💳 How to Pay (97,000 Ks (Lifetime) / 5,000 Ks (Sprint))", callback_data: "info_payment" }]
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
          [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }],
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
• ${env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/"} ကို Desktop Chrome / Edge တွင် ဖွင့်ပါ။
• Telegram Login (သို့) VIP Desktop Voucher Code ဖြင့် အကောင့်ကို ချိတ်ဆက်ပါ။`;

      await sendTelegramMessage(botToken, chatId, helpMsg, {
        inline_keyboard: [
          [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }],
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

      // Admin Spreadsheet Export Command
      if (text === "/export" || text === "/customers" || text === "/csv" || text === "/spreadsheet") {
        await sendTelegramMessage(botToken, chatId, "⏳ _Generating live VIP customers spreadsheet from D1 database..._");
        try {
          const { csv, count } = await generateCustomersCSV(env);
          const nowMmt = new Date().toLocaleString("en-GB", { timeZone: "Asia/Yangon" });
          const fileName = `ielts_vip_customers_${new Date().toISOString().slice(0, 10)}.csv`;
          const caption = 
`📊 *IELTS PREP STUDIO — VIP CUSTOMERS SPREADSHEET*
━━━━━━━━━━━━━━━━━━━━
👥 Total Approved VIP Students: *${count}*
🕒 Generated: \`${nowMmt} MMT\`

📁 *Format:* Standard CSV (UTF-8 BOM). Compatible with Microsoft Excel, Google Sheets, Apple Numbers, and Notion.`;

          await sendTelegramDocument(botToken, chatId, csv, fileName, caption);
        } catch (err) {
          console.error("[Export CSV Error]", err);
          await sendTelegramMessage(botToken, chatId, `❌ Failed to generate spreadsheet: ${err.message}`);
        }
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
• \`/export\` or \`/customers\` — 📥 Download CSV Spreadsheet
• \`/vip <id> on/off\` — Toggle VIP for user`;

        await sendTelegramMessage(botToken, chatId, statsMsg, {
          inline_keyboard: [
            [{ text: "📥 Download Customers Spreadsheet (.csv)", callback_data: "admin_export_csv" }]
          ]
        });
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

    // Student Photo Submission (Payment Receipt Slip OR Gemini Vision Analysis)
    if (msg.photo && msg.photo.length > 0) {
      let isAwaitingSlip = false;
      try {
        const userRec = await env.DB.prepare("SELECT pending_tool FROM users WHERE telegram_id = ?").bind(userId).first();
        if (userRec && userRec.pending_tool === 'vip_slip') {
          isAwaitingSlip = true;
          // Clear pending tool
          await env.DB.prepare("UPDATE users SET pending_tool = NULL WHERE telegram_id = ?").bind(userId).run();
        }
      } catch (err) {
        console.error("[Check VIP Slip State Error]", err);
      }

      const highestPhoto = msg.photo[msg.photo.length - 1];
      const fileId = highestPhoto.file_id;
      const caption = (msg.caption || "").trim();

      if (isAwaitingSlip) {
        const insertResult = await env.DB.prepare(`
          INSERT INTO payments (telegram_id, username, file_id, caption_note, amount_mmk, status, created_at)
          VALUES (?, ?, ?, ?, 97000, 'pending', unixepoch())
        `).bind(msg.from.id, msg.from.username || "", fileId, caption).run();

        const paymentId = insertResult.meta ? insertResult.meta.last_row_id : "pending";

        // Acknowledge receipt to student & request TxRef / Phone
        await sendTelegramMessage(botToken, chatId,
`✅ *ငွေလွှဲစလစ် လက်ခံရရှိပါသည်!*
Screenshot received! Admin မှ 97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint) စလစ်ကို စစ်ဆေးအတည်ပြုနေပါသည်။

📝 *အမြန်ဆုံး အတည်ပြုနိုင်ရန်:*
သင်၏ KBZPay / WavePay **Transaction ID နောက်ဆုံး ၄ လုံး** (သို့မဟုတ်) **ငွေလွှဲခဲ့သည့် ဖုန်းနံပါတ်** ကို ဤနေရာတွင် စာတိုအဖြစ် ပေးပို့ပေးပါ ခင်ဗျာ။`,
          getMainMenuKeyboard(env)
        );

        // Forward slip photo to Admin for 1-Tap Approval
        if (adminId) {
          const adminCaption = 
`💳 *NEW PAYMENT SUBMISSION (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint))*
• Student: @${msg.from.username || "NoUsername"} (\`${msg.from.id}\`)
• Name: ${msg.from.first_name || ""} ${msg.from.last_name || ""}
• Payment ID: #${paymentId}
• Notes: ${caption || "None"}`;

          await sendTelegramPhoto(botToken, adminId, fileId, adminCaption, {
            inline_keyboard: [
              [
                { text: "👑 Approve Lifetime (97k Ks)", callback_data: `approve:${msg.from.id}:${paymentId}:lifetime` },
                { text: "⚡ Approve 7-Day Sprint (5k Ks)", callback_data: `approve:${msg.from.id}:${paymentId}:sprint` },
                { text: "❌ Reject", callback_data: `reject:${msg.from.id}:${paymentId}` }
              ]
            ]
          });
        }

        return jsonResponse({ ok: true });
      }

      // 📸 Gemini Vision Analysis Flow for IELTS Questions, Essays, Charts, and Notes
      await sendTelegramChatAction(botToken, chatId, "typing");
      const userByokKey = await getTelegramByokKey(env, userId);
      const hasByok = userByokKey.length >= 20;

      let imageBase64 = "";
      let mimeType = "image/jpeg";
      try {
        const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        if (fileInfoRes.ok) {
          const fileInfo = await fileInfoRes.json();
          const filePath = fileInfo?.result?.file_path;
          if (filePath) {
            const dlRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
            if (dlRes.ok) {
              const arrayBuf = await dlRes.arrayBuffer();
              imageBase64 = arrayBufferToBase64(arrayBuf);
              if (filePath.endsWith(".png")) mimeType = "image/png";
              else if (filePath.endsWith(".webp")) mimeType = "image/webp";
            }
          }
        }
      } catch (dlErr) {
        console.error("[Telegram Image Download Error]", dlErr);
      }

      if (hasByok && imageBase64) {
        const systemPrompt = `You are the Cambridge AI Mentor & In-App Copilot for IELTS Prep Studio.
You provide Band 8.5+ IELTS preparation advice, essay evaluations, speaking frameworks, and vocabulary.
Analyze IELTS practice material, question papers, handwritten essays, charts/graphs (Task 1), or reading passages provided in images.
Provide structured, concise, and highly actionable analysis with clear headings and bullet points.
Support both English and Burmese (မြန်မာဘာသာ) when appropriate.`;

        const promptText = caption || "Please analyze this IELTS study material / practice question / handwriting essay / Task 1 chart in detail. Provide a Band 8.5-9 evaluation, breakdown of key academic vocabulary, grammar corrections, or structured answering framework.";

        const visionResult = await callDirectByokGeminiVisionTelegram(userByokKey, imageBase64, mimeType, systemPrompt, promptText);
        if (visionResult && visionResult.text) {
          await sendTelegramMessage(botToken, chatId,
`📸 *CAMBRIDGE AI VISION ANALYSIS*
━━━━━━━━━━━━━━━━━━━━
${visionResult.text}

_🔑 BYOK Vision (${visionResult.model}) • Cambridge AI Core_`,
            {
              inline_keyboard: [
                [{ text: "🤖 Ask Follow-up Question", callback_data: "prompt_tool:ai" }],
                [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }],
                [{ text: "👑 Submit as VIP Payment Slip instead", callback_data: `slip_submit:${fileId}` }]
              ]
            }
          );
          return jsonResponse({ ok: true });
        }
      }

      // If BYOK not configured or vision call failed, guide student & provide 1-tap slip submission
      await sendTelegramMessage(botToken, chatId,
`📸 *IELTS PHOTO RECEIVED — GEMINI VISION READY*
━━━━━━━━━━━━━━━━━━━━
I can analyze your IELTS Task 1 graphs, handwritten essays, test questions, or vocabulary notes using **Google Gemini Vision**!

🔑 *Connect your 100% Free Gemini API Key (BYOK) for Unlimited Vision Analysis:*
1️⃣ Get your free key from Google AI Studio:
👉 [create your api key here(100% free)](https://aistudio.google.com/api-keys)
2️⃣ Paste your key (\`AQ...\` or \`AIza...\`) right here in the chat to activate!

👑 *Did you mean to submit a 97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint) VIP payment slip?*
Tap the button below to submit this screenshot to Admin for Lifetime VIP activation!`,
        {
          inline_keyboard: [
            [{ text: "🔑 create your api key here(100% free) ↗", url: "https://aistudio.google.com/api-keys" }],
            [{ text: "⚙️ How to Set Free BYOK Key", callback_data: "byok_setup" }],
            [{ text: "👑 Submit as VIP Payment Slip (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint))", callback_data: `slip_submit:${fileId}` }],
            [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
          ]
        }
      );
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

      // Conversational Fallback: Route natural questions directly to Cambridge AI Mentor!
      if (text && text.length >= 3 && !text.startsWith("/")) {
        await handleTelegramAiMentorQuery(env, botToken, chatId, userId, text);
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

    // Vision Photo 1-Tap Slip Submit Callback
    if (data.startsWith("slip_submit:")) {
      const fileId = data.replace("slip_submit:", "");
      const cbUser = cb.from;
      
      const insertResult = await env.DB.prepare(`
        INSERT INTO payments (telegram_id, username, file_id, caption_note, amount_mmk, status, created_at)
        VALUES (?, ?, ?, ?, 97000, 'pending', unixepoch())
      `).bind(cbUser.id, cbUser.username || "", fileId, "Submitted via Vision photo button").run();

      const paymentId = insertResult.meta ? insertResult.meta.last_row_id : "pending";

      await answerCallbackQuery(botToken, cb.id, "✅ Payment slip submitted to Admin!");
      await sendTelegramMessage(botToken, cbChatId,
`✅ *ငွေလွှဲစလစ် လက်ခံရရှိပါသည်!*
Screenshot received! Admin မှ 97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint) စလစ်ကို စစ်ဆေးအတည်ပြုနေပါသည်။

📝 *အမြန်ဆုံး အတည်ပြုနိုင်ရန်:*
သင်၏ KBZPay / WavePay **Transaction ID နောက်ဆုံး ၄ လုံး** (သို့မဟုတ်) **ငွေလွှဲခဲ့သည့် ဖုန်းနံပါတ်** ကို ဤနေရာတွင် စာတိုအဖြစ် ပေးပို့ပေးပါ ခင်ဗျာ။`,
        getMainMenuKeyboard(env)
      );

      if (adminId) {
        const adminCaption = 
`💳 *NEW PAYMENT SUBMISSION (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint))*
• Student: @${cbUser.username || "NoUsername"} (\`${cbUser.id}\`)
• Name: ${cbUser.first_name || ""} ${cbUser.last_name || ""}
• Payment ID: #${paymentId}
• Note: Submitted via photo button`;

        await sendTelegramPhoto(botToken, adminId, fileId, adminCaption, {
          inline_keyboard: [
            [
              { text: "👑 Approve Lifetime (97k Ks)", callback_data: `approve:${cbUser.id}:${paymentId}:lifetime` },
              { text: "⚡ Approve 7-Day Sprint (5k Ks)", callback_data: `approve:${cbUser.id}:${paymentId}:sprint` },
              { text: "❌ Reject", callback_data: `reject:${cbUser.id}:${paymentId}` }
            ]
          ]
        });
      }
      return jsonResponse({ ok: true });
    }

    // BYOK Setup & Clear Callbacks
    if (data === "byok_setup") {
      await answerCallbackQuery(botToken, cb.id, "🔑 BYOK Free API Key Setup");
      await sendTelegramByokSetupPrompt(botToken, cbChatId, cbUserId, env);
      return jsonResponse({ ok: true });
    }
    if (data === "byok_clear") {
      await setTelegramByokKey(env, cbUserId, "");
      await answerCallbackQuery(botToken, cb.id, "🗑️ Removed BYOK API Key");
      await sendTelegramMessage(botToken, cbChatId, "🗑️ *Personal BYOK API Key Removed.* Reverted to standard daily free quota.");
      return jsonResponse({ ok: true });
    }

        // Quiz Evaluation Callback
    if (data.startsWith("quiz_eval:")) {
      const parts = data.split(":");
      const qIdx = parseInt(parts[1], 10);
      const optIdx = parseInt(parts[2], 10);
      const explanations = [
        {
          correct: 1, // B) stringent
          exp: "✅ *Correct Answer: B) stringent*\n\n*Why:* While 'strict' is common (Band 6.0), 'stringent regulations' is an authentic C2 institutional collocation that examiners look for to reward Band 8.5+ in Lexical Resource.\n\n*Burmese:* stringent = အလွန်တင်းကျပ်ပြီး တိကျခိုင်မာသော (ဥပဒေ/စည်းမျဉ်းများအတွက် အဆင့်မြင့်သုံးစွဲမှု)"
        },
        {
          correct: 1, // B) FALSE
          exp: "✅ *Correct Answer: B) FALSE*\n\n*Why:* The passage uses tentative modality ('suggested', 'might indicate', 'modest'), which directly contradicts the definitive assertion in the statement ('proved that the technique was effective'). Direct contradiction = FALSE.\n\n*Burmese:* Suggestion (အကြံပြုချက်/ယူဆချက်) နှင့် Proof (သက်သေပြနိုင်ခြင်း) တို့သည် ဖြောင့်ဖြောင့်ကြီး ဆန့်ကျင်နေသောကြောင့် FALSE ဖြစ်ပါသည်။"
        },
        {
          correct: 1, // B) Seldom do people realize...
          exp: "✅ *Correct Answer: B) Seldom do people realize...*\n\n*Why:* When a negative adverbial ('Seldom', 'Rarely', 'Not only') begins a sentence, standard English syntax requires inversion: Negative Adverb + Auxiliary Verb (do/does/did) + Subject + Main Verb.\n\n*Burmese:* Negative Inversion တွင် ဝါကျရှေ့ဆုံးသို့ Seldom ရောက်လာပါက အရန်ကြိယာ (do/does) ကို Subject ရှေ့သို့ ပို့ပေးရပါမည်။"
        }
      ];

      const item = explanations[qIdx] || explanations[0];
      const isRight = (optIdx === item.correct);
      const reply = (isRight ? "🎉 *EXCELLENT! BAND 8.5+ PRECISION!*\n" : "❌ *INCORRECT ATTEMPT*\n") + "\n" + item.exp;

      await sendTelegramMessage(botToken, cbChatId, reply, {
        inline_keyboard: [
          [{ text: "🧠 Try Another Drill", callback_data: "cmd_quiz" }],
          [{ text: "⚡ Open Studio Mini App", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.pages.dev" } }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    if (data === "cmd_quiz") {
      const qId = Math.floor(Math.random() * 3);
      const quizzes = [
        {
          q: "📚 *Academic Collocation Drill:*\n\n\"The municipal council agreed to implement ________ regulations to combat urban air pollution.\"\n\nWhich C2 academic adjective achieves Band 8.5+ precision?",
          opts: [
            { t: "A) strict", c: "quiz_eval:0:0" },
            { t: "B) stringent", c: "quiz_eval:0:1" },
            { t: "C) hard", c: "quiz_eval:0:2" },
            { t: "D) tough", c: "quiz_eval:0:3" }
          ]
        },
        {
          q: "📖 *Reading TFNG Arbiter Drill:*\n\n*Passage:* \"Dr. Roberts suggested that the preliminary experimental data might indicate a modest reduction in emissions.\"\n\n*Question:* \"Dr. Roberts proved that the technique was effective.\"",
          opts: [
            { t: "A) TRUE", c: "quiz_eval:1:0" },
            { t: "B) FALSE", c: "quiz_eval:1:1" },
            { t: "C) NOT GIVEN", c: "quiz_eval:1:2" }
          ]
        },
        {
          q: "⚖️ *Live Band Surgery (Grammatical Range):*\n\nWhich negative inverted structure is grammatically flawless for IELTS Task 2?",
          opts: [
            { t: "A) Seldom people realize the consequences...", c: "quiz_eval:2:0" },
            { t: "B) Seldom do people realize the consequences...", c: "quiz_eval:2:1" },
            { t: "C) Seldom people do realize the consequences...", c: "quiz_eval:2:2" }
          ]
        }
      ];
      const sel = quizzes[qId];
      await sendTelegramMessage(botToken, cbChatId, sel.q, {
        inline_keyboard: sel.opts.map(o => [{ text: o.t, callback_data: o.c }])
      });
      return jsonResponse({ ok: true });
    }

    // Telegram Stars Payment Callbacks (Lifetime vs Sprint)
    if (data === "pay_stars" || data === "pay_stars_lifetime") {
      if (isVip) {
        await answerCallbackQuery(botToken, cb.id, "👑 You are already a VIP user!");
        await sendTelegramMessage(botToken, cbChatId, `👑 *You are already a VIP user!*

Your account has full Lifetime VIP Access permanently active. All Cambridge CBT tests, 1,162 AWL flashcards, Academic AI tools, and Speaking mocks are completely unlocked!

No further payment is required. Enjoy unlimited preparation!`);
        return jsonResponse({ ok: true });
      }
      await answerCallbackQuery(botToken, cb.id);
      await sendStarsInvoice(botToken, cbChatId, cbUserId, "lifetime");
      return jsonResponse({ ok: true });
    }

    if (data === "pay_stars_sprint") {
      await answerCallbackQuery(botToken, cb.id);
      await sendStarsInvoice(botToken, cbChatId, cbUserId, "sprint");
      return jsonResponse({ ok: true });
    }

    // Language Menu Callback
    if (data === "menu_lang") {
      await answerCallbackQuery(botToken, cb.id);
      const langMsg =
`🌐 *CHOOSE YOUR BOT LANGUAGE PREFERENCE*
━━━━━━━━━━━━━━━━━━━━
Select how you would like IELTS Prep Studio Bot to interact with you:

• 🇬🇧 *English Only (Default):* Clean, examiner-grade academic English. Recommended for international test takers.
• 🇲🇲 *Bilingual (English + မြန်မာ):* Includes Burmese explanations, exam traps citations, and Myanmar mobile wallet details.`;

      await sendTelegramMessage(botToken, cbChatId, langMsg, {
        inline_keyboard: [
          [{ text: "🇬🇧 English Only (Default)", callback_data: "set_lang:en" }],
          [{ text: "🇲🇲 Bilingual (EN + မြန်မာ)", callback_data: "set_lang:my" }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    // Language Selection Callback
    if (data.startsWith("set_lang:")) {
      const selectedLang = data.replace("set_lang:", "").trim();
      try {
        await env.DB.prepare("UPDATE users SET preferred_lang = ? WHERE telegram_id = ?").bind(selectedLang, cbUserId).run();
      } catch (e) {}

      const confirmText = selectedLang === "en"
        ? "✓ Switched to English Only"
        : "✓ မြန်မာဘာသာစကား သို့ ပြောင်းလဲပြီးပါပြီ";
      await answerCallbackQuery(botToken, cb.id, confirmText);

      const replyMsg = selectedLang === "en"
        ? "🇬🇧 *Language preference set to English Only.* All study tools and bot menus will now default to English."
        : "🇲🇲 *ဘာသာစကားအား မြန်မာ + အင်္ဂလိပ် သို့ ပြောင်းလဲထားပါသည်။* လေ့လာမှု လမ်းညွှန်ချက်များနှင့် စာမေးပွဲ ရှင်းလင်းချက်များကို မြန်မာဘာသာဖြင့် ဖော်ပြပေးပါမည်။";
      await sendTelegramMessage(botToken, cbChatId, replyMsg, getMainMenuKeyboard(env, isVip));
      return jsonResponse({ ok: true });
    }

    // Voucher Redeem Callback
    if (data === "menu_redeem") {
      await answerCallbackQuery(botToken, cb.id);
      const redeemMsg =
`🎟️ *REDEEM VIP VOUCHER CODE*
━━━━━━━━━━━━━━━━━━━━
Have a lifetime voucher code (e.g. \`IPS-VIP-XXXX-YYYY\`)?

• Launch the Studio Mini App and paste it in the VIP Pass modal to activate instantly across all devices.
• Or reply directly with your code here (e.g. \`/redeem IPS-VIP-101\`).`;
      await sendTelegramMessage(botToken, cbChatId, redeemMsg, {
        inline_keyboard: [
          [{ text: "🚀 Open Studio to Redeem", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.web.app" } }]
        ]
      });
      return jsonResponse({ ok: true });
    }

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

    if (data === "tool_cloze") {
      await answerCallbackQuery(botToken, cb.id);
      await handleClozeCommand(cbChatId, cbUserId, "urban sustainability", env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data === "tool_podcast" || data === "pod_ielts" || data === "pod_bbc" || data === "pod_energy" || data === "pod_cambridge" || data === "pod_speak") {

      await answerCallbackQuery(botToken, cb.id);

      let chan = "ielts";

      if (data === "pod_bbc") chan = "bbc";

      else if (data === "pod_energy") chan = "energy";

      else if (data === "pod_cambridge" || data === "pod_speak") chan = "speak";

      await handlePodcastCommand(cbChatId, cbUserId, chan, env, botToken);

      return jsonResponse({ ok: true });

    }



    if (data.startsWith("pod_play:")) {

      await answerCallbackQuery(botToken, cb.id, "Streaming English episode to Telegram...");

      const parts = data.split(":");

      const chan = parts[1] || "ielts";

      const idx = parseInt(parts[2] || "0", 10);

      await handlePlayPodcastEpisode(cbChatId, cbUserId, chan, idx, env, botToken);

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

    if (data.startsWith("wiki_p:")) {
      const parts = data.split(":");
      const cacheId = parts[1];
      const pageIdx = parseInt(parts[2], 10) || 0;
      await handleWikiPageCallback(cbChatId, cbUserId, cbMessageId, cb.id, cacheId, pageIdx, env, botToken);
      return jsonResponse({ ok: true });
    }

    if (data === "wiki_noop") {
      await answerCallbackQuery(botToken, cb.id, "Use ⬅️ Prev / Next ➡️ to navigate pages.");
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

    // 1.05 Pricing & Cancel VIP Slip Handlers
    if (data === "pricing") {
      await answerCallbackQuery(botToken, cb.id);
      const pricingMsg = 
`👑 *IELTS PREP STUDIO — LIFETIME VIP PASS*
━━━━━━━━━━━━━━━━━━━━
Examiner-Grade CBT Mocks • Band 9 Models • 1,162 Academic Lexicon & Traps

⭐ *Worldwide Investment:* *1,350 ★ Stars (Lifetime) / 75 ★ Stars (Sprint)*
🇲🇲 *Myanmar Local Price:* *97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)* (KBZPay / WavePay)
_One-Time Investment • Lifetime Access • Zero Subscriptions_

🎁 *Everything You Unlock Forever:*
• 🔤 All 1,162 Vocabulary Items, Native Audio & 1-3-7 SRS
• 📖 All 23 Cambridge Reading CBT Passages (231 Questions)
• ✍️ All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Analyzer
• 🎙️ All 30 Speaking Forecast Topics & 5 Frameworks
• ⚡ Unlimited VIP Academic Tools (/collocate, /syn, /read, /dict, /quote)
• ☁️ Multi-Device Cloud Sync + Desktop PC VIP Voucher Code

👇 *ငွေပေးချေမှု စနစ်ကို အောက်ပါ Menu မှ ရွေးချယ်နိုင်ပါသည်:*`;

      await sendTelegramMessage(botToken, cbChatId, pricingMsg, {
        inline_keyboard: [
          [{ text: "🇲🇲 KBZPay / WavePay Slip (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint) — Myanmar)", callback_data: "info_payment" }],
          [{ text: "⭐️ Pay with Telegram Stars (750 ★ Instant Worldwide)", callback_data: "pay_stars" }],
          [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
        ]
      });
      return jsonResponse({ ok: true });
    }

    if (data === "cancel_vip_slip") {
      try {
        await env.DB.prepare("UPDATE users SET pending_tool = NULL WHERE telegram_id = ?").bind(cbUserId).run();
      } catch (e) {}
      await answerCallbackQuery(botToken, cb.id, "VIP purchase cancelled.");
      await sendTelegramMessage(botToken, cbChatId, "ℹ️ VIP ဝယ်ယူမှုအား ပယ်ဖျက်လိုက်ပါပြီ။ လိုအပ်ပါက အချိန်မရွေး ပြန်လည် ဝယ်ယူနိုင်ပါသည်။");
      return jsonResponse({ ok: true });
    }

    // 1. Info payment button
    if (data === "info_payment") {
      if (isVip) {
        await answerCallbackQuery(botToken, cb.id, "👑 You are already a VIP user!");
        const activeMsg = 
`👑 *YOU ARE ALREADY A VIP USER!*
━━━━━━━━━━━━━━━━━━━━
✅ You are already a Lifetime VIP user! All 1,162 Vocabulary items, 23 Cambridge Reading CBT Passages, and 40 Writing Models are completely unlocked!

No payment is required.

👨‍🏫 For instructor support, reach out directly to @hyuguo.`;
        if (cbMessageId) {
          await editTelegramMessageText(botToken, cbChatId, cbMessageId, activeMsg, {
            inline_keyboard: [
              [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }],
              [{ text: "⚡ VIP Academic Tools", callback_data: "menu_tools" }],
              [{ text: "💬 Chat with Lead Instructor (@hyuguo)", url: "https://t.me/hyuguo" }]
            ]
          });
        }
        return jsonResponse({ ok: true });
      }

      // Flag user as actively awaiting slip submission
      try {
        await env.DB.prepare("UPDATE users SET pending_tool = 'vip_slip' WHERE telegram_id = ?").bind(cbUserId).run();
      } catch (e) {
        console.error("[Set pending_tool vip_slip Error]", e);
      }

      await answerCallbackQuery(botToken, cb.id, "KBZPay / WavePay: 09-768691939 (Lyan Htet)");
      const payMsg = 
`💳 *LIFETIME STUDIO VIP PASS — 97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)*
━━━━━━━━━━━━━━━━━━━━
📱 *KBZPay / WavePay:* \`${env.PAYMENT_PHONE || "09-768691939"}\`
👤 *Account Name:* *${env.ACCOUNT_NAME || "Lyan Htet"}*
💰 *Amount:* *97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)* (Lifetime Access)

📸 *ငွေလွှဲပြီးပါက:*
ငွေလွှဲပြေစာ Screenshot (Slip) ကို ဤ Chat သို့ ချက်ချင်း ပေးပို့ပေးပါ ခင်ဗျာ။ Admin ထံသို့ စစ်ဆေးအတည်ပြုရန် ချက်ချင်း တင်ပြပေးပါမည်!`;
      await sendTelegramMessage(botToken, cbChatId, payMsg, {
        inline_keyboard: [
          [{ text: "❌ Cancel / မဝယ်တော့ပါ", callback_data: "cancel_vip_slip" }],
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
Open ${env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/"} on computer and log in with Telegram!`;

      if (cbMessageId) {
        await editTelegramMessageText(botToken, cbChatId, cbMessageId, statusMsg, {
          inline_keyboard: [
            [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }],
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
            [{ text: "🚀 Practice in Mini App", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
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
            [{ text: `🎯 Target Band: ${updatedUser.target_band || 7.5} (Change)`, callback_data: "target_band_menu" }],
            [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
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
            [{ text: `🎯 Target Band: ${band} (Change)`, callback_data: "target_band_menu" }],
            [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
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
            [{ text: "🎯 Band 6.0", callback_data: "set_band:6.0" }, { text: "🎯 Band 6.5", callback_data: "set_band:6.5" }],
            [{ text: "🎯 Band 7.0", callback_data: "set_band:7.0" }, { text: "🎯 Band 7.5", callback_data: "set_band:7.5" }],
            [{ text: "🎯 Band 8.0", callback_data: "set_band:8.0" }, { text: "🎯 Band 8.5", callback_data: "set_band:8.5" }],
            [{ text: "🎯 Band 9.0 Expert Master", callback_data: "set_band:9.0" }],
            [{ text: "⏪ Back to Countdown", callback_data: "reset_exam_prompt" }]
          ]
        });
      }
      return jsonResponse({ ok: true });
    }

    // Admin Approval, Rejection & Spreadsheet Export
    if (String(cb.from.id) === String(adminId)) {
      if (data === "admin_export_csv") {
        await answerCallbackQuery(botToken, cb.id, "Generating spreadsheet...");
        try {
          const { csv, count } = await generateCustomersCSV(env);
          const nowMmt = new Date().toLocaleString("en-GB", { timeZone: "Asia/Yangon" });
          const fileName = `ielts_vip_customers_${new Date().toISOString().slice(0, 10)}.csv`;
          const caption = 
`📊 *IELTS PREP STUDIO — VIP CUSTOMERS SPREADSHEET*
━━━━━━━━━━━━━━━━━━━━
👥 Total Approved VIP Students: *${count}*
🕒 Generated: \`${nowMmt} MMT\``;
          await sendTelegramDocument(botToken, cbChatId, csv, fileName, caption);
        } catch (err) {
          console.error("[Export CSV Callback Error]", err);
          await sendTelegramMessage(botToken, cbChatId, `❌ Failed to generate spreadsheet: ${err.message}`);
        }
        return jsonResponse({ ok: true });
      }
      if (data.startsWith("approve:")) {
        const parts = data.split(":");
        const targetTgId = parts[1];
        const paymentId = parts[2];
        const planTier = parts[3] || "lifetime";
        const isSprint = (planTier === "sprint");
        const numTgId = parseInt(targetTgId, 10);
        const nowMs = Date.now();
        const bonusMs = 7 * 24 * 60 * 60 * 1000;
        const expiresAt = isSprint ? (nowMs + bonusMs) : 0;

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
        const desktopVoucher = isSprint ? `IPS-SPRINT-${Math.floor(100 + Math.random() * 900)}` : generateRandomCode();
        await env.DB.prepare(`
          INSERT INTO promo_codes (code, is_used, used_by_tg_id, used_at, plan_type)
          VALUES (?, 1, ?, unixepoch(), ?)
        `).bind(desktopVoucher, numTgId, isSprint ? "sprint" : "lifetime").run();

        // Update D1: users and payments
        if (isSprint) {
          await env.DB.prepare(`
            INSERT INTO users (telegram_id, is_vip, vip_activated_at, vip_expires_at, updated_at)
            VALUES (?, 1, unixepoch(), ?, unixepoch())
            ON CONFLICT(telegram_id) DO UPDATE SET
              is_vip = 1,
              vip_activated_at = COALESCE(vip_activated_at, unixepoch()),
              vip_expires_at = CASE WHEN vip_expires_at > ? THEN vip_expires_at + ? ELSE ? + ? END,
              updated_at = unixepoch()
          `).bind(numTgId, nowMs + bonusMs, nowMs, bonusMs, nowMs, bonusMs).run();
        } else {
          await env.DB.prepare(`
            INSERT INTO users (telegram_id, is_vip, vip_activated_at, vip_expires_at, updated_at)
            VALUES (?, 1, unixepoch(), 0, unixepoch())
            ON CONFLICT(telegram_id) DO UPDATE SET
              is_vip = 1,
              vip_activated_at = COALESCE(vip_activated_at, unixepoch()),
              vip_expires_at = 0,
              updated_at = unixepoch()
          `).bind(numTgId).run();
        }

        if (paymentId && paymentId !== "pending") {
          await env.DB.prepare("UPDATE payments SET status = 'approved', plan_tier = ?, amount_mmk = ? WHERE id = ?").bind(isSprint ? "sprint" : "lifetime", isSprint ? 5000 : 97000, paymentId).run();
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

        // Auto-Sync to Google Sheets Webhook if configured
        const sheetWebhook = env.GOOGLE_SHEETS_WEBHOOK_URL || env.SHEET_WEBHOOK_URL;
        if (sheetWebhook && ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(
            fetch(sheetWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "VIP_APPROVED",
                timestamp: nowMmt,
                paymentId: paymentId || "-",
                telegramId: numTgId,
                username: username ? "@" + username : "",
                name: (targetUser && targetUser.first_name) || "",
                amount: 97000,
                currency: "MMK",
                voucherCode: desktopVoucher,
                status: "APPROVED"
              })
            }).catch(e => console.error("[Google Sheets Auto-Sync Error]", e))
          );
        }

        await answerCallbackQuery(botToken, cb.id, isSprint ? "⚡ User upgraded to 7-Day Sprint!" : "✅ User upgraded to Lifetime VIP!");
        
        // Notify Student with Telegram unlock + Desktop Voucher
        const expiryDateStr = isSprint ? new Date(nowMs + bonusMs).toLocaleDateString("en-GB", { timeZone: "Asia/Yangon" }) : "Never (Lifetime)";
        const notifyMsg = isSprint ?
`🎉 *Congratulations! Your 7-Day Sprint VIP Pass is ACTIVE!*

Your 5,000 MMK payment has been verified.
⚡ *Sprint Duration:* 7 Full Days (Valid until ${expiryDateStr} MMT)
All 1,162 Vocabulary items, 23 Cambridge Reading CBT Passages, 40 Writing Models, and Speaking Forecasts are now unlocked for your sprint! 🚀

💻 *Study on Computer / Laptop (Chrome or Edge):*
Your Personal Desktop Sprint Pass:
\`${desktopVoucher}\`

Visit: ${env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/"}
Click **⭐ VIP Pass** > Enter Voucher: \`${desktopVoucher}\` > Unlock Instantly!`
:
`🎉 *Congratulations! Your Lifetime VIP Pass is ACTIVE!*

Your 97,000 MMK payment has been verified.
All 1,162 Vocabulary items, 23 Cambridge Reading CBT Passages, 40 Writing Models, and Speaking Forecasts are now unlocked forever! 🚀

💻 *Study on Computer / Laptop (Chrome or Edge):*
Your Personal Desktop Lifetime Pass:
\`${desktopVoucher}\`

Visit: ${env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/"}
Click **⭐ VIP Pass** > Enter Voucher: \`${desktopVoucher}\` > Unlock Instantly!`;

        await sendTelegramMessage(botToken, numTgId, notifyMsg, {
          inline_keyboard: [
            [{ text: "👑 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }],
            [{ text: "🌐 Open on Web Browser ↗", url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" }]
          ]
        });

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
We were unable to verify your 97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint) transaction slip.
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
          [{ text: "🧠 Review SRS Cards Now", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }],
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

async function sendTelegramChatAction(botToken, chatId, action = "typing") {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: action })
    });
  } catch (e) {}
}

const memoryByokCache = new Map();

async function getTelegramByokKey(env, userId) {
  if (!userId) return "";
  const cacheKey = String(userId);
  if (memoryByokCache.has(cacheKey)) return memoryByokCache.get(cacheKey);
  const kv = env.VIP_KV || env.BOT_STATE;
  if (!kv) return "";
  try {
    const key = (await kv.get(`byok_key:${userId}`)) || "";
    if (key) memoryByokCache.set(cacheKey, key);
    return key;
  } catch (e) {
    return "";
  }
}

async function setTelegramByokKey(env, userId, apiKey) {
  if (!userId) return;
  const cacheKey = String(userId);
  const clean = (apiKey || "").trim().replace(/^["']|["']$/g, "");
  if (clean) {
    memoryByokCache.set(cacheKey, clean);
  } else {
    memoryByokCache.delete(cacheKey);
  }
  const kv = env.VIP_KV || env.BOT_STATE;
  if (!kv) return;
  try {
    if (clean) {
      await kv.put(`byok_key:${userId}`, clean);
    } else {
      await kv.delete(`byok_key:${userId}`);
    }
  } catch (e) {}
}

async function sendTelegramByokSetupPrompt(botToken, chatId, userId, env) {
  const existingKey = await getTelegramByokKey(env, userId);
  const masked = existingKey
    ? `✅ *ACTIVE* (\`${existingKey.slice(0, 6)}...${existingKey.slice(-4)}\`) — *Unlimited Free AI Unlocked*`
    : `⚪ *Not Set* (Using 10/day standard free quota)`;

  const msg =
`🔑 *FREE TIER BYOK — BRING YOUR OWN GEMINI API KEY*
━━━━━━━━━━━━━━━━━━━━
Status: ${masked}

Unlock *Unlimited 24/7 AI Mentor queries* on the Free Tier by connecting your own free Google Gemini API key!

1️⃣ Get your free key from Google AI Studio:
👉 [create your api key here(100% free)](https://aistudio.google.com/api-keys)

2️⃣ Copy your Google AI Studio key (starts with \`AQ...\` or \`AIza...\`) and *paste it directly into this chat* (or send \`/byok <your-key>\`).`;

  const kb = [
    [{ text: "🔑 create your api key here(100% free) ↗", url: "https://aistudio.google.com/api-keys" }]
  ];
  if (existingKey) {
    kb.push([{ text: "🗑️ Remove Saved BYOK Key", callback_data: "byok_clear" }]);
  }
  kb.push([{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.web.app" } }]);

  await sendTelegramMessage(botToken, chatId, msg, { inline_keyboard: kb });
}

async function callDirectByokGeminiTelegram(apiKey, systemPrompt, userPrompt) {
  const models = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-flash-lite-latest", "gemini-3.8-flash", "gemini-flash-latest"];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 1200 }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (txt) return { text: txt.trim(), model };
      }
    } catch (e) {}
  }
  return null;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

async function callDirectByokGeminiVisionTelegram(apiKey, imageBase64, mimeType, systemPrompt, userPrompt) {
  const models = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-flash-lite-latest", "gemini-3.8-flash", "gemini-flash-latest"];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const parts = [
        { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } }
      ];
      if (userPrompt) {
        parts.push({ text: userPrompt });
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: parts }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 1400 }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (txt) return { text: txt.trim(), model };
      }
    } catch (e) {}
  }
  return null;
}

async function handleTelegramAiMentorQuery(env, botToken, chatId, userId, promptText) {
  if (!promptText || promptText.trim().length === 0) return;
  const cleanPrompt = promptText.trim();

  await sendTelegramChatAction(botToken, chatId, "typing");

  const userByokKey = await getTelegramByokKey(env, userId);
  const hasByok = userByokKey.length >= 20;
  const isVip = await resolveIsVip(env, userId);
  const quota = hasByok ? { allowed: true, remaining: 999 } : await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId,
`⚠️ *DAILY AI MENTOR QUOTA REACHED (10/10)*
━━━━━━━━━━━━━━━━━━━━
You have reached your daily built-in free limit of 10 AI queries today.

🔑 *Want Unlimited AI Mentor on the Free Tier (100% Free)?*
Connect your own free Google Gemini API key (BYOK):
👉 [create your api key here(100% free)](https://aistudio.google.com/api-keys)
Then simply paste your Google AI Studio key (\`AQ...\` or \`AIza...\`) right here in the chat!

👑 Or upgrade to *Lifetime VIP Pass (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint))* for zero-setup unlimited access across all devices!`,
      {
        inline_keyboard: [
          [{ text: "🔑 create your api key here(100% free) ↗", url: "https://aistudio.google.com/api-keys" }],
          [{ text: "⚙️ How to Set Free BYOK Key", callback_data: "byok_setup" }],
          [{ text: "👑 Get VIP Pass (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint))", callback_data: "pay_manual" }],
          [{ text: "⭐ Pay with Telegram Stars (750 Stars)", callback_data: "pay_stars" }]
        ]
      }
    );
    return;
  }

  const systemPrompt = `You are the Cambridge AI Mentor & In-App Copilot for IELTS Prep Studio.
You provide Band 8.5+ IELTS preparation advice, essay evaluations, speaking frameworks, and vocabulary.
Keep explanations structured, concise, and highly actionable. Format with clean bullet points and clear headings.
Support both English and Burmese (မြန်မာဘာသာ) when appropriate.`;

  let replyText = "";
  let modelUsed = "Llama 3.2 3B";

  if (hasByok) {
    const byokResult = await callDirectByokGeminiTelegram(userByokKey, systemPrompt, cleanPrompt);
    if (byokResult && byokResult.text) {
      replyText = byokResult.text;
      modelUsed = `BYOK (${byokResult.model})`;
    }
  }

  if (env.AI) {
    try {
      const aiRes = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: cleanPrompt }
        ],
        max_tokens: 700
      });
      replyText = (aiRes && (aiRes.response || aiRes.text)) || (typeof aiRes === "string" ? aiRes : "");
    } catch (e) {
      console.warn("[Telegram AI Mentor] Primary Workers AI busy:", e);
    }
  }

  if (!replyText) {
    try {
      const pRes = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: cleanPrompt }
          ],
          seed: 42
        })
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData && pData.choices && pData.choices[0] && pData.choices[0].message) {
          replyText = pData.choices[0].message.content.trim();
          modelUsed = "High-Speed Neural Core";
        }
      }
    } catch (e2) {
      console.error("[Telegram AI Mentor] Secondary failover error:", e2);
    }
  }

  if (!replyText) {
    await sendTelegramMessage(botToken, chatId,
`⚠️ *AI MENTOR CONNECTION NOTICE*
━━━━━━━━━━━━━━━━━━━━
The Cambridge AI Mentor is experiencing high traffic. Please try asking again in a few moments or open the web app to chat live!`,
      {
        inline_keyboard: [
          [{ text: "🚀 Open Web App AI Mentor", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.web.app" } }]
        ]
      }
    );
    return;
  }

  const quotaNote = hasByok ? `🔑 BYOK Unlimited Free Tier (${modelUsed})` : isVip ? "👑 VIP Unlimited" : `📊 Quota: ${quota.remaining} queries left today`;
  const formattedMsg = `🤖 *CAMBRIDGE AI MENTOR*\n━━━━━━━━━━━━━━━━━━━━\n${replyText}\n\n_${quotaNote} • Cambridge AI Core_`;

  await sendTelegramMessage(botToken, chatId, formattedMsg, {
    inline_keyboard: [
      [{ text: "🚀 Continue in Studio Web App", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio.web.app" } }],
      [{ text: "👑 VIP Pass Info", callback_data: "pricing" }]
    ]
  });
}

async function sendTelegramMessage(botToken, chatId, text, replyMarkup = null, disablePreview = false) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown"
  };
  if (disablePreview) payload.disable_web_page_preview = true;
  if (replyMarkup) payload.reply_markup = replyMarkup;

  let res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    try {
      const errJson = await res.clone().json();
      if (errJson && errJson.description && errJson.description.toLowerCase().includes("parse")) {
        delete payload.parse_mode;
        res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {}
  }
  return res;
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



async function sendTelegramAudio(botToken, chatId, audioUrl, title, performer, caption = "", duration = 0, replyMarkup = null) {

  const payload = {

    chat_id: chatId,

    audio: audioUrl,

    title: title,

    performer: performer,

    caption: caption,

    parse_mode: "Markdown"

  };

  if (duration > 0) payload.duration = duration;

  if (replyMarkup) payload.reply_markup = replyMarkup;



  return fetch(`https://api.telegram.org/bot${botToken}/sendAudio`, {

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

async function sendStarsInvoice(botToken, chatId, userId, plan = "lifetime") {
  const isSprint = (plan === "sprint");
  const amount = isSprint ? 75 : 1350;
  const title = isSprint ? "IELTS Prep Studio — 7-Day Sprint Pass" : "IELTS Prep Studio — Lifetime VIP Pass";
  const desc = isSprint
    ? "7-Day Full VIP Access: All 23 Cambridge Reading CBTs, 40 Writing Models, Live Band Surgery, 1,162 Academic Lexicon & VIP Tools."
    : "Lifetime VIP: All 23 Cambridge Reading CBTs, 40 Writing Models, AI Examiner scoring, 1,162 Academic Lexicon & VIP Tools forever.";
  const payload = JSON.stringify({
    type: isSprint ? "vip_sprint" : "vip_lifetime",
    userId: userId,
    plan: isSprint ? "sprint" : "lifetime",
    nonce: Date.now()
  });

  return await fetch(`https://api.telegram.org/bot${botToken}/sendInvoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      title: title,
      description: desc,
      payload: payload,
      provider_token: "",
      currency: "XTR",
      prices: [{ label: isSprint ? "7-Day Sprint Pass" : "Lifetime VIP Studio Pass", amount: amount }]
    })
  });
}

async function handleCreateStarsInvoice(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || 0;
    const plan = (body.plan === "sprint") ? "sprint" : "lifetime";
    const isSprint = (plan === "sprint");
    const amount = isSprint ? 75 : 1350;
    const botToken = env.BOT_TOKEN;
    if (!botToken) {
      return jsonResponse({ error: "BOT_TOKEN not configured" }, 500);
    }
    const payload = JSON.stringify({
      type: isSprint ? "vip_sprint" : "vip_lifetime",
      userId: userId,
      plan: plan,
      nonce: Date.now()
    });

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: isSprint ? "IELTS Prep Studio — 7-Day Sprint Pass" : "IELTS Prep Studio — Lifetime VIP Pass",
        description: isSprint 
          ? "7-Day Full VIP Access: All 23 Cambridge Reading CBTs, 40 Writing Models, Live Band Surgery, 1,162 Academic Lexicon & VIP Tools."
          : "Lifetime access: 23 Cambridge Reading CBTs, 40 Writing Models, AI Examiner scoring, 1,162 Academic Lexicon & VIP Tools.",
        payload: payload,
        provider_token: "",
        currency: "XTR",
        prices: [{ label: isSprint ? "7-Day Sprint Pass" : "Lifetime VIP Studio Pass", amount: amount }]
      })
    });
    const res = await resp.json();
    if (res.ok && res.result) {
      return jsonResponse({ success: true, invoiceLink: res.result });
    }
    return jsonResponse({ error: res.description || "Failed to create invoice link" }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
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
  { command: "login", description: "💻 1-Click Desktop Browser Login (Chrome/Edge)" },
  { command: "referral", description: "🎁 Referral Program: Invite Friends & Earn +7 Days VIP" },
  { command: "invite", description: "👥 Invite Link & Referral Stats (+7 Days VIP)" },
  { command: "vip", description: "💎 VIP Pass Plans & Pricing (5,000 Ks / 97,000 Ks)" },
  { command: "app", description: "📱 Open Telegram Mini App" },
  { command: "tools", description: "⚡ VIP Academic Lexicon & Topic Tools" },
  { command: "cloze", description: "🔬 Scholarly Cloze Drill (/cloze <topic>)" },
  { command: "podcast", description: "🎙️ Cambridge & BBC Podcasts (/podcast [bbc|cambridge])" },
  { command: "collocate", description: "📚 Collocations (/collocate <word>)" },
  { command: "syn", description: "💎 Band 8.5+ Synonyms (/syn <word>)" },
  { command: "read", description: "📖 Academic Topic Briefs (/read <topic>)" },
  { command: "dict", description: "📖 Live Academic Dictionary (/dict <word>)" },
  { command: "sprint", description: "⏱️ Exam Focus Sprint (/sprint 20 or /sprint 40)" },
  { command: "help", description: "❓ Student Guide & Commands Help" }
];

async function getUserVipVoucher(env, userId) {
  if (!userId) return null;
  const adminId = env.ADMIN_TG_ID || env.ADMIN_CHAT_ID || "";
  if (adminId && String(userId) === String(adminId)) {
    return "VIP-5X2V-BQQK";
  }
  try {
    const promo = await env.DB.prepare(
      "SELECT code FROM promo_codes WHERE used_by_tg_id = ? ORDER BY used_at DESC LIMIT 1"
    ).bind(userId).first();
    if (promo && promo.code) return promo.code;
  } catch (e) {
    console.warn("[getUserVipVoucher Error]", e);
  }
  return null;
}

function getStudioLaunchUrl(env, userId = null, voucher = null, name = null) {
  const base = (env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app").replace(/\/+$/, "");
  const params = [];
  if (voucher) params.push(`voucher=${encodeURIComponent(voucher)}`);
  if (userId) params.push(`tg_user=${encodeURIComponent(userId)}`);
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  return params.length ? `${base}/?${params.join("&")}` : `${base}/`;
}

async function registerBotCommands(botToken, studioUrl = "https://ielts-prep-studio-olive.vercel.app/") {
  if (!botToken) return { ok: false, error: "No bot token" };
  try {
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: BOT_COMMANDS })
    });
    const cleanUrl = studioUrl.replace(/\/+$/, "");
    await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "Open App",
          web_app: {
            url: cleanUrl
          }
        }
      })
    });
    return await resp.json();
  } catch (err) {
    console.error("[registerBotCommands Error]", err);
    return { ok: false, error: err.message };
  }
}

// Persistent Reply Keyboard (with Open App and /start for new users)
function getPrimaryKeyboard(env = null, userId = null, voucher = null) {
  return {
    keyboard: [
      [{ text: "🚀 Start Menu" }]
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: "Tap 🚀 Start Menu to explore"
  };
}

function getMainMenuKeyboard(env, isVip = false, userId = null, voucher = null) {
  const launchUrl = getStudioLaunchUrl(env, userId, voucher);
  
  if (isVip) {
    return {
      keyboard: [
        [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: launchUrl } }],
        [{ text: "🤖 Cambridge AI Mentor" }, { text: "⚡ VIP Academic Tools" }],
        [{ text: "👑 VIP Status: Active" }],
        [{ text: "📖 Scholarly Cloze Drill" }, { text: "🎙️ Native Podcasts" }],
        [{ text: "📚 Curriculum & Features" }, { text: "📊 My Study & VIP Status" }],
        [{ text: "💬 Chat with Lead Instructor" }, { text: "📅 Exam Countdown" }],
        [{ text: "💡 Band 9 Tip of the Day" }, { text: "👨‍🏫 Contact Support" }],
        [{ text: "🌐 Language (EN/မြန်မာ)" }, { text: "📕 How To Use & Guide" }],
        [{ text: "🔽 Collapse Menu" }]
      ],
      resize_keyboard: true,
      is_persistent: false,
      input_field_placeholder: "VIP Unlocked • Tap 🔽 Collapse to hide"
    };
  }

  return {
    keyboard: [
      [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: launchUrl } }],
      [{ text: "🤖 Cambridge AI Mentor" }, { text: "⚡ VIP Academic Tools" }],
      [{ text: "👑 Buy VIP (750 ★ / 55k)" }],
      [{ text: "📚 Curriculum & Features" }, { text: "📊 My Study & VIP Status" }],
      [{ text: "💳 Payment Info" }, { text: "📅 Exam Countdown" }],
      [{ text: "💡 Band 9 Tip of the Day" }, { text: "👨‍🏫 Contact Support" }],
      [{ text: "🌐 Language (EN/မြန်မာ)" }, { text: "📕 How To Use & Guide" }],
      [{ text: "🔽 Collapse Menu" }]
    ],
    resize_keyboard: true,
    is_persistent: false,
    input_field_placeholder: "Choose an option or tap 🔽 Collapse"
  };
}

// Interactive Curriculum Catalog Keyboards & Module Details (Matching Reference Screenshot 1 & 2)
function getCurriculumCatalogKeyboard(env, isVip = false) {
  const ctaButton = isVip
    ? { text: "⚡ VIP Academic Tools", callback_data: "menu_tools" }
    : { text: "💳 How to Pay (97,000 Ks (Lifetime) / 5,000 Ks (Sprint))", callback_data: "info_payment" };
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
        { text: "🚀 Launch Mini App", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } },
        ctaButton
      ]
    ]
  };
}

function getModuleKeyboard(moduleId, env, isVip = false) {
  const topButton = isVip
    ? [{ text: "👑 Unlocked in Lifetime VIP", callback_data: "vip_status" }]
    : [{ text: "⭐ Unlock in Lifetime VIP (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint))", callback_data: "info_payment" }];
  return {
    inline_keyboard: [
      topButton,
      [{ text: "🚀 Open in IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }],
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
💎 *One-Time Investment:* *97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)* (Lifetime Unlimited • No Monthly Subscription)

🎁 *What You Unlock Forever:*
• All 1,162 Vocabulary Items, Native Audio & 1-3-7 SRS
• All 23 Cambridge Reading CBT Passages & 231 Questions
• All 40 Writing Task 1 & Task 2 Models + CEFR 90/10 Analyzer
• All 30 Speaking Forecast Topics & 5 Frameworks
• Multi-Device Cloud Sync + Desktop PC VIP Voucher Code

💳 *To Activate:*
Transfer 97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint) to KBZPay/WavePay: \`09-768691939\` (Lyan Htet) and send your slip screenshot here!`
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
      paymentText = `✅ *ငွေလွှဲ အတည်ပြုပြီး (Approved)*\n  _97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint) Lifetime Access Granted_`;
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

  const launchUrl = getStudioLaunchUrl(env, userId, vipVoucher);
  const inlineKeyboard = [];
  if (!isVip) {
    inlineKeyboard.push([{ text: "👑 Upgrade to Lifetime VIP (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint))", callback_data: "info_payment" }]);
  }
  inlineKeyboard.push([
    { text: "🚀 Launch Studio Now", web_app: { url: launchUrl } },
    { text: "📅 Exam Countdown", callback_data: "view_exam" }
  ]);
  inlineKeyboard.push([
    { text: "💡 Band 9 Tip of the Day", callback_data: "next_tip" },
    { text: "📚 Curriculum Catalog", callback_data: "mod_catalog_back" }
  ]);
  if (isVip && vipVoucher) {
    inlineKeyboard.push([
      { text: "🌐 Open on PC / Laptop ↗", url: launchUrl }
    ]);
  }

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
      [{ text: `🎯 Target Band: ${user && user.target_band ? user.target_band : 7.5} (Change)`, callback_data: "target_band_menu" }],
      [{ text: "🚀 Launch Studio Now", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
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
          [{ text: "🚀 Open IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
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
  const adminId = env.ADMIN_TG_ID || env.ADMIN_CHAT_ID || "";
  if (telegramId && adminId && String(telegramId) === String(adminId)) {
    return true;
  }
  if (telegramId && parseInt(telegramId, 10) > 0) {
    const user = await env.DB.prepare("SELECT is_vip, vip_expires_at FROM users WHERE telegram_id = ?").bind(parseInt(telegramId, 10)).first();
    if (user && user.is_vip === 1) {
      if (user.vip_expires_at && user.vip_expires_at > 0) {
        if (Date.now() > user.vip_expires_at) {
          // 7-Day Sprint Pass has expired! Lazily update DB
          try {
            await env.DB.prepare("UPDATE users SET is_vip = 0 WHERE telegram_id = ?").bind(parseInt(telegramId, 10)).run();
          } catch (e) {}
          return false;
        }
      }
      return true;
    }
  }
  if (voucherCode) {
    const cleanCode = String(voucherCode).trim().toUpperCase();
    const codeHash = await sha256Hex(cleanCode);
    const v = await env.DB.prepare("SELECT * FROM vouchers WHERE code_hash = ? AND revoked = 0").bind(codeHash).first();
    if (v) {
      if (v.expires_at && v.expires_at > 0 && Date.now() > v.expires_at) {
        return false;
      }
      return true;
    }
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

  // Free users have 10 queries per day in Asia/Yangon time
  const dateStr = getYangonDateStr();
  const safeId = parseInt(telegramId, 10) || 0;

  const row = await env.DB.prepare(
    "SELECT count FROM daily_quota WHERE telegram_id = ? AND date_str = ?"
  ).bind(safeId, dateStr).first();

  const currentCount = row ? (row.count || 0) : 0;
  const FREE_DAILY_LIMIT = 10;

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
  const FREE_DAILY_LIMIT = 10;
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

const CURATED_ACADEMIC_LEXICON = {
  "important": {
    "pos": "adj",
    "meaning_mm": "အရေးပါသော / အဓိကကျသော / မရှိမဖြစ် လိုအပ်သော",
    "collocations": {
      "verb_noun": [
        "play a pivotal role",
        "assume paramount importance",
        "warrant urgent attention",
        "attach significant weight to"
      ],
      "adj_noun": [
        "paramount importance",
        "critical factor",
        "indispensable component",
        "salient feature",
        "vital prerequisite"
      ],
      "adv_adj": [
        "vitally important",
        "critically significant",
        "profoundly impactful",
        "exceptionally crucial"
      ],
      "prep_phrase": [
        "of paramount significance to",
        "at a crucial juncture in",
        "central to the discussion on"
      ],
      "frame": "It is widely acknowledged that early childhood education is of paramount importance in fostering societal cohesion.",
      "frame_mm": "ငယ်စဉ်ကလေးဘဝ ပညာရေးသည် လူမှုအသိုက်အဝန်း စည်းလုံးညီညွတ်မှုကို တည်ဆောက်ရာတွင် အထူးအရေးပါကြောင်း အများက လက်ခံထားကြသည်။"
    },
    "synonyms": [
      {
        "term": "Paramount",
        "register": "C2 High Academic",
        "nuance": "Supreme; superior to all others in rank, order, or importance.",
        "example": "Public safety considerations must remain of paramount concern to urban authorities."
      },
      {
        "term": "Pivotal",
        "register": "C1 Analytical",
        "nuance": "Acting as the vital turning point on which outcomes depend.",
        "example": "Technological innovation plays a pivotal role in accelerating industrial productivity."
      },
      {
        "term": "Indispensable",
        "register": "C1 Academic",
        "nuance": "Essential; absolutely required and cannot be dispensed with.",
        "example": "Empirical data is an indispensable requirement for robust scientific research."
      },
      {
        "term": "Imperative",
        "register": "C2 Formal",
        "nuance": "Of urgent priority demanding immediate compliance or action.",
        "example": "It is imperative that comprehensive climate policies be executed globally."
      }
    ]
  },
  "mitigate": {
    "pos": "verb",
    "meaning_mm": "ပြင်းထန်ဆိုးရွားမှုကို လျော့ပါးသက်သာစေသည်",
    "collocations": {
      "verb_noun": [
        "mitigate adverse consequences",
        "alleviate systemic poverty",
        "curb environmental degradation",
        "cushion the economic impact"
      ],
      "adj_noun": [
        "mitigating factor",
        "substantial mitigation",
        "effective mitigation strategy",
        "proactive risk mitigation"
      ],
      "adv_adj": [
        "proactively mitigated",
        "measurably alleviated",
        "gradually mitigated",
        "partially offset"
      ],
      "prep_phrase": [
        "with a view to mitigating",
        "in an effort to mitigate",
        "as a means of mitigating"
      ],
      "frame": "Decisive government intervention is imperative to mitigate the catastrophic repercussions of urban sprawl.",
      "frame_mm": "မြို့ပြဧရိယာ အထိန်းအကွပ်မဲ့ ကျယ်ပြန့်လာမှုကြောင့် ဖြစ်ပေါ်လာသော ဆိုးရွားလှသည့် အကျိုးဆက်များကို လျော့ပါးသက်သာစေရန် အစိုးရ၏ ပြတ်သားသော ဝင်ရောက်စွက်ဖက်မှုသည် မဖြစ်မနေ လိုအပ်ပါသည်။"
    },
    "synonyms": [
      {
        "term": "Alleviate",
        "register": "C1 Academic",
        "nuance": "Relieve suffering, deficiency, or severe systemic burdens.",
        "example": "Targeted educational grants aim to alleviate deep socio-economic inequalities."
      },
      {
        "term": "Moderate",
        "register": "C1 Analytical",
        "nuance": "Reduce the extremity, speed, or volatility of an undesirable trend.",
        "example": "Fiscal adjustments can moderate cyclic macroeconomic fluctuations."
      },
      {
        "term": "Attenuate",
        "register": "C2 High Academic",
        "nuance": "Diminish the thickness, intensity, or virulent momentum of a threat.",
        "example": "Afforestation initiatives help attenuate catastrophic flash flood risks."
      },
      {
        "term": "Curb",
        "register": "B2-C1 Core",
        "nuance": "Restrain or check within boundaries to halt uncontrolled expansion.",
        "example": "Strict tariffs are deployed to curb the illicit trafficking of wildlife."
      }
    ]
  },
  "ubiquitous": {
    "pos": "adj",
    "meaning_mm": "နေရာတိုင်းတွင် တွေ့မြင်နိုင်သော / အနှံ့အပြား ပျံ့နှံ့နေသော",
    "collocations": {
      "verb_noun": [
        "witness the proliferation",
        "curb the dominance",
        "harness the reach",
        "navigate ubiquitous surveillance"
      ],
      "adj_noun": [
        "ubiquitous presence",
        "pervasive influence",
        "ubiquitous connectivity",
        "omnipresent digital media"
      ],
      "adv_adj": [
        "increasingly ubiquitous",
        "nearly ubiquitous",
        "virtually ubiquitous",
        "rapidly becoming ubiquitous"
      ],
      "prep_phrase": [
        "in an era of ubiquitous connectivity",
        "across ubiquitous digital channels"
      ],
      "frame": "Portable digital devices have become so ubiquitous that their pervasive psychological impact warrants rigorous study.",
      "frame_mm": "ဆယ်ကျော်သက်များအကြား စမတ်ဖုန်းများ နေရာအနှံ့ တွင်ကျယ်လာမှုသည် ရိုးရာလူမှုဆက်ဆံရေး ပုံစံများကို သိသိသာသာ ပြောင်းလဲစေခဲ့သည်။"
    },
    "synonyms": [
      {
        "term": "Pervasive",
        "register": "C1 Academic",
        "nuance": "Spreading widely throughout all layers of a system or society.",
        "example": "The pervasive influence of advertising shapes contemporary consumer preferences."
      },
      {
        "term": "Omnipresent",
        "register": "C2 Formal",
        "nuance": "Present simultaneously in all places at all times.",
        "example": "Algorithmic data collection has become virtually omnipresent in modern online commerce."
      },
      {
        "term": "Prevalent",
        "register": "B2-C1 Core",
        "nuance": "Commonly occurring or widely accepted in a particular demographic.",
        "example": "Sedentary lifestyles remain distressingly prevalent among corporate desk workers."
      }
    ]
  },
  "exacerbate": {
    "pos": "verb",
    "meaning_mm": "(ဆိုးရွားသောအခြေအနေ သို့မဟုတ် ပြဿနာကို) ပိုမိုဆိုးရွားပြင်းထန်စေသည်",
    "collocations": {
      "verb_noun": [
        "exacerbate existing inequalities",
        "compound the difficulty",
        "worsen living standards",
        "intensify social friction"
      ],
      "adj_noun": [
        "exacerbating factor",
        "severe exacerbation",
        "underlying catalyst",
        "compounding effect"
      ],
      "adv_adj": [
        "severely exacerbated",
        "drastically exacerbated",
        "exponentially exacerbated",
        "unintentionally compounded"
      ],
      "prep_phrase": [
        "threatens to exacerbate",
        "serves only to exacerbate",
        "has a tendency to exacerbate"
      ],
      "frame": "Rapid rural-to-urban migration threatens to exacerbate acute shortages in municipal affordable housing.",
      "frame_mm": "မတရား အမြတ်ထုတ်သော အိမ်ရှင်များ၏ လုပ်ရပ်များကို ထိန်းကျောင်းရန် ပျက်ကွက်ခြင်းသည် မြို့ကြီးများ၏ တန်ဖိုးသင့် အိမ်ရာပြဿနာကို ပိုမိုဆိုးရွားစေရန်သာ ဦးတည်စေမည်ဖြစ်သည်။"
    },
    "synonyms": [
      {
        "term": "Compound",
        "register": "C1 Analytical",
        "nuance": "Add a new dimension of difficulty, making a predicament exponentially worse.",
        "example": "Severe currency inflation has compounded the economic challenges facing developing nations."
      },
      {
        "term": "Aggravate",
        "register": "B2-C1 Academic",
        "nuance": "Inflame an existing grievance, friction, or delicate state.",
        "example": "Unchecked industrial effluent aggravates localized waterway degradation."
      },
      {
        "term": "Intensify",
        "register": "B2 Academic",
        "nuance": "Escalate the raw magnitude or sharpness of a conflict.",
        "example": "Resource scarcity continues to intensify geopolitical frictions across border regions."
      }
    ]
  },
  "education": {
    "pos": "noun",
    "meaning_mm": "ပညာရေး / အသိပညာ သင်ကြားပို့ချမှု",
    "collocations": {
      "verb_noun": [
        "pursue tertiary education",
        "acquire holistic knowledge",
        "reform pedagogical systems",
        "expand vocational training"
      ],
      "adj_noun": [
        "tertiary education",
        "compulsory schooling",
        "pedagogical framework",
        "holistic development",
        "inclusive education"
      ],
      "adv_adj": [
        "academically rigorous",
        "intellectually demanding",
        "pedagogically sound"
      ],
      "prep_phrase": [
        "in the pursuit of higher education",
        "fundamental to educational attainment",
        "across diverse learning environments"
      ],
      "frame": "Subsidizing tertiary education enables marginalized youths to break intergenerational cycles of poverty.",
      "frame_mm": "နိုင်ငံတော်မှ ထောက်ပံ့သော တက္ကသိုလ်အဆင့် ပညာရေးသည် တီထွင်ဆန်းသစ်မှု ဦးဆောင်သော အမျိုးသားစီးပွားရေးကို တည်ဆောက်ရန် မရှိမဖြစ် လိုအပ်သော ရင်းနှီးမြှုပ်နှံမှုတစ်ခု ဖြစ်သည်။"
    },
    "synonyms": [
      {
        "term": "Pedagogy",
        "register": "C2 High Academic",
        "nuance": "The formal method, theory, and practice of teaching.",
        "example": "Innovative pedagogical frameworks prioritize critical inquiry over passive memorization."
      },
      {
        "term": "Tertiary Schooling",
        "register": "C1 Academic",
        "nuance": "Post-secondary college or university education.",
        "example": "Access to tertiary schooling correlates directly with enhanced career mobility."
      },
      {
        "term": "Intellectual Development",
        "register": "C1 Analytical",
        "nuance": "The overarching maturation of cognitive and reasoning faculties.",
        "example": "Early literacy programs lay the bedrock for sustained intellectual development."
      }
    ]
  },
  "problem": {
    "pos": "noun",
    "meaning_mm": "ပြဿနာ / ဖြေရှင်းရန်ခက်ခဲသော အခြေအနေ / အခက်အခဲ",
    "collocations": {
      "verb_noun": [
        "address pressing issues",
        "tackle an acute dilemma",
        "resolve thorny predicaments",
        "confront an intractable challenge"
      ],
      "adj_noun": [
        "acute predicament",
        "insurmountable challenge",
        "pressing dilemma",
        "chronic setback",
        "deep-seated issue"
      ],
      "adv_adj": [
        "deeply problematic",
        "inherently challenging",
        "systemically flawed"
      ],
      "prep_phrase": [
        "at the root of this predicament",
        "in the face of mounting dilemmas",
        "fraught with complications"
      ],
      "frame": "Urban congestion represents an acute predicament that requires multi-modal transportation solutions.",
      "frame_mm": "မူဝါဒချမှတ်သူများသည် အပေါ်ယံ သက်သာရုံ နည်းလမ်းများကို ကျော်လွန်၍ နာတာရှည် လူငယ်အလုပ်လက်မဲ့ပြဿနာ၏ အရင်းခံ လူမှုစီးပွားအကြောင်းရင်းများကို စတင်ဖြေရှင်းရမည်ဖြစ်သည်။"
    },
    "synonyms": [
      {
        "term": "Predicament",
        "register": "C1 Academic",
        "nuance": "A difficult, perplexing, or precarious plight.",
        "example": "Indebted developing states face an acute economic predicament in balancing budgets."
      },
      {
        "term": "Dilemma",
        "register": "B2-C1 Analytical",
        "nuance": "A situation demanding a choice between two equally undesirable alternatives.",
        "example": "Policymakers confront an ethical dilemma regarding public health restrictions versus economic reopening."
      },
      {
        "term": "Impediment",
        "register": "C1 Formal",
        "nuance": "A structural obstacle that obstructs forward progress.",
        "example": "Prohibitive tariff walls constitute an impediment to regional agricultural commerce."
      }
    ]
  },
  "increase": {
    "pos": "verb",
    "meaning_mm": "တိုးပွားလာသည် / မြင့်တက်လာသည် (verb)၊ တိုးတက်များပြားလာခြင်း (noun)",
    "collocations": {
      "verb_noun": [
        "accelerate productivity",
        "augment state revenue",
        "escalate expenditure",
        "bolster economic growth"
      ],
      "adj_noun": [
        "exponential growth",
        "substantial surge",
        "marked upward trajectory",
        "unprecedented escalation"
      ],
      "adv_adj": [
        "substantially augmented",
        "exponentially increased",
        "measurably heightened",
        "dramatically escalated"
      ],
      "prep_phrase": [
        "on an unprecedented upward trajectory",
        "in tandem with increasing demand",
        "surging at a rapid pace"
      ],
      "frame": "Renewable energy adoption has surged on an unprecedented upward trajectory over the past decade.",
      "frame_mm": "ပြန်လည်ပြည့်ဖြိုးမြဲစွမ်းအင် သုံးစွဲမှု ဆတက်ထမ်းပိုး မြင့်တက်လာခြင်းက ရေရှည်တည်တံ့သော အသွင်ကူးပြောင်းမှုများသည် စီးပွားရေးအရ လက်တွေ့ဖြစ်မြောက်နိုင်ကြောင်း သက်သေပြနေသည်။"
    },
    "synonyms": [
      {
        "term": "Augment",
        "register": "C1 Academic",
        "nuance": "Make larger or more effective by adding supplementary resources.",
        "example": "Municipalities must augment healthcare funding to meet aging demographic needs."
      },
      {
        "term": "Proliferate",
        "register": "C2 High Academic",
        "nuance": "Multiply and spread rapidly across an entire ecosystem.",
        "example": "Online vocational courses have proliferated exponentially across emerging economies."
      },
      {
        "term": "Escalate",
        "register": "B2-C1 Formal",
        "nuance": "Increase rapidly in intensity, scale, or severity.",
        "example": "Localized labor strikes threaten to escalate into nationwide supply-chain disruptions."
      }
    ]
  },
  "decrease": {
    "pos": "verb",
    "meaning_mm": "လျော့နည်းကျဆင်းသွားသည် (verb)၊ လျော့နည်းကျဆင်းခြင်း (noun)",
    "collocations": {
      "verb_noun": [
        "curtail greenhouse emissions",
        "diminish purchasing power",
        "deplete natural reserves",
        "dampen economic enthusiasm"
      ],
      "adj_noun": [
        "precipitous decline",
        "gradual diminution",
        "downward trajectory",
        "substantial curtailment"
      ],
      "adv_adj": [
        "sharply curtailed",
        "substantially diminished",
        "precipitously dropped"
      ],
      "prep_phrase": [
        "on a steady downward trajectory",
        "in light of dwindling resources"
      ],
      "frame": "Carbon taxation has proven instrumental in curtailing industrial greenhouse emissions across the continent.",
      "frame_mm": "ပြည်တွင်း ဇီဝမျိုးစုံမျိုးကွဲများ ရုတ်ခြည်း ကျဆင်းသွားခြင်းသည် စိုက်ပျိုးရေးနှင့် စားနပ်ရိက္ခာ ဖူလုံရေး၏ ခံနိုင်ရည်စွမ်းကို မလွဲမသွေ အန္တရာယ်ဖြစ်စေသည်။"
    },
    "synonyms": [
      {
        "term": "Curtail",
        "register": "C1 Academic",
        "nuance": "Impose an active restriction to reduce volume, extent, or duration.",
        "example": "Governments must curtail discretionary spending during economic recessions."
      },
      {
        "term": "Diminish",
        "register": "B2-C1 Formal",
        "nuance": "Make smaller or lessen in authority, reputation, or volume.",
        "example": "Prolonged screen usage can diminish attention spans among young learners."
      },
      {
        "term": "Plummet",
        "register": "C1 Expressive",
        "nuance": "Drop steeply and rapidly from a high level.",
        "example": "Tourism revenues plummeted drastically during the global pandemic."
      }
    ]
  },
  "detrimental": {
    "pos": "adj",
    "meaning_mm": "ဆိုးကျိုးဖြစ်စေသော / အန္တရာယ်ရှိသော / ထိခိုက်နစ်နာစေသော",
    "collocations": {
      "verb_noun": [
        "exert a detrimental influence",
        "pose a grave risk",
        "incur severe harm",
        "suffer adverse consequences"
      ],
      "adj_noun": [
        "detrimental impact",
        "deleterious effect",
        "adverse repercussions",
        "corrosive influence"
      ],
      "adv_adj": [
        "distinctly detrimental",
        "profoundly deleterious",
        "demonstrably harmful"
      ],
      "prep_phrase": [
        "detrimental to long-term sustainability",
        "with deleterious consequences for"
      ],
      "frame": "Excessive consumption of ultra-processed food exerts a profoundly detrimental effect on cardiovascular health.",
      "frame_mm": "အလိုအလျောက် အယ်လဂိုရီသမ် စနစ်များအပေါ် အလွန်အကျွံ အမှီပြုခြင်းသည် လူသားတို့၏ သိမြင်မှတ်သားနိုင်စွမ်းကို အလွန်ထိခိုက်စေနိုင်ပါသည်။"
    },
    "synonyms": [
      {
        "term": "Deleterious",
        "register": "C2 High Academic",
        "nuance": "Causing subtle, insidious, yet long-lasting harm.",
        "example": "Chemical pesticides can exert deleterious effects on surrounding groundwater ecology."
      },
      {
        "term": "Adverse",
        "register": "C1 Analytical",
        "nuance": "Unfavorable, contrary, or preventing success or development.",
        "example": "High interest rates create adverse conditions for emerging tech startups."
      },
      {
        "term": "Inimical",
        "register": "C2 Formal",
        "nuance": "Tending to obstruct or harm; hostile to beneficial progress.",
        "example": "Severe censorship is inimical to the flourishing of academic research."
      }
    ]
  },
  "advantage": {
    "pos": "noun",
    "meaning_mm": "အားသာချက် / အကျိုးကျေးဇူး / အခွင့်အရေး",
    "collocations": {
      "verb_noun": [
        "confer substantial benefits",
        "yield a competitive edge",
        "derive distinct advantages",
        "harness the merits of"
      ],
      "adj_noun": [
        "inestimable merit",
        "distinct competitive edge",
        "lucrative dividend",
        "salient advantage"
      ],
      "adv_adj": [
        "decidedly advantageous",
        "inherently beneficial",
        "immensely lucrative"
      ],
      "prep_phrase": [
        "to great advantage",
        "conferring a decisive advantage on",
        "yields clear dividends for"
      ],
      "frame": "Bilingualism confers inestimable cognitive advantages that persist well into later adulthood.",
      "frame_mm": "အများပြည်သူ စက်ဘီးစီး အခြေခံအဆောက်အအုံများတွင် ရင်းနှီးမြှုပ်နှံခြင်းသည် ပြည်သူ့ကျန်းမာရေးနှင့် မြို့ပြ ကာဗွန်လျှော့ချရေးအတွက် တွက်ချက်မပြနိုင်လောက်အောင် ကြီးမားသော အကျိုးကျေးဇူးများကို ပေးစွမ်းသည်။"
    },
    "synonyms": [
      {
        "term": "Merit",
        "register": "C1 Academic",
        "nuance": "An inherent positive virtue or quality deserving praise.",
        "example": "The plan possesses considerable merit, particularly in addressing wealth disparities."
      },
      {
        "term": "Boon",
        "register": "C1 Literary",
        "nuance": "A timely, unexpected benefit or blessing to a community.",
        "example": "High-speed rail connectivity has proven an economic boon for rural townships."
      },
      {
        "term": "Dividend",
        "register": "C1 Analytical",
        "nuance": "A long-term beneficial payoff from early effort or investment.",
        "example": "Investing heavily in green infrastructure yields massive environmental dividends."
      }
    ]
  },
  "disadvantage": {
    "pos": "noun",
    "meaning_mm": "အားနည်းချက် / အခက်အခဲ / ဆိုးကျိုး",
    "collocations": {
      "verb_noun": [
        "outweigh the drawbacks",
        "offset potential pitfalls",
        "remedy structural shortcomings",
        "address severe deficiencies"
      ],
      "adj_noun": [
        "inherent drawback",
        "glaring shortcoming",
        "perilous pitfall",
        "structural deficiency"
      ],
      "adv_adj": [
        "inherently disadvantageous",
        "systemically compromised"
      ],
      "prep_phrase": [
        "at a marked disadvantage",
        "fraught with unforeseen pitfalls"
      ],
      "frame": "The merits of urbanization clearly outweigh its inherent drawbacks when managed with modern zoning.",
      "frame_mm": "အစောပိုင်း ကာကွယ်ဆေးထိုး အစီအစဉ်များ၏ အဓိကအားနည်းချက်တစ်ခုမှာ အပူချိန်အလွန်နိမ့်သော သိုလှောင်ရုံများ ထိန်းသိမ်းရန် လိုအပ်သည့် ရှုပ်ထွေးသော ထောက်ပံ့ပို့ဆောင်ရေး ကွင်းဆက် ဖြစ်ခဲ့သည်။"
    },
    "synonyms": [
      {
        "term": "Drawback",
        "register": "B2-C1 Core",
        "nuance": "An undesirable feature or disadvantage of an otherwise good idea.",
        "example": "The primary drawback of electric transport remains the slow rate of battery recharging."
      },
      {
        "term": "Shortcoming",
        "register": "C1 Analytical",
        "nuance": "A fault or defect in a system, policy, or character.",
        "example": "The audit revealed glaring shortcomings in municipal wastewater regulation."
      },
      {
        "term": "Pitfall",
        "register": "C1 Formal",
        "nuance": "A hidden or unsuspected hazard or trap for unwary planners.",
        "example": "Relying strictly on fossil subsidies presents grave long-term macroeconomic pitfalls."
      }
    ]
  },
  "technology": {
    "pos": "noun",
    "meaning_mm": "နည်းပညာ / ခေတ်မီစက်မှုပညာ",
    "collocations": {
      "verb_noun": [
        "harness frontier technology",
        "deploy artificial intelligence",
        "regulate disruptive innovations",
        "accelerate technological diffusion"
      ],
      "adj_noun": [
        "disruptive technology",
        "technological paradigm",
        "frontier innovation",
        "automated architecture"
      ],
      "adv_adj": [
        "technologically sophisticated",
        "digitally empowered",
        "algorithmically driven"
      ],
      "prep_phrase": [
        "at the vanguard of technology",
        "driven by technological automation",
        "in an era of rapid digitization"
      ],
      "frame": "Harnessing frontier technologies in agriculture is vital to ensure long-term food security.",
      "frame_mm": "သတင်းအချက်အလက် နည်းပညာများ လျင်မြန်စွာ တိုးတက်လာခြင်းသည် ကမ္ဘာတစ်ဝန်း စီးပွားရေးလုပ်ငန်းများ ဆက်သွယ်ဆောင်ရွက်သည့် ပုံစံကို အခြေခံကျကျ ပြောင်းလဲစေခဲ့သည်။"
    },
    "synonyms": [
      {
        "term": "Technological Advancement",
        "register": "C1 Academic",
        "nuance": "The cumulative progression of scientific applications and machinery.",
        "example": "Rapid technological advancement has revolutionized remote collaboration across borders."
      },
      {
        "term": "Disruptive Innovation",
        "register": "C1 Analytical",
        "nuance": "Novel technological processes that upend established markets.",
        "example": "Autonomous logistics represents a disruptive innovation within the freight sector."
      },
      {
        "term": "Digital Infrastructure",
        "register": "C1 Formal",
        "nuance": "The underlying hardware and software enabling connected systems.",
        "example": "Modernizing digital infrastructure is essential for inclusive digital governance."
      }
    ]
  },
  "environment": {
    "pos": "noun",
    "meaning_mm": "သဘာဝပတ်ဝန်းကျင် / ဂေဟစနစ်",
    "collocations": {
      "verb_noun": [
        "preserve delicate ecosystems",
        "halt environmental degradation",
        "safeguard the biosphere",
        "curb ecological destruction"
      ],
      "adj_noun": [
        "ecological equilibrium",
        "fragile biosphere",
        "pristine wilderness",
        "anthropogenic footprint"
      ],
      "adv_adj": [
        "environmentally tenable",
        "ecologically catastrophic",
        "sustainable in design"
      ],
      "prep_phrase": [
        "for the preservation of the environment",
        "with severe implications for the biosphere"
      ],
      "frame": "Preserving ecological equilibrium requires strict statutory ceilings on industrial emissions.",
      "frame_mm": "သဘာဝပတ်ဝန်းကျင် ယိုယွင်းပျက်စီးမှုကို ကာကွယ်ရန် ကမ္ဘာ့နိုင်ငံများအကြား ပူးပေါင်းဆောင်ရွက်မှုနှင့် တင်းကျပ်သော မူဝါဒများ ချမှတ်ကျင့်သုံးရန် လိုအပ်သည်။"
    },
    "synonyms": [
      {
        "term": "Biosphere",
        "register": "C2 High Academic",
        "nuance": "The global ecological system integrating all living beings and relationships.",
        "example": "Anthropogenic pollution poses an existential danger to marine life across the biosphere."
      },
      {
        "term": "Ecosystem",
        "register": "C1 Academic",
        "nuance": "A biological community of interacting organisms and their physical habitat.",
        "example": "Wetland ecosystems provide indispensable flood protection and water filtration services."
      },
      {
        "term": "Habitat",
        "register": "B2-C1 Formal",
        "nuance": "The natural home or natural environment of an animal, plant, or organism.",
        "example": "Deforestation destroys the native habitats of endangered primate species."
      }
    ]
  },
  "policy": {
    "pos": "noun",
    "meaning_mm": "မူဝါဒ / စီမံလမ်းညွှန်ချက်",
    "collocations": {
      "verb_noun": [
        "enact statutory legislation",
        "formulate comprehensive policies",
        "implement stringent regulations",
        "repeal archaic mandates"
      ],
      "adj_noun": [
        "statutory framework",
        "pragmatic policy",
        "stringent regulation",
        "holistic policy blueprint"
      ],
      "adv_adj": [
        "statutorily mandated",
        "politically viable",
        "fiscally sustainable"
      ],
      "prep_phrase": [
        "under the prevailing policy framework",
        "in adherence to regulatory mandates"
      ],
      "frame": "Governments must formulate comprehensive statutory frameworks to govern artificial intelligence development.",
      "frame_mm": "အများပြည်သူ ကျန်းမာရေးစောင့်ရှောက်မှု မူဝါဒများသည် ပြည်သူအားလုံး တန်းတူညီမျှ လက်လှမ်းမီနိုင်ရေးကို ဦးတည်ရမည်ဖြစ်သည်။"
    },
    "synonyms": [
      {
        "term": "Regulatory Framework",
        "register": "C1 High Academic",
        "nuance": "The formal codified system of rules and legal enforcement.",
        "example": "A robust regulatory framework is needed to prevent predatory lending practices."
      },
      {
        "term": "Statutory Measure",
        "register": "C2 Formal",
        "nuance": "Actions or rules enacted by formal parliamentary or congressional law.",
        "example": "Compulsory recycling represents an effective statutory measure against urban waste."
      },
      {
        "term": "Mandate",
        "register": "C1 Analytical",
        "nuance": "An official order, authorization, or commission to carry out a policy.",
        "example": "The public health mandate required universal mask compliance in enclosed spaces."
      }
    ]
  },
  "sustainable": {
    "pos": "adj",
    "meaning_mm": "ရေရှည်တည်တံ့သော / သဘာဝနှင့် သဟဇာတဖြစ်သော",
    "collocations": {
      "verb_noun": [
        "pursue sustainable development",
        "achieve ecological balance",
        "foster enduring growth",
        "maintain viable yields"
      ],
      "adj_noun": [
        "sustainable development",
        "viable alternative",
        "tenable strategy",
        "long-term viability"
      ],
      "adv_adj": [
        "environmentally sustainable",
        "economically viable",
        "socially tenable"
      ],
      "prep_phrase": [
        "conducive to sustainable growth",
        "with a commitment to sustainability"
      ],
      "frame": "Transitioning toward sustainable renewable energy sources is imperative for mitigating climate volatility.",
      "frame_mm": "ရေရှည်တည်တံ့သော ဖွံ့ဖြိုးတိုးတက်မှု ပန်းတိုင်များ ပြည့်မီစေရန် စွမ်းအင်သန့်စင်မှု ကဏ္ဍတွင် ပိုမိုရင်းနှီးမြှုပ်နှံရမည်ဖြစ်သည်။"
    },
    "synonyms": [
      {
        "term": "Viable",
        "register": "C1 Analytical",
        "nuance": "Capable of working successfully; feasible and practicable.",
        "example": "Solar microgrids represent a viable energy solution for isolated rural settlements."
      },
      {
        "term": "Tenable",
        "register": "C2 High Academic",
        "nuance": "Able to be maintained or defended against challenge or depletion.",
        "example": "Unlimited consumption of fossil fuels is no longer an environmentally tenable position."
      },
      {
        "term": "Enduring",
        "register": "C1 Formal",
        "nuance": "Continuing or long-lasting across generations.",
        "example": "Sound educational reform creates enduring prosperity for national economies."
      }
    ]
  },
  "significant": {
    "pos": "adj",
    "meaning_mm": "သိသာထင်ရှားသော / အရေးပါသော / ကြီးမားသော",
    "collocations": {
      "verb_noun": [
        "exert a significant influence",
        "demonstrate marked progress",
        "witness a substantial shift",
        "warrant close scrutiny"
      ],
      "adj_noun": [
        "substantial shift",
        "momentous breakthrough",
        "pronounced disparity",
        "consequential development"
      ],
      "adv_adj": [
        "statistically significant",
        "exceptionally momentous",
        "substantially pronounced"
      ],
      "prep_phrase": [
        "of significant importance to",
        "in a significant manner"
      ],
      "frame": "There is a statistically significant correlation between higher educational investment and lower national crime rates.",
      "frame_mm": "လေ့လာတွေ့ရှိချက်များအရ အစောပိုင်း ပညာသင်ကြားမှုသည် ကလေးငယ်များ၏ အနာဂတ်အောင်မြင်မှုအပေါ် သိသာထင်ရှားသော သက်ရောက်မှုရှိကြောင်း ပြသနေသည်။"
    },
    "synonyms": [
      {
        "term": "Substantial",
        "register": "C1 Academic",
        "nuance": "Of considerable importance, size, or worth.",
        "example": "The reform delivered substantial economic dividends across regional economies."
      },
      {
        "term": "Momentous",
        "register": "C2 High Academic",
        "nuance": "Of enormous significance, especially having great bearing on the future.",
        "example": "The eradication of smallpox was a momentous milestone in medical history."
      },
      {
        "term": "Pronounced",
        "register": "C1 Analytical",
        "nuance": "Very noticeable, marked, or conspicuous.",
        "example": "There is a pronounced disparity in healthcare access between rural and urban sectors."
      }
    ]
  },
  "implement": {
    "pos": "verb",
    "meaning_mm": "လက်တွေ့အကောင်အထည်ဖော်သည် / ကျင့်သုံးဆောင်ရွက်သည်",
    "collocations": {
      "verb_noun": [
        "institute regulatory reforms",
        "execute pragmatic solutions",
        "roll out comprehensive programs",
        "enforce statutory rules"
      ],
      "adj_noun": [
        "seamless implementation",
        "rigorous enforcement",
        "strategic execution",
        "phased rollout"
      ],
      "adv_adj": [
        "systematically implemented",
        "strictly enforced",
        "swiftly instituted"
      ],
      "prep_phrase": [
        "in the process of implementing",
        "geared toward executing"
      ],
      "frame": "Municipalities must swiftly institute zoning reforms to accommodate expanding urban populations.",
      "frame_mm": "အစိုးရသည် ယာဉ်ကြောပိတ်ဆို့မှု လျှော့ချရေးအတွက် အများပြည်သူ သယ်ယူပို့ဆောင်ရေး စီမံကိန်းအသစ်များကို အောင်မြင်စွာ အကောင်အထည်ဖော်ခဲ့သည်။"
    },
    "synonyms": [
      {
        "term": "Institute",
        "register": "C1 Formal",
        "nuance": "Establish, initiate, or set in motion a formal system or rule.",
        "example": "The university instituted a stringent anti-plagiarism honor code."
      },
      {
        "term": "Execute",
        "register": "C1 Analytical",
        "nuance": "Carry out, perform, or put a planned strategy into practical effect.",
        "example": "The civil engineering team executed the flood defense project ahead of schedule."
      },
      {
        "term": "Enact",
        "register": "C1 Academic",
        "nuance": "Pass legislation or decree into formal law.",
        "example": "Parliament enacted landmark legislation protecting consumer privacy online."
      }
    ]
  },
  "scrutinize": {
    "pos": "verb",
    "meaning_mm": "စေ့စေ့စပ်စပ် စစ်ဆေးစိစစ်သည် / သေချာစွာ စစ်ဆေးသည်",
    "collocations": {
      "verb_noun": [
        "scrutinize empirical evidence",
        "examine underlying factors",
        "dissect complex data",
        "audit public expenditure"
      ],
      "adj_noun": [
        "close scrutiny",
        "meticulous examination",
        "rigorous analysis",
        "in-depth audit"
      ],
      "adv_adj": [
        "closely scrutinized",
        "rigorously evaluated",
        "meticulously inspected"
      ],
      "prep_phrase": [
        "under intense public scrutiny",
        "subject to academic scrutiny"
      ],
      "frame": "Scholars must carefully scrutinize the ethical implications of genetic engineering prior to widespread clinical deployment.",
      "frame_mm": "လွတ်လပ်သော ကျွမ်းကျင်သူများသည် ဆုံးဖြတ်ချက်မချမီ စီမံကိန်း၏ ပတ်ဝန်းကျင်ဆိုင်ရာ သက်ရောက်မှု အစီရင်ခံစာကို စေ့စေ့စပ်စပ် စိစစ်သုံးသပ်ခဲ့ကြသည်။"
    },
    "synonyms": [
      {
        "term": "Examine",
        "register": "B2-C1 Academic",
        "nuance": "Inspect closely and thoroughly in order to determine the nature or condition.",
        "example": "Researchers must examine the longitudinal outcomes of early screen exposure."
      },
      {
        "term": "Dissect",
        "register": "C1 Analytical",
        "nuance": "Analyze a problem or text in minute, systematic detail.",
        "example": "The essay dissects the multifaceted causes of contemporary political polarization."
      },
      {
        "term": "Audit",
        "register": "C1 Formal",
        "nuance": "Conduct an official and rigorous inspection of financial or systemic records.",
        "example": "Independent bodies regularly audit healthcare facilities to uphold medical standards."
      }
    ]
  },
  "consequence": {
    "pos": "noun",
    "meaning_mm": "အကျိုးဆက် / နောက်ဆက်တွဲရလဒ်",
    "collocations": {
      "verb_noun": [
        "bear catastrophic repercussions",
        "suffer dire consequences",
        "mitigate the fallout",
        "foresee adverse outcomes"
      ],
      "adj_noun": [
        "dire consequence",
        "catastrophic repercussion",
        "unintended fallout",
        "profound implication"
      ],
      "adv_adj": [
        "consequentially affected",
        "gravitationally linked"
      ],
      "prep_phrase": [
        "as a direct consequence of",
        "with grave repercussions for",
        "in the aftermath of"
      ],
      "frame": "Unchecked deforestation carries catastrophic repercussions for biodiversity and global atmospheric stability.",
      "frame_mm": "ရာသီဥတုပြောင်းလဲမှု၏ ဆိုးရွားသော အကျိုးဆက်များကို ကမ္ဘာတစ်ဝန်းရှိ ကမ်းရိုးတန်းဒေသများတွင် စတင်ခံစားနေရပြီဖြစ်သည်။"
    },
    "synonyms": [
      {
        "term": "Repercussion",
        "register": "C1 Academic",
        "nuance": "An unintended, widespread, and usually unwelcome indirect consequence.",
        "example": "The collapse of the commercial bank had dire financial repercussions across Europe."
      },
      {
        "term": "Ramification",
        "register": "C2 High Academic",
        "nuance": "A complex or unwelcome consequence of an action or event, branching out in many directions.",
        "example": "Legal scholars continue to debate the commercial ramifications of AI copyright cases."
      },
      {
        "term": "Aftermath",
        "register": "B2-C1 Formal",
        "nuance": "The consequences or after-effects of a significant unpleasant event.",
        "example": "Rebuilding civil infrastructure in the aftermath of the earthquake took over a decade."
      }
    ]
  },
  "foster": {
    "pos": "verb",
    "meaning_mm": "ပျိုးထောင်ပေးသည် / အားပေးအားမြှောက်ပြုသည် / တိုးတက်စေသည်",
    "collocations": {
      "verb_noun": [
        "foster critical thinking",
        "cultivate innovation",
        "nurture social cohesion",
        "stimulate economic dynamism"
      ],
      "adj_noun": [
        "fostering environment",
        "nurturing atmosphere",
        "conducive climate for growth"
      ],
      "adv_adj": [
        "actively fostered",
        "consciously cultivated",
        "carefully nurtured"
      ],
      "prep_phrase": [
        "instrumental in fostering",
        "conducive to fostering"
      ],
      "frame": "Interactive school curricula foster critical thinking and intellectual autonomy among students.",
      "frame_mm": "တက္ကသိုလ်များသည် ကျောင်းသားများအကြား တီထွင်ဖန်တီးနိုင်စွမ်းနှင့် သုတေသနစိတ်ဓာတ်ကို ပျိုးထောင်ပေးသင့်သည်။"
    },
    "synonyms": [
      {
        "term": "Cultivate",
        "register": "C1 Academic",
        "nuance": "Actively develop or acquire a mental faculty, relationship, or skill.",
        "example": "Universities should cultivate intellectual curiosity alongside technical vocational training."
      },
      {
        "term": "Nurture",
        "register": "B2-C1 Core",
        "nuance": "Encourage growth, development, or positive attitudes over time.",
        "example": "Mentorship initiatives help nurture leadership qualities in underprivileged youths."
      },
      {
        "term": "Stimulate",
        "register": "C1 Analytical",
        "nuance": "Raise levels of physiological or economic activity and progress.",
        "example": "Tax credits stimulate investment in zero-emission green technology."
      }
    ]
  },
  "hinder": {
    "pos": "verb",
    "meaning_mm": "ဟန့်တားနှောင့်ယှက်သည် / အဟန့်အတားဖြစ်စေသည်",
    "collocations": {
      "verb_noun": [
        "hinder economic progress",
        "impede cognitive development",
        "thwart academic achievement",
        "stifle entrepreneurship"
      ],
      "adj_noun": [
        "hindering factor",
        "formidable impediment",
        "stifling constraint"
      ],
      "adv_adj": [
        "severely hindered",
        "substantially impeded",
        "cripplingly obstructed"
      ],
      "prep_phrase": [
        "serves to hinder",
        "threatens to impede"
      ],
      "frame": "Excessive bureaucracy and red tape hinder entrepreneurial innovation and foreign direct investment.",
      "frame_mm": "ဗျူရိုကရေစီ ယန္တရား ရှုပ်ထွေးမှုများသည် နိုင်ငံခြား ရင်းနှီးမြှုပ်နှံမှုများ ဝင်ရောက်လာမှုကို ကြီးစွာ အဟန့်အတား ဖြစ်စေသည်။"
    },
    "synonyms": [
      {
        "term": "Impede",
        "register": "C1 Academic",
        "nuance": "Delay, slow down, or prevent the progress or movement of someone or something.",
        "example": "Severe winter blizzards impeded the timely delivery of medical relief supplies."
      },
      {
        "term": "Thwart",
        "register": "C2 High Academic",
        "nuance": "Prevent someone from accomplishing their goals; completely frustrate plans.",
        "example": "Rigorous anti-corruption watchdogs thwarted attempts to misappropriate public funds."
      },
      {
        "term": "Stifle",
        "register": "C1 Expressive",
        "nuance": "Suffocate, repress, or prevent from flourishing.",
        "example": "Rigid curriculum mandates often stifle creative problem-solving in classrooms."
      }
    ]
  },
  "society": {
    "pos": "noun",
    "meaning_mm": "လူမှုအဖွဲ့အစည်း / လူ့ဘောင်",
    "collocations": {
      "verb_noun": [
        "strengthen social cohesion",
        "shape contemporary society",
        "polarize the populace",
        "advance civic harmony"
      ],
      "adj_noun": [
        "contemporary society",
        "civic harmony",
        "egalitarian society",
        "pluralistic community"
      ],
      "adv_adj": [
        "socially cohesive",
        "culturally diverse",
        "civically engaged"
      ],
      "prep_phrase": [
        "in contemporary society",
        "across all strata of society",
        "for the betterment of society"
      ],
      "frame": "Promoting universal public healthcare is indispensable for safeguarding equity across all strata of society.",
      "frame_mm": "တရားဥပဒေစိုးမိုးမှုနှင့် တရားမျှတမှုသည် ငြိမ်းချမ်းသာယာသော လူမှုအဖွဲ့အစည်းတစ်ခု တည်ဆောက်ရေး၏ အခြေခံအုတ်မြစ်ဖြစ်သည်။"
    },
    "synonyms": [
      {
        "term": "Contemporary Society",
        "register": "C1 Academic",
        "nuance": "Modern human civilization and collective social life.",
        "example": "Digital connectivity has profoundly restructured the social architecture of contemporary society."
      },
      {
        "term": "Populace",
        "register": "C2 High Academic",
        "nuance": "The general public or total collective population of a state.",
        "example": "Educating the populace on epidemic prevention is paramount during global health crises."
      },
      {
        "term": "Civilization",
        "register": "B2-C1 Formal",
        "nuance": "An advanced stage of social and cultural development and organization.",
        "example": "Preserving archaeological heritage is essential for maintaining human civilization's collective memory."
      }
    ]
  },
  "inequality": {
    "pos": "noun",
    "meaning_mm": "မညီမျှမှု / ကွာဟမှု",
    "collocations": {
      "verb_noun": [
        "bridge the wealth gap",
        "alleviate income disparity",
        "remedy systemic inequality",
        "entrench class divisions"
      ],
      "adj_noun": [
        "glaring disparity",
        "systemic inequality",
        "socioeconomic chasm",
        "intergenerational imbalance"
      ],
      "adv_adj": [
        "deeply unequal",
        "alarmingly disparate",
        "systemically skewed"
      ],
      "prep_phrase": [
        "in terms of income disparity",
        "at the heart of socioeconomic inequality"
      ],
      "frame": "Progressive taxation remains a tested fiscal mechanism to alleviate systemic wealth disparities.",
      "frame_mm": "ဝင်ငွေမညီမျှမှု ကျယ်ပြန့်လာခြင်းသည် လူမှုသဟဇာတဖြစ်မှုကို ထိခိုက်စေပြီး ဆင်းရဲနွမ်းပါးမှု သံသရာကို ရှည်ကြာစေသည်။"
    },
    "synonyms": [
      {
        "term": "Disparity",
        "register": "C1 Academic",
        "nuance": "A great and noticeable difference or imbalance, especially in treat or income.",
        "example": "The glaring disparity in healthcare funding between regions warrants immediate federal review."
      },
      {
        "term": "Imbalance",
        "register": "B2-C1 Analytical",
        "nuance": "Lack of proportion or equitable distribution.",
        "example": "Trade tariffs can exacerbate structural imbalances between export and import markets."
      },
      {
        "term": "Iniquity",
        "register": "C2 High Academic",
        "nuance": "Gross injustice or deeply unfair treatment embedded into a social system.",
        "example": "Civil rights movements mobilized millions against legal iniquities in segregated states."
      }
    ]
  },
  "solution": {
    "pos": "noun",
    "meaning_mm": "အဖြေ / ပြဿနာဖြေရှင်းနည်း",
    "collocations": {
      "verb_noun": [
        "devise viable remedies",
        "implement pragmatic solutions",
        "adopt a holistic approach",
        "craft multifaceted strategies"
      ],
      "adj_noun": [
        "pragmatic solution",
        "viable remedy",
        "holistic approach",
        "feasible roadmap",
        "panacea"
      ],
      "adv_adj": [
        "pragmatically viable",
        "empirically tested",
        "comprehensive in scope"
      ],
      "prep_phrase": [
        "as a viable remedy for",
        "in search of a panacea for"
      ],
      "frame": "Addressing climate change demands a multifaceted strategy rather than reliance on a single technological panacea.",
      "frame_mm": "စွမ်းအင်ချွေတာရေးနှင့် ပြန်လည်ပြည့်ဖြိုးမြဲစွမ်းအင် သုံးစွဲခြင်းသည် ကမ္ဘာလုံးဆိုင်ရာ စွမ်းအင်အကျပ်အတည်းအတွက် ရေရှည်အဖြေတစ်ခု ဖြစ်သည်။"
    },
    "synonyms": [
      {
        "term": "Remedy",
        "register": "C1 Academic",
        "nuance": "A treatment or measure that resolves or counteracts a disease, grievance, or defect.",
        "example": "Subsidized public transit is a proven remedy for downtown vehicular congestion."
      },
      {
        "term": "Panacea",
        "register": "C2 High Academic",
        "nuance": "A hypothetical single cure-all for all diseases or problems (often used skeptically).",
        "example": "Artificial intelligence is an extraordinary tool, but it should not be viewed as a panacea for all administrative woes."
      },
      {
        "term": "Pragmatic Resolution",
        "register": "C1 Analytical",
        "nuance": "A realistic and sensible conclusion to a dispute or hurdle.",
        "example": "Both parties negotiated a pragmatic resolution to prevent prolonged factory closures."
      }
    ]
  },
  "evidence": {
    "pos": "noun",
    "meaning_mm": "သက်သေအထောက်အထား / ခိုင်လုံသော အချက်အလက်",
    "collocations": {
      "verb_noun": [
        "substantiate with empirical data",
        "corroborate hypotheses",
        "furnish compelling evidence",
        "scrutinize scholarly proof"
      ],
      "adj_noun": [
        "empirical data",
        "compelling evidence",
        "irrefutable proof",
        "scholarly documentation"
      ],
      "adv_adj": [
        "empirically grounded",
        "evidenced-based",
        "substantially corroborated"
      ],
      "prep_phrase": [
        "in the light of empirical evidence",
        "supported by compelling data"
      ],
      "frame": "Compelling empirical evidence indicates that green urban spaces measurably lower cortisol and anxiety levels.",
      "frame_mm": "သိပ္ပံနည်းကျ ခိုင်လုံသော သက်သေအထောက်အထားများ မရှိဘဲ မူဝါဒအသစ်များကို အတည်မပြုသင့်ပါ။"
    },
    "synonyms": [
      {
        "term": "Empirical Data",
        "register": "C1 Academic",
        "nuance": "Information acquired through direct observation or systematic experimentation.",
        "example": "Public policy should be formulated based on rigorous empirical data rather than ideological intuition."
      },
      {
        "term": "Corroboration",
        "register": "C2 High Academic",
        "nuance": "Evidence that confirms or supports a statement, theory, or finding.",
        "example": "Independent clinical trials provided decisive corroboration for the novel vaccine's efficacy."
      },
      {
        "term": "Testimony",
        "register": "B2-C1 Formal",
        "nuance": "Formal evidence or affirmation of an event, experience, or fact.",
        "example": "The remarkable recovery of the coral reef stands as testimony to strict conservation policies."
      }
    ]
  },
  "mistake": {
    "pos": "noun / verb",
    "meaning_mm": "အမှား / မှားယွင်းမှု (noun)၊ အမှားပြုလုပ်မိသည် (verb)",
    "collocations": {
      "verb_noun": [
        "make a mistake (အမှားပြုလုပ်မိသည် / အမှားလုပ်သည်)",
        "avoid a mistake (အမှားမဖြစ်အောင် ရှောင်ရှားသည်)",
        "learn from a mistake (အမှားမှ သင်ခန်းစာယူသည်)",
        "rectify a mistake (အမှားကို ပြန်လည်ပြင်ဆင်သည်)",
        "repeat a mistake (အမှားဟောင်းကို ထပ်ကျော့မိသည်)"
      ],
      "adj_noun": [
        "costly mistake (ကြီးလေးသော / ဆုံးရှုံးမှုကြီးမားသော အမှား)",
        "grave mistake (အလွန်ကြီးလေးသော အမှား)",
        "careless mistake (ပေါ့ဆမှုကြောင့် ဖြစ်သော အမှား)",
        "common mistake (အဖြစ်များသော အမှား)",
        "honest mistake (မရည်ရွယ်ဘဲ မှားယွင်းမှု)"
      ],
      "adv_adj": [
        "mistakenly believe (လွဲမှားစွာ ယုံကြည်ထားသည်)",
        "genuinely mistaken (အမှန်တကယ် မှားယွင်းသွားသော)",
        "fatally flawed (ဆိုးရွားစွာ အပြစ်အနာအဆာများသော)"
      ],
      "prep_phrase": [
        "by mistake (မတော်တဆ မှားယွင်း၍)",
        "under the mistaken impression that (လွဲမှားသော အထင်အမြင်ဖြင့်)",
        "learn from one's mistakes (မိမိ၏ အမှားများမှ သင်ခန်းစာဖော်ထုတ်သည်)"
      ],
      "frame": "Candidates must critically review practice essays to identify recurring weaknesses and avoid repeating costly mistakes in the actual exam.",
      "frame_mm": "စာမေးပွဲဖြေဆိုသူများသည် ထပ်တလဲလဲဖြစ်တတ်သော အားနည်းချက်များကို ရှာဖွေဖော်ထုတ်ရန်နှင့် စာမေးပွဲစစ်စစ်တွင် ဆုံးရှုံးမှုကြီးမားသော အမှားများ ထပ်မံမကျူးလွန်မိစေရန် မိမိတို့၏ အစမ်းစာစီစာကုံးများကို သေချာစွာ ပြန်လည်သုံးသပ်ရမည်။"
    },
    "synonyms": [
      {
        "term": "Error",
        "register": "C1 Academic",
        "nuance": "A fundamental deviation from accuracy, correctness, or truth in facts or calculation.",
        "example": "Grammatical errors can significantly detract from the cohesion of an academic essay."
      },
      {
        "term": "Oversight",
        "register": "C1 Formal",
        "nuance": "An unintentional failure to notice, perform, or correct something due to lapse of attention.",
        "example": "The exclusion of rural demographics was an unfortunate methodological oversight in the survey."
      },
      {
        "term": "Miscalculation",
        "register": "C1 Analytical",
        "nuance": "An error in assessment, planning, or quantitative estimation leading to adverse outcomes.",
        "example": "Underestimating transit infrastructure costs proved to be a catastrophic fiscal miscalculation."
      },
      {
        "term": "Inaccuracy",
        "register": "B2-C1 Core",
        "nuance": "Lack of precision or fidelity to empirical reality.",
        "example": "Statistical inaccuracies in historical archives undermine the credibility of empirical research."
      }
    ]
  },
  "challenge": {
    "pos": "noun / verb",
    "meaning_mm": "စိန်ခေါ်မှု / ခက်ခဲသောတာဝန် (noun)၊ စိန်ခေါ်သည် (verb)",
    "collocations": {
      "verb_noun": [
        "pose a formidable challenge (ကြီးမားသော စိန်ခေါ်မှုကို ဖြစ်ပေါ်စေသည်)",
        "tackle unprecedented challenges (မကြုံစဖူးသော စိန်ခေါ်မှုများကို ရင်ဆိုင်ဖြေရှင်းသည်)",
        "rise to the challenge (စိန်ခေါ်မှုကို အောင်မြင်စွာ ရင်ဆိုင်ကျော်လွှားသည်)",
        "overcome logistical challenges (ထောက်ပံ့ပို့ဆောင်ရေးဆိုင်ရာ အခက်အခဲများကို ကျော်လွှားသည်)"
      ],
      "adj_noun": [
        "formidable challenge (ကြီးမားခက်ခဲသော စိန်ခေါ်မှု)",
        "unprecedented challenge (မကြုံဖူးသော စိန်ခေါ်မှု)",
        "pressing challenge (အရေးတကြီး ရင်ဆိုင်ရမည့် စိန်ခေါ်မှု)",
        "underlying challenge (အရင်းခံ စိန်ခေါ်မှု)"
      ],
      "adv_adj": [
        "exceptionally challenging (အထူး ခက်ခဲစိန်ခေါ်မှုများသော)",
        "inherently challenging (သဘာဝအားဖြင့် ခက်ခဲသော)"
      ],
      "prep_phrase": [
        "in the face of mounting challenges (တိုးပွားလာသော စိန်ခေါ်မှုများနှင့် ရင်ဆိုင်ရစဉ်)",
        "direct challenge to established norms (လက်ခံထားသော စံနှုန်းများကို တိုက်ရိုက် စိန်ခေါ်ခြင်း)"
      ],
      "frame": "Accelerating climate volatility poses an unprecedented challenge to the stability of international food supply chains.",
      "frame_mm": "ပိုမိုပြင်းထန်လာသော ရာသီဥတု မတည်ငြိမ်မှုများသည် နိုင်ငံတကာ စားနပ်ရိက္ခာ ထောက်ပံ့ရေးကွင်းဆက်များ၏ တည်ငြိမ်မှုအပေါ် မကြုံစဖူးသော စိန်ခေါ်မှုတစ်ရပ်ကို ဖြစ်ပေါ်စေလျက်ရှိသည်။"
    },
    "synonyms": [
      {
        "term": "Obstacle",
        "register": "B2-C1 Core",
        "nuance": "A physical or systemic hurdle that obstructs progress.",
        "example": "Trade protectionism poses a significant obstacle to multilateral cooperation."
      },
      {
        "term": "Dilemma",
        "register": "C1 Analytical",
        "nuance": "A difficult situation requiring a choice between two equally undesirable alternatives.",
        "example": "Policymakers face an acute dilemma between economic stimulus and fiscal austerity."
      },
      {
        "term": "Impediment",
        "register": "C2 High Academic",
        "nuance": "A formal or structural hindrance that restricts smooth operation.",
        "example": "Excessive bureaucracy remains a crippling impediment to technological innovation."
      }
    ]
  },
  "opportunity": {
    "pos": "noun",
    "meaning_mm": "အခွင့်အရေး / အခွင့်အလမ်း / ကောင်းမွန်သော အခြေအနေ",
    "collocations": {
      "verb_noun": [
        "seize an unparalleled opportunity (နှိုင်းယှဉ်မရနိုင်သော အခွင့်အလမ်းကို အရယူသည်)",
        "unlock economic opportunities (စီးပွားရေး အခွင့်အလမ်းများကို ဖွင့်လှစ်ပေးသည်)",
        "squander a golden opportunity (ရွှေရောင်အခွင့်အရေးကို ဖြုန်းတီးပစ်မိသည်)",
        "maximize vocational opportunities (အသက်မွေးဝမ်းကျောင်း အခွင့်အလမ်းများကို အမြင့်ဆုံး အသုံးချသည်)"
      ],
      "adj_noun": [
        "unparalleled opportunity (နှိုင်းယှဉ်မရနိုင်သော အခွင့်အလမ်း)",
        "lucrative opportunity (အကျိုးအမြတ်များသော အခွင့်အရေး)",
        "equal opportunity (တန်းတူအခွင့်အရေး)",
        "transformative opportunity (အခြေခံကျကျ ပြောင်းလဲစေနိုင်သော အခွင့်အလမ်း)"
      ],
      "adv_adj": [
        "uniquely opportune (ထူးခြားစွာ အချိန်အခါသင့်သော)",
        "highly promising (အလားအလာ အလွန်ကောင်းသော)"
      ],
      "prep_phrase": [
        "provide ample opportunity for (အတွက် လုံလောက်သော အခွင့်အရေးကို ပေးစွမ်းသည်)",
        "at the earliest opportunity (အစောဆုံး အခွင့်အရေးရသည်နှင့်)"
      ],
      "frame": "The transition toward green infrastructure unlocks transformative opportunities for high-skilled domestic employment.",
      "frame_mm": "သဘာဝပတ်ဝန်းကျင်နှင့် သဟဇာတဖြစ်သော အခြေခံအဆောက်အအုံများဆီသို့ အသွင်ကူးပြောင်းခြင်းသည် ပြည်တွင်း ကျွမ်းကျင်လုပ်သားများအတွက် အခြေခံကျကျ ပြောင်းလဲစေနိုင်သော အခွင့်အလမ်းများကို ဖွင့်လှစ်ပေးသည်။"
    },
    "synonyms": [
      {
        "term": "Prospect",
        "register": "C1 Academic",
        "nuance": "The possibility or likelihood of some future event occurring favorably.",
        "example": "The expansion of renewable energy enhances the long-term prospects of regional employment."
      },
      {
        "term": "Avenue",
        "register": "C1 Formal",
        "nuance": "A channel or pathway for pursuing an objective or resolution.",
        "example": "Online distance learning creates viable avenues for socio-economic mobility."
      }
    ]
  },
  "crucial": {
    "pos": "adj",
    "meaning_mm": "အလွန်အရေးပါသော / အဆုံးအဖြတ်ပေးနိုင်သော",
    "collocations": {
      "verb_noun": [
        "play a crucial role (အလွန်အရေးပါသော အခန်းကဏ္ဍမှ ပါဝင်သည်)",
        "reach a crucial milestone (အဆုံးအဖြတ်ပေးနိုင်သော မှတ်တိုင်တစ်ခုသို့ ရောက်ရှိသည်)",
        "overlook a crucial detail (အလွန်အရေးကြီးသော အသေးစိတ်အချက်ကို လျစ်လျူရှုမိသည်)"
      ],
      "adj_noun": [
        "crucial juncture (အရေးပါသော အချိုးအကွေ့)",
        "crucial prerequisite (မရှိမဖြစ် လိုအပ်ချက်)",
        "crucial catalyst (အဓိက တွန်းအား)",
        "crucial element (အရေးပါသော အစိတ်အပိုင်း)"
      ],
      "adv_adj": [
        "absolutely crucial (လုံးဝ မရှိမဖြစ် အရေးကြီးသော)",
        "demonstrably crucial (သက်သေပြနိုင်လောက်အောင် အရေးပါသော)"
      ],
      "prep_phrase": [
        "crucial to the success of (၏ အောင်မြင်မှုအတွက် အလွန်အရေးပါသော)",
        "at this crucial juncture (ဤအရေးပါသော အချိုးအကွေ့တွင်)"
      ],
      "frame": "Early intervention programs are crucial to preventing educational divergence among socio-economically disadvantaged children.",
      "frame_mm": "လူမှုစီးပွား အားနည်းသော ကလေးငယ်များအကြား ပညာရေးကွာဟမှု မဖြစ်ပေါ်စေရန် စောစီးစွာ ဝင်ရောက်ကူညီသည့် အစီအစဉ်များသည် အလွန်အရေးပါပါသည်။"
    },
    "synonyms": [
      {
        "term": "Pivotal",
        "register": "C1 Analytical",
        "nuance": "Of crucial importance in relation to the development or success of something.",
        "example": "Vaccine distribution played a pivotal role in curtailing the pandemic."
      },
      {
        "term": "Decisive",
        "register": "C1 Formal",
        "nuance": "Settling an issue; producing a definite result.",
        "example": "Decisive government action was required to avert financial insolvency."
      }
    ]
  },
  "acquire": {
    "pos": "verb",
    "meaning_mm": "ရရှိသည် / သင်ယူဆည်းပူးသည် / တတ်မြောက်သည်",
    "collocations": {
      "verb_noun": [
        "acquire essential competencies (မရှိမဖြစ် ကျွမ်းကျင်မှုများကို ဆည်းပူးတတ်မြောက်သည်)",
        "acquire specialized knowledge (အထူးပြု အသိပညာများကို ဆည်းပူးသည်)",
        "acquire fluency (ကျွမ်းကျင်စွာ ပြောဆိုနိုင်စွမ်းကို ရရှိသည်)"
      ],
      "adj_noun": [
        "acquired capability (ဆည်းပူးရရှိထားသော စွမ်းရည်)",
        "language acquisition (ဘာသာစကား သင်ယူဆည်းပူးမှု)",
        "knowledge acquisition (အသိပညာ ဆည်းပူးခြင်း)"
      ],
      "adv_adj": [
        "rapidly acquired (လျင်မြန်စွာ ဆည်းပူးတတ်မြောက်သော)",
        "painstakingly acquired (ပင်ပင်ပန်းပန်း ဆည်းပူးခဲ့ရသော)"
      ],
      "prep_phrase": [
        "with a view to acquiring (ဆည်းပူးတတ်မြောက်ရန် ရည်ရွယ်ချက်ဖြင့်)",
        "through the process of acquiring (ဆည်းပူးခြင်း လုပ်ငန်းစဉ်မှတစ်ဆင့်)"
      ],
      "frame": "Tertiary students must acquire rigorous analytical capabilities to thrive in increasingly automated job markets.",
      "frame_mm": "တက္ကသိုလ်ကျောင်းသားများသည် အလိုအလျောက်စနစ် တွင်ကျယ်လာသော အလုပ်အကိုင်ဈေးကွက်တွင် အောင်မြင်ရှင်သန်နိုင်ရန် ခိုင်မာသော ဝေဖန်ဆန်းစစ်နိုင်စွမ်းများကို ဆည်းပူးတတ်မြောက်ထားရမည်ဖြစ်သည်။"
    },
    "synonyms": [
      {
        "term": "Attain",
        "register": "C1 Academic",
        "nuance": "Succeed in achieving a desired level through sustained effort.",
        "example": "Candidates must attain a high level of lexical sophistication."
      },
      {
        "term": "Master",
        "register": "B2-C1 Core",
        "nuance": "Gain comprehensive knowledge or skill in a subject.",
        "example": "Mastering academic collocations elevates Task 2 writing significantly."
      }
    ]
  }
};

const LEXICON_BURMESE_MAP = {"mitigate":{"mm":"ပြင်းထန်မှုကို လျော့ပါးသက်သာစေသည်","pos":"Verb","col":"mitigate adverse impacts / mitigate climate risks"},"exacerbate":{"mm":"(ဆိုးရွားသောအခြေအနေကို) ပိုမိုဆိုးရွားစေသည်","pos":"Verb","col":"exacerbate existing tensions / exacerbate warming"},"deplete":{"mm":"(သယံဇာတ/စွမ်းအင်) ကုန်ခန်းသွားစေသည်","pos":"Verb","col":"deplete finite aquifers / deplete natural reserves"},"sustainable":{"mm":"ရေရှည်တည်တံ့သော","pos":"Adjective","col":"sustainable development / environmentally sustainable"},"catastrophic":{"mm":"ကပ်ဘေးဆိုက်စေလောက်အောင် ဆိုးရွားပြင်းထန်သော","pos":"Adjective","col":"catastrophic consequences / catastrophic loss"},"proliferate":{"mm":"အလျင်အမြန် ပွားများလာသည်","pos":"Verb","col":"proliferate rapidly / proliferate across"},"anthropogenic":{"mm":"လူသားတို့၏ လုပ်ဆောင်ချက်ကြောင့် ဖြစ်ပေါ်လာသော","pos":"Adjective","col":"anthropogenic emissions / anthropogenic climate change"},"degradation":{"mm":"အရည်အသွေး ယိုယွင်းပျက်စီးခြင်း","pos":"Noun","col":"environmental degradation / soil degradation"},"irreversible":{"mm":"နောက်ကြောင်းပြန်လှည့်၍ မရနိုင်သော၊ ပြန်လည်ပြုပြင်၍မရသော","pos":"Adjective","col":"irreversible damage / irreversible threshold"},"precarious":{"mm":"မရေရာသော၊ အန္တရာယ်ကျရောက်လွယ်သော","pos":"Adjective","col":"precarious balance / precarious existence"},"curriculum":{"mm":"သင်ရိုးညွှန်းတမ်း (ဗဟုဝုစ် - Curricula)","pos":"Noun","col":"national curriculum / overhaul the curriculum"},"pedagogy":{"mm":"သင်ကြားနည်းပညာ၊ ဆရာအတတ်ပညာ","pos":"Noun","col":"student-centered pedagogy / innovative pedagogy"},"cognitive":{"mm":"သိမြင်နားလည်မှုနှင့် ဉာဏ်ရည်ဆိုင်ရာ","pos":"Adjective","col":"cognitive development / cognitive flexibility"},"empirical":{"mm":"လက်တွေ့စမ်းသပ်ချက်နှင့် အထောက်အထားပေါ် အခြေခံသော","pos":"Adjective","col":"empirical evidence / empirical study"},"assimilate":{"mm":"(ဗဟုသုတကို) စုပ်ယူနားလည်သည်၊ ပေါင်းစည်းဝင်ဆံ့သည်","pos":"Verb","col":"assimilate new knowledge / assimilate into society"},"innate":{"mm":"မွေးရာပါဖြစ်သော၊ ပင်ကိုသဘာဝဖြစ်သော","pos":"Adjective","col":"innate talent / innate predisposition"},"inculcate":{"mm":"(စိတ်ဓာတ်/စံနှုန်းများကို) စွဲမြဲအောင် ရိုက်သွင်းပျိုးထောင်ပေးသည်","pos":"Verb","col":"inculcate moral values / inculcate discipline"},"rote":{"mm":"အဓိပ္ပာယ်မစဉ်းစားဘဲ အလွတ်ကျက်မှတ်ခြင်း","pos":"Noun / Adj","col":"rote memorization / rote learning"},"autonomous":{"mm":"ကိုယ်ပိုင်ဆုံးဖြတ်လုပ်ပိုင်ခွင့်ရှိသော၊ အမှီအခိုကင်းသော","pos":"Adjective","col":"autonomous learner / autonomous decision-making"},"extrinsic":{"mm":"ပြင်ပမှလာသော (ငွေကြေး၊ ဆုလာဘ်ကဲ့သို့ ပြင်ပတွန်းအား)","pos":"Adjective","col":"extrinsic motivation / extrinsic rewards"},"ubiquitous":{"mm":"နေရာတိုင်းတွင် တွေ့ရှိရသော","pos":"Adjective","col":"ubiquitous presence / become ubiquitous"},"obsolete":{"mm":"ခေတ်ကုန်သွားသော၊ အသုံးမဝင်တော့သော","pos":"Adjective","col":"render obsolete / become obsolete"},"catalyst":{"mm":"အပြောင်းအလဲကို အရှိန်မြှင့်ပေးသော အဓိကတွန်းအား","pos":"Noun","col":"act as a catalyst for / powerful catalyst"},"unprecedented":{"mm":"ယခင်က တစ်ခါမျှ မကြုံဖူးသော","pos":"Adjective","col":"at an unprecedented pace / on an unprecedented scale"},"paradigm":{"mm":"စံနမူနာပုံစံ၊ အတွေးအခေါ်မူဘောင်","pos":"Noun","col":"paradigm shift / dominant paradigm"},"surveillance":{"mm":"အနီးကပ် စောင့်ကြည့်စစ်ဆေးခြင်း","pos":"Noun","col":"mass surveillance / biometric surveillance"},"rudimentary":{"mm":"အခြေခံအကျဆုံး အဆင့်သာရှိသေးသော၊ ရှေးကျရိုးရှင်းသော","pos":"Adjective","col":"rudimentary tools / rudimentary understanding"},"ingenious":{"mm":"ဉာဏ်ပညာကြီးမားပြီး ဆန်းသစ်တီထွင်ထားသော","pos":"Adjective","col":"ingenious device / ingenious solution"},"disparity":{"mm":"ကွာဟချက်ကြီးမားမှု၊ မညီမျှမှု","pos":"Noun","col":"socioeconomic disparity / widen the disparity"},"affluent":{"mm":"ချမ်းသာကြွယ်ဝသော","pos":"Adjective","col":"affluent nations / affluent households"},"impoverished":{"mm":"ဆင်းရဲနွမ်းပါးသော၊ ချို့တဲ့သော","pos":"Adjective","col":"impoverished regions / impoverished communities"},"demographic":{"mm":"လူဦးရေဆိုင်ရာ အချက်အလက် / လူဦးရေအုပ်စု","pos":"Noun / Adj","col":"demographic shift / aging demographic"},"subsidize":{"mm":"(အစိုးရက) ထောက်ပံ့ကြေးပေးသည်","pos":"Verb","col":"heavily subsidize / state-subsidized transit"},"marginalize":{"mm":"ဘေးဖယ်ထားသည်၊ အရေးမပါသကဲ့သို့ ဆက်ဆံသည်","pos":"Verb","col":"marginalized communities / socially marginalized"},"egalitarian":{"mm":"လူတိုင်း တန်းတူအခွင့်အရေးရှိသော","pos":"Adjective","col":"egalitarian society / egalitarian access"},"homogenization":{"mm":"မတူကွဲပြားမှုများ ပျောက်ကွယ်ပြီး တစ်ပုံစံတည်း ဖြစ်သွားခြင်း","pos":"Noun","col":"cultural homogenization / global homogenization"},"sedentary":{"mm":"အထိုင်များပြီး ကိုယ်လက်လှုပ်ရှားမှု နည်းပါးသော","pos":"Adjective","col":"sedentary lifestyle / sedentary occupation"},"detrimental":{"mm":"ထိခိုက်နစ်နာစေသော၊ ဆိုးကျိုးပေးသော","pos":"Adjective","col":"detrimental to health / detrimental impact"},"chronic":{"mm":"နာတာရှည်ဖြစ်သော၊ ကာလရှည်ကြာ စွဲမြဲနေသော","pos":"Adjective","col":"chronic illness / chronic shortage"},"alleviate":{"mm":"(ဝေဒနာ/ဆင်းရဲဒုက္ခ/ပြဿနာကို) သက်သာရာရစေသည်","pos":"Verb","col":"alleviate pain / alleviate poverty"},"longevity":{"mm":"အသက်ရှည်ခြင်း၊ သက်တမ်းရှည်ကြာမှု","pos":"Noun","col":"human longevity / increase longevity"},"susceptible":{"mm":"(ရောဂါ/ဆိုးကျိုးကို) အလွယ်တကူ ခံစားရလွယ်သော","pos":"Adjective","col":"highly susceptible to / susceptible population"},"eradicate":{"mm":"အမြစ်ပြတ် ချေမှုန်းသည်၊ လုံးဝပပျောက်စေသည်","pos":"Verb","col":"eradicate polio / eradicate extreme poverty"},"circadian":{"mm":"၂၄ နာရီ ဇီဝနာရီစက်ဝန်းနှင့် ဆိုင်သော","pos":"Adjective","col":"circadian rhythm / disrupt circadian cycles"},"deterrent":{"mm":"ဟန့်တားမှု၊ ပြစ်မှုမကျူးလွန်ဝံ့အောင် ခြောက်လှန့်ဟန့်တားသောအရာ","pos":"Noun","col":"act as a deterrent / effective deterrent"},"rehabilitate":{"mm":"(အကျဉ်းသား/လူနာကို) ပြန်လည်ထူထောင်ပေးသည်","pos":"Verb","col":"rehabilitate offenders / vocational rehabilitation"},"stringent":{"mm":"အလွန်တင်းကျပ်သော (ဥပဒေ/စည်းမျဉ်း)","pos":"Adjective","col":"stringent regulations / stringent safety standards"},"recidivism":{"mm":"ထောင်မှလွတ်ပြီးနောက် ပြစ်မှုထပ်မံကျူးလွန်ခြင်း","pos":"Noun","col":"reduce recidivism rates / high recidivism"},"autonomy":{"mm":"ကိုယ်ပိုင်ဆုံးဖြတ်ပိုင်ခွင့်၊ လွတ်လပ်ခွင့်","pos":"Noun","col":"bodily autonomy / institutional autonomy"},"illicit":{"mm":"တရားမဝင်သော၊ ဥပဒေနှင့် မလွတ်ကင်းသော","pos":"Adjective","col":"illicit trade / illicit substances"},"plummet":{"mm":"(ကိန်းဂဏန်း/ပမာဏ) ထိုးကျသွားသည်","pos":"Verb","col":"plummet from X to Y / plummet dramatically"},"surge":{"mm":"(ကိန်းဂဏန်း/ပမာဏ) ရုတ်တရက် တဟုန်ထိုး မြင့်တက်လာသည်","pos":"Verb / Noun","col":"experience a dramatic surge / surge by 40%"},"fluctuate":{"mm":"အတက်အကျ မငြိမ်မသက် ဖြစ်နေသည်","pos":"Verb","col":"fluctuate wildly / fluctuate between X and Y"},"plateau":{"mm":"မြင့်တက်လာပြီးနောက် တန်းသွားသည် (ဆက်မတက်တော့ဘဲ တည်ငြိမ်နေသည်)","pos":"Verb / Noun","col":"reach a plateau / plateau at around 50%"},"negligible":{"mm":"မပြောပလောက်အောင် အလွန်နည်းပါးသော","pos":"Adjective","col":"a negligible proportion / negligible difference"},"outstrip":{"mm":"ကျော်တက်သွားသည်၊ သာလွန်သွားသည်","pos":"Verb","col":"outstrip demand / outstrip its competitors"},"dwindle":{"mm":"တဖြည်းဖြည်း လျော့နည်းကျုံ့သွားသည်","pos":"Verb","col":"dwindle steadily / dwindling numbers"},"apex":{"mm":"အမြင့်ဆုံးထိပ်ဆုံးအမှတ် (Peak ၏ အဆင့်မြင့် Synonym)","pos":"Noun","col":"reach its apex / at the apex of"},"demolish":{"mm":"(အဆောက်အအုံဟောင်းကို) ဖြိုချဖျက်ဆီးသည်","pos":"Verb","col":"be demolished to make way for / completely demolished"},"erect":{"mm":"(အဆောက်အအုံ) တည်ဆောက်သည်၊ စိုက်ထူသည်","pos":"Verb","col":"be erected on the site of / newly erected"},"renovate":{"mm":"(အဆောက်အအုံဟောင်းကို) အသစ်ပြန်လည် မွမ်းမံပြင်ဆင်သည်","pos":"Verb","col":"extensively renovated / renovated and converted into"},"pedestrianize":{"mm":"ကားမဝင်ရဘဲ လူသွားလမ်းသီးသန့်အဖြစ် ပြောင်းလဲသည်","pos":"Verb","col":"pedestrianized zone / pedestrianize the main street"},"pulverize":{"mm":"အမှုန့်ဖြစ်အောင် ကြိတ်ချေသည်","pos":"Verb","col":"pulverize raw limestone / finely pulverized"},"ferment":{"mm":"အချဉ်ဖောက်သည်၊ ကဇော်ဖောက်သည်","pos":"Verb","col":"leave to ferment / fermentation vats"},"condense":{"mm":"(အငွေ့မှ အရည်သို့) ငွေ့ရည်ဖွဲ့သည်","pos":"Verb","col":"condense into droplets / condensation chamber"},"adjacent":{"mm":"ကပ်လျက်တည်ရှိသော (to နှင့် တွဲသုံးရသည်)","pos":"Adjective","col":"adjacent to the station / immediately adjacent"},"substantiate":{"mm":"ခိုင်လုံသော သက်သေအထောက်အထားဖြင့် အတည်ပြုပြသသည်","pos":"Verb","col":"substantiate a claim / empirical substantiation"},"refute":{"mm":"(အယူအဆတစ်ခု မှားယွင်းကြောင်း) သက်သေပြ၍ ချေပသည်","pos":"Verb","col":"refute a hypothesis / thoroughly refuted"},"scrutinize":{"mm":"အသေးစိတ် စေ့စပ်သေချာစွာ စစ်ဆေးလေ့လာသည်","pos":"Verb","col":"scrutinize data / come under close scrutiny"},"postulate":{"mm":"သီအိုရီ/အဆိုတစ်ခုအဖြစ် ကြံဆတင်ပြသည်","pos":"Verb","col":"postulate that / postulate the existence of"},"skeptical":{"mm":"သံသယရှိသော၊ အလွယ်တကူ မယုံကြည်သော","pos":"Adjective","col":"remain skeptical about / deeply skeptical"},"advocate":{"mm":"အတိအလင်း ထောက်ခံအကြံပြုသည် / ထောက်ခံသူ","pos":"Verb / Noun","col":"staunchly advocate / advocates of reform"},"inadvertently":{"mm":"မရည်ရွယ်ဘဲ၊ အမှတ်တမဲ့","pos":"Adverb","col":"inadvertently cause / inadvertently exacerbate"},"sporadic":{"mm":"တစ်ခါတစ်ရံမှ ပေါ်ပေါက်တတ်သော၊ အချိန်မှန်မဟုတ်သော","pos":"Adjective","col":"sporadic outbreaks / sporadic rainfall"},"stem from":{"mm":"...မှ အရင်းခံသည်၊ ...ကြောင့် ဖြစ်ပေါ်လာသည်","pos":"Phrasal Verb","col":"stem primarily from / stem from a lack of"},"bring about":{"mm":"(အပြောင်းအလဲကြီးတစ်ခုကို) ဖြစ်ပေါ်စေသည်","pos":"Phrasal Verb","col":"bring about sweeping changes / bring about reform"},"phase out":{"mm":"တဖြည်းဖြည်း အဆင့်လိုက် ရပ်ဆိုင်းပယ်ဖျက်သည်","pos":"Phrasal Verb","col":"phase out fossil fuels / phase out single-use plastics"},"account for":{"mm":"(ပမာဏ/ရာခိုင်နှုန်းအားဖြင့်) ပါဝင်သည် / အကြောင်းရင်းကို ရှင်းပြသည်","pos":"Phrasal Verb","col":"account for the vast majority of / account for 35%"},"embark on":{"mm":"(စီမံကိန်းကြီး သို့မဟုတ် ဘဝခရီးသစ်ကို) စတင်ဆောင်ရွက်သည်","pos":"Phrasal Verb","col":"embark on a career / embark on an ambitious project"},"grapple with":{"mm":"(ခက်ခဲသောပြဿနာကို) အပြင်းအထန် ရင်ဆိုင်ဖြေရှင်းရန် ကြိုးပမ်းသည်","pos":"Phrasal Verb","col":"grapple with demographic decline / grapple with inflation"},"predominantly":{"mm":"အဓိကအားဖြင့်၊ အများစုအားဖြင့်","pos":"Adverb","col":"predominantly driven by / predominantly rural"},"nevertheless":{"mm":"သို့သော်လည်း၊ ထိုသို့ဖြစ်စေကာမူ","pos":"Adverb","col":"; nevertheless, / Nevertheless, it is evident that"},"albeit":{"mm":"...ဖြစ်သော်လည်းပဲ (Adjective/Adverb phrase ရှေ့တွင် သုံးသည်)","pos":"Conjunction","col":"albeit slowly / albeit to a lesser degree"},"notwithstanding":{"mm":"...ရှိနေသော်လည်းပဲ (Despite ၏ အဆင့်မြင့် Synonym)","pos":"Prep / Adverb","col":"notwithstanding these limitations / notwithstanding the fact that"},"ostentatious":{"mm":"ကြွားဝါလိုသော၊ ပကာသနဖက်သော","pos":"Adjective","col":"ostentatious display of wealth / ostentatious consumption"},"ephemeral":{"mm":"ခဏတာမျှသာ တည်မြဲသော၊ သက်တမ်းတိုတောင်းသော","pos":"Adjective","col":"ephemeral fashion trends / ephemeral satisfaction"},"indigenous":{"mm":"ဌာနေတိုင်းရင်းသားဖြစ်သော၊ ဒေသရင်းဖြစ်သော","pos":"Adjective","col":"indigenous languages / indigenous flora and fauna"},"unprecedentedly":{"mm":"ယခင်က တစ်ခါမျှ မကြုံဖူးသော ပုံစံဖြင့်","pos":"Adverb","col":"unprecedentedly high / grow unprecedentedly"},"viable":{"mm":"လက်တွေ့အကောင်အထည်ဖော်နိုင်သော၊ အောင်မြင်နိုင်ခြေရှိသော","pos":"Adjective","col":"viable solution / viable option / financially viable alternative"},"renowned":{"mm":"ကျော်ကြားထင်ရှားသော၊ လူသိများလေးစားခံရသော","pos":"Adjective","col":"renowned expert / renowned company / globally renowned for"},"prime":{"mm":"အဓိကအကျဆုံးဖြစ်သော၊ အကောင်းဆုံးစံနမူနာဖြစ်သော","pos":"Adjective","col":"prime example / prime advantage / prime disadvantage / prime reason"},"prone":{"mm":"(အမှား/ရောဂါ) ဖြစ်လွယ်သော၊ ကြုံတွေ့ရလွယ်သော","pos":"Adjective","col":"prone to errors / prone to making mistakes / prone to illness"},"output":{"mm":"ကုန်ထုတ်လုပ်မှု ပမာဏ၊ ထွက်ကုန်","pos":"Noun","col":"industrial output / total output / increase the output of companies"},"intellect":{"mm":"ဉာဏ်ပညာ၊ ဆင်ခြင်တွေးခေါ်နိုင်စွမ်း","pos":"Noun","col":"sharp intellect / develop a child's intellect"},"incentives":{"mm":"မက်လုံးများ၊ လုပ်ချင်ကိုင်ချင်စိတ် ပေါ်ပေါက်စေသော ဆုလာဘ်/အခွန်ကင်းလွတ်ခွင့်များ","pos":"Noun","col":"provide financial incentives / offer tax incentives to"},"irrespective":{"mm":"...ကို ထည့်သွင်းစဉ်းစားခြင်းမပြုဘဲ၊ မည်သို့ပင်ဖြစ်စေကာမူ","pos":"Adverb / Prep","col":"irrespective of background / irrespective of the outcome"},"disclose":{"mm":"(လျှို့ဝှက်ချက်/အချက်အလက်ကို) ထုတ်ဖော်ပြောကြားသည်","pos":"Verb","col":"disclose information / disclose financial risks / disclose corruption"},"accountable":{"mm":"မိမိလုပ်ရပ်အတွက် တာဝန်ခံမှုရှိသော","pos":"Adjective","col":"hold officials accountable for / accountable to the public"},"address":{"mm":"(ပြဿနာတစ်ရပ်ကို) ကိုင်တွယ်ဖြေရှင်းသည်၊ အလေးထားဆွေးနွေးသည်","pos":"Verb","col":"address the issue of / address the root causes"},"allocate":{"mm":"(ဘတ်ဂျက်/သယံဇာတ/ရာထူးနေရာ) ခွဲဝေသတ်မှတ်ပေးသည်","pos":"Verb","col":"allocate resources / allocate public funds to"},"awareness":{"mm":"အသိပညာ၊ သတိပြုမိမှု","pos":"Noun","col":"raise public awareness / nationwide awareness campaigns"},"burden":{"mm":"ဝန်ထုပ်ဝန်ပိုး (အထူးသဖြင့် ငွေကြေး သို့မဟုတ် တာဝန်)","pos":"Noun","col":"financial burden / heavy burden on taxpayers"},"consumption":{"mm":"သုံးစွဲမှုပမာဏ၊ စားသုံးမှု","pos":"Noun","col":"energy consumption / human consumption / fuel consumption"},"competence":{"mm":"ကျွမ်းကျင်ပိုင်နိုင်မှု၊ အရည်အချင်းပြည့်ဝမှု","pos":"Noun","col":"professional competence / core competencies"},"drawbacks":{"mm":"အားနည်းချက်များ၊ ဆိုးကျိုးများ","pos":"Noun","col":"major drawbacks / potential downsides"},"deficiency":{"mm":"ချို့တဲ့မှု၊ လိုအပ်ချက်ရှိနေမှု","pos":"Noun","col":"nutritional deficiency / vitamin deficiency / deficiency in"},"embrace":{"mm":"(အပြောင်းအလဲ/ယဉ်ကျေးမှုသစ်ကို) ဝမ်းမြောက်စွာ လက်ခံကျင့်သုံးသည်","pos":"Verb","col":"embrace change / embrace other cultures / embrace innovation"},"establishments":{"mm":"အဖွဲ့အစည်းများ၊ ကျောင်း/တက္ကသိုလ်/လုပ်ငန်းဌာနများ","pos":"Noun","col":"educational establishments / commercial establishments"},"expenditure":{"mm":"အသုံးစရိတ် (အထူးသဖြင့် အစိုးရ သို့မဟုတ် အဖွဲ့အစည်း၏ သုံးငွေ)","pos":"Noun","col":"government expenditure / public expenditure on healthcare"},"exceed":{"mm":"(သတ်မှတ်ချက်/ပမာဏထက်) ကျော်လွန်သွားသည်","pos":"Verb","col":"exceed expectations / exceed the legal limit / exceed 50%"},"insights":{"mm":"ထိုးထွင်းသိမြင်မှုများ၊ နက်နဲသော နားလည်သဘောပေါက်မှုများ","pos":"Noun","col":"provide valuable insights into / gain insights into"},"merit":{"mm":"အရည်အချင်း၊ ထိုက်တန်မှုဂုဏ်သတ္တိ","pos":"Noun","col":"academic merit / selected on merit / judge on its own merits"},"mediocre":{"mm":"သာမန်မျှသာဖြစ်သော၊ ထူးခြားကောင်းမွန်မှုမရှိသော","pos":"Adjective","col":"mediocre performance / mediocre results"},"notable":{"mm":"ထင်ရှားမှတ်သားဖွယ်ကောင်းသော","pos":"Adjective","col":"a notable example / a notable exception / notable achievement"},"peers":{"mm":"သက်တူရွယ်တူများ၊ အဆင့်တူ လုပ်ဖော်ကိုင်ဖက်များ","pos":"Noun","col":"peer pressure / outperform their peers / interact with peers"},"phenomenon":{"mm":"ဖြစ်ရပ်၊ ထူးခြားသော လူမှုရေး/သဘာဝ ဖြစ်စဉ် (ဗဟုဝုစ် - Phenomena)","pos":"Noun","col":"social phenomenon / natural phenomenon / this phenomenon stems from"},"revenue":{"mm":"အခွန်ဘဏ္ဍာငွေ၊ လုပ်ငန်းဝင်ငွေ","pos":"Noun","col":"tax revenue / generate annual revenue / allocate revenue to"},"resent":{"mm":"မကျေမနပ်ဖြစ်သည်၊ အငြိုးအတေးထားသည်","pos":"Verb","col":"resent the implication / resent parental pressure"},"sector":{"mm":"စီးပွားရေး/လုပ်ငန်း ကဏ္ဍ","pos":"Noun","col":"the public sector / the private sector / the voluntary sector"},"workforce":{"mm":"အလုပ်သမားထု၊ လုပ်သားအင်အား","pos":"Noun","col":"a skilled workforce / shrinking workforce / enter the workforce"},"thrive":{"mm":"ရှင်သန်ကြီးထွားသည်၊ အောင်မြင်ဖြစ်ထွန်းသည်","pos":"Verb","col":"thrive in a supportive environment / businesses thrive"},"unwind":{"mm":"(ပင်ပန်းမှုများမှ) စိတ်အပန်းဖြေသည်၊ အနားယူသည်","pos":"Verb","col":"unwind after a demanding workday / help employees unwind"},"general populace":{"mm":"အများပြည်သူလူထု၊ နိုင်ငံသားထု","pos":"Noun Phrase","col":"impact on the general populace / benefit the local populace"},"domestic unit":{"mm":"အိမ်ထောင်စု၊ မိသားစုယူနစ် (Sociological term)","pos":"Noun Phrase","col":"the modern domestic unit / average household size"},"scholars & pupils":{"mm":"Pupils = မူလတန်း/အထက်တန်း ကျောင်းသားငယ်များ | Scholars = တက္ကသိုလ်/ပညာရှင်အဆင့် ကျောင်းသားများ","pos":"Noun Trap","col":"primary school pupils / promising university scholars / adult learners"},"adolescents vs. minors":{"mm":"Adolescents = ဆယ်ကျော်သက်များ (၁၃-၁၉ နှစ်) | Minors = အသက် ၁၈ နှစ်အောက် ကလေးအားလုံး","pos":"Noun Trap","col":"adolescents aged 13 to 19 / protect legal minors"},"prevalent vs. popular":{"mm":"အဖြစ်များသော၊ ကျယ်ပြန့်စွာ တွေ့ရသော (Popular နှင့် မမှားရ!)","pos":"Adjective Trap","col":"increasingly prevalent among / widespread problem"},"ameliorate":{"mm":"(ဆိုးရွားသော အခြေအနေတစ်ရပ်ကို) ပိုမိုကောင်းမွန်အောင် ပြုပြင်ပေးသည်","pos":"Verb","col":"ameliorate living conditions / steps to ameliorate poverty"},"potent":{"mm":"အလွန်ထိရောက်အားကောင်းသော","pos":"Adjective","col":"a potent deterrent / a potent catalyst for change"},"contend":{"mm":"ခိုင်မာစွာ အဆိုပြုငြင်းဆိုသည်၊ ယူဆသည်","pos":"Verb","col":"critics contend that / I would contend that"},"state-run & civic":{"mm":"State-run = အစိုးရက စီမံလည်ပတ်သော | Civic = မြို့ပြနှင့် နိုင်ငံသားတာဝန်ဆိုင်ရာ","pos":"Adjective","col":"state-run transport / state-funded healthcare / civic duty"},"fruitful":{"mm":"အကျိုးရလဒ် ကောင်းမွန်သော၊ အောင်မြင်ဖြစ်ထွန်းသော","pos":"Adjective","col":"fruitful collaboration / fruitful discussion / financially prosperous"},"go hand in hand":{"mm":"ဒွန်တွဲနေသည်၊ တစ်ခုနှင့်တစ်ခု အပြန်အလှန် အထောက်အကူပြုသည်","pos":"Spoken Idiom","col":"both approaches go hand in hand"},"like clockwork":{"mm":"နာရီစက်လည်သကဲ့သို့ အချိန်မှန်မှန်၊ တစ်သွေမတိမ်း","pos":"Spoken Idiom","col":"wake up at 8 a.m. like clockwork / run like clockwork"},"on the fence":{"mm":"နှစ်ဖက်ကြားတွင် ဆုံးဖြတ်ရခက်နေသည် (သဘောတူရမလား၊ မတူရမလား မသေချာသေးသော)","pos":"Spoken Idiom","col":"sit on the fence / I'm kind of on the fence about that"},"handed on a platter":{"mm":"ကိုယ်တိုင် မကြိုးစားရဘဲ အသင့်ခူးခပ်ပေးထားသကဲ့သို့ အလွယ်တကူ ရရှိသည်","pos":"Spoken Idiom","col":"everything was given to you on a platter"},"at your fingertips":{"mm":"လက်တစ်ကမ်းတွင် အလွယ်တကူ အသင့်ရှိနေသော","pos":"Spoken Idiom","col":"information is available at your fingertips"},"suss out":{"mm":"(ပတ်ဝန်းကျင်အသစ်/လူအသစ်ကို) အရင်ဆုံး အကဲခတ်လေ့လာသည်","pos":"Phrasal Verb (Spoken)","col":"suss out my environment / suss out the situation"},"take a backseat":{"mm":"ဒုတိယနေရာသို့ ရောက်သွားသည်၊ ဦးစားပေးမခံရတော့ဘဲ မှေးမှိန်သွားသည်","pos":"Spoken Idiom","col":"on the backseat / take a backseat to cinema"},"regurgitate":{"mm":"အလွတ်ကျက်ထားသမျှကို ဉာဏ်မသုံးဘဲ စာမေးပွဲတွင် ပြန်အန်ထုတ်ဖြေဆိုသည်","pos":"Verb","col":"memorize and regurgitate on an exam"},"bite the bullet":{"mm":"မလုပ်ချင်သော်လည်း မဖြစ်မနေ လုပ်ရမည့် ခက်ခဲသောကိစ္စကို ရဲရဲဝံ့ဝံ့ ရင်ဆိုင်လုပ်ဆောင်သည်","pos":"Spoken Idiom","col":"decided to bite the bullet / had to bite the bullet"},"a piece of cake":{"mm":"အလွန်လွယ်ကူသော အရာ","pos":"Spoken Idiom","col":"compared to X, Y is a piece of cake"},"kill two birds with one stone":{"mm":"ခဲတစ်လုံးတည်းဖြင့် ငှက်နှစ်ကောင်ပစ်သည် (အလုပ်တစ်ခုတည်းဖြင့် ရည်ရွယ်ချက်နှစ်ခု ပြီးမြောက်သည်)","pos":"Spoken Idiom","col":"decided to kill two birds with one stone / killed two birds with one stone"},"let the cat out of the bag":{"mm":"လျှို့ဝှက်ချက်ကို မတော်တဆ ပေါက်ကြားမိသွားသည်","pos":"Spoken Idiom","col":"accidentally let the cat out of the bag"},"put all your eggs in one basket":{"mm":"အရင်းအနှီး သို့မဟုတ် မျှော်လင့်ချက်အားလုံးကို တစ်နေရာတည်းတွင်သာ ပုံအောထားသည်","pos":"Spoken Idiom","col":"foolish to put all my eggs in one basket / don't put all your eggs in one basket"},"once in a blue moon":{"mm":"အလွန်ရှားရှားပါးပါး၊ တစ်ခါတစ်ရံမှသာ","pos":"Spoken Idiom","col":"go out once in a blue moon / happens once in a blue moon"},"burn the midnight oil":{"mm":"ညဉ့်နက်သန်းခေါင်အထိ အပြင်းအထန် အလုပ်လုပ်သည် သို့မဟုတ် စာကျက်သည်","pos":"Spoken Idiom","col":"burning the midnight oil before final exams"},"burn the candle at both ends":{"mm":"နေ့ရောညပါ အလုပ်နှင့် အပျော်အပါး မနားတမ်းလုပ်ရင်း လူပန်းစိတ်ပန်း ဖြစ်စေသည်","pos":"Spoken Idiom","col":"used to burn the candle at both ends"},"at the drop of a hat":{"mm":"ချက်ချင်းလက်ငင်း၊ တုံ့ဆိုင်းမနေဘဲ","pos":"Spoken Idiom","col":"move anywhere at the drop of a hat / pack up at the drop of a hat"},"cry over spilt milk":{"mm":"ပြန်ပြင်၍မရတော့သော အတိတ်က အမှားအတွက် အချိန်ကုန်ခံ ပူဆွေးနေသည်","pos":"Spoken Idiom","col":"there's no point crying over spilt milk"},"can't judge a book by its cover":{"mm":"အပေါ်ယံ အသွင်အပြင်ကို ကြည့်ပြီး အကဲမဖြတ်သင့်ပါ","pos":"Spoken Idiom","col":"firm believer that you can't judge a book by its cover"},"don't count your chickens":{"mm":"လက်တွေ့ မအောင်မြင်သေးမီ ကြိုတင်၍ စိတ်ကူးယဉ် တွက်ချက်မထားပါနှင့်","pos":"Spoken Idiom","col":"I don't want to count my chickens before they hatch"},"go the extra mile":{"mm":"တာဝန်အရ လိုအပ်သည်ထက် ပိုမို၍ စေတနာထား ကြိုးပမ်းအားထုတ်သည်","pos":"Spoken Idiom","col":"always goes the extra mile for clients / go the extra mile when it comes to"},"raining cats and dogs":{"mm":"မိုးသည်းထန်စွာ ရွာသွန်းသည်","pos":"Spoken Idiom","col":"it was raining cats and dogs / normally raining cats and dogs"},"throw in the towel":{"mm":"လက်လျှော့အရှုံးပေးလိုက်သည်","pos":"Spoken Idiom","col":"easy to throw in the towel / refused to throw in the towel"},"cross that bridge when you come to it":{"mm":"ပြဿနာနှင့် လက်တွေ့ကြုံလာမှသာ ရင်ဆိုင်ဖြေရှင်းမည် (ကြိုတင် မပူပန်သေးပါ)","pos":"Spoken Idiom","col":"we'll cross that bridge when we come to it"},"rome wasn't built in a day":{"mm":"ကြီးမားသော အောင်မြင်မှုရရန် အချိန်ယူ တည်ဆောက်ရသည် (နေ့ချင်းညချင်း မပြီးမြောက်နိုင်ပါ)","pos":"Spoken Idiom","col":"understand that Rome wasn't built in a day"},"when in rome":{"mm":"ရောက်ရာအရပ်၏ ဓလေ့ထုံးစံအတိုင်း လိုက်လျောညီထွေ နေထိုင်သည် (ရောမရောက်လျှင် ရောမလိုကျင့်)","pos":"Spoken Idiom","col":"so you know, when in Rome"},"it comes down to":{"mm":"အဓိက အဆုံးအဖြတ်ပေးသည့် အချက်မှာ ... ပေါ်တွင် မူတည်သည်","pos":"Phrasal Chunk","col":"ultimately, it comes down to personal preference / comes down to consistency"},"strike a balance between":{"mm":"အရာနှစ်ခုကြား သင့်တင့်မျှတသော အလယ်အလတ်လမ်းကြောင်းကို ရှာဖွေသည်","pos":"Collocation Chunk","col":"strike a balance between work and leisure / strike a balance between A and B"},"in the long run":{"mm":"ရေရှည်တွင်၊ နောင်တစ်ချိန်တွင်","pos":"Prepositional Phrase","col":"in the long run, the benefits outweigh the costs"},"at the end of the day":{"mm":"အားလုံးကို ခြုံငုံသုံးသပ်ကြည့်လျှင်၊ နောက်ဆုံးတွင်တော့","pos":"Spoken Discourse Phrase","col":"at the end of the day, it depends on the individual"},"in two minds about":{"mm":"ရွေးချယ်စရာ နှစ်ခုကြား ဒွိဟဖြစ်နေသည်၊ စိတ်နှစ်ခွ ဖြစ်နေသည်","pos":"Spoken Idiom","col":"I'm actually in two minds about whether to..."},"keep an open mind":{"mm":"အမြင်ကျဉ်းမြောင်းမှု မရှိဘဲ အတွေးအခေါ်အသစ်များကို လက်ခံစဉ်းစားပေးသည်","pos":"Collocation Chunk","col":"keep an open mind about new technology / keep an open mind when traveling"},"get carried away":{"mm":"စိတ်ပါသွားပြီး အရှိန်လွန်သွားသည် (အချိန် သို့မဟုတ် ငွေ သတိမထားမိဘဲ သုံးမိသည်)","pos":"Phrasal Idiom","col":"easy to get carried away scrolling / got carried away shopping online"},"step out of your comfort zone":{"mm":"သက်သောင့်သက်သာ ရှိနေသည့် အလေ့အထမှ ဖောက်ထွက်ပြီး စိန်ခေါ်မှုအသစ်ကို စမ်းသပ်သည်","pos":"Spoken Idiom","col":"pushed me to step out of my comfort zone"},"get the hang of":{"mm":"လေ့ကျင့်ရင်းဖြင့် လုပ်ပုံလုပ်နည်း အထာသိသွားသည်၊ ကျွမ်းကျင်စပြုလာသည်","pos":"Spoken Idiom","col":"took a few weeks to get the hang of driving / get the hang of using smartphones"},"spoiled for choice":{"mm":"ရွေးချယ်စရာ အကောင်းစားများ ပေါများလွန်းသဖြင့် ဘာရွေးရမှန်းမသိအောင် ဖြစ်ရသည်","pos":"Idiomatic Phrase","col":"we are spoiled for choice in terms of restaurants"},"blow off steam":{"mm":"စိတ်ဖိစီးမှုများကို ဖြေဖျောက်သည်၊ စိတ်အပန်းဖြေသည်","pos":"Spoken Idiom","col":"go for a run to blow off steam after work"},"an acquired taste":{"mm":"အစပိုင်းတွင် မကြိုက်သော်လည်း အကြိမ်ကြိမ် မြည်းစမ်းပြီးမှ နှစ်သက်လာတတ်သော အရာ","pos":"Noun Phrase (Idiom)","col":"stinky tofu is definitely an acquired taste"},"click with someone":{"mm":"လူတစ်ဦးနှင့် စိတ်သဘောထားချင်း တိုက်ဆိုင်ပြီး ချက်ချင်း ရင်းနှီးသွားသည်","pos":"Phrasal Verb (Spoken)","col":"we clicked straight away / takes time to click with new people"},"hustle and bustle":{"mm":"မြို့ပြ၏ လှုပ်ရှားသွားလာ ဆူညံရှုပ်ထွေးမှုများ","pos":"Binomial Phrase","col":"escape the hustle and bustle of city life"},"pull it off":{"mm":"ခက်ခဲသော ကိစ္စတစ်ခုကို အောင်မြင်အောင် လုပ်ဆောင်နိုင်ခဲ့သည်","pos":"Phrasal Verb (Spoken)","col":"managed to pull it off at the last minute"},"out of sight, out of mind":{"mm":"မျက်စိရှေ့ မမြင်ရတော့လျှင် စိတ်ထဲမှလည်း မေ့ပျောက်သွားသည်","pos":"Spoken Idiom","col":"once I finish work, emails are out of sight, out of mind"},"touch upon":{"mm":"အကြောင်းအရာတစ်ခုကို အကျဉ်းချုပ် ထည့်သွင်းပြောဆိုသည်","pos":"Phrasal Verb","col":"touch upon current social issues / as I touched upon earlier"},"larger than life":{"mm":"သာမန်ထက်ပို၍ ဆွဲဆောင်မှုရှိပြီး သြဇာတိက္ကမ ကြီးမားသော","pos":"Idiomatic Adjective","col":"a larger-than-life personality on screen"},"by word of mouth":{"mm":"လူအချင်းချင်း တစ်ဆင့်စကား တစ်ဆင့်ကြားဖြင့် (ကြော်ငြာမသုံးဘဲ နာမည်ကြီးလာခြင်း)","pos":"Prepositional Idiom","col":"spread by word of mouth / gained popularity by word of mouth"},"second nature":{"mm":"အကျင့်ပါပြီး အလိုအလျောက် လုပ်မိသွားသော သဘာဝတစ်ခုလို ဖြစ်လာသည့်အရာ","pos":"Noun Phrase (Idiom)","col":"becomes second nature after a few months"},"i'd say i generally prefer [x] simply because...":{"mm":"ကျွန်တော့်အနေနဲ့ ယေဘုယျအားဖြင့် [X] ကို ပိုသဘောကျတယ်လို့ ပြောရမယ်၊ ဘာကြောင့်လဲဆိုတော့...","pos":"Band 9 Sentence Pattern","col":"Part 1 & Part 3 Preference Questions (Used by 37% of Band 7–9 candidates)"},"actually, in my opinion, it depends on...":{"mm":"တကယ်တမ်း ကျွန်တော့်အမြင်အရတော့ ဒါက ... ပေါ်မှာ မူတည်ပါတယ်","pos":"Band 9 Sentence Pattern","col":"Part 1 & Part 3 Opinion Questions (Natural conversational filler + balanced view)"},"well, i remember back in [year] when i...":{"mm":"လွန်ခဲ့တဲ့ [ခုနှစ်] တုန်းက ကျွန်တော် ... ခဲ့တာကို မှတ်မိပါသေးတယ်","pos":"Band 9 Sentence Pattern","col":"Part 2 Cue Cards & Past Experience Questions (Used by 60%+ of top scorers)"},"i would probably choose [x] because...":{"mm":"ရွေးချယ်ခွင့်ရှိမယ်ဆိုရင်တော့ [X] ကိုပဲ ရွေးဖြစ်ဖို့ များပါတယ်၊ ဘာကြောင့်လဲဆိုတော့...","pos":"Band 9 Sentence Pattern","col":"Hypothetical Questions ('If you could...') — Used by 55% of Band 7–9 speakers"},"that's an interesting question; i think some people... while others...":{"mm":"စိတ်ဝင်စားဖို့ကောင်းတဲ့ မေးခွန်းပါပဲ၊ တချို့လူတွေက ... လို့ မြင်ကြပေမယ့် တချို့ကတော့...","pos":"Band 9 Sentence Pattern","col":"Part 3 Analytical & Comparative Questions (Used by 46% of top scorers)"},"certainly, for example, last year i...":{"mm":"သေချာတာပေါ့၊ ဥပမာပြောရရင် မနှစ်တုန်းက ကျွန်တော်...","pos":"Band 9 Sentence Pattern","col":"Part 1 & Part 3 Personal Example Prompts (Used by 39% of top scorers)"},"i'm not entirely sure, but if i had to guess, i'd say...":{"mm":"အသေးစိတ်တော့ အတိအကျ မသိပေမယ့် ခန့်မှန်းကြည့်ရမယ်ဆိုရင်တော့...","pos":"Band 9 Sentence Pattern","col":"Unfamiliar Part 3 Topics (90% of Band 7–9 candidates speculate rather than stopping)"},"not necessarily, because while [a] is true, [b]...":{"mm":"အမြဲတမ်းတော့ အဲဒီလို မဟုတ်နိုင်ပါဘူး၊ ဘာကြောင့်လဲဆိုတော့ [A] က မှန်ပေမယ့် [B] ကတော့...","pos":"Band 9 Sentence Pattern","col":"Part 3 Yes/No & Evaluation Questions (9 Most Common Sentence Patterns)"},"it is possible that [x] could lead to [y]...":{"mm":"[X] က [Y] ကို ဖြစ်ပေါ်စေနိုင်ခြေ ရှိပါသည်","pos":"Band 9 Sentence Pattern","col":"Part 3 Future Speculation & Writing Task 2 Hedging"},"on the other hand, we also have to consider...":{"mm":"အခြားတစ်ဖက်တွင်လည်း ကျွန်တော်တို့ ထည့်သွင်းစဉ်းစားရမည့် အချက်မှာ...","pos":"Band 9 Sentence Pattern","col":"Expanding Part 3 Answers & Task 2 Contrast Paragraphs"},"in a nutshell, the core issue is...":{"mm":"အတိုချုပ် ပြောရလျှင် အဓိက ပြဿနာ/အချက်မှာ...","pos":"Band 9 Sentence Pattern","col":"Argument Link Step / Part 3 Concise Wrap-Up"},"this essay agrees that [x] because [reason 1] and [reason 2].":{"mm":"[အကြောင်းပြချက် ၁] နှင့် [အကြောင်းပြချက် ၂] တို့ကြောင့် [X] ဖြစ်သည်ဆိုသော အချက်ကို ဤအက်ဆေးက သဘောတူပါသည်။","pos":"Band 9 Writing Skeleton","col":"Writing Task 2 Introduction Thesis Statement (Academic Playbook Formula)"},"overall, it is immediately apparent that [trend a], whereas [trend b]...":{"mm":"ခြုံငုံကြည့်လျှင် [လမ်းကြောင်း A] ဖြစ်ပေါ်ခဲ့ပြီး [လမ်းကြောင်း B] မှာမူ ... ဖြစ်ကြောင်း သိသာထင်ရှားပါသည်။","pos":"Band 9 Writing Skeleton","col":"Writing Task 1 Academic Overview Paragraph (Mandatory for Band 7+)"},"while there is some merit to the argument that [x], i firmly believe [y].":{"mm":"[X] ဆိုသည့် အဆိုတွင် လက်ခံနိုင်ဖွယ် အချက်အချို့ ရှိသော်လည်း [Y] ဖြစ်သည်ဟု ကျွန်တော် အခိုင်အမာ ယုံကြည်ပါသည်။","pos":"Band 9 Sentence Pattern","col":"Task 2 Discussion/Opinion Conclusion & Speaking Part 3 123 Framework"},"this stems primarily from the fact that...":{"mm":"ဤသို့ဖြစ်ရခြင်း၏ အဓိက အကြောင်းရင်းမှာ ... ကြောင့် ဖြစ်ပါသည်။","pos":"Band 9 Sentence Pattern","col":"Body Paragraph Explanation (Sentence 2 in Task 2 / Analysis in PARA)"},"a concrete example of this can be seen in...":{"mm":"ဤအချက်၏ လက်တွေ့ကျသော ဥပမာတစ်ခုကို ... တွင် တွေ့မြင်နိုင်ပါသည်။","pos":"Band 9 Sentence Pattern","col":"Body Paragraph Example (Sentence 3 in Task 2 / Level-Up Step)"},"without adequate intervention, this trend will likely result in...":{"mm":"လုံလောက်သော ကြားဝင်ဖြေရှင်းမှု မရှိပါက ဤလမ်းကြောင်းသည် ... ကို ဖြစ်ပေါ်စေနိုင်ဖွယ် ရှိသည်။","pos":"Band 9 Sentence Pattern","col":"PARA Framework (Result Step) & Problem/Solution Essays"},"the most viable solution would be for authorities to...":{"mm":"လက်တွေ့အကျဆုံး ဖြေရှင်းနည်းမှာ အာဏာပိုင်များအနေဖြင့် ... လုပ်ဆောင်ပေးရန် ဖြစ်ပါလိမ့်မည်။","pos":"Band 9 Sentence Pattern","col":"PARA Framework (Action Step) & Task 2 Solution Paragraph"},"compared to a generation ago, there has been a marked shift toward...":{"mm":"လွန်ခဲ့သော မျိုးဆက်တစ်ခုနှင့် နှိုင်းယှဉ်လျှင် ... ဘက်သို့ သိသာထင်ရှားသော ပြောင်းလဲမှုတစ်ခု ဖြစ်ပေါ်ခဲ့သည်။","pos":"Band 9 Sentence Pattern","col":"Speaking Part 3 Change-Over-Time Questions & Task 2 Introductions"},"not only does [x] foster [benefit a], but it also [benefit b].":{"mm":"[X] သည် [အကျိုးကျေးဇူး A] ကို မြှင့်တင်ပေးရုံသာမက [အကျိုးကျေးဇူး B] ကိုလည်း ပေးစွမ်းပါသည်။","pos":"Band 9 Grammar Pattern","col":"Negative Inversion for Grammatical Range & Accuracy"},"had it not been for [x], i would never have [y].":{"mm":"အကယ်၍ [X] သာ မရှိခဲ့လျှင် ကျွန်တော် [Y] ကို လုပ်ဆောင်နိုင်ခဲ့မည် မဟုတ်ပါ။","pos":"Band 9 Grammar Pattern","col":"Speaking Part 2 Cue Card Reflection (Inverted Third Conditional)"},"to put it simply, the long-term advantages far outweigh the initial drawbacks.":{"mm":"ရိုးရိုးရှင်းရှင်း ပြောရလျှင် ရေရှည်အကျိုးကျေးဇူးများက အစပိုင်း အားနည်းချက်များထက် သာလွန်များပြားပါသည်။","pos":"Band 9 Sentence Pattern","col":"Outweigh Essay Conclusion & Speaking Part 3 Evaluation"},"tuition":{"mm":"သင်ကြားပို့ချမှု၊ ကျောင်းလခ","pos":"Noun (Uncountable)","col":"afford university tuition / waive tuition fees"},"pursue":{"mm":"(ဘွဲ့/အလုပ်အကိုင်/ရည်မှန်းချက်ကို) လိုက်စားသည်၊ ဆက်လက်သင်ယူသည်","pos":"Verb","col":"pursue a degree in biology / pursue a career"},"enrol":{"mm":"ကျောင်းအပ်နှံသည်၊ သင်တန်းစာရင်းသွင်းသည်","pos":"Verb","col":"enrol in a program / enrolled students"},"mentor":{"mm":"အတွေ့အကြုံရှိ လမ်းညွှန်သင်ပြပေးသူ","pos":"Noun / Verb","col":"having a mentor / mentor junior staff"},"biodiversity":{"mm":"ဇီဝမျိုးစုံမျိုးကွဲများ","pos":"Noun (Uncountable)","col":"support enormous biodiversity / preserve biodiversity"},"depletion":{"mm":"ကုန်ခန်းလျော့နည်းသွားခြင်း","pos":"Noun","col":"depletion of key fish stocks / ozone depletion"},"fossil fuels":{"mm":"ရုပ်ကြွင်းလောင်စာများ (ကျောက်မီးသွေး၊ ရေနံ၊ သဘာဝဓာတ်ငွေ့)","pos":"Noun Phrase","col":"cut dependence on fossil fuels / burning fossil fuels"},"extinction":{"mm":"မျိုးသုဉ်းပျောက်ကွယ်သွားခြင်း","pos":"Noun","col":"push species toward extinction / on the brink of extinction"},"entrepreneur":{"mm":"စွန့်ဦးတီထွင် စီးပွားရေးလုပ်ငန်းရှင်","pos":"Noun","col":"take significant financial risks as an entrepreneur"},"redundancy":{"mm":"ဝန်ထမ်းလျှော့ချမှုကြောင့် အလုပ်လက်မဲ့ဖြစ်ခြင်း","pos":"Noun","col":"announce 200 redundancies / face redundancy"},"outsource":{"mm":"ပြင်ပအဖွဲ့အစည်းသို့ လုပ်ငန်းလွှဲအပ် လုပ်ကိုင်စေသည်","pos":"Verb","col":"outsource customer service / outsource our critical thinking to AI"},"productivity":{"mm":"ကုန်ထုတ်စွမ်းအား၊ အလုပ်တွင်ကျယ်မှု","pos":"Noun","col":"boost productivity / lost productivity"},"immune system":{"mm":"ကိုယ်ခံအားစနစ်","pos":"Noun Phrase","col":"strengthen the immune system / weaken the immune system"},"epidemic":{"mm":"ကူးစက်ရောဂါ သို့မဟုတ် ပြဿနာတစ်ခု အကြီးအကျယ် ပျံ့နှံ့ဖြစ်ပွားမှု","pos":"Noun","col":"an obesity epidemic / spread quickly through the region"},"malnutrition":{"mm":"အာဟာရချို့တဲ့မှု","pos":"Noun (Uncountable)","col":"suffer from malnutrition / combat childhood malnutrition"},"cybersecurity":{"mm":"ဆိုက်ဘာလုံခြုံရေး (အွန်လိုင်းတိုက်ခိုက်မှုမှ ကာကွယ်ခြင်း)","pos":"Noun (Uncountable)","col":"cybersecurity is a growing concern / invest in cybersecurity"},"breakthrough":{"mm":"သိပ္ပံ သို့မဟုတ် နည်းပညာဆိုင်ရာ ကြီးမားသော ထိုးဖောက်အောင်မြင်မှု","pos":"Noun","col":"announce a breakthrough in battery technology / medical breakthrough"},"connectivity":{"mm":"ဆက်သွယ်ချိတ်ဆက်နိုင်မှု စွမ်းရည်","pos":"Noun (Uncountable)","col":"improved internet connectivity / high-speed connectivity"},"ageing population":{"mm":"သက်ကြီးရွယ်အို အချိုးအစား များပြားလာသော လူ့အဖွဲ့အစည်း","pos":"Noun Phrase","col":"an ageing population puts pressure on pension systems"},"discrimination":{"mm":"ခွဲခြားဆက်ဆံမှု","pos":"Noun (Uncountable)","col":"fight workplace discrimination / gender discrimination"},"deficit":{"mm":"လိုငွေပြမှု (ဝင်ငွေထက် ထွက်ငွေ ပိုများနေခြင်း)","pos":"Noun","col":"reduce its budget deficit / trade deficit"},"subsidy":{"mm":"အစိုးရ၏ ငွေကြေးထောက်ပံ့မှု","pos":"Noun","col":"receive agricultural subsidies / subsidize public transport"},"peak":{"mm":"အမြင့်ဆုံးအမှတ်သို့ ရောက်ရှိသည် (Verb) / အမြင့်ဆုံးအမှတ် (Noun)","pos":"Verb / Noun","col":"peaked in July at 4 million / reached a peak"},"proportion":{"mm":"အချိုးအစား၊ ဝေစု","pos":"Noun","col":"a large proportion of households / the highest proportion"},"pose a threat":{"mm":"ခြိမ်းခြောက်မှု သို့မဟုတ် အန္တရာယ် ဖြစ်ပေါ်စေသည်","pos":"Collocation","col":"pose a serious threat to coastal cities"},"raise awareness":{"mm":"အများပြည်သူ အသိပညာ တိုးပွားလာအောင် လုပ်ဆောင်သည်","pos":"Collocation","col":"campaigns to raise awareness of mental health"},"take responsibility":{"mm":"တာဝန်ယူသည်","pos":"Collocation","col":"take responsibility for protecting public health"},"have an impact on":{"mm":"... အပေါ် သက်ရောက်မှု ရှိသည်","pos":"Collocation","col":"have a major/profound/detrimental impact on"},"meet the demand":{"mm":"လိုအပ်ချက် (သို့မဟုတ် ဝယ်လိုအား) ကို ပြည့်မီအောင် ဖြည့်ဆည်းပေးသည်","pos":"Collocation","col":"struggled to meet the demand for housing/vaccines"},"bridge the gap":{"mm":"ကွာဟချက်ကို ပေါင်းကူးဖြည့်ဆည်းပေးသည် (ကျဉ်းမြောင်းစေသည်)","pos":"Collocation","col":"bridge the skills gap / bridge the gap between rich and poor"},"symptom":{"mm":"ရောဂါလက္ခဏာ (သို့မဟုတ် ပြဿနာတစ်ခု၏ အပေါ်ယံလက္ခဏာ)","pos":"Noun","col":"common symptom of anemia / exhibit symptoms"},"vaccination":{"mm":"ကာကွယ်ဆေးထိုးနှံခြင်း","pos":"Noun","col":"widespread vaccination programs"},"life expectancy":{"mm":"ပျမ်းမျှ သက်တမ်း","pos":"Noun Phrase","col":"life expectancy has risen steadily"},"sanitation":{"mm":"သန့်ရှင်းသော ရေနှင့် မိလ္လာစနစ် (ပြည်သူ့သန့်ရှင်းရေး)","pos":"Noun (Uncountable)","col":"better sanitation prevents the spread of disease"},"obesity":{"mm":"အဝလွန်ရောဂါ","pos":"Noun (Uncountable)","col":"rates of childhood obesity have increased"},"offence":{"mm":"ပြစ်မှု၊ ဥပဒေချိုးဖောက်မှု","pos":"Noun","col":"commit a minor offence / first-time offenders"},"deter":{"mm":"(ပြစ်ဒဏ်ကြောက်သဖြင့် မကျူးလွန်ဝံ့အောင်) ဟန့်တားသည်","pos":"Verb","col":"deter people from committing fraud / act as a deterrent"},"rehabilitation":{"mm":"အကျဉ်းသားများကို လူကောင်းပြန်ဖြစ်လာအောင် ပြန်လည်ထူထောင်ပေးခြင်း","pos":"Noun (Uncountable)","col":"focus on rehabilitation rather than punishment"},"law enforcement":{"mm":"တရားဥပဒေ စိုးမိုးရေး အဖွဲ့အစည်းများ (ရဲတပ်ဖွဲ့)","pos":"Noun Phrase","col":"law enforcement agencies"},"legislation":{"mm":"ပြဋ္ဌာန်းထားသော ဥပဒေများ","pos":"Noun (Uncountable)","col":"introduce new legislation / pass strict legislation"},"public spending":{"mm":"အစိုးရ၏ ပြည်သူ့အသုံးစရိတ်","pos":"Noun Phrase","col":"increase public spending on education and healthcare"},"bureaucracy":{"mm":"ကြိုးနီစနစ်၊ ရှုပ်ထွေးလေးလံသော အုပ်ချုပ်ရေးလုပ်ထုံးလုပ်နည်း","pos":"Noun","col":"excessive bureaucracy slows down projects"},"welfare":{"mm":"လူမှုဖူလုံရေး ထောက်ပံ့မှု၊ ကောင်းကျိုးချမ်းသာ","pos":"Noun (Uncountable)","col":"welfare payments / social welfare system"},"overtourism":{"mm":"ခရီးသွားဧည့်သည် အလွန်အကျွံ ဝင်ရောက်မှုကြောင့် ဒေသထိခိုက်ခြင်း","pos":"Noun (Uncountable)","col":"overtourism has damaged historic cities"},"itinerary":{"mm":"ခရီးသွား အစီအစဉ်အချိန်ဇယား","pos":"Noun","col":"our itinerary included three cities / packed itinerary"},"eco-tourism":{"mm":"သဘာဝပတ်ဝန်းကျင်ကို ထိန်းသိမ်းသော ခရီးသွားလုပ်ငန်း","pos":"Noun (Uncountable)","col":"promote eco-tourism to protect wildlife"},"hospitality":{"mm":"ဟိုတယ်နှင့် ခရီးသွား ဧည့်ဝတ်ပြုရေး လုပ်ငန်းကဏ္ဍ (သို့မဟုတ် ဖော်ရွေပျူငှာမှု)","pos":"Noun (Uncountable)","col":"the hospitality sector employs millions"},"processed food":{"mm":"တာရှည်ခံအောင် ပြုပြင်ထုတ်လုပ်ထားသော အသင့်စား အစားအစာ","pos":"Noun Phrase","col":"processed food contains high levels of sugar and sodium"},"staple food":{"mm":"နေ့စဉ် အဓိကထား စားသုံးသော အခြေခံအစားအစာ (ဥပမာ ဆန်)","pos":"Noun Phrase","col":"rice is a staple food across Asia"},"nutrient":{"mm":"အာဟာရဓာတ်","pos":"Noun","col":"rich in essential nutrients"},"nuclear family":{"mm":"မိဘနှင့် သားသမီးသာ ပါဝင်သော မိသားစုငယ်","pos":"Noun Phrase","col":"shift from extended families to the nuclear family"},"extended family":{"mm":"ဘိုးဘွား၊ ဦးလေး၊ အဒေါ်များပါ ပါဝင်သော မိသားစုဝန်းကျင်ကြီး","pos":"Noun Phrase","col":"extended family members live together"},"upbringing":{"mm":"ငယ်စဉ်ဘဝ ပြုစုပျိုးထောင်ပေးမှု","pos":"Noun","col":"parental upbringing shapes a child's values"},"generation gap":{"mm":"မျိုးဆက်တစ်ခုနှင့်တစ်ခုကြား အတွေးအခေါ် ကွာဟချက်","pos":"Noun Phrase","col":"widen the generation gap / bridge the generation gap"},"spectator":{"mm":"အားကစားပွဲ (သို့မဟုတ် ပွဲလမ်းသဘင်) ကြည့်ရှုသူ ပရိသတ်","pos":"Noun","col":"crowds of spectators attended the final / spectator sports"},"recreational":{"mm":"အပန်းဖြေ အနားယူမှုဆိုင်ရာ","pos":"Adjective","col":"recreational facilities / recreational activities"},"heritage":{"mm":"ယဉ်ကျေးမှု အမွေအနှစ်","pos":"Noun (Uncountable)","col":"protect cultural heritage sites / architectural heritage"},"literacy":{"mm":"စာတတ်မြောက်မှု (သို့မဟုတ် နယ်ပယ်တစ်ခုကို နားလည်တတ်ကျွမ်းမှု)","pos":"Noun (Uncountable)","col":"promote literacy among children / digital literacy / financial literacy"},"mainstream":{"mm":"လူအများစု လက်ခံကျင့်သုံးနေသော အဓိက ရေစီးကြောင်း","pos":"Noun / Adjective","col":"become mainstream / mainstream media / mainstream education"},"urban sprawl":{"mm":"မြို့ပြဧရိယာများ ကျေးလက်မြေများပေါ်သို့ စည်းကမ်းမဲ့ ကျယ်ပြန့်လာခြင်း","pos":"Noun Phrase","col":"urban sprawl increases dependence on cars"},"gentrification":{"mm":"ချမ်းသာသူများ ပြောင်းရွှေ့ဝင်ရောက်လာမှုကြောင့် ရပ်ကွက်ဟောင်းတွင် အိမ်ငှားခများ ကြီးမြင့်လာခြင်း","pos":"Noun (Uncountable)","col":"gentrification can push out long-term residents"},"erosion":{"mm":"ကမ်းပါး/မြေဆီလွှာ တိုက်စားခံရခြင်း (သို့မဟုတ် စံတန်ဖိုးများ တဖြည်းဖြည်း လျော့ပါးလာခြင်း)","pos":"Noun (Uncountable)","col":"coastal erosion / soil erosion / erosion of traditional values"},"hazard":{"mm":"အန္တရာယ်ဖြစ်စေနိုင်သော အရာ","pos":"Noun","col":"natural hazard / occupational health hazard"},"considerable":{"mm":"ပမာဏ သို့မဟုတ် အတိုင်းအတာအားဖြင့် အတော်အတန် ကြီးမားသော","pos":"Adjective","col":"a considerable rise in costs / considerable appeal"},"beneficial":{"mm":"အကျိုးကျေးဇူး ဖြစ်ထွန်းစေသော","pos":"Adjective","col":"beneficial for small businesses / mutually beneficial"},"illustrate":{"mm":"(ဂရပ် သို့မဟုတ် ဥပမာဖြင့်) ရှင်းလင်းစွာ ဖော်ပြသည်","pos":"Verb","col":"the chart illustrates / the data illustrates a clear pattern"},"obtain":{"mm":"ရရှိသည်၊ ရယူသည်","pos":"Verb","col":"obtain loans to study abroad / obtain a qualification"},"facilitate":{"mm":"(လုပ်ငန်းစဉ်တစ်ခုကို) ပိုမိုလွယ်ကူချောမွေ့အောင် ပံ့ပိုးပေးသည်","pos":"Verb","col":"technology can facilitate communication"},"endeavour":{"mm":"အားထုတ်ကြိုးပမ်းသည် (Verb) / ကြိုးပမ်းအားထုတ်မှု (Noun)","pos":"Verb / Noun","col":"endeavour to reduce inflation / scientific endeavour"},"outnumber":{"mm":"ဦးရေအားဖြင့် ပိုများသည်၊ အရေအတွက် သာလွန်သည်","pos":"Verb","col":"women outnumbered men in the arts sector"},"adjacent to":{"mm":"ကပ်လျက်တည်ရှိသော","pos":"Prepositional Phrase","col":"constructed a new car park adjacent to the main hall"},"subsequently":{"mm":"ထို့နောက်ပိုင်းတွင်၊ ဆက်လက်၍","pos":"Adverb","col":"melted into pellets and subsequently sold to manufacturers"},"mutually exclusive":{"mm":"တစ်ခုနှင့်တစ်ခု အတူယှဉ်တွဲ မရှိနိုင်သော (တစ်ခုရွေးလျှင် တစ်ခုစွန့်ရမည့်)","pos":"Adjective Phrase","col":"governments should not treat these priorities as mutually exclusive"},"close-knit community":{"mm":"အချင်းချင်း စည်းလုံးရင်းနှီးပြီး အပြန်အလှန် ကူညီတတ်သော ရပ်ရွာအသိုက်အဝန်း","pos":"Noun Phrase","col":"grow up in a close-knit community"},"off the beaten track":{"mm":"ခရီးသွားအများစု မရောက်လေ့ရှိသော လူသူအရောက်အပေါက်နည်းသည့် နေရာ","pos":"Idiomatic Phrase","col":"travel to villages off the beaten track"},"be glued to":{"mm":"(ဖုန်း/တီဗီ မျက်နှာပြင်ကို) မျက်စိမခွာတမ်း စွဲလမ်းကြည့်ရှုနေသည်","pos":"Idiomatic Verb Phrase","col":"glued to their smartphone screens"},"self-reliance":{"mm":"ကိုယ့်အားကိုယ်ကိုးတတ်မှု","pos":"Noun (Uncountable)","col":"foster self-reliance in young adults"},"urban heat island":{"mm":"ကွန်ကရစ်နှင့် ကတ္တရာလမ်းများကြောင့် မြို့လယ်ခေါင်တွင် ပတ်ဝန်းကျင်ထက် ပိုမိုပူပြင်းနေသော သက်ရောက်မှု","pos":"Noun Phrase","col":"mitigate the urban heat island effect by planting street trees"},"corroborate":{"mm":"သက်သေအထောက်အထားဖြင့် ထပ်ဆင့်အတည်ပြုပေးသည်","pos":"Verb","col":"empirical data corroborates"},"compound":{"mm":"ပြဿနာကို ထပ်ဆင့် ပိုမိုဆိုးရွားစေသည်","pos":"Verb","col":"further compounded by"},"engender":{"mm":"(ခံစားချက် သို့မဟုတ် အခြေအနေကို) ဖြစ်ပေါ်ပေါက်ဖွားစေသည်","pos":"Verb","col":"engender public trust"},"burgeoning":{"mm":"အရှိန်အဟုန်ဖြင့် ကြီးထွားဖွံ့ဖြိုးလာနေသော","pos":"Adjective","col":"burgeoning demand for"},"feasible":{"mm":"လက်တွေ့ အကောင်အထည်ဖော်နိုင်သော","pos":"Adjective","col":"economically feasible solution"},"imperative":{"mm":"မဖြစ်မနေ အရေးတကြီး လုပ်ဆောင်ရန် လိုအပ်သော","pos":"Adjective","col":"it is imperative that governments act"},"pervasive":{"mm":"နေရာအနှံ့ စိမ့်ဝင်ပျံ့နှံ့နေသော","pos":"Adjective","col":"pervasive influence of advertising"},"systemic":{"mm":"စနစ်တစ်ခုလုံးတွင် အမြစ်တွယ်နေသော","pos":"Adjective","col":"address systemic inequality"},"tangible":{"mm":"လက်ဆုပ်လက်ကိုင် ပြနိုင်သော၊ သိသာထင်ရှားသော","pos":"Adjective","col":"yield tangible benefits"},"intangible":{"mm":"ဒြပ်မဲ့သော၊ တိုက်ရိုက်တိုင်းတာ၍မရသော","pos":"Adjective","col":"intangible cultural heritage"},"discrepancy":{"mm":"ကိန်းဂဏန်း သို့မဟုတ် အချက်အလက်နှစ်ခုကြား ကွဲလွဲချက်","pos":"Noun","col":"a marked discrepancy between"},"equilibrium":{"mm":"ဟန်ချက်ညီမျှမှု အခြေအနေ","pos":"Noun","col":"disrupt the ecological equilibrium"},"ramifications":{"mm":"နောက်ဆက်တွဲ ရိုက်ခတ်မှုများ၊ အကျိုးဆက်များ","pos":"Noun (Plural)","col":"far-reaching ramifications for"},"repercussions":{"mm":"မလိုလားအပ်သော နောက်ဆက်တွဲ ဆိုးကျိုးများ","pos":"Noun (Plural)","col":"severe repercussions for public health"},"prerequisite":{"mm":"ရှေးဦးစွာ မရှိမဖြစ် လိုအပ်သော အခြေခံအချက်","pos":"Noun","col":"a prerequisite for career advancement"},"cornerstone":{"mm":"အဓိက အုတ်မြစ်၊ အသက်သွေးကြော","pos":"Noun","col":"forms the cornerstone of"},"impetus":{"mm":"ရှေ့သို့ ဆက်လက်ရွေ့လျားစေသော အရှိန်အဟုန်၊ တွန်းအား","pos":"Noun","col":"provide fresh impetus for"},"dichotomy":{"mm":"ဆန့်ကျင်ဘက် နှစ်ခုကြား ပြတ်သားစွာ ကွဲပြားနေမှု","pos":"Noun","col":"a false dichotomy between"},"consensus":{"mm":"အများသဘောတူညီချက်","pos":"Noun","col":"a broad scientific consensus"},"pragmatic":{"mm":"စိတ်ကူးယဉ်မဆန်ဘဲ လက်တွေ့ကျသော","pos":"Adjective","col":"adopt a pragmatic approach"},"altruistic":{"mm":"ကိုယ်ကျိုးမဖက်ဘဲ အများအကျိုးကိုသာ ရှေးရှုသော","pos":"Adjective","col":"altruistic values and behavior"},"meritocratic":{"mm":"အရည်အချင်းနှင့် ကြိုးစားမှုအလိုက် နေရာပေးသော","pos":"Adjective","col":"a genuinely meritocratic system"},"arbitrary":{"mm":"ခိုင်လုံသော အကြောင်းပြချက်မရှိဘဲ စိတ်ထင်ရာ သတ်မှတ်ထားသော","pos":"Adjective","col":"an arbitrary restriction"},"plausible":{"mm":"ယုတ္တိရှိပြီး လက်ခံနိုင်ဖွယ်ရာ ဖြစ်သော","pos":"Adjective","col":"sounds plausible at first glance"},"tenable":{"mm":"ဆက်လက် ဆုပ်ကိုင်ထားနိုင်သော၊ ခုခံချေပနိုင်သော","pos":"Adjective","col":"no longer tenable"},"disproportionate":{"mm":"အချိုးအစား မမျှတဘဲ အလွန်အကျွံ ဖြစ်နေသော","pos":"Adjective","col":"place a disproportionate burden on"},"commensurate":{"mm":"(အရည်အချင်း သို့မဟုတ် ပြစ်မှုနှင့်) အချိုးကျ ထိုက်တန်ညီမျှသော","pos":"Adjective","col":"remuneration commensurate with"},"ostensibly":{"mm":"အပေါ်ယံအားဖြင့် (ထုတ်ဖော်ပြောဆိုထားချက်အရ)","pos":"Adverb","col":"ostensibly designed to"},"inextricably":{"mm":"ခွဲခြား၍မရနိုင်အောင် ဆက်စပ်နေသော","pos":"Adverb","col":"inextricably linked to"},"conducive":{"mm":"(ကောင်းမွန်သော ရလဒ်အတွက်) အထောက်အကူပြုသော၊ သင့်လျော်သော","pos":"Adjective","col":"conducive to deep concentration"},"deleterious":{"mm":"ထိခိုက်ပျက်စီးစေသော၊ ဆိုးကျိုးသက်ရောက်စေသော","pos":"Adjective","col":"deleterious effects on health"},"prevalent":{"mm":"အဖြစ်များနေသော၊ ခေတ်စားပျံ့နှံ့နေသော","pos":"Adjective","col":"increasingly prevalent among youth"},"paramount":{"mm":"အရေးကြီးဆုံးဖြစ်သော၊ ထိပ်တန်းဦးစားပေးဖြစ်သော","pos":"Adjective","col":"of paramount importance"},"prudent":{"mm":"အနာဂတ်အတွက် အမြော်အမြင်ရှိပြီး သတိကြီးစွာ ဆောင်ရွက်တတ်သော","pos":"Adjective","col":"a prudent financial policy"},"nocturnal":{"mm":"ညဘက်တွင်သာ လှုပ်ရှားသွားလာတတ်သော","pos":"Adjective","col":"nocturnal insects and birds"},"arid":{"mm":"မိုးခေါင်ပြီး အလွန်ခြောက်သွေ့သော","pos":"Adjective","col":"cultivate crops in arid regions"},"fertile":{"mm":"မြေဆီသြဇာ ကောင်းမွန်သော","pos":"Adjective","col":"fertile river valleys"},"pristine":{"mm":"မူလသဘာဝအတိုင်း မပျက်မစီး သန့်စင်နေသော","pos":"Adjective","col":"pristine marine reserves"},"finite":{"mm":"အကန့်အသတ်ရှိသော (တစ်ချိန်တွင် ကုန်ခန်းသွားမည့်)","pos":"Adjective","col":"finite natural resources"},"biodegradable":{"mm":"သဘာဝအလျောက် ဆွေးမြည့်ပျက်စီးနိုင်သော","pos":"Adjective","col":"biodegradable packaging"},"lethal":{"mm":"သေစေနိုင်လောက်အောင် အန္တရာယ်ပြင်းထန်သော","pos":"Adjective","col":"produce lethal venom"},"benign":{"mm":"အန္တရာယ်မရှိသော၊ သိမ်မွေ့ညင်သာသော","pos":"Adjective","col":"environmentally benign"},"acute":{"mm":"ရုတ်တရက် ပြင်းထန်စွာ ဖြစ်ပေါ်သော","pos":"Adjective","col":"an acute shortage of housing"},"hereditary":{"mm":"မျိုးရိုးဗီဇအရ လက်ဆင့်ကမ်း ဆင်းသက်လာသော","pos":"Adjective","col":"hereditary health conditions"},"neurological":{"mm":"ဦးနှောက်နှင့် အာရုံကြောစနစ်ဆိုင်ရာ","pos":"Adjective","col":"neurological research"},"metabolic":{"mm":"ခန္ဓာကိုယ်၏ အစာချေဖျက် စွမ်းအင်ထုတ်လုပ်မှု (ဇီဝကမ္မ) ဆိုင်ရာ","pos":"Adjective","col":"resting metabolic rate"},"resilient":{"mm":"အခက်အခဲများမှ အလျင်အမြန် ပြန်လည်နာလန်ထူနိုင်သော (ကြံ့ကြံ့ခံနိုင်သော)","pos":"Adjective","col":"emotionally resilient adults"},"cutting-edge":{"mm":"ခေတ်ရှေ့ပြေး အဆင့်မြင့်ဆုံးဖြစ်သော","pos":"Adjective","col":"cutting-edge diagnostic equipment"},"intricate":{"mm":"အသေးစိတ် ရှုပ်ထွေးသိမ်မွေ့စွာ ဖွဲ့စည်းထားသော","pos":"Adjective","col":"intricate stone carvings"},"simultaneous":{"mm":"တစ်ချိန်တည်း တစ်ပြိုင်နက်တည်း ဖြစ်ပေါ်သော","pos":"Adjective","col":"simultaneous real-time editing"},"consecutive":{"mm":"ကြားမပြတ်ဘဲ ဆက်တိုက်ဖြစ်သော","pos":"Adjective","col":"for five consecutive years"},"chronological":{"mm":"ဖြစ်ပျက်ခဲ့သော အချိန်ကာလ အစဉ်လိုက်ဖြစ်သော","pos":"Adjective","col":"in chronological order"},"intermittent":{"mm":"ရပ်လိုက်ပြန်ဖြစ်လိုက် ပြတ်တောင်းပြတ်တောင်း ဖြစ်သော","pos":"Adjective","col":"intermittent wind and solar power"},"perpetual":{"mm":"အစဉ်အမြဲ မရပ်မနား ဖြစ်ပေါ်နေသော","pos":"Adjective","col":"a perpetual cycle of debt"},"transient":{"mm":"ခေတ္တခဏသာ နေထိုင်/ဖြစ်ပေါ်သော","pos":"Adjective","col":"a largely transient population"},"imminent":{"mm":"မကြာမီ အချိန်အတွင်း ကျရောက်လာတော့မည့်","pos":"Adjective","col":"when a cyclone is imminent"},"inevitable":{"mm":"ရှောင်လွှဲ၍မရနိုင်သော၊ မုချဖြစ်ပေါ်လာမည့်","pos":"Adjective","col":"an inevitable consequence"},"anomalous":{"mm":"ပုံမှန်အခြေအနေမှ သွေဖည်ထူးခြားနေသော","pos":"Adjective","col":"an anomalous dip in 2020"},"sceptical":{"mm":"(အဆိုတစ်ခု မှန်ကန်ကြောင်းကို) သံသယရှိသော၊ မယုံကြည်သေးသော","pos":"Adjective","col":"remain sceptical about"},"unanimous":{"mm":"ကန့်ကွက်သူမရှိ တစ်ခဲနက် သဘောတူညီသော","pos":"Adjective","col":"reach a unanimous decision"},"lenient":{"mm":"(ပြစ်ဒဏ်ပေးရာတွင်) သက်ညှာသော၊ အလျှော့ပေးသော","pos":"Adjective","col":"hand down lenient sentences"},"draconian":{"mm":"(ဥပဒေ သို့မဟုတ် ပြစ်ဒဏ်) အလွန်အမင်း ပြင်းထန်ကြမ်းတမ်းသော","pos":"Adjective","col":"impose draconian fines"},"abundant":{"mm":"ပေါများကြွယ်ဝသော","pos":"Adjective","col":"abundant sunshine and wind"},"scarce":{"mm":"ရှားပါးသော၊ မလုံလောက်သော","pos":"Adjective","col":"affordable land is increasingly scarce"},"homogeneous":{"mm":"တစ်ပုံစံတည်း တူညီနေသော","pos":"Adjective","col":"look increasingly homogeneous"},"heterogeneous":{"mm":"မတူကွဲပြားသော အရာများ/လူများ စုပေါင်းပါဝင်နေသော","pos":"Adjective","col":"a heterogeneous student population"},"rudiments":{"mm":"ဘာသာရပ်တစ်ခု၏ အခြေခံ သဘောတရားများ","pos":"Noun (Plural)","col":"grasp the rudiments of coding"},"obscure":{"mm":"လူသိနည်းပြီး နားလည်ရခက်သော","pos":"Adjective","col":"once-obscure historical manuscripts"},"prominent":{"mm":"ထင်ရှားကျော်ကြားသော၊ အဓိကကျသော","pos":"Adjective","col":"play a prominent role in"},"unambiguous":{"mm":"ဒွိဟဖြစ်စရာ မရှိဘဲ လုံးဝရှင်းလင်းပြတ်သားသော","pos":"Adjective","col":"provide unambiguous information"},"sensationalism":{"mm":"သတင်းများကို စိတ်လှုပ်ရှားဖွယ် ချဲ့ကားဖော်ပြခြင်း","pos":"Noun","col":"resort to sensationalism"},"censorship":{"mm":"သတင်းနှင့် စာပေ စိစစ်ဖြတ်တောက်ခြင်း","pos":"Noun","col":"internet censorship"},"impartiality":{"mm":"ဘက်မလိုက်ဘဲ သမာသမတ်ကျမှု","pos":"Noun","col":"maintain journalistic impartiality"},"misinformation":{"mm":"မှားယွင်းသော သတင်းအချက်အလက်များ","pos":"Noun","col":"combat online misinformation"},"target audience":{"mm":"ကြော်ငြာက အဓိက ပစ်မှတ်ထားသော ပရိသတ်အုပ်စု","pos":"Noun Phrase","col":"appeal to a young target audience"},"brand loyalty":{"mm":"အမှတ်တံဆိပ်တစ်ခုတည်းကိုသာ စွဲမြဲစွာ ဝယ်ယူသုံးစွဲတတ်မှု","pos":"Noun Phrase","col":"cultivate lasting brand loyalty"},"impulsive buying":{"mm":"ကြိုတင်မစဉ်းစားဘဲ စိတ်လိုက်မာန်ပါ ဝယ်ယူခြင်း","pos":"Noun Phrase","col":"trigger impulsive buying"},"conspicuous consumption":{"mm":"ချမ်းသာမှုကို လူမြင်အောင် ကြွားဝါလို၍ ဇိမ်ခံပစ္စည်း ဝယ်ယူသုံးစွဲခြင်း","pos":"Noun Phrase","col":"fuel conspicuous consumption"},"materialism":{"mm":"ရုပ်ဝတ္ထုပစ္စည်းနှင့် ငွေကြေးပိုင်ဆိုင်မှုကိုသာ အဓိကတန်ဖိုးထားသော ဝါဒ","pos":"Noun","col":"promote materialism"},"throwaway society":{"mm":"ပစ္စည်းများကို ပြုပြင်မသုံးတော့ဘဲ အလွယ်တကူ စွန့်ပစ်တတ်သော လူ့အဖွဲ့အစည်း","pos":"Noun Phrase","col":"turn nations into a throwaway society"},"planned obsolescence":{"mm":"ပစ္စည်းအသစ် ထပ်ဝယ်ရစေရန် သက်တမ်းတိုအောင် တမင်ဒီဇိုင်းထုတ်ထားခြင်း","pos":"Noun Phrase","col":"curb planned obsolescence"},"circular economy":{"mm":"စွန့်ပစ်ပစ္စည်း မထွက်ရှိစေဘဲ ပြန်လည်ပြုပြင် အသုံးချသည့် စီးပွားရေးစနစ်","pos":"Noun Phrase","col":"transition toward a circular economy"},"cultural assimilation":{"mm":"ယဉ်ကျေးမှုကြီးတစ်ခုထဲသို့ အခြားယဉ်ကျေးမှုငယ်က ပေါင်းစည်းဝင်ရောက်ခြင်း","pos":"Noun Phrase","col":"balance cultural assimilation"},"lingua franca":{"mm":"မိခင်ဘာသာစကား မတူညီသူများကြား ဘုံဆက်သွယ်ရေး ဘာသာစကား","pos":"Noun Phrase","col":"serve as the global lingua franca"},"mother tongue":{"mm":"မိခင်ဘာသာစကား","pos":"Noun Phrase","col":"literacy in one's mother tongue"},"cosmopolitan":{"mm":"နိုင်ငံတကာမှ လူမျိုးနှင့် ယဉ်ကျေးမှုပေါင်းစုံ ရောနှောနေထိုင်သော","pos":"Adjective","col":"a vibrant cosmopolitan hub"},"social cohesion":{"mm":"လူ့အဖွဲ့အစည်းအတွင်း စည်းလုံးညီညွတ်မှု","pos":"Noun Phrase","col":"strengthen social cohesion"},"alienation":{"mm":"ပတ်ဝန်းကျင်နှင့် ကင်းကွာပြီး အထီးကျန်နေသည့် ခံစားချက်","pos":"Noun","col":"deepen feelings of urban alienation"},"marginalization":{"mm":"အားနည်းသူများကို လူ့အဖွဲ့အစည်း၏ အစွန်အဖျားသို့ ဖယ်ကြဉ်ထားခြင်း","pos":"Noun","col":"marginalization of elderly residents"},"conformity":{"mm":"အများနည်းတူ စည်းမျဉ်းနှင့် စံနှုန်းအတိုင်း လိုက်နာနေထိုင်မှု","pos":"Noun","col":"promote discipline and conformity"},"individualism":{"mm":"တစ်ဦးချင်း လွတ်လပ်မှုနှင့် ရပ်တည်မှုကို အလေးပေးသော ဝါဒ","pos":"Noun","col":"rise of individualism"},"collectivism":{"mm":"မိသားစုနှင့် အဖွဲ့အစည်း အကျိုးကို ဦးစားပေးသော ဓလေ့","pos":"Noun","col":"rooted in collectivism"},"commercialization":{"mm":"ရိုးရာပွဲတော် သို့မဟုတ် ယဉ်ကျေးမှုကို စီးပွားရှာသည့် လုပ်ငန်းအဖြစ် အသုံးချခြင်း","pos":"Noun","col":"commercialization of traditional holidays"},"philanthropy":{"mm":"လူသားအကျိုးပြု ပရဟိတ အလှူအတန်းပြုလုပ်ခြင်း","pos":"Noun","col":"private philanthropy funds research"},"ethical consumerism":{"mm":"ပတ်ဝန်းကျင်နှင့် လုပ်သားအခွင့်အရေး မထိခိုက်သော ပစ္စည်းများကိုသာ ရွေးချယ်ဝယ်ယူသည့် အလေ့အထ","pos":"Noun Phrase","col":"growth of ethical consumerism"},"boycott":{"mm":"ကန့်ကွက်သည့်အနေဖြင့် ကုန်ပစ္စည်းကို မဝယ်ဘဲ သပိတ်မှောက်သည်","pos":"Verb / Noun","col":"boycott brands that pollute"},"celebrity endorsement":{"mm":"နာမည်ကြီးများဖြင့် ကုန်ပစ္စည်း ထောက်ခံကြော်ငြာစေခြင်း","pos":"Noun Phrase","col":"spend millions on celebrity endorsements"},"echo chamber":{"mm":"မိမိနှင့် အမြင်တူသော အချက်အလက်များကိုသာ ပြန်ကြားနေရသည့် အွန်လိုင်းဝန်းကျင်","pos":"Noun Phrase","col":"trapped in an online echo chamber"},"vernacular":{"mm":"ဒေသခံပြည်သူများ နေ့စဉ်ပြောသော ဘာသာစကား (သို့မဟုတ် ဒေသရင်း ဗိသုကာဟန်)","pos":"Noun / Adjective","col":"vernacular architecture / local vernacular"},"folklore":{"mm":"ရှေးရိုးစဉ်လာ နှုတ်ပြောပုံပြင်များနှင့် ရိုးရာဓလေ့များ","pos":"Noun","col":"preserve regional folklore"},"stereotype":{"mm":"လူအုပ်စုတစ်စုအပေါ် ပုံသေမှတ်ယူထားသော အစွဲ","pos":"Noun / Verb","col":"challenge gender stereotypes"},"xenophobia":{"mm":"နိုင်ငံခြားသား သို့မဟုတ် လူမျိုးခြားများအပေါ် မလိုမုန်းထား ကြောက်ရွံ့မှု","pos":"Noun","col":"help counter xenophobia"},"cultural erosion":{"mm":"မူလရိုးရာယဉ်ကျေးမှုနှင့် ဓလေ့ထုံးတမ်းများ တဖြည်းဖြည်း ပျောက်ကွယ်လာခြင်း","pos":"Noun Phrase","col":"accelerate cultural erosion"},"patronage":{"mm":"(အနုပညာ သို့မဟုတ် ပြတိုက်များကို) ငွေကြေးထောက်ပံ့ မြှောက်စားခြင်း","pos":"Noun","col":"public patronage of the arts"},"disinformation":{"mm":"လှည့်ဖြားရန် ရည်ရွယ်ချက်ရှိရှိ လုပ်ကြံဖြန့်ဝေသော သတင်းမှား","pos":"Noun","col":"spot deliberate disinformation"},"editorial":{"mm":"အယ်ဒီတာ့အာဘော် / သတင်းတည်းဖြတ်စိစစ်မှုဆိုင်ရာ","pos":"Noun / Adjective","col":"rigorous editorial oversight"},"clickbait":{"mm":"စာဖတ်သူများ ဝင်ကြည့်ချင်အောင် ချဲ့ကားရေးထားသော အွန်လိုင်းခေါင်းစဉ်","pos":"Noun","col":"publish shallow clickbait"},"subliminal":{"mm":"လူ့သိစိတ်က သတိမထားမိဘဲ မသိစိတ်ထဲသို့ သိမ်မွေ့စွာ လွှမ်းမိုးသော","pos":"Adjective","col":"subliminal advertising"},"tabloid":{"mm":"နာမည်ကြီးများ၏ အတွင်းရေးသတင်းများကိုသာ အသားပေးသော သတင်းစာငယ်","pos":"Noun / Adjective","col":"tabloid photographers"},"paparazzi":{"mm":"နာမည်ကြီးများနောက် လိုက်လံဓာတ်ပုံရိုက်ယူသော ဓာတ်ပုံဆရာများ","pos":"Noun (Plural)","col":"intrusive paparazzi"},"intrusive":{"mm":"ကိုယ်ရေးကိုယ်တာ နယ်ပယ်ထဲသို့ စည်းကျော် ဝင်ရောက်နှောင့်ယှက်သော","pos":"Adjective","col":"overly intrusive ads"},"bilingualism":{"mm":"ဘာသာစကား နှစ်မျိုးကို ကျွမ်းကျင်စွာ ပြောဆိုတတ်မြောက်မှု","pos":"Noun","col":"childhood bilingualism"},"cultural melting pot":{"mm":"လူမျိုးနှင့် ယဉ်ကျေးမှု ပေါင်းစုံ ရောနှောပေါင်းစည်းနေသော နေရာ","pos":"Noun Phrase","col":"a vibrant cultural melting pot"},"metropolis":{"mm":"အလွန်ကြီးမားပြီး စည်ကားသော မြို့တော်ကြီး","pos":"Noun","col":"a bustling modern metropolis"},"commuter belt":{"mm":"မြို့လယ်သို့ နေ့စဉ် ရုံးတက်ရုံးဆင်း သွားလာသူများ နေထိုင်ရာ ဆင်ခြေဖုံးဒေသ","pos":"Noun Phrase","col":"relocate to the commuter belt"},"outskirts":{"mm":"မြို့စွန်မြို့ဖျား ဒေသ","pos":"Noun (Plural)","col":"on the outskirts of the city"},"façade":{"mm":"အဆောက်အအုံတစ်ခု၏ မျက်နှာစာအပြင်ပိုင်း","pos":"Noun","col":"preserve the historic façade"},"eyesore":{"mm":"အကျည်းတန်နေသော အဆောက်အအုံ သို့မဟုတ် နေရာ","pos":"Noun","col":"an urban eyesore"},"retrofit":{"mm":"အဆောက်အအုံဟောင်းကို မဖြိုချဘဲ ခေတ်မီနည်းပညာ တပ်ဆင်မွမ်းမံသည်","pos":"Verb","col":"retrofit older apartment blocks"},"demolition":{"mm":"အဆောက်အအုံကို ဖြိုချဖျက်ဆီးခြင်း","pos":"Noun","col":"protect buildings from demolition"},"make way for":{"mm":"... အသစ်တည်ဆောက်နိုင်ရန် မူလအရာကို ဖယ်ရှားပေးလိုက်သည်","pos":"Idiomatic Phrase","col":"cleared to make way for"},"gridlock":{"mm":"မော်တော်ယာဉ်များ တစ်စီးမှ ရွေ့မရအောင် လမ်းပိတ်ဆို့နေမှု","pos":"Noun","col":"bring bridges to complete gridlock"},"bottleneck":{"mm":"လမ်းကျဉ်းသွားသဖြင့် ယာဉ်ကြောပိတ်ဆို့စေသော နေရာ","pos":"Noun","col":"eliminate a major bottleneck"},"park-and-ride":{"mm":"မြို့စွန်တွင် ကားရပ်ခဲ့ပြီး မြို့တွင်းသို့ ဘတ်စ်ကား/ရထား ပြောင်းစီးသည့် စနစ်","pos":"Noun Phrase","col":"expand park-and-ride schemes"},"carpooling":{"mm":"လမ်းကြောင်းတူသူ အချင်းချင်း ကားတစ်စီးတည်း စုပေါင်းစီးနင်းခြင်း","pos":"Noun","col":"incentivize daily carpooling"},"rural depopulation":{"mm":"လူငယ်များ မြို့ပြသို့ ပြောင်းရွှေ့သွားသဖြင့် ကျေးလက်လူဦးရေ လျော့နည်းသွားခြင်း","pos":"Noun Phrase","col":"reverse rural depopulation"},"brain drain":{"mm":"ပညာတတ် ကျွမ်းကျင်ပညာရှင်များ ပြည်ပသို့ ပြောင်းရွှေ့ထွက်ခွာသွားခြင်း","pos":"Noun Phrase","col":"suffer a severe brain drain"},"civic amenities":{"mm":"ပန်းခြံ၊ စာကြည့်တိုက်၊ ဆေးခန်း စသည့် အများပြည်သူ အဆောက်အအုံများ","pos":"Noun Phrase","col":"fund essential civic amenities"},"affordable housing":{"mm":"ဝင်ငွေနည်း ပြည်သူများ လက်လှမ်းမီသော တန်ဖိုးသင့်အိမ်ရာ","pos":"Noun Phrase","col":"include affordable housing"},"mortgage":{"mm":"အိမ်ခြံမြေ ဝယ်ယူရန် ဘဏ်မှ နှစ်ရှည်ချေးယူသော အိမ်ရာချေးငွေ","pos":"Noun","col":"qualify for a mortgage"},"zoning laws":{"mm":"မြို့ပြမြေနေရာကို လူနေရပ်ကွက်နှင့် စီးပွားရေးဇုန် ပိုင်းခြားသတ်မှတ်သော ဥပဒေများ","pos":"Noun Phrase","col":"relax restrictive zoning laws"},"greenbelt":{"mm":"မြို့ပတ်လည်တွင် အဆောက်အအုံ တိုးချဲ့ခွင့် ကန့်သတ်ထားသော သစ်တောနှင့် စိုက်ပျိုးမြေဇုန်","pos":"Noun","col":"encroach on the greenbelt"},"brownfield site":{"mm":"မြို့တွင်း၌ ယခင်က စက်ရုံဆောက်ခဲ့ဖူးပြီး ပြန်လည်အသုံးပြုနိုင်သော မြေကွက်ဟောင်း","pos":"Noun Phrase","col":"redevelop urban brownfield sites"},"walkability":{"mm":"ရပ်ကွက်အတွင်း ခြေလျင်လျှောက်သွားလာရ လွယ်ကူလုံခြုံမှု အရည်အသွေး","pos":"Noun","col":"improve neighborhood walkability"},"mixed-use development":{"mm":"လူနေတိုက်ခန်း၊ ရုံးခန်းနှင့် ဈေးဆိုင်များကို တစ်နေရာတည်း ပေါင်းစပ်ထားသော စီမံကိန်း","pos":"Noun Phrase","col":"promote mixed-use developments"},"vertical city":{"mm":"အထပ်မြင့် အဆောက်အအုံကြီးများဖြင့် အပေါ်သို့ မြင့်တက်တည်ဆောက်ထားသော မြို့ပြပုံစံ","pos":"Noun Phrase","col":"live in a vertical city"},"derelict":{"mm":"စွန့်ပစ်ထားသဖြင့် ပျက်စီးယိုယွင်းနေသော (အဆောက်အအုံ)","pos":"Adjective","col":"derelict dockland warehouses"},"dilapidated":{"mm":"ဟောင်းနွမ်းဆွေးမြည့်ပြီး ပြိုပျက်လုနီးပါး ဖြစ်နေသော","pos":"Adjective","col":"repair dilapidated bridges"},"refurbish":{"mm":"အဆောက်အအုံ သို့မဟုတ် အခန်းကို အသစ်ပြန်လည် မွမ်းမံပြင်ဆင်သည်","pos":"Verb","col":"completely refurbished in 2022"},"congestion charge":{"mm":"မြို့လယ်သို့ ဝင်ရောက်သော ကိုယ်ပိုင်ကားများထံမှ ကောက်ခံသည့် ယာဉ်ကြောပိတ်ဆို့ခ","pos":"Noun Phrase","col":"levy a daily congestion charge"},"freight":{"mm":"အမြောက်အမြား သယ်ယူပို့ဆောင်သော ကုန်စည်","pos":"Noun","col":"shift long-distance freight to rail"},"rolling stock":{"mm":"မီးရထားလမ်းကြောင်းပေါ်တွင် ပြေးဆွဲနေသော စက်ခေါင်းများနှင့် ရထားတွဲများ","pos":"Noun Phrase","col":"modern air-conditioned rolling stock"},"arterial road":{"mm":"မြို့တွင်းအဓိက ယာဉ်ကြောစီးဆင်းရာ လမ်းမကြီး","pos":"Noun Phrase","col":"bus lanes along arterial roads"},"thoroughfare":{"mm":"အများပြည်သူ သွားလာရာ အဓိက လမ်းမကြီး","pos":"Noun","col":"busy commercial thoroughfare"},"shantytown":{"mm":"မြို့စွန်၌ ယာယီတဲများဖြင့် ပြွတ်သိပ်နေထိုင်ကြသော ဆင်းရဲသား/ကျူးကျော် ရပ်ကွက်","pos":"Noun","col":"expansion of informal shantytowns"},"gated community":{"mm":"လုံခြုံရေးဂိတ်နှင့် အုတ်တံတိုင်း ကာရံထားသော သီးသန့်အိမ်ရာဝန်း","pos":"Noun Phrase","col":"exclusive gated communities"},"tenant":{"mm":"အိမ်ငှား၊ အခန်းငှားရမ်းနေထိုင်သူ","pos":"Noun","col":"protect long-term tenants"},"landlord":{"mm":"အိမ်ရှင်၊ အခန်းပိုင်ရှင်","pos":"Noun","col":"the landlord bears repair costs"},"eviction":{"mm":"အိမ်ငှားကို အိမ်မှ တရားဝင် ဖယ်ရှားနှင်ထုတ်ခြင်း","pos":"Noun","col":"prevent families from facing eviction"},"public utilities":{"mm":"လျှပ်စစ်မီး၊ သောက်သုံးရေ စသည့် အများပြည်သူ အခြေခံဝန်ဆောင်မှုလုပ်ငန်းများ","pos":"Noun Phrase","col":"regulate public utilities"},"soundproof":{"mm":"အသံလုံအောင် ပြုလုပ်ထားသော","pos":"Adjective","col":"soundproof double glazing"},"noise pollution":{"mm":"ဆူညံသံ ညစ်ညမ်းမှု","pos":"Noun Phrase","col":"reduce urban noise pollution"},"inhabitant":{"mm":"နေထိုင်သူ (မြို့သူမြို့သား)","pos":"Noun","col":"well-being of city inhabitants"},"city dweller":{"mm":"မြို့ပြတွင် နေထိုင်သူ","pos":"Noun Phrase","col":"apartment-bound city dwellers"},"overcrowding":{"mm":"နေရာမဆံ့အောင် လူဦးရေ ပြွတ်သိပ်ထူထပ်နေမှု","pos":"Noun","col":"alleviate overcrowding"},"edifice":{"mm":"ခံ့ညားထည်ဝါပြီး ကြီးမားသော အဆောက်အအုံကြီး","pos":"Noun","col":"a sprawling red-brick edifice"},"conurbation":{"mm":"မြို့ကြီးများနှင့် ပတ်ဝန်းကျင် မြို့ငယ်များ တစ်ဆက်တည်း ပေါင်းစပ်သွားသော မြို့ပြဒေသကြီး","pos":"Noun","col":"merge into a single conurbation"},"aerospace":{"mm":"လေကြောင်းနှင့် အာကာသ သိပ္ပံနည်းပညာကဏ္ဍ","pos":"Noun / Adjective","col":"aerospace engineering"},"celestial":{"mm":"အာကာသအတွင်းရှိ ဂြိုဟ်၊ ကြယ်၊ လ တို့နှင့် သက်ဆိုင်သော","pos":"Adjective","col":"celestial bodies such as asteroids"},"extraterrestrial":{"mm":"ကမ္ဘာမြေပြင်ပ အာကာသမှ ဖြစ်သော (ဂြိုဟ်သား/သက်ရှိ)","pos":"Adjective","col":"search for extraterrestrial life"},"microgravity":{"mm":"အာကာသယာဉ်အတွင်း ဆွဲငင်အား အလွန်နည်းပါးသော အခြေအနေ","pos":"Noun","col":"experiments conducted in microgravity"},"geothermal":{"mm":"ကမ္ဘာ့မြေအောက် အပူစွမ်းအင်သုံး","pos":"Adjective","col":"geothermal power plants"},"hydroelectric":{"mm":"ရေအားလျှပ်စစ်ထုတ်လုပ်သော","pos":"Adjective","col":"hydroelectric dams"},"photovoltaic":{"mm":"နေရောင်ခြည်ကို လျှပ်စစ်ဓာတ်အားအဖြစ် တိုက်ရိုက်ပြောင်းလဲပေးသော (ဆိုလာပြား)","pos":"Adjective","col":"rooftop photovoltaic panels"},"carbon neutral":{"mm":"ကာဗွန်ထုတ်လွှတ်မှုနှင့် ပြန်လည်စုပ်ယူမှု မျှခြေညီသော (အသားတင် ကာဗွန်ထုတ်လွှတ်မှု သုညဖြစ်သော)","pos":"Adjective Phrase","col":"become carbon neutral by 2050"},"desertification":{"mm":"စိုက်ပျိုးမြေများ သဲကန္တာရအဖြစ် ပြောင်းလဲပျက်စီးသွားခြင်း","pos":"Noun","col":"combat desertification"},"afforestation":{"mm":"ယခင်က သစ်တောမရှိခဲ့သော မြေလွတ်မြေရိုင်းများပေါ်တွင် သစ်တောအသစ် စိုက်ပျိုးထူထောင်ခြင်း","pos":"Noun","col":"large-scale afforestation projects"},"reforestation":{"mm":"ခုတ်ထွင်ရှင်းလင်းခံခဲ့ရသော သစ်တောမြေများတွင် သစ်ပင်များ ပြန်လည်စိုက်ပျိုးခြင်း","pos":"Noun","col":"community-led reforestation"},"poaching":{"mm":"တောရိုင်းတိရစ္ဆာန်များကို တရားမဝင် အမဲလိုက်ဖမ်းဆီးခြင်း","pos":"Noun","col":"curb illegal poaching"},"habitat fragmentation":{"mm":"သစ်တောကြီးများကို ကားလမ်းနှင့် စိုက်ခင်းများက ဖြတ်တောက်ပစ်သဖြင့် တောရိုင်းတိရစ္ဆာန် နေရင်းဒေသများ အပိုင်းပိုင်း ပြတ်တောက်သွားခြင်း","pos":"Noun Phrase","col":"suffer from habitat fragmentation"},"monoculture":{"mm":"မြေဧက အမြောက်အမြားပေါ်တွင် သီးနှံတစ်မျိုးတည်းကိုသာ နှစ်စဉ် ဆက်တိုက်စိုက်ပျိုးခြင်း","pos":"Noun","col":"industrial monoculture farming"},"crop rotation":{"mm":"မြေဆီလွှာ အာဟာရထိန်းသိမ်းရန် တူညီသော လယ်ကွက်တွင် ရာသီအလိုက် သီးနှံအမျိုးအစား ပြောင်းလဲစိုက်ပျိုးခြင်း","pos":"Noun Phrase","col":"practice seasonal crop rotation"},"agrochemicals":{"mm":"စိုက်ပျိုးရေးသုံး ဓာတုမြေသြဇာနှင့် ပိုးသတ်ဆေးများ","pos":"Noun (Plural)","col":"excessive use of agrochemicals"},"irrigation":{"mm":"စိုက်ပျိုးရေ ပေးဝေသွင်းယူခြင်းစနစ်","pos":"Noun","col":"modern drip irrigation systems"},"yield":{"mm":"သီးနှံအထွက်နှုန်း (သို့မဟုတ် ရလဒ်) / ထွက်ရှိစေသည်","pos":"Noun / Verb","col":"boost agricultural crop yields"},"food security":{"mm":"လူတိုင်းအတွက် လုံလောက်ပြီး အာဟာရပြည့်ဝသော စားနပ်ရိက္ခာ ဖူလုံစိတ်ချရမှု","pos":"Noun Phrase","col":"ensure long-term food security"},"desalination":{"mm":"ပင်လယ်ရေငန်မှ ဆားဓာတ်ဖယ်ရှား၍ သောက်သုံးရေချို ထုတ်လုပ်ခြင်း","pos":"Noun","col":"solar-powered desalination plants"},"aquifer":{"mm":"မြေအောက် ရေအောင်းလွှာ","pos":"Noun","col":"depletion of underground aquifers"},"microplastics":{"mm":"ပင်လယ်သမုဒ္ဒရာနှင့် အစာကွင်းဆက်အတွင်း ညစ်ညမ်းနေသော အလွန်သေးငယ်သည့် ပလတ်စတစ် အမှုန်အမွှားများ","pos":"Noun (Plural)","col":"ingest marine microplastics"},"coral bleaching":{"mm":"သမုဒ္ဒရာရေ ပူနွေးလာမှုကြောင့် သန္တာကျောက်တန်းများ အရောင်ကျွတ်ပြီး သေဆုံးပျက်စီးခြင်း","pos":"Noun Phrase","col":"widespread coral bleaching events"},"seismic":{"mm":"မြေငလျင်ဆိုင်ရာ (သို့မဟုတ် လူ့အဖွဲ့အစည်းအတွင်း ကြီးမားပြင်းထန်သော အပြောင်းအလဲ)","pos":"Adjective","col":"seismic activity / a seismic shift in work culture"},"genetically modified":{"mm":"မျိုးရိုးဗီဇ ပြုပြင်ပြောင်းလဲထားသော (သီးနှံ)","pos":"Adjective Phrase","col":"genetically modified (GM) crops"},"incineration":{"mm":"စွန့်ပစ်အမှိုက်များကို အပူချိန်မြင့်မားစွာဖြင့် မီးရှို့ဖျက်ဆီးခြင်း","pos":"Noun","col":"waste-to-energy incineration plants"},"landfill":{"mm":"စွန့်ပစ်အမှိုက်များ မြေမြှုပ်စွန့်ပစ်ရာ အမှိုက်ပုံကြီး","pos":"Noun","col":"divert household waste from landfills"},"topsoil":{"mm":"အပင်များ ရှင်သန်ကြီးထွားရာ အပေါ်ယံ မြေဆီလွှာ","pos":"Noun","col":"prevent the erosion of fertile topsoil"},"salinity":{"mm":"ရေ သို့မဟုတ် မြေဆီလွှာအတွင်း ဆားငန်ဓာတ် ပါဝင်မှုနှုန်း","pos":"Noun","col":"rising soil salinity"},"pollination":{"mm":"ပျားနှင့် အင်းဆက်များက ပန်းဝတ်မှုန် ကူးပေးခြင်း","pos":"Noun","col":"rely on insect pollination"},"keystone species":{"mm":"ဂေဟစနစ် တစ်ခုလုံး၏ ဟန်ချက်ကို ထိန်းထားပေးသော အဓိက မျိုးစိတ်","pos":"Noun Phrase","col":"protect keystone species such as bees and wolves"},"invasive species":{"mm":"ပြင်ပမှ ဝင်ရောက်လာပြီး ဒေသရင်း သက်ရှိများကို ဝါးမျိုဖျက်ဆီးတတ်သော မျိုးစိတ်","pos":"Noun Phrase","col":"outcompete native wildlife as an invasive species"},"captive breeding":{"mm":"မျိုးသုဉ်းလုနီးပါး တိရစ္ဆာန်များကို တိရစ္ဆာန်ဥယျာဉ်/ဘေးမဲ့တောတွင် ထိန်းသိမ်းသားဖောက်ပေးခြင်း","pos":"Noun Phrase","col":"captive breeding and reintroduction programs"},"animal husbandry":{"mm":"မွေးမြူရေး တိရစ္ဆာန်များကို စနစ်တကျ မွေးမြူစောင့်ရှောက်ခြင်း ပညာ","pos":"Noun Phrase","col":"sustainable animal husbandry"},"factory farming":{"mm":"တိရစ္ဆာန်အမြောက်အမြားကို နေရာကျဉ်းကျဉ်းတွင် စက်ရုံပုံစံ ပြွတ်သိပ်မွေးမြူထုတ်လုပ်ခြင်း","pos":"Noun Phrase","col":"ethical concerns over factory farming"},"free-range":{"mm":"ခြံလှောင်မထားဘဲ သဘာဝအတိုင်း လွတ်လပ်စွာ သွားလာစားသောက်ခွင့်ပြုထားသော (မွေးမြူရေး)","pos":"Adjective","col":"free-range poultry and eggs"},"carbon sequestration":{"mm":"လေထုထဲရှိ ကာဗွန်ဒိုင်အောက်ဆိုဒ်ကို သစ်တောများ သို့မဟုတ် မြေအောက်တွင် စုပ်ယူသိုလှောင်ထားရှိခြင်း","pos":"Noun Phrase","col":"natural carbon sequestration by peatlands and forests"},"peatland":{"mm":"နှစ်ပေါင်းထောင်ချီ ဆွေးမြည့်နေသော သစ်ပင်သစ်ရွက်များ စုပုံနေသည့် စိမ့်မြေဒေသ","pos":"Noun","col":"rewetting drained peatlands"},"mangrove":{"mm":"ကမ်းရိုးတန်း ဒီရေတောပင်","pos":"Noun","col":"restore coastal mangrove forests"},"permafrost":{"mm":"ဝင်ရိုးစွန်းဒေသများတွင် တစ်နှစ်ပတ်လုံး အေးခဲနေသော မြေအောက်မြေသားလွှာ","pos":"Noun","col":"thawing Arctic permafrost"},"subside":{"mm":"(မုန်တိုင်း/ရေကြီးမှု/နာကျင်မှု) တဖြည်းဖြည်း လျော့ပါးကျဆင်းသွားသည် / မြေကျွံကျသည်","pos":"Verb","col":"wait for floodwaters to subside"},"potable":{"mm":"သောက်သုံးရန် ဘေးကင်းသန့်ရှင်းသော (ရေ)","pos":"Adjective","col":"access to potable water"},"brackish":{"mm":"ရေချိုနှင့် ရေငန် ရောနှောနေသဖြင့် အနည်းငယ် ငန်နေသော (ရေ)","pos":"Adjective","col":"purify brackish groundwater"},"byproduct":{"mm":"ပင်မကုန်ပစ္စည်း ထုတ်လုပ်ရာမှ ဘေးထွက်ရရှိလာသော ပစ္စည်း (သို့မဟုတ် ဘေးထွက်ရလဒ်)","pos":"Noun","col":"industrial byproduct"},"symbiotic":{"mm":"နှစ်ဦးနှစ်ဖက် အပြန်အလှန် အကျိုးပြုနေသော","pos":"Adjective","col":"a symbiotic relationship between"},"remuneration":{"mm":"လုပ်အားခ၊ လစာနှင့် ခံစားခွင့်ငွေကြေး","pos":"Noun","col":"generous remuneration package"},"fringe benefit":{"mm":"အခြေခံလစာအပြင် အလုပ်ရှင်က ထပ်ဆောင်းပေးသော ကျန်းမာရေးအာမခံ၊ ကြိုပို့ယာဉ် စသည့် ခံစားခွင့်များ","pos":"Noun Phrase","col":"attractive fringe benefits"},"glass ceiling":{"mm":"အမျိုးသမီးများနှင့် လူနည်းစုများ ထိပ်တန်းရာထူးသို့ မတက်လှမ်းနိုင်အောင် မမြင်ရဘဲ ကာဆီးထားသော အတားအဆီး","pos":"Noun Phrase","col":"shatter the corporate glass ceiling"},"gig economy":{"mm":"အမြဲတမ်းဝန်ထမ်း မဟုတ်ဘဲ အက်ပ်များနှင့် ကာလတိုစာချုပ်များဖြင့် လုပ်ကိုင်ကြသော ခေတ်သစ်လုပ်ငန်းခွင်စနစ်","pos":"Noun Phrase","col":"working in the gig economy"},"telecommuting":{"mm":"အင်တာနက်နှင့် နည်းပညာသုံး၍ အိမ်မှနေ၍ အလုပ်လုပ်ကိုင်ခြင်း","pos":"Noun","col":"widespread adoption of telecommuting"},"burnout":{"mm":"အလုပ်ဖိစီးမှု ကာလရှည်ကြာ များပြားခြင်းကြောင့် လူရောစိတ်ပါ ခြေကုန်လက်ပန်းကျ နွမ်းနယ်မှု","pos":"Noun","col":"suffer from severe occupational burnout"},"absenteeism":{"mm":"အလုပ် သို့မဟုတ် ကျောင်းသို့ မကြာခဏ ပျက်ကွက်တတ်မှု","pos":"Noun","col":"reduce workplace absenteeism"},"staff turnover":{"mm":"ဝန်ထမ်းများ အလုပ်ထွက်ပြီး လူသစ်ပြန်ခန့်ရသည့် အပြောင်းအလဲနှုန်း","pos":"Noun Phrase","col":"high staff turnover is costly"},"blue-collar":{"mm":"စက်ရုံ၊ ဆောက်လုပ်ရေး စသည့် ကာယနှင့် စက်မှုလက်မှု လုပ်သားများဆိုင်ရာ","pos":"Adjective","col":"skilled blue-collar workers"},"white-collar":{"mm":"ရုံးခန်းအခြေပြု စီမံခန့်ခွဲရေးနှင့် ပညာရှင် လုပ်ငန်းများဆိုင်ရာ","pos":"Adjective","col":"white-collar professionals / white-collar crime"},"apprenticeship":{"mm":"လုပ်ငန်းခွင်၌ လက်တွေ့သင်ယူရင်း လုပ်ခလစာပါ ရရှိသော အလုပ်သင်စနစ်","pos":"Noun","col":"complete an electrical apprenticeship"},"purchasing power":{"mm":"ငွေကြေးတစ်ယူနစ်ဖြင့် ကုန်ပစ္စည်း ဝယ်ယူနိုင်စွမ်းအား","pos":"Noun Phrase","col":"inflation erodes purchasing power"},"protectionism":{"mm":"ပြည်တွင်းလုပ်ငန်းများကို ကာကွယ်ရန် သွင်းကုန်ခွန် တိုးမြှင့်ကန့်သတ်သော စီးပွားရေးမူဝါဒ","pos":"Noun","col":"resort to economic protectionism"},"tariff":{"mm":"သွင်းကုန် သို့မဟုတ် ပို့ကုန်ပေါ်တွင် ကောက်ခံသော အကောက်ခွန်","pos":"Noun","col":"impose tariffs on imported steel"},"monopoly":{"mm":"ကုမ္ပဏီတစ်ခုတည်းက ဈေးကွက်တစ်ခုလုံးကို လက်ဝါးကြီးအုပ် ချုပ်ကိုင်ထားခြင်း","pos":"Noun","col":"prevent tech giants from forming a monopoly"},"conglomerate":{"mm":"မတူညီသော စီးပွားရေးလုပ်ငန်း ပေါင်းစုံကို ပိုင်ဆိုင်ထားသည့် ကုမ္ပဏီစုကြီး","pos":"Noun","col":"global media conglomerates"},"microfinance":{"mm":"ဘဏ်ချေးငွေ မရနိုင်သော ဝင်ငွေနည်း အသေးစားလုပ်ငန်းရှင်များအား ထုတ်ချေးသည့် အသေးစားချေးငွေစနစ်","pos":"Noun","col":"microfinance schemes empower women"},"austerity":{"mm":"ဘတ်ဂျက်လိုငွေ လျှော့ချရန် အစိုးရ၏ ပြည်သူ့အသုံးစရိတ်များကို တင်းကျပ်စွာ ဖြတ်တောက်ခြင်း","pos":"Noun","col":"impose harsh austerity measures"},"progressive taxation":{"mm":"ဝင်ငွေနည်းသူ အခွန်နှုန်းနည်းပြီး ဝင်ငွေမြင့်မားသူများ အခွန်နှုန်း ပိုမိုပေးဆောင်ရသော အခွန်စနစ်","pos":"Noun Phrase","col":"redistribute wealth through progressive taxation"},"tax evasion":{"mm":"တရားမဝင်သော နည်းလမ်းဖြင့် အခွန်ရှောင်တိမ်းခြင်း","pos":"Noun Phrase","col":"crack down on corporate tax evasion"},"juvenile delinquency":{"mm":"အသက်မပြည့်သေးသော လူငယ်များ ကျူးလွန်သည့် ပြစ်မှုနှင့် လူမှုစည်းကမ်း ဖောက်ဖျက်မှု","pos":"Noun Phrase","col":"curb juvenile delinquency through youth clubs"},"capital punishment":{"mm":"သေဒဏ်ပေးခြင်း (တရားဝင် သေဒဏ်စီရင်မှု)","pos":"Noun Phrase","col":"abolish capital punishment"},"community service":{"mm":"သာမန်ပြစ်မှုငယ် ကျူးလွန်သူများကို ထောင်ချမည့်အစား အများပြည်သူအကျိုးပြု လုပ်အားပေးစေသည့် ပြစ်ဒဏ်","pos":"Noun Phrase","col":"sentence minor offenders to community service"},"probation":{"mm":"ပြစ်မှုကျူးလွန်သူကို ထောင်မချဘဲ စည်းကမ်းချက်ဖြင့် စောင့်ကြည့်ကာလ သတ်မှတ်လွှတ်ပေးထားခြင်း (သို့မဟုတ် အလုပ်သင် အစမ်းခန့်ကာလ)","pos":"Noun","col":"placed on two years' probation"},"corporal punishment":{"mm":"ကလေး သို့မဟုတ် ကျောင်းသားများကို ရိုက်နှက်ဆုံးမသော ပြစ်ဒဏ်","pos":"Noun Phrase","col":"ban corporal punishment in schools"},"judiciary":{"mm":"တရားစီရင်ရေး မဏ္ဍိုင် (တရားရုံးများနှင့် တရားသူကြီးများ အဖွဲ့အစည်း)","pos":"Noun","col":"an independent judiciary"},"custodial sentence":{"mm":"အကျဉ်းထောင်တွင်း မဖြစ်မနေ အကျဉ်းချခံရသော ထောင်ဒဏ်","pos":"Noun Phrase","col":"serve a custodial sentence"},"law-abiding":{"mm":"တရားဥပဒေကို လေးစားလိုက်နာသော (ပြည်သူ)","pos":"Adjective","col":"protect law-abiding citizens"},"cybercrime":{"mm":"အင်တာနက်နှင့် ကွန်ပျူတာသုံး၍ ကျူးလွန်သော ဆိုက်ဘာမှုခင်း","pos":"Noun","col":"combat cross-border cybercrime"},"identity theft":{"mm":"အခြားသူတစ်ဦး၏ ကိုယ်ရေးအချက်အလက်များကို ခိုးယူဟန်ဆောင်၍ ငွေကြေးလိမ်လည်မှု","pos":"Noun Phrase","col":"fall victim to online identity theft"},"tied aid":{"mm":"အလှူရှင်နိုင်ငံ၏ ကုမ္ပဏီများနှင့် ကုန်ပစ္စည်းများကိုသာ ပြန်လည်ဝယ်ယူသုံးစွဲရမည်ဟု စည်းကမ်းသတ်မှတ်ထားသော နိုင်ငံတကာ အကူအညီ","pos":"Noun Phrase","col":"strings attached to tied aid"},"debt relief":{"mm":"ဖွံ့ဖြိုးဆဲနိုင်ငံများ တင်ရှိနေသော ပြည်ပကြွေးမြီများကို လျှော့ပေါ့ သို့မဟုတ် လျှော်ပစ်ပေးခြင်း","pos":"Noun Phrase","col":"grant debt relief to developing nations"},"paternity leave":{"mm":"ကလေးမွေးဖွားချိန်တွင် ဖခင်ဖြစ်သူအား ပေးအပ်သော လစာရ အလုပ်ခွင့်ရက်","pos":"Noun Phrase","col":"paid paternity leave promotes gender equality"},"minimum wage":{"mm":"အလုပ်ရှင်များက တရားဝင် အနည်းဆုံး ပေးချေရမည့် အနိမ့်ဆုံး လုပ်ခလစာနှုန်း","pos":"Noun Phrase","col":"raise the national minimum wage"},"universal basic income":{"mm":"နိုင်ငံသား အရွယ်ရောက်သူတိုင်းအား အစိုးရက လစဉ် ပုံသေထောက်ပံ့ငွေ ပေးအပ်သော စနစ်","pos":"Noun Phrase","col":"trial a universal basic income"},"means-tested":{"mm":"ဝင်ငွေနည်းပါးကြောင်း စိစစ်အတည်ပြုပြီးမှသာ အမှန်တကယ် လိုအပ်သူကို ပေးအပ်သော (ထောက်ပံ့ကြေး/ပညာသင်ဆု)","pos":"Adjective","col":"means-tested university scholarships"},"stagnation":{"mm":"စီးပွားရေး သို့မဟုတ် လုပ်ခလစာ တိုးတက်မှုမရှိဘဲ ရပ်တန့်နေခြင်း","pos":"Noun","col":"prolonged wage stagnation"},"recession":{"mm":"စီးပွားရေး ကျဆင်းမှုကာလ","pos":"Noun","col":"weather a global economic recession"},"deregulation":{"mm":"စီးပွားရေးကဏ္ဍတစ်ခုအပေါ် အစိုးရ၏ စည်းမျဉ်းကန့်သတ်ချက်များ ဖြေလျှော့ပေးခြင်း","pos":"Noun","col":"financial deregulation"},"privatization":{"mm":"နိုင်ငံပိုင် လုပ်ငန်း သို့မဟုတ် ဝန်ဆောင်မှုကို ပုဂ္ဂလိကပိုင်အဖြစ် လွှဲပြောင်းရောင်းချခြင်း","pos":"Noun","col":"oppose the privatization of healthcare"},"nationalization":{"mm":"ပုဂ္ဂလိက လုပ်ငန်းများကို နိုင်ငံပိုင် (အများပြည်သူပိုင်) အဖြစ် ပြောင်းလဲသတ်မှတ်ခြင်း","pos":"Noun","col":"support the nationalization of water utilities"},"nepotism":{"mm":"အရည်အချင်းကို မကြည့်ဘဲ ဆွေမျိုးသားချင်းနှင့် အသိမိတ်ဆွေများကိုသာ ဘက်လိုက်ရာထူးပေးခြင်း","pos":"Noun","col":"combat workplace nepotism"},"whistleblower":{"mm":"ကုမ္ပဏီ သို့မဟုတ် အဖွဲ့အစည်းအတွင်းရှိ တရားမဝင် အဂတိလိုက်စားမှုများကို ဖော်ထုတ်တိုင်ကြားသူ","pos":"Noun","col":"legal protection for corporate whistleblowers"},"litigation":{"mm":"တရားရုံးတွင် တရားစွဲဆို အမှုရင်ဆိုင်ခြင်း","pos":"Noun","col":"face costly environmental litigation"},"rote learning":{"mm":"အဓိပ္ပာယ်ကို နက်နက်နဲနဲ မစဉ်းစားဘဲ အလွတ်ကျက်မှတ် သင်ယူခြင်း","pos":"Noun Phrase","col":"shift away from rote learning"},"extracurricular":{"mm":"ပုံမှန် ကျောင်းသင်ရိုးညွှန်းတမ်းပြင်ပ (အားကစား၊ ဂီတ၊ အသင်းအဖွဲ့ လှုပ်ရှားမှုများ)","pos":"Adjective","col":"extracurricular activities such as sport and choir"},"co-educational":{"mm":"ကျား/မ အတူတကွ ပူးပေါင်းသင်ကြားပေးသော (ကျောင်း)","pos":"Adjective","col":"attend a co-educational secondary school"},"streaming":{"mm":"ကျောင်းသားများကို စာတော်မှု အဆင့်အလိုက် အတန်းခွဲခြား သင်ကြားခြင်း","pos":"Noun","col":"oppose early academic streaming"},"truancy":{"mm":"ခွင့်ပြုချက်မရှိဘဲ ကျောင်းပြေးခြင်း၊ ကျောင်းပျက်ကွက်ခြင်း","pos":"Noun","col":"tackle persistent school truancy"},"formative years":{"mm":"ကလေးတစ်ဦး၏ စိတ်နေစရိုက်ကို အဓိက ပုံဖော်ပေးသည့် ငယ်စဉ်ဘဝကာလ (အသက် ၁ နှစ်မှ ၈ နှစ်ခန့်)","pos":"Noun Phrase","col":"during a child's formative years"},"emotional intelligence":{"mm":"မိမိနှင့် တစ်ပါးသူ၏ စိတ်ခံစားချက်ကို နားလည်ထိန်းကျောင်းပြီး စာနာဆက်ဆံတတ်သော ဉာဏ်ရည် (EQ)","pos":"Noun Phrase","col":"cultivate emotional intelligence in the workplace"},"peer pressure":{"mm":"ရွယ်တူချင်း အပေါင်းအသင်းများ၏ ဖိအားပေး လွှမ်းမိုးမှု","pos":"Noun Phrase","col":"succumb to adolescent peer pressure"},"helicopter parenting":{"mm":"ကလေး၏ ကိစ္စတိုင်းကို အရိပ်တကြည့်ကြည့်ဖြင့် အလွန်အကျွံ ဝင်ရောက်စွက်ဖက် ကာကွယ်ပေးလွန်းသော မိဘအုပ်ထိန်းမှုပုံစံ","pos":"Noun Phrase","col":"helicopter parenting hinders self-reliance"},"intrinsic motivation":{"mm":"ငွေကြေး သို့မဟုတ် ဆုလာဘ်ကြောင့် မဟုတ်ဘဲ ပညာရပ်/အလုပ်ကို ကိုယ်တိုင် စိတ်ဝင်စားနှစ်သက်၍ ကြိုးစားလိုသော စိတ်တွန်းအား","pos":"Noun Phrase","col":"spark students' intrinsic motivation"},"attention span":{"mm":"အာရုံမပျံ့လွင့်ဘဲ အလုပ်တစ်ခုတည်းပေါ် ဆက်တိုက် အာရုံစူးစိုက်နိုင်သည့် အချိန်အတိုင်းအတာ","pos":"Noun Phrase","col":"shorten young people's attention span"},"procrastination":{"mm":"အရေးကြီး လုပ်ဆောင်ရမည့် အလုပ်များကို နောက်ဆုံးအချိန်အထိ အချိန်ဆွဲ ရွှေ့ဆိုင်းထားတတ်မှု","pos":"Noun","col":"overcome academic procrastination"},"dissertation":{"mm":"တက္ကသိုလ်ဘွဲ့အတွက် ရေးသားတင်သွင်းရသော သုတေသန ဘွဲ့ယူစာတမ်းကြီး","pos":"Noun","col":"submit a final-year dissertation"},"gap year":{"mm":"အထက်တန်းကျောင်းအောင်ပြီး တက္ကသိုလ်မတက်မီ ခရီးသွားခြင်း သို့မဟုတ် လုပ်ငန်းအတွေ့အကြုံယူရန် တစ်နှစ်နားသည့်ကာလ","pos":"Noun Phrase","col":"take a gap year to gain work experience"},"aesthetic":{"mm":"အလှအပနှင့် အနုပညာ ရသဆိုင်ရာ","pos":"Adjective / Noun","col":"balance aesthetic appeal with functionality"},"utilitarian":{"mm":"အလှအပထက် လက်တွေ့အသုံးဝင်မှု သက်သက်ကိုသာ ဦးစားပေး ဒီဇိုင်းထုတ်ထားသော","pos":"Adjective","col":"stark utilitarian concrete blocks"},"performing arts":{"mm":"ပရိသတ်ရှေ့မှောက်တွင် တင်ဆက်ကပြရသော ပြဇာတ်၊ ဂီတနှင့် အက အနုပညာရပ်များ","pos":"Noun Phrase","col":"subsidize the performing arts"},"avant-garde":{"mm":"ခေတ်ရှေ့ပြေး စမ်းသပ်ဆန်းသစ်သော (အနုပညာ/စာပေ/ဂီတ)","pos":"Adjective","col":"avant-garde contemporary art"},"acoustics":{"mm":"ခန်းမတစ်ခုအတွင်း အသံကြည်လင်ပြတ်သားစွာ ပျံ့နှံ့ပဲ့တင်ထပ်နိုင်သော အရည်အသွေး","pos":"Noun (Plural)","col":"the concert hall has superb acoustics"},"curate":{"mm":"ပြတိုက်ပြပွဲ သို့မဟုတ် အွန်လိုင်းစာမျက်နှာအတွက် အကောင်းဆုံးအရာများကို စနစ်တကျ ရွေးချယ်စီစဉ်ပြသသည်","pos":"Verb","col":"curate a museum exhibition / curate social media feeds"},"masterpiece":{"mm":"အထူးချွန်ဆုံး မဟာအနုပညာ လက်ရာမွန်ကြီး","pos":"Noun","col":"an architectural or literary masterpiece"},"plagiarism":{"mm":"အခြားသူ၏ စာပေ သို့မဟုတ် အတွေးအခေါ်ကို မိမိကိုယ်ပိုင်အဖြစ် ပုံတူကူးချခိုးယူခြင်း","pos":"Noun","col":"penalize academic plagiarism"},"illiteracy":{"mm":"စာမတတ်မြောက်မှု","pos":"Noun","col":"eradicate adult illiteracy"},"numeracy":{"mm":"ကိန်းဂဏန်းနှင့် အခြေခံသင်္ချာ တွက်ချက်နားလည်နိုင်စွမ်း","pos":"Noun","col":"foundational literacy and numeracy"},"inquisitive":{"mm":"သိချင်စိတ်ပြင်းပြပြီး စူးစမ်းမေးမြန်းတတ်သော","pos":"Adjective","col":"nurturing an inquisitive mind"},"apathetic":{"mm":"စိတ်ဝင်စားမှု သို့မဟုတ် တက်ကြွမှု လုံးဝမရှိဘဲ လျစ်လျူရှုနေသော","pos":"Adjective","col":"politically apathetic young voters"},"self-esteem":{"mm":"မိမိကိုယ်ကိုယ် တန်ဖိုးထား လေးစားယုံကြည်မှု","pos":"Noun","col":"boost children's self-esteem"},"burnished":{"mm":"ပြောင်လက်တောက်ပအောင် ပွတ်တိုက်ထားသော (သို့မဟုတ် ဂုဏ်သတင်း ပိုမိုတောက်ပလာသော)","pos":"Adjective","col":"burnished gold / burnished reputation"},"tarnish":{"mm":"ကောင်းမွန်သော ဂုဏ်သိက္ခာကို ညှိုးနွမ်းထိခိုက်စေသည်","pos":"Verb","col":"tarnish a brand's reputation"},"disillusioned":{"mm":"မိမိ ထင်ထားသလောက် မကောင်းကြောင်း သိရှိသွားသဖြင့် အထင်ကြီးစိတ် ပျောက်ဆုံးပြီး စိတ်ပျက်သွားသော","pos":"Adjective","col":"grow disillusioned with"},"cathartic":{"mm":"စိတ်ထဲရှိ ဖိစီးမှုနှင့် ခံစားချက်များကို ဖွင့်ထုတ်လိုက်ရသဖြင့် စိတ်ပေါ့ပါး သက်သာရာရစေသော","pos":"Adjective","col":"a cathartic emotional experience"},"evocative":{"mm":"အတိတ်အမှတ်တရများ သို့မဟုတ် စိတ်ခံစားချက်များကို ပြန်လည်နိုးထပေါ်လွင်လာစေသော","pos":"Adjective","col":"evocative photography and music"},"poignant":{"mm":"ရင်ထဲ ထိရှကြေကွဲဖွယ် သို့မဟုတ် လေးနက်သော ခံစားချက် ပေးစွမ်းနိုင်သော","pos":"Adjective","col":"a poignant reminder of"},"thought-provoking":{"mm":"လေးလေးနက်နက် စဉ်းစားတွေးခေါ်စရာများ ပေးစွမ်းနိုင်သော","pos":"Adjective","col":"a thought-provoking documentary"},"didactic":{"mm":"ပညာပေးရန် သို့မဟုတ် ကိုယ်ကျင့်တရား သင်ခန်းစာပေးရန် ရည်ရွယ်သော","pos":"Adjective","col":"serve a didactic purpose"},"edification":{"mm":"ဉာဏ်ပညာနှင့် အသိအမြင် တိုးပွားမြင့်မားစေခြင်း","pos":"Noun","col":"public edification and entertainment"},"escapism":{"mm":"နေ့စဉ်ဘဝ မွန်းကျပ်မှုများမှ ရုပ်ရှင်/စာအုပ်/ဂိမ်းများဖြင့် ခေတ္တ စိတ်ထွက်ပေါက်ရှာ အပန်းဖြေခြင်း","pos":"Noun","col":"offer harmless escapism after work"},"binge-watch":{"mm":"ရုပ်သံဇာတ်လမ်းတွဲ တစ်တွဲလုံးကို တစ်ထိုင်တည်း ဆက်တိုက် ကြည့်ရှုသည်","pos":"Verb","col":"binge-watch an entire series over the weekend"},"page-turner":{"mm":"စာမျက်နှာ တစ်ရွက်ပြီးတစ်ရွက် မချနိုင်အောင် ဆွဲဆောင်မှုရှိသော စာအုပ်","pos":"Noun","col":"an absolute page-turner"},"autodidact":{"mm":"ဆရာမပါဘဲ မိမိဘာသာ ကိုယ်တိုင်လေ့လာ သင်ယူတတ်မြောက်သူ","pos":"Noun","col":"become an autodidact using online courses"},"cognitive dissonance":{"mm":"မိမိ၏ လက်ခံယုံကြည်ချက်နှင့် လက်တွေ့လုပ်ရပ် ဆန့်ကျင်ဘက် ဖြစ်နေသည့်အခါ ဖြစ်ပေါ်သော စိတ်ပိုင်းဆိုင်ရာ မသက်မသာဖြစ်မှု","pos":"Noun Phrase","col":"experience cognitive dissonance"},"echo":{"mm":"(အခြားသူ၏ အမြင်/စိုးရိမ်မှုကို) ထပ်တူသဘောတူ ပဲ့တင်ထပ်ဖော်ပြသည်","pos":"Verb / Noun","col":"echo the concerns of scientists"},"nuance":{"mm":"သိမ်မွေ့နက်နဲသော အဓိပ္ပာယ် ကွာခြားချက်အနုစိတ်","pos":"Noun","col":"capture cultural nuances"},"pragmatism":{"mm":"စိတ်ကူးယဉ်မဆန်ဘဲ လက်တွေ့အကျိုးဖြစ်ထွန်းမှုကို အခြေခံသော ဝါဒ","pos":"Noun","col":"guided by economic pragmatism"},"brush up on":{"mm":"မေ့လျော့စပြုနေသော ဘာသာစကား သို့မဟုတ် ပညာရပ်ကို ပြန်လည်လေ့ကျင့် မွမ်းမံသည်","pos":"Phrasal Verb","col":"brush up on my spoken English before the trip"},"catch up on":{"mm":"အချိန်မရ၍ မလုပ်ဖြစ်ခဲ့သော အိပ်စက်ခြင်း သို့မဟုတ် စာဖတ်ခြင်းကို အချိန်ပေး ပြန်လုပ်သည်","pos":"Phrasal Verb","col":"use Sunday mornings to catch up on sleep and reading"},"cut down on":{"mm":"(အစားအသောက်၊ ကော်ဖီ၊ ဖုန်းသုံးချိန် စသည်ကို) လျှော့ချသည်","pos":"Phrasal Verb","col":"trying to cut down on caffeine and screen time"},"do away with":{"mm":"(စနစ်ဟောင်း သို့မဟုတ် စည်းမျဉ်းတစ်ခုကို) လုံးဝ ဖျက်သိမ်းပစ်သည်","pos":"Phrasal Verb","col":"do away with paper tickets"},"fall behind":{"mm":"အခြားသူများ သို့မဟုတ် သတ်မှတ်အချိန်ဇယားနောက်တွင် နောက်ကျကျန်ရစ်သည်","pos":"Phrasal Verb","col":"fall behind with university coursework"},"get around to":{"mm":"လုပ်မည်ဟု ရည်ရွယ်ထားသော်လည်း မအားသေးသည့် အလုပ်ကို နောက်ဆုံးတွင် အချိန်ပေး လုပ်ဖြစ်သည်","pos":"Phrasal Verb","col":"haven't got around to reading it yet"},"look up to":{"mm":"(စံပြပုဂ္ဂိုလ်အဖြစ်) လေးစားအားကျသည်","pos":"Phrasal Verb","col":"someone I really look up to is my grandfather"},"make up for":{"mm":"လိုအပ်ချက် သို့မဟုတ် ဆုံးရှုံးသွားသည့်အရာကို ပြန်လည်ဖြည့်ဆည်း ထေမိစေသည်","pos":"Phrasal Verb","col":"enthusiasm makes up for a lack of experience"},"mull over":{"mm":"ဆုံးဖြတ်ချက်တစ်ခု မချမီ အသေအချာ အချိန်ယူ စဉ်းစားချင့်ချိန်သည်","pos":"Phrasal Verb","col":"mull over a major career decision"},"narrow down":{"mm":"ရွေးချယ်စရာ အများအပြားထဲမှ အကောင်းဆုံး အနည်းငယ်သာ ကျန်အောင် စိစစ်ရွေးထုတ်သည်","pos":"Phrasal Verb","col":"narrow down our holiday options to two cities"},"pan out":{"mm":"(အစီအစဉ် သို့မဟုတ် ကိစ္စတစ်ခု) အဆင်ပြေ အောင်မြင်စွာ ဖြစ်မြောက်လာသည်","pos":"Phrasal Verb","col":"see how the project pans out"},"put off":{"mm":"အချိန်ရွှေ့ဆိုင်းသည် (သို့မဟုတ် စိတ်ပျက်/စိတ်ကုန်သွားစေသည်)","pos":"Phrasal Verb","col":"put off going to the dentist / high prices put tourists off"},"put up with":{"mm":"မနှစ်မြို့ဖွယ် အရာတစ်ခုကို သည်းခံနေထိုင်သည်","pos":"Phrasal Verb","col":"put up with noisy neighbors and traffic"},"set aside":{"mm":"(အချိန် သို့မဟုတ် ငွေကြေးကို) ရည်ရွယ်ချက်တစ်ခုအတွက် သီးသန့်ဖယ်ထားပေးသည်","pos":"Phrasal Verb","col":"set aside thirty minutes every evening for reading"},"stand out":{"mm":"အခြားအရာများ/လူများထက် သိသာထင်ရှားစွာ ပေါ်လွင်ထူးခြားနေသည်","pos":"Phrasal Verb","col":"stand out in a competitive job market"},"take after":{"mm":"မိဘ သို့မဟုတ် လူကြီးတစ်ဦးနှင့် ရုပ်ရည် သို့မဟုတ် စိတ်နေစရိုက် တူသည်","pos":"Phrasal Verb","col":"I definitely take after my father in temperament"},"take up":{"mm":"(ဝါသနာ သို့မဟုတ် အားကစားအသစ်တစ်ခုကို) စတင်လိုက်စားသည် / (အချိန်/နေရာ) ယူသည်","pos":"Phrasal Verb","col":"decided to take up swimming last summer"},"turn down":{"mm":"(ကမ်းလှမ်းချက် သို့မဟုတ် ဖိတ်ကြားချက်ကို) ငြင်းပယ်သည် / (အသံ) တိုးသည်","pos":"Phrasal Verb","col":"turn down a lucrative job offer"},"wind down":{"mm":"ပင်ပန်းခဲ့သမျှကို တဖြည်းဖြည်း စိတ်အပန်းဖြေ အနားယူသည်","pos":"Phrasal Verb","col":"listen to acoustic music to wind down before bed"},"wrap up":{"mm":"(အလုပ် သို့မဟုတ် အစည်းအဝေးကို) အပြီးသတ် လက်စသတ်သည်","pos":"Phrasal Verb","col":"wrap up my office tasks by 6 p.m."},"zero in on":{"mm":"အဓိကအချက်ပေါ်သို့ အာရုံအပြည့်အဝ စူးစိုက်ပစ်မှတ်ထားသည်","pos":"Phrasal Verb","col":"zero in on the root cause of the problem"},"a breath of fresh air":{"mm":"ငြီးငွေ့ဖွယ် ပုံစံခွက်ထဲမှ လန်းဆန်းတက်ကြွဖွယ် ကောင်းသော အပြောင်းအလဲ/လူသစ်","pos":"Spoken Idiom","col":"her teaching style was a breath of fresh air"},"around the clock":{"mm":"နေ့ရောညပါ ၂၄ နာရီပတ်လုံး မရပ်မနား","pos":"Spoken Idiom","col":"work around the clock to restore electricity"},"back to square one":{"mm":"အစီအစဉ် မအောင်မြင်သဖြင့် အစကနေ တစ်ဖန် ပြန်လည်စတင်ရသည့် အခြေအနေ","pos":"Spoken Idiom","col":"corrupted data sent us back to square one"},"behind the times":{"mm":"ခေတ်နောက်ကျကျန်ရစ်နေသော","pos":"Spoken Idiom","col":"companies that refuse to digitize are behind the times"},"by and large":{"mm":"ခြုံငုံကြည့်လျှင်၊ ယေဘုယျအားဖြင့်တော့","pos":"Discourse Idiom","col":"by and large, public transit is reliable"},"call it a day":{"mm":"တစ်နေ့တာ အလုပ်ကို ရပ်နားပြီး အိမ်ပြန်/အနားယူရန် ဆုံးဖြတ်သည်","pos":"Spoken Idiom","col":"call it a day around 6 p.m."},"down to earth":{"mm":"ဘဝင်မမြင့်ဘဲ ရိုးသားပွင့်လင်းပြီး လက်တွေ့ကျသော (လူပုဂ္ဂိုလ်)","pos":"Idiomatic Adjective","col":"remarkably down to earth despite his fame"},"from scratch":{"mm":"အသင့်လုပ်ထားသည့် အရာမသုံးဘဲ အခြေခံ ကုန်ကြမ်း/အစကနေ ကိုယ်တိုင်ပြုလုပ်သည်","pos":"Spoken Idiom","col":"cook traditional meals from scratch"},"hit the nail on the head":{"mm":"အဓိက အချက်အချာကျသော အမှန်တရားကို ကွက်တိ ထိမိအောင် ထောက်ပြနိုင်သည်","pos":"Spoken Idiom","col":"that report hit the nail on the head"},"in the same boat":{"mm":"တူညီသော အခက်အခဲ သို့မဟုတ် အခြေအနေတစ်ခုတည်းကို အတူတကွ ရင်ဆိုင်နေရသော","pos":"Spoken Idiom","col":"all final-year students were in the same boat"},"keep up appearances":{"mm":"လူအများရှေ့တွင် ချမ်းသာဟန်၊ အဆင်ပြေဟန် ဟန်ဆောင်မျက်နှာဖုံး တပ်ထားသည်","pos":"Spoken Idiom","col":"borrow money just to keep up appearances"},"make ends meet":{"mm":"အခြေခံ စားဝတ်နေရေး ကုန်ကျစရိတ်နှင့် ဝင်ငွေ အလျဉ်မီအောင် ရုန်းကန်ရသည်","pos":"Spoken Idiom","col":"struggle to make ends meet on a single income"},"off the top of my head":{"mm":"အချက်အလက် အတိအကျ ပြန်မကြည့်ဘဲ လက်တန်း မှတ်မိသလောက် ချက်ချင်းပြောရလျှင်","pos":"Spoken Idiom","col":"off the top of my head, I'd say around sixty percent"},"play devil's advocate":{"mm":"ဆွေးနွေးပွဲ ပိုမိုပြည့်စုံစေရန် ဆန့်ကျင်ဘက် ရှုထောင့်ဘက်မှ ခေတ္တ ဝင်ရောက်စဉ်းစား ထောက်ပြသည်","pos":"Spoken Idiom","col":"if I were to play devil's advocate for a moment"},"see eye to eye":{"mm":"လူတစ်ဦးနှင့်တစ်ဦး အမြင်ချင်း သဘောထားချင်း ထပ်တူညီသည်","pos":"Spoken Idiom","col":"we don't always see eye to eye on politics"},"a double-edged sword":{"mm":"ကောင်းကျိုးရော ဆိုးကျိုးပါ တစ်ပြိုင်နက် ဒွန်တွဲနေသော အရာ (နှစ်ဖက်သွားဓား)","pos":"Idiomatic Phrase","col":"social media is a double-edged sword (use sparingly)"},"part and parcel":{"mm":"ရှောင်လွှဲ၍မရဘဲ တစ်ပါတည်း ပါဝင်နေသော အစိတ်အပိုင်း","pos":"Idiomatic Phrase","col":"making mistakes is part and parcel of learning a language"},"rule of thumb":{"mm":"လက်တွေ့အတွေ့အကြုံအရ အကြမ်းဖျင်း မှတ်သားလိုက်နာနိုင်သော လမ်းညွှန်ချက်","pos":"Idiomatic Phrase","col":"as a general rule of thumb"},"take for granted":{"mm":"နေ့စဉ် အလွယ်တကူ ရရှိနေသဖြင့် တန်ဖိုးထားရကောင်းမှန်း မသိဘဲ ပေါ့ပေါ့တန်တန် သဘောထားမိသည်","pos":"Idiomatic Verb Phrase","col":"take clean running water and high-speed internet for granted"},"food for thought":{"mm":"လေးလေးနက်နက် ဆက်လက်စဉ်းစားဆင်ခြင်စရာ အတွေးအမြင်","pos":"Idiomatic Phrase","col":"the documentary gave me plenty of food for thought"},"walk of life":{"mm":"လူမှုအလွှာပေါင်းစုံ၊ အလုပ်အကိုင် နယ်ပယ်ပေါင်းစုံ","pos":"Idiomatic Phrase","col":"people from all walks of life"},"time and again":{"mm":"အကြိမ်ကြိမ်အဖန်ဖန် (သမိုင်းတစ်လျှောက် အကြိမ်ပေါင်းများစွာ)","pos":"Idiomatic Adverb Phrase","col":"history has shown time and again that"},"bridge the divide":{"mm":"ဆန့်ကျင်ကွဲပြားနေသော အုပ်စုနှစ်ခုကြား နားလည်မှုဖြင့် ပေါင်းကူးဆက်စပ်ပေးသည်","pos":"Collocation Idiom","col":"bridge the divide between generations"},"resemble":{"mm":"(Reading 538 Trap) 'like, look, be similar to' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"resemble significantly / resemble in relation to"},"recognize":{"mm":"(Reading 538 Trap) 'perceive, acknowledge, realize, appreciate, admit, identify, comprehend, understand, know' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"recognize significantly / recognize in relation to"},"adjust":{"mm":"(Reading 538 Trap) 'change, modify, shift, alter' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"adjust significantly / adjust in relation to"},"approach":{"mm":"(Reading 538 Trap) 'method, way' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"approach significantly / approach in relation to"},"fundamental":{"mm":"(Reading 538 Trap) 'rudimentary, preliminary, basic' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"fundamental significantly / fundamental in relation to"},"rely on":{"mm":"(Reading 538 Trap) 'depend on' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"rely on significantly / rely on in relation to"},"domestic":{"mm":"(Reading 538 Trap) 'home, local, national' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"domestic significantly / domestic in relation to"},"measure":{"mm":"(Reading 538 Trap) 'calculate, assess, evaluate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"measure significantly / measure in relation to"},"trait":{"mm":"(Reading 538 Trap) 'characteristic, feature, property' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"trait significantly / trait in relation to"},"coin":{"mm":"(Reading 538 Trap) 'first used, invent' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"coin significantly / coin in relation to"},"artificial":{"mm":"(Reading 538 Trap) 'synthetic, man-made' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"artificial significantly / artificial in relation to"},"prompt":{"mm":"(Reading 538 Trap) 'initiate, immediately' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"prompt significantly / prompt in relation to"},"exchange":{"mm":"(Reading 538 Trap) 'share, swap, trade' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"exchange significantly / exchange in relation to"},"underlie":{"mm":"(Reading 538 Trap) 'based on, ground, root' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"underlie significantly / underlie in relation to"},"ignore":{"mm":"(Reading 538 Trap) 'neglect, overlook, underestimate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"ignore significantly / ignore in relation to"},"fertiliser":{"mm":"(Reading 538 Trap) 'chemical, toxic, unnatural' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"fertiliser significantly / fertiliser in relation to"},"that*":{"mm":"(Reading 538 Trap) 'this, it, they, those, these, such' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"that* significantly / that* in relation to"},"and*":{"mm":"(Reading 538 Trap) 'or, as well as, both…and, not only…but also…, other than, in addition, besides, on the one hand…on the other hand…, neither…nor…' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"and* significantly / and* in relation to"},"rather than*":{"mm":"(Reading 538 Trap) 'but, yet, however, whereas, nonetheless, nevertheless, although, notwithstanding, though, instead' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"rather than* significantly / rather than* in relation to"},"thanks to*":{"mm":"(Reading 538 Trap) 'stem from, derive, owing to, due to, according to, because of, on account of, as a result of, leading to, because, since, for, in that, as, therefore, hence' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"thanks to* significantly / thanks to* in relation to"},"diversity":{"mm":"(Reading 538 Trap) 'variety, difference' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"diversity significantly / diversity in relation to"},"detect":{"mm":"(Reading 538 Trap) 'find, look for, seek, search' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"detect significantly / detect in relation to"},"isolate":{"mm":"(Reading 538 Trap) 'inaccessible' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"isolate significantly / isolate in relation to"},"avoid":{"mm":"(Reading 538 Trap) 'escape, evitable' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"avoid significantly / avoid in relation to"},"budget":{"mm":"(Reading 538 Trap) 'fund, financial' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"budget significantly / budget in relation to"},"adapt to":{"mm":"(Reading 538 Trap) 'fit, suit' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"adapt to significantly / adapt to in relation to"},"alternative":{"mm":"(Reading 538 Trap) 'substitute' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"alternative significantly / alternative in relation to"},"compensate":{"mm":"(Reading 538 Trap) 'make up, offset' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"compensate significantly / compensate in relation to"},"component":{"mm":"(Reading 538 Trap) 'proportion' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"component significantly / component in relation to"},"military":{"mm":"(Reading 538 Trap) 'weapon, army' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"military significantly / military in relation to"},"criteria":{"mm":"(Reading 538 Trap) 'standard' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"criteria significantly / criteria in relation to"},"constrain":{"mm":"(Reading 538 Trap) 'stop, control' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"constrain significantly / constrain in relation to"},"supplement":{"mm":"(Reading 538 Trap) 'provision' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"supplement significantly / supplement in relation to"},"distinguish":{"mm":"(Reading 538 Trap) 'separate, differentiate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"distinguish significantly / distinguish in relation to"},"analyze":{"mm":"(Reading 538 Trap) 'examine, diagnose' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"analyze significantly / analyze in relation to"},"emphasize":{"mm":"(Reading 538 Trap) 'focus on, stress' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"emphasize significantly / emphasize in relation to"},"enormous":{"mm":"(Reading 538 Trap) 'massive, large' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"enormous significantly / enormous in relation to"},"imitate":{"mm":"(Reading 538 Trap) 'mimic, copy' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"imitate significantly / imitate in relation to"},"impair":{"mm":"(Reading 538 Trap) 'damage, diminish, decrease' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"impair significantly / impair in relation to"},"hinder":{"mm":"(Reading 538 Trap) 'impede, prevent, deter, obstacle' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"hinder significantly / hinder in relation to"},"legitimate":{"mm":"(Reading 538 Trap) 'legal' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"legitimate significantly / legitimate in relation to"},"limitation":{"mm":"(Reading 538 Trap) 'restriction' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"limitation significantly / limitation in relation to"},"convention":{"mm":"(Reading 538 Trap) 'method; tradition' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"convention significantly / convention in relation to"},"demanding":{"mm":"(Reading 538 Trap) 'troublesome' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"demanding significantly / demanding in relation to"},"determine":{"mm":"(Reading 538 Trap) 'decide' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"determine significantly / determine in relation to"},"accelerate":{"mm":"(Reading 538 Trap) 'speed up' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"accelerate significantly / accelerate in relation to"},"ancient":{"mm":"(Reading 538 Trap) 'aged, old' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"ancient significantly / ancient in relation to"},"conscious":{"mm":"(Reading 538 Trap) 'aware, knowing' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"conscious significantly / conscious in relation to"},"minimize":{"mm":"(Reading 538 Trap) 'reduce, lessen' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"minimize significantly / minimize in relation to"},"immunity":{"mm":"(Reading 538 Trap) 'resistance' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"immunity significantly / immunity in relation to"},"secrete":{"mm":"(Reading 538 Trap) 'discharge, exude' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"secrete significantly / secrete in relation to"},"exaggerate":{"mm":"(Reading 538 Trap) 'overstate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"exaggerate significantly / exaggerate in relation to"},"transmit":{"mm":"(Reading 538 Trap) 'pass, send, transfer' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"transmit significantly / transmit in relation to"},"extinct":{"mm":"(Reading 538 Trap) 'die out, lost' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"extinct significantly / extinct in relation to"},"exclusive":{"mm":"(Reading 538 Trap) 'only' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"exclusive significantly / exclusive in relation to"},"guarantee":{"mm":"(Reading 538 Trap) 'assure' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"guarantee significantly / guarantee in relation to"},"inherit":{"mm":"(Reading 538 Trap) 'receive' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"inherit significantly / inherit in relation to"},"witness":{"mm":"(Reading 538 Trap) 'view, see' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"witness significantly / witness in relation to"},"magnetic":{"mm":"(Reading 538 Trap) 'attractive' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"magnetic significantly / magnetic in relation to"},"loss":{"mm":"(Reading 538 Trap) 'waste, gone' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"loss significantly / loss in relation to"},"option":{"mm":"(Reading 538 Trap) 'choice' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"option significantly / option in relation to"},"prefer to":{"mm":"(Reading 538 Trap) 'rather' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"prefer to significantly / prefer to in relation to"},"priority":{"mm":"(Reading 538 Trap) 'preference, preferential' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"priority significantly / priority in relation to"},"primary":{"mm":"(Reading 538 Trap) 'principle, main' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"primary significantly / primary in relation to"},"principle":{"mm":"(Reading 538 Trap) 'rule' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"principle significantly / principle in relation to"},"potential":{"mm":"(Reading 538 Trap) 'possibility' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"potential significantly / potential in relation to"},"quantity":{"mm":"(Reading 538 Trap) 'number' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"quantity significantly / quantity in relation to"},"settle":{"mm":"(Reading 538 Trap) 'fix, figure out' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"settle significantly / settle in relation to"},"sophisticate":{"mm":"(Reading 538 Trap) 'complicate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"sophisticate significantly / sophisticate in relation to"},"specific":{"mm":"(Reading 538 Trap) 'detailed, particular' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"specific significantly / specific in relation to"},"survive":{"mm":"(Reading 538 Trap) 'remain' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"survive significantly / survive in relation to"},"swift":{"mm":"(Reading 538 Trap) 'quick, rapid' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"swift significantly / swift in relation to"},"unexpectedly":{"mm":"(Reading 538 Trap) 'surprising' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"unexpectedly significantly / unexpectedly in relation to"},"surrounding":{"mm":"(Reading 538 Trap) 'setting, environment' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"surrounding significantly / surrounding in relation to"},"attempt":{"mm":"(Reading 538 Trap) 'try, test' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"attempt significantly / attempt in relation to"},"expertise":{"mm":"(Reading 538 Trap) 'knowledge, skill' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"expertise significantly / expertise in relation to"},"faculty":{"mm":"(Reading 538 Trap) 'ability' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"faculty significantly / faculty in relation to"},"donate":{"mm":"(Reading 538 Trap) 'contribute' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"donate significantly / donate in relation to"},"dynamics":{"mm":"(Reading 538 Trap) 'energy, force, move' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"dynamics significantly / dynamics in relation to"},"incentive":{"mm":"(Reading 538 Trap) 'motive, stimulus' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"incentive significantly / incentive in relation to"},"mortality":{"mm":"(Reading 538 Trap) 'death' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"mortality significantly / mortality in relation to"},"peripheral":{"mm":"(Reading 538 Trap) 'unimportant, minor' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"peripheral significantly / peripheral in relation to"},"vicinity":{"mm":"(Reading 538 Trap) 'neighbourhood, nearby' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"vicinity significantly / vicinity in relation to"},"threaten":{"mm":"(Reading 538 Trap) 'endanger, jeopardize, risk, hazard' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"threaten significantly / threaten in relation to"},"practice":{"mm":"(Reading 538 Trap) 'method, exercise' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"practice significantly / practice in relation to"},"bacteria":{"mm":"(Reading 538 Trap) 'virus, germ, microbe' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"bacteria significantly / bacteria in relation to"},"be subject to":{"mm":"(Reading 538 Trap) 'face' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"be subject to significantly / be subject to in relation to"},"be liable to":{"mm":"(Reading 538 Trap) 'potential' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"be liable to significantly / be liable to in relation to"},"pattern":{"mm":"(Reading 538 Trap) 'formation' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"pattern significantly / pattern in relation to"},"therapy":{"mm":"(Reading 538 Trap) 'treatment' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"therapy significantly / therapy in relation to"},"original":{"mm":"(Reading 538 Trap) 'initial, first' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"original significantly / original in relation to"},"confidential":{"mm":"(Reading 538 Trap) 'undisclosed, secret, hidden' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"confidential significantly / confidential in relation to"},"comply with":{"mm":"(Reading 538 Trap) 'obey' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"comply with significantly / comply with in relation to"},"consult":{"mm":"(Reading 538 Trap) 'ask for advice' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"consult significantly / consult in relation to"},"superior":{"mm":"(Reading 538 Trap) 'higher, upper' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"superior significantly / superior in relation to"},"co-operation":{"mm":"(Reading 538 Trap) 'support, work together' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"co-operation significantly / co-operation in relation to"},"co-ordinate":{"mm":"(Reading 538 Trap) 'organize, harmonize' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"co-ordinate significantly / co-ordinate in relation to"},"differ":{"mm":"(Reading 538 Trap) 'vary' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"differ significantly / differ in relation to"},"cue":{"mm":"(Reading 538 Trap) 'hint, clue' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"cue significantly / cue in relation to"},"signal":{"mm":"(Reading 538 Trap) 'symbol, mark, sign' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"signal significantly / signal in relation to"},"abandon":{"mm":"(Reading 538 Trap) 'quit, give up, forsake, derelict' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"abandon significantly / abandon in relation to"},"halt":{"mm":"(Reading 538 Trap) 'stop, quit' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"halt significantly / halt in relation to"},"fragile":{"mm":"(Reading 538 Trap) 'vulnerable' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"fragile significantly / fragile in relation to"},"retain":{"mm":"(Reading 538 Trap) 'maintain' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"retain significantly / retain in relation to"},"vanish":{"mm":"(Reading 538 Trap) 'disappear' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"vanish significantly / vanish in relation to"},"delivery":{"mm":"(Reading 538 Trap) 'dispatch' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"delivery significantly / delivery in relation to"},"erode":{"mm":"(Reading 538 Trap) 'wear away, corrode, degrade' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"erode significantly / erode in relation to"},"induce":{"mm":"(Reading 538 Trap) 'cause, lead to' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"induce significantly / induce in relation to"},"stable":{"mm":"(Reading 538 Trap) 'constant, unchanged' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"stable significantly / stable in relation to"},"integrate":{"mm":"(Reading 538 Trap) 'combine, incorporate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"integrate significantly / integrate in relation to"},"equal":{"mm":"(Reading 538 Trap) 'equivalent, matching, capable' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"equal significantly / equal in relation to"},"grant":{"mm":"(Reading 538 Trap) 'award, provide, approve funding' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"grant significantly / grant in relation to"},"accumulate":{"mm":"(Reading 538 Trap) 'gather' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"accumulate significantly / accumulate in relation to"},"addictive":{"mm":"(Reading 538 Trap) 'habit' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"addictive significantly / addictive in relation to"},"adversity":{"mm":"(Reading 538 Trap) 'trouble' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"adversity significantly / adversity in relation to"},"aggression":{"mm":"(Reading 538 Trap) 'attack' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"aggression significantly / aggression in relation to"},"agreeable":{"mm":"(Reading 538 Trap) 'pleasant' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"agreeable significantly / agreeable in relation to"},"aid":{"mm":"(Reading 538 Trap) 'help' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"aid significantly / aid in relation to"},"allergic":{"mm":"(Reading 538 Trap) 'irritate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"allergic significantly / allergic in relation to"},"altitude":{"mm":"(Reading 538 Trap) 'height' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"altitude significantly / altitude in relation to"},"application":{"mm":"(Reading 538 Trap) 'utilization' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"application significantly / application in relation to"},"approve":{"mm":"(Reading 538 Trap) 'agree' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"approve significantly / approve in relation to"},"array":{"mm":"(Reading 538 Trap) 'order' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"array significantly / array in relation to"},"assign":{"mm":"(Reading 538 Trap) 'allocate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"assign significantly / assign in relation to"},"association":{"mm":"(Reading 538 Trap) 'union' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"association significantly / association in relation to"},"attitude":{"mm":"(Reading 538 Trap) 'opinion' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"attitude significantly / attitude in relation to"},"authority":{"mm":"(Reading 538 Trap) 'government' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"authority significantly / authority in relation to"},"be consistent with":{"mm":"(Reading 538 Trap) 'compatible' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"be consistent with significantly / be consistent with in relation to"},"bear":{"mm":"(Reading 538 Trap) 'tolerate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"bear significantly / bear in relation to"},"blight":{"mm":"(Reading 538 Trap) 'damage, ruin, wither' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"blight significantly / blight in relation to"},"boundary":{"mm":"(Reading 538 Trap) 'barrier' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"boundary significantly / boundary in relation to"},"bungle":{"mm":"(Reading 538 Trap) 'mishandle' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"bungle significantly / bungle in relation to"},"calamity":{"mm":"(Reading 538 Trap) 'disaster' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"calamity significantly / calamity in relation to"},"capacity":{"mm":"(Reading 538 Trap) 'volume' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"capacity significantly / capacity in relation to"},"cater":{"mm":"(Reading 538 Trap) 'serve' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"cater significantly / cater in relation to"},"certify":{"mm":"(Reading 538 Trap) 'verify' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"certify significantly / certify in relation to"},"civic":{"mm":"(Reading 538 Trap) 'municipal, civil' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"civic significantly / civic in relation to"},"comment":{"mm":"(Reading 538 Trap) 'remark' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"comment significantly / comment in relation to"},"commitment":{"mm":"(Reading 538 Trap) 'engagement' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"commitment significantly / commitment in relation to"},"communal":{"mm":"(Reading 538 Trap) 'public' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"communal significantly / communal in relation to"},"commute":{"mm":"(Reading 538 Trap) 'travel' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"commute significantly / commute in relation to"},"compare":{"mm":"(Reading 538 Trap) 'contrast' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"compare significantly / compare in relation to"},"conceal":{"mm":"(Reading 538 Trap) 'hide' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"conceal significantly / conceal in relation to"},"concentrate":{"mm":"(Reading 538 Trap) 'focus' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"concentrate significantly / concentrate in relation to"},"concur":{"mm":"(Reading 538 Trap) 'agree' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"concur significantly / concur in relation to"},"confer":{"mm":"(Reading 538 Trap) 'grant' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"confer significantly / confer in relation to"},"conflict":{"mm":"(Reading 538 Trap) 'unharmonious' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"conflict significantly / conflict in relation to"},"confuse":{"mm":"(Reading 538 Trap) 'puzzle' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"confuse significantly / confuse in relation to"},"conservative":{"mm":"(Reading 538 Trap) 'traditional' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"conservative significantly / conservative in relation to"},"contingent":{"mm":"(Reading 538 Trap) 'uncertain' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"contingent significantly / contingent in relation to"},"controversial":{"mm":"(Reading 538 Trap) 'disputable' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"controversial significantly / controversial in relation to"},"correlation":{"mm":"(Reading 538 Trap) 'link' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"correlation significantly / correlation in relation to"},"courtship":{"mm":"(Reading 538 Trap) 'mate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"courtship significantly / courtship in relation to"},"crash":{"mm":"(Reading 538 Trap) 'collapse' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"crash significantly / crash in relation to"},"credibility":{"mm":"(Reading 538 Trap) 'reliance' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"credibility significantly / credibility in relation to"},"criminal":{"mm":"(Reading 538 Trap) 'offender, delinquent' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"criminal significantly / criminal in relation to"},"crisis":{"mm":"(Reading 538 Trap) 'risk' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"crisis significantly / crisis in relation to"},"criticism":{"mm":"(Reading 538 Trap) 'critique, disapproval' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"criticism significantly / criticism in relation to"},"curb":{"mm":"(Reading 538 Trap) 'restrict' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"curb significantly / curb in relation to"},"damp":{"mm":"(Reading 538 Trap) 'wet' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"damp significantly / damp in relation to"},"dazzle":{"mm":"(Reading 538 Trap) 'flash' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"dazzle significantly / dazzle in relation to"},"deadline":{"mm":"(Reading 538 Trap) 'limit' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"deadline significantly / deadline in relation to"},"delay":{"mm":"(Reading 538 Trap) 'postpone' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"delay significantly / delay in relation to"},"democratic":{"mm":"(Reading 538 Trap) 'participatory' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"democratic significantly / democratic in relation to"},"dental":{"mm":"(Reading 538 Trap) 'teeth' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"dental significantly / dental in relation to"},"depression":{"mm":"(Reading 538 Trap) 'frustration' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"depression significantly / depression in relation to"},"designate":{"mm":"(Reading 538 Trap) 'appoint, assign, mark' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"designate significantly / designate in relation to"},"detain":{"mm":"(Reading 538 Trap) 'hold' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"detain significantly / detain in relation to"},"devastate":{"mm":"(Reading 538 Trap) 'wreck' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"devastate significantly / devastate in relation to"},"disparate":{"mm":"(Reading 538 Trap) 'different' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"disparate significantly / disparate in relation to"},"display":{"mm":"(Reading 538 Trap) 'show' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"display significantly / display in relation to"},"disrupt":{"mm":"(Reading 538 Trap) 'destroy' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"disrupt significantly / disrupt in relation to"},"distract":{"mm":"(Reading 538 Trap) 'divert' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"distract significantly / distract in relation to"},"distribute":{"mm":"(Reading 538 Trap) 'spread' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"distribute significantly / distribute in relation to"},"documentation":{"mm":"(Reading 538 Trap) 'record' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"documentation significantly / documentation in relation to"},"domain":{"mm":"(Reading 538 Trap) 'field' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"domain significantly / domain in relation to"},"dominant":{"mm":"(Reading 538 Trap) 'overbearing' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"dominant significantly / dominant in relation to"},"dramatic":{"mm":"(Reading 538 Trap) 'striking' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"dramatic significantly / dramatic in relation to"},"drought":{"mm":"(Reading 538 Trap) 'dry' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"drought significantly / drought in relation to"},"durable":{"mm":"(Reading 538 Trap) 'lasting' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"durable significantly / durable in relation to"},"eco-friendly":{"mm":"(Reading 538 Trap) 'environmentally-friendly' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"eco-friendly significantly / eco-friendly in relation to"},"elaborate":{"mm":"(Reading 538 Trap) 'illustrate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"elaborate significantly / elaborate in relation to"},"elderly":{"mm":"(Reading 538 Trap) 'aged' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"elderly significantly / elderly in relation to"},"eliminate":{"mm":"(Reading 538 Trap) 'dispose' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"eliminate significantly / eliminate in relation to"},"elusive":{"mm":"(Reading 538 Trap) 'hard' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"elusive significantly / elusive in relation to"},"encyclopaedia":{"mm":"(Reading 538 Trap) 'entire range of knowledge' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"encyclopaedia significantly / encyclopaedia in relation to"},"equator":{"mm":"(Reading 538 Trap) 'geography' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"equator significantly / equator in relation to"},"erratically":{"mm":"(Reading 538 Trap) 'unpredictably' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"erratically significantly / erratically in relation to"},"established":{"mm":"(Reading 538 Trap) 'built' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"established significantly / established in relation to"},"estate":{"mm":"(Reading 538 Trap) 'property' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"estate significantly / estate in relation to"},"ethical":{"mm":"(Reading 538 Trap) 'moral' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"ethical significantly / ethical in relation to"},"eventually":{"mm":"(Reading 538 Trap) 'finally' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"eventually significantly / eventually in relation to"},"evidence":{"mm":"(Reading 538 Trap) 'proof' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"evidence significantly / evidence in relation to"},"evolve":{"mm":"(Reading 538 Trap) 'develop' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"evolve significantly / evolve in relation to"},"exhausted":{"mm":"(Reading 538 Trap) 'fatigue' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"exhausted significantly / exhausted in relation to"},"experiment":{"mm":"(Reading 538 Trap) 'test' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"experiment significantly / experiment in relation to"},"exceptional":{"mm":"(Reading 538 Trap) 'extreme, utmost' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"exceptional significantly / exceptional in relation to"},"explicit":{"mm":"(Reading 538 Trap) 'clear' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"explicit significantly / explicit in relation to"},"exploit":{"mm":"(Reading 538 Trap) 'use' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"exploit significantly / exploit in relation to"},"extend":{"mm":"(Reading 538 Trap) 'expand' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"extend significantly / extend in relation to"},"extract":{"mm":"(Reading 538 Trap) 'quotation' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"extract significantly / extract in relation to"},"famine":{"mm":"(Reading 538 Trap) 'hunger' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"famine significantly / famine in relation to"},"fitness":{"mm":"(Reading 538 Trap) 'physical condition, health' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"fitness significantly / fitness in relation to"},"foe":{"mm":"(Reading 538 Trap) 'enemy' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"foe significantly / foe in relation to"},"format":{"mm":"(Reading 538 Trap) 'structure' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"format significantly / format in relation to"},"fragment":{"mm":"(Reading 538 Trap) 'piece' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"fragment significantly / fragment in relation to"},"freeze":{"mm":"(Reading 538 Trap) 'chill' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"freeze significantly / freeze in relation to"},"fulfill":{"mm":"(Reading 538 Trap) 'execute' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"fulfill significantly / fulfill in relation to"},"gene":{"mm":"(Reading 538 Trap) 'factor' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"gene significantly / gene in relation to"},"gifted":{"mm":"(Reading 538 Trap) 'talented' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"gifted significantly / gifted in relation to"},"graphic":{"mm":"(Reading 538 Trap) 'picture' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"graphic significantly / graphic in relation to"},"habitat":{"mm":"(Reading 538 Trap) 'residence' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"habitat significantly / habitat in relation to"},"harbor":{"mm":"(Reading 538 Trap) 'hold' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"harbor significantly / harbor in relation to"},"hardship":{"mm":"(Reading 538 Trap) 'difficult' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"hardship significantly / hardship in relation to"},"harsh":{"mm":"(Reading 538 Trap) 'rough' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"harsh significantly / harsh in relation to"},"hypothesis":{"mm":"(Reading 538 Trap) 'assumption' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"hypothesis significantly / hypothesis in relation to"},"impact":{"mm":"(Reading 538 Trap) 'influence' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"impact significantly / impact in relation to"},"impressive":{"mm":"(Reading 538 Trap) 'touching' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"impressive significantly / impressive in relation to"},"in accordance with":{"mm":"(Reading 538 Trap) 'conform' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"in accordance with significantly / in accordance with in relation to"},"inaccurate":{"mm":"(Reading 538 Trap) 'incorrect' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"inaccurate significantly / inaccurate in relation to"},"inactive":{"mm":"(Reading 538 Trap) 'passive' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"inactive significantly / inactive in relation to"},"inappropriate":{"mm":"(Reading 538 Trap) 'hard' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"inappropriate significantly / inappropriate in relation to"},"indulge":{"mm":"(Reading 538 Trap) 'spoil' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"indulge significantly / indulge in relation to"},"infest":{"mm":"(Reading 538 Trap) 'plague' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"infest significantly / infest in relation to"},"installment":{"mm":"(Reading 538 Trap) 'regular/periodic payment' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"installment significantly / installment in relation to"},"intelligence":{"mm":"(Reading 538 Trap) 'mind' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"intelligence significantly / intelligence in relation to"},"intense":{"mm":"(Reading 538 Trap) 'strong' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"intense significantly / intense in relation to"},"interaction":{"mm":"(Reading 538 Trap) 'social activities' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"interaction significantly / interaction in relation to"},"interference":{"mm":"(Reading 538 Trap) 'interposition, disruption' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"interference significantly / interference in relation to"},"interior":{"mm":"(Reading 538 Trap) 'inner' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"interior significantly / interior in relation to"},"interrupt":{"mm":"(Reading 538 Trap) 'stop' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"interrupt significantly / interrupt in relation to"},"introverted":{"mm":"(Reading 538 Trap) 'reserved, inward-looking' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"introverted significantly / introverted in relation to"},"involve":{"mm":"(Reading 538 Trap) 'associate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"involve significantly / involve in relation to"},"keen":{"mm":"(Reading 538 Trap) 'eager, enthusiastic' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"keen significantly / keen in relation to"},"label":{"mm":"(Reading 538 Trap) 'display' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"label significantly / label in relation to"},"lack":{"mm":"(Reading 538 Trap) 'shortage' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"lack significantly / lack in relation to"},"landscape":{"mm":"(Reading 538 Trap) 'scene' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"landscape significantly / landscape in relation to"},"likelihood":{"mm":"(Reading 538 Trap) 'chance' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"likelihood significantly / likelihood in relation to"},"limb":{"mm":"(Reading 538 Trap) 'arm or leg' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"limb significantly / limb in relation to"},"linguistic":{"mm":"(Reading 538 Trap) 'language' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"linguistic significantly / linguistic in relation to"},"log":{"mm":"(Reading 538 Trap) 'record, logging' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"log significantly / log in relation to"},"look-in":{"mm":"(Reading 538 Trap) 'opportunity, chance' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"look-in significantly / look-in in relation to"},"lopsided":{"mm":"(Reading 538 Trap) 'uneven' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"lopsided significantly / lopsided in relation to"},"mainly":{"mm":"(Reading 538 Trap) 'primarily' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"mainly significantly / mainly in relation to"},"malfunction":{"mm":"(Reading 538 Trap) 'breakdown' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"malfunction significantly / malfunction in relation to"},"mammal":{"mm":"(Reading 538 Trap) 'creature' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"mammal significantly / mammal in relation to"},"manage to do":{"mm":"(Reading 538 Trap) 'success' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"manage to do significantly / manage to do in relation to"},"manifest":{"mm":"(Reading 538 Trap) 'obvious' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"manifest significantly / manifest in relation to"},"manufacture":{"mm":"(Reading 538 Trap) 'produce' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"manufacture significantly / manufacture in relation to"},"marine":{"mm":"(Reading 538 Trap) 'sea' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"marine significantly / marine in relation to"},"mate":{"mm":"(Reading 538 Trap) 'partner, spouse' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"mate significantly / mate in relation to"},"mechanism":{"mm":"(Reading 538 Trap) 'method' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"mechanism significantly / mechanism in relation to"},"mental":{"mm":"(Reading 538 Trap) 'psychological, cognitive' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"mental significantly / mental in relation to"},"mercury":{"mm":"(Reading 538 Trap) 'liquid metal' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"mercury significantly / mercury in relation to"},"meteorological":{"mm":"(Reading 538 Trap) 'weather' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"meteorological significantly / meteorological in relation to"},"migrate":{"mm":"(Reading 538 Trap) 'move' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"migrate significantly / migrate in relation to"},"moisture":{"mm":"(Reading 538 Trap) 'humidity' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"moisture significantly / moisture in relation to"},"monitor":{"mm":"(Reading 538 Trap) 'surveillance' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"monitor significantly / monitor in relation to"},"motif":{"mm":"(Reading 538 Trap) 'theme' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"motif significantly / motif in relation to"},"mould":{"mm":"(Reading 538 Trap) 'form' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"mould significantly / mould in relation to"},"native":{"mm":"(Reading 538 Trap) 'original' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"native significantly / native in relation to"},"norm":{"mm":"(Reading 538 Trap) 'regulation' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"norm significantly / norm in relation to"},"notoriety":{"mm":"(Reading 538 Trap) 'famous' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"notoriety significantly / notoriety in relation to"},"objective":{"mm":"(Reading 538 Trap) 'goal' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"objective significantly / objective in relation to"},"obligation":{"mm":"(Reading 538 Trap) 'responsibility' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"obligation significantly / obligation in relation to"},"odd":{"mm":"(Reading 538 Trap) 'strange' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"odd significantly / odd in relation to"},"odour":{"mm":"(Reading 538 Trap) 'smell' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"odour significantly / odour in relation to"},"offensive":{"mm":"(Reading 538 Trap) 'hostile' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"offensive significantly / offensive in relation to"},"official":{"mm":"(Reading 538 Trap) 'authority' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"official significantly / official in relation to"},"optimum":{"mm":"(Reading 538 Trap) 'best' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"optimum significantly / optimum in relation to"},"ordinary":{"mm":"(Reading 538 Trap) 'common' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"ordinary significantly / ordinary in relation to"},"organ":{"mm":"(Reading 538 Trap) 'a part of a body' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"organ significantly / organ in relation to"},"out of the question":{"mm":"(Reading 538 Trap) 'impossible, not an option' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"out of the question significantly / out of the question in relation to"},"overcome":{"mm":"(Reading 538 Trap) 'defeat' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"overcome significantly / overcome in relation to"},"overtake":{"mm":"(Reading 538 Trap) 'surpass' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"overtake significantly / overtake in relation to"},"paralyse":{"mm":"(Reading 538 Trap) 'disable, incapacitate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"paralyse significantly / paralyse in relation to"},"participate":{"mm":"(Reading 538 Trap) 'join' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"participate significantly / participate in relation to"},"patient":{"mm":"(Reading 538 Trap) 'tolerant, calm, ill person' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"patient significantly / patient in relation to"},"permit":{"mm":"(Reading 538 Trap) 'allow' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"permit significantly / permit in relation to"},"persuade":{"mm":"(Reading 538 Trap) 'influence' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"persuade significantly / persuade in relation to"},"pessimistic":{"mm":"(Reading 538 Trap) 'negative' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"pessimistic significantly / pessimistic in relation to"},"phase":{"mm":"(Reading 538 Trap) 'process' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"phase significantly / phase in relation to"},"physical":{"mm":"(Reading 538 Trap) 'body' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"physical significantly / physical in relation to"},"plagiarise":{"mm":"(Reading 538 Trap) 'copy' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"plagiarise significantly / plagiarise in relation to"},"plenty of":{"mm":"(Reading 538 Trap) 'many' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"plenty of significantly / plenty of in relation to"},"plot":{"mm":"(Reading 538 Trap) 'plan' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"plot significantly / plot in relation to"},"pose":{"mm":"(Reading 538 Trap) 'cause' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"pose significantly / pose in relation to"},"portable":{"mm":"(Reading 538 Trap) 'conveyable' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"portable significantly / portable in relation to"},"poverty":{"mm":"(Reading 538 Trap) 'poor' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"poverty significantly / poverty in relation to"},"praise":{"mm":"(Reading 538 Trap) 'commend' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"praise significantly / praise in relation to"},"predict":{"mm":"(Reading 538 Trap) 'expect' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"predict significantly / predict in relation to"},"pressing":{"mm":"(Reading 538 Trap) 'urgent' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"pressing significantly / pressing in relation to"},"private":{"mm":"(Reading 538 Trap) 'personal' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"private significantly / private in relation to"},"prohibit":{"mm":"(Reading 538 Trap) 'forbid, ban' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"prohibit significantly / prohibit in relation to"},"prolong":{"mm":"(Reading 538 Trap) 'extend' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"prolong significantly / prolong in relation to"},"promote":{"mm":"(Reading 538 Trap) 'improve' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"promote significantly / promote in relation to"},"prosper":{"mm":"(Reading 538 Trap) 'success' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"prosper significantly / prosper in relation to"},"purify":{"mm":"(Reading 538 Trap) 'clean' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"purify significantly / purify in relation to"},"qualify":{"mm":"(Reading 538 Trap) 'fulfill' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"qualify significantly / qualify in relation to"},"radical":{"mm":"(Reading 538 Trap) 'utmost' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"radical significantly / radical in relation to"},"range":{"mm":"(Reading 538 Trap) 'scope' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"range significantly / range in relation to"},"rare":{"mm":"(Reading 538 Trap) 'unusual' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"rare significantly / rare in relation to"},"rate":{"mm":"(Reading 538 Trap) 'rank, measure' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"rate significantly / rate in relation to"},"react":{"mm":"(Reading 538 Trap) 'respond' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"react significantly / react in relation to"},"recreation":{"mm":"(Reading 538 Trap) 'entertainment' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"recreation significantly / recreation in relation to"},"reduction":{"mm":"(Reading 538 Trap) 'decrease' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"reduction significantly / reduction in relation to"},"refer to":{"mm":"(Reading 538 Trap) 'talk about' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"refer to significantly / refer to in relation to"},"rehearsal":{"mm":"(Reading 538 Trap) 'preparation' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"rehearsal significantly / rehearsal in relation to"},"reject":{"mm":"(Reading 538 Trap) 'exclude' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"reject significantly / reject in relation to"},"relevant":{"mm":"(Reading 538 Trap) 'relative' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"relevant significantly / relevant in relation to"},"religious":{"mm":"(Reading 538 Trap) 'sacred' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"religious significantly / religious in relation to"},"reluctant":{"mm":"(Reading 538 Trap) 'unwilling' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"reluctant significantly / reluctant in relation to"},"reproduce":{"mm":"(Reading 538 Trap) 'breed' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"reproduce significantly / reproduce in relation to"},"responsible":{"mm":"(Reading 538 Trap) 'liable' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"responsible significantly / responsible in relation to"},"revision":{"mm":"(Reading 538 Trap) 'editing' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"revision significantly / revision in relation to"},"revive":{"mm":"(Reading 538 Trap) 'renaissance' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"revive significantly / revive in relation to"},"ruin":{"mm":"(Reading 538 Trap) 'destroy' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"ruin significantly / ruin in relation to"},"scenic":{"mm":"(Reading 538 Trap) 'beautiful' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"scenic significantly / scenic in relation to"},"shade":{"mm":"(Reading 538 Trap) 'shelter' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"shade significantly / shade in relation to"},"skepticism":{"mm":"(Reading 538 Trap) 'doubt' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"skepticism significantly / skepticism in relation to"},"soar":{"mm":"(Reading 538 Trap) 'increase' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"soar significantly / soar in relation to"},"solely":{"mm":"(Reading 538 Trap) 'alone' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"solely significantly / solely in relation to"},"solicitor":{"mm":"(Reading 538 Trap) 'lawyer' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"solicitor significantly / solicitor in relation to"},"steer":{"mm":"(Reading 538 Trap) 'manage' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"steer significantly / steer in relation to"},"stimulate":{"mm":"(Reading 538 Trap) 'motivate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"stimulate significantly / stimulate in relation to"},"stride":{"mm":"(Reading 538 Trap) 'progress' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"stride significantly / stride in relation to"},"succumb":{"mm":"(Reading 538 Trap) 'yield' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Vocabulary","col":"succumb significantly / succumb in relation to"},"subdivide":{"mm":"(Reading 538 Trap) 'break down' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"subdivide significantly / subdivide in relation to"},"subtle":{"mm":"(Reading 538 Trap) 'delicate' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"subtle significantly / subtle in relation to"},"substance":{"mm":"(Reading 538 Trap) 'matter' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"substance significantly / substance in relation to"},"sufficiency":{"mm":"(Reading 538 Trap) 'enough' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"sufficiency significantly / sufficiency in relation to"},"supersede":{"mm":"(Reading 538 Trap) 'replace' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"supersede significantly / supersede in relation to"},"suppress":{"mm":"(Reading 538 Trap) 'hold' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"suppress significantly / suppress in relation to"},"supremacy":{"mm":"(Reading 538 Trap) 'priority' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"supremacy significantly / supremacy in relation to"},"suspicious":{"mm":"(Reading 538 Trap) 'odd' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"suspicious significantly / suspicious in relation to"},"tension":{"mm":"(Reading 538 Trap) 'upset' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"tension significantly / tension in relation to"},"term":{"mm":"(Reading 538 Trap) 'word' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"term significantly / term in relation to"},"throughout":{"mm":"(Reading 538 Trap) 'anywhere' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"throughout significantly / throughout in relation to"},"toll":{"mm":"(Reading 538 Trap) 'charge' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"toll significantly / toll in relation to"},"trace":{"mm":"(Reading 538 Trap) 'track' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"trace significantly / trace in relation to"},"transcend":{"mm":"(Reading 538 Trap) 'excel' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"transcend significantly / transcend in relation to"},"transit":{"mm":"(Reading 538 Trap) 'send' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"transit significantly / transit in relation to"},"tremendous":{"mm":"(Reading 538 Trap) 'vast' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"tremendous significantly / tremendous in relation to"},"trigger":{"mm":"(Reading 538 Trap) 'begin' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"trigger significantly / trigger in relation to"},"tropical":{"mm":"(Reading 538 Trap) 'hot' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"tropical significantly / tropical in relation to"},"unbiased":{"mm":"(Reading 538 Trap) 'fair' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"unbiased significantly / unbiased in relation to"},"uniform":{"mm":"(Reading 538 Trap) 'consistent' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"uniform significantly / uniform in relation to"},"valuable":{"mm":"(Reading 538 Trap) 'benefit' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"valuable significantly / valuable in relation to"},"versatile":{"mm":"(Reading 538 Trap) 'all-around' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"versatile significantly / versatile in relation to"},"view":{"mm":"(Reading 538 Trap) 'overlook' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Verb","col":"view significantly / view in relation to"},"violent":{"mm":"(Reading 538 Trap) 'fierce' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"violent significantly / violent in relation to"},"visible":{"mm":"(Reading 538 Trap) 'see' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"visible significantly / visible in relation to"},"visual":{"mm":"(Reading 538 Trap) 'image' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Adjective","col":"visual significantly / visual in relation to"},"well-being":{"mm":"(Reading 538 Trap) 'health, happiness, welfare' ၏ အဓိပ္ပာယ်တူ စာမေးပွဲလှည့်ကွက်စကားလုံး","pos":"Noun","col":"well-being significantly / well-being in relation to"},"reserve":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'book' အစား 'reserve' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"reserve ahead of time / reserve immediately"},"in advance":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'ahead, before' အစား 'in advance' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"in advance ahead of time / in advance immediately"},"have to":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'must, should, need, require, necessary, be supposed to, demand, order' အစား 'have to' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"have to ahead of time / have to immediately"},"and":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'and also, as well as, with, in addition' အစား 'and' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Vocabulary","col":"and ahead of time / and immediately"},"but":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'however, yet, instead' အစား 'but' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Vocabulary","col":"but ahead of time / but immediately"},"because":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'why, as a result, therefore, cause' အစား 'because' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Vocabulary","col":"because ahead of time / because immediately"},"fee":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'money, cost, price, expense, budget, fund, financial, economic' အစား 'fee' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"fee ahead of time / fee immediately"},"establish":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'build, create, construct, set up, install' အစား 'establish' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"establish ahead of time / establish immediately"},"transfer":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'move, relocate' အစား 'transfer' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"transfer ahead of time / transfer immediately"},"international":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'countries, continents, global' အစား 'international' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"international ahead of time / international immediately"},"export":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'abroad, overseas' အစား 'export' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"export ahead of time / export immediately"},"vegetation":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'plant, tree, forest, botanic' အစား 'vegetation' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"vegetation ahead of time / vegetation immediately"},"animal":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'mammal, wildlife, creature, species' အစား 'animal' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"animal ahead of time / animal immediately"},"feature":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'characteristic, trait, property' အစား 'feature' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"feature ahead of time / feature immediately"},"emigrate":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'move, go away' အစား 'emigrate' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"emigrate ahead of time / emigrate immediately"},"food":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'feed on, eat' အစား 'food' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"food ahead of time / food immediately"},"tradition":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'custom, convention, local culture, lifestyle' အစား 'tradition' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"tradition ahead of time / tradition immediately"},"entertainment":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'recreation, leisure' အစား 'entertainment' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"entertainment ahead of time / entertainment immediately"},"press":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'media, TV, newspaper, radio' အစား 'press' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"press ahead of time / press immediately"},"online":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'Internet, website' အစား 'online' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"online ahead of time / online immediately"},"publicity":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'website, media, news, marketing' အစား 'publicity' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"publicity ahead of time / publicity immediately"},"picture":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'photo, photograph, camera, image' အစား 'picture' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"picture ahead of time / picture immediately"},"jewellery":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'rings, bracelets, necklaces, precious stones, gem, diamond, luxurious' အစား 'jewellery' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"jewellery ahead of time / jewellery immediately"},"artwork":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'painting, drawing, craft' အစား 'artwork' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"artwork ahead of time / artwork immediately"},"statue":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'sculpture, carving' အစား 'statue' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"statue ahead of time / statue immediately"},"movie":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'film, documentary, cinema' အစား 'movie' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"movie ahead of time / movie immediately"},"geology":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'cliff, fossil, rock, landscape' အစား 'geology' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"geology ahead of time / geology immediately"},"countryside":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'rural area' အစား 'countryside' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"countryside ahead of time / countryside immediately"},"urban":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'city, metropolitan' အစား 'urban' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"urban ahead of time / urban immediately"},"coastline":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'shore, seaside' အစား 'coastline' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"coastline ahead of time / coastline immediately"},"environment":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'neighbourhood, surrounding' အစား 'environment' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"environment ahead of time / environment immediately"},"noisy":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'disturbing, not quiet' အစား 'noisy' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"noisy ahead of time / noisy immediately"},"outdoor":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'gardens, park, open air' အစား 'outdoor' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"outdoor ahead of time / outdoor immediately"},"accommodation":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'living, dwelling, dorm' အစား 'accommodation' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"accommodation ahead of time / accommodation immediately"},"place":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'where, spot, location, area' အစား 'place' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"place ahead of time / place immediately"},"near":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'close, not far from, nearby' အစား 'near' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"near ahead of time / near immediately"},"remote":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'isolated, distant' အစား 'remote' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"remote ahead of time / remote immediately"},"advantage":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'benefit, positive, good thing, strength' အစား 'advantage' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"advantage ahead of time / advantage immediately"},"disadvantage":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'drawback, shortcoming, negative, problem' အစား 'disadvantage' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"disadvantage ahead of time / disadvantage immediately"},"education":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'schools, colleges, institution' အစား 'education' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"education ahead of time / education immediately"},"ordinary people":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'people, inhabitants, the public, men and women' အစား 'ordinary people' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"ordinary people ahead of time / ordinary people immediately"},"student":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'pupil, undergraduate, postgraduate' အစား 'student' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"student ahead of time / student immediately"},"purpose":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'aim, goal, target, key areas' အစား 'purpose' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"purpose ahead of time / purpose immediately"},"learn":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'acquire, get, obtain' အစား 'learn' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"learn ahead of time / learn immediately"},"structure":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'outline, framework' အစား 'structure' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"structure ahead of time / structure immediately"},"reference materials":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'books, journals, magazines' အစား 'reference materials' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"reference materials ahead of time / reference materials immediately"},"extensive":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'comprehensive, a lot of, many' အစား 'extensive' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"extensive ahead of time / extensive immediately"},"group":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'team' အစား 'group' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"group ahead of time / group immediately"},"associate":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'relate to, connect, link' အစား 'associate' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"associate ahead of time / associate immediately"},"motivate":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'encourage, stimulate, keep active, boost, help' အစား 'motivate' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"motivate ahead of time / motivate immediately"},"improve":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'develop, promote' အစား 'improve' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"improve ahead of time / improve immediately"},"overlook":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'underestimate, neglect' အစား 'overlook' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"overlook ahead of time / overlook immediately"},"omit":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'leave out, cancel' အစား 'omit' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"omit ahead of time / omit immediately"},"find":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'discover, detect, spot, see, sight' အစား 'find' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"find ahead of time / find immediately"},"opportunity":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'chance, odds, hope' အစား 'opportunity' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"opportunity ahead of time / opportunity immediately"},"difficult":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'problem, hard, not easy, not simple' အစား 'difficult' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"difficult ahead of time / difficult immediately"},"prevent":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'avoid, stop, escape, forbid, out of bounds' အစား 'prevent' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"prevent ahead of time / prevent immediately"},"misunderstand":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'wrong idea, confuse, puzzle, perplex' အစား 'misunderstand' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"misunderstand ahead of time / misunderstand immediately"},"try hard":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'make, efforts, hard working' အစား 'try hard' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"try hard ahead of time / try hard immediately"},"feedback":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'response, reaction, reply' အစား 'feedback' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"feedback ahead of time / feedback immediately"},"affect":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'impact, influence, effect' အစား 'affect' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"affect ahead of time / affect immediately"},"analysis":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'perspective, understand, perceive, know' အစား 'analysis' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"analysis ahead of time / analysis immediately"},"result":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'outcome, consequence, conclusion' အစား 'result' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"result ahead of time / result immediately"},"handle":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'dealwith, cope with, figure out, work out, take care of' အစား 'handle' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"handle ahead of time / handle immediately"},"support":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'help, assistance, aid, tip' အစား 'support' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"support ahead of time / support immediately"},"ideal":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'perfect' အစား 'ideal' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"ideal ahead of time / ideal immediately"},"rigorous":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'strict, demanding' အစား 'rigorous' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"rigorous ahead of time / rigorous immediately"},"restrict":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'limit, not permit' အစား 'restrict' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"restrict ahead of time / restrict immediately"},"similar":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'like, compare' အစား 'similar' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"similar ahead of time / similar immediately"},"particular":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'special, in particular, especially' အစား 'particular' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"particular ahead of time / particular immediately"},"copy":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'repeat, reproduce' အစား 'copy' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"copy ahead of time / copy immediately"},"statistics":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'data, figure' အစား 'statistics' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"statistics ahead of time / statistics immediately"},"maximum":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'up to, at most' အစား 'maximum' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"maximum ahead of time / maximum immediately"},"minimum":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'at least' အစား 'minimum' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"minimum ahead of time / minimum immediately"},"initial":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'at first, start, begin, early on, premiere' အစား 'initial' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"initial ahead of time / initial immediately"},"limited":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'just a few, a little, small, a small number of, not many, miniature' အစား 'limited' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"limited ahead of time / limited immediately"},"shorten":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'cut down' အစား 'shorten' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"shorten ahead of time / shorten immediately"},"decrease":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'lower, reduce, fewer, drop, fall, decrease' အစား 'decrease' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"decrease ahead of time / decrease immediately"},"large":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'big, huge' အစား 'large' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"large ahead of time / large immediately"},"amount of":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'lots of, large quantities of, loads of' အစား 'amount of' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"amount of ahead of time / amount of immediately"},"majority":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'most' အစား 'majority' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"majority ahead of time / majority immediately"},"double":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'twice' အစား 'double' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"double ahead of time / double immediately"},"more than":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'over, beyond, exceed, above' အစား 'more than' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"more than ahead of time / more than immediately"},"at present":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'already, existing, currently, nowadays' အစား 'at present' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"at present ahead of time / at present immediately"},"update":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'upgrade, up to date, more current, modern' အစား 'update' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"update ahead of time / update immediately"},"newest":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'latest' အစား 'newest' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"newest ahead of time / newest immediately"},"soon":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'later, in the future' အစား 'soon' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"soon ahead of time / soon immediately"},"out of date":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'old fashioned' အစား 'out of date' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"out of date ahead of time / out of date immediately"},"temporary":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'a short time' အစား 'temporary' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"temporary ahead of time / temporary immediately"},"permanent":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'long-lasting' အစား 'permanent' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"permanent ahead of time / permanent immediately"},"more often":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'frequent' အစား 'more often' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"more often ahead of time / more often immediately"},"annual":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'every year' အစား 'annual' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"annual ahead of time / annual immediately"},"every month":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'monthly, four weeks' အစား 'every month' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"every month ahead of time / every month immediately"},"every day":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'daily' အစား 'every day' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"every day ahead of time / every day immediately"},"classify":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'category, sort, type, kind' အစား 'classify' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"classify ahead of time / classify immediately"},"entrance":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'access, main gate, door' အစား 'entrance' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"entrance ahead of time / entrance immediately"},"behind":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'back, rear' အစား 'behind' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Preposition","col":"behind ahead of time / behind immediately"},"below":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'under' အစား 'below' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Preposition","col":"below ahead of time / below immediately"},"beside":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'next to, near, border' အစား 'beside' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Preposition","col":"beside ahead of time / beside immediately"},"available":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'have, accessible, not close, open' အစား 'available' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"available ahead of time / available immediately"},"boring":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'not interesting, boredom' အစား 'boring' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"boring ahead of time / boring immediately"},"trend":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'possibility, likely, tendency' အစား 'trend' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"trend ahead of time / trend immediately"},"risky":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'dangerous, not safe, hazard' အစား 'risky' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"risky ahead of time / risky immediately"},"poisonous":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'toxic, dangerous' အစား 'poisonous' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"poisonous ahead of time / poisonous immediately"},"warning":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'alarm, alert' အစား 'warning' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"warning ahead of time / warning immediately"},"care":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'caution' အစား 'care' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"care ahead of time / care immediately"},"steal":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'theft' အစား 'steal' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"steal ahead of time / steal immediately"},"protect":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'safeguard, shelter, preserve' အစား 'protect' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"protect ahead of time / protect immediately"},"injury":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'harm, hurt, damage, dangerous, frighten' အစား 'injury' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"injury ahead of time / injury immediately"},"tactics":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'strategy, method' အစား 'tactics' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"tactics ahead of time / tactics immediately"},"travel":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'tourism, trip, passenger, flight' အစား 'travel' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"travel ahead of time / travel immediately"},"space travel":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'aircraft, rocket, satellite' အစား 'space travel' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"space travel ahead of time / space travel immediately"},"transport":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'vehicle, bus, train, boat, ship, ferry, subway' အစား 'transport' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"transport ahead of time / transport immediately"},"request":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'ask for, inquiry' အစား 'request' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"request ahead of time / request immediately"},"clear":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'definitive' အစား 'clear' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"clear ahead of time / clear immediately"},"organization":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'business, company, corporation structure' အစား 'organization' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"organization ahead of time / organization immediately"},"organize":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'arrange, plan' အစား 'organize' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"organize ahead of time / organize immediately"},"produce":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'generate, make' အစား 'produce' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"produce ahead of time / produce immediately"},"administer":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'manage' အစား 'administer' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"administer ahead of time / administer immediately"},"occupation":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'profession, job' အစား 'occupation' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"occupation ahead of time / occupation immediately"},"all ages":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'young and old' အစား 'all ages' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"all ages ahead of time / all ages immediately"},"youth":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'young, boy, child, teenager' အစား 'youth' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"youth ahead of time / youth immediately"},"staff":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'recruit, worker, employee' အစား 'staff' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"staff ahead of time / staff immediately"},"sale":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'retail' အစား 'sale' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"sale ahead of time / sale immediately"},"cheap":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'low price' အစား 'cheap' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"cheap ahead of time / cheap immediately"},"discount":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် '10% off, on sale' အစား 'discount' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"discount ahead of time / discount immediately"},"round":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'curve, circle' အစား 'round' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"round ahead of time / round immediately"},"order":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'sequence' အစား 'order' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"order ahead of time / order immediately"},"alone":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'single, by themselves' အစား 'alone' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"alone ahead of time / alone immediately"},"shape like":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'look like, seem' အစား 'shape like' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"shape like ahead of time / shape like immediately"},"depress":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'disappoint, dispirit, frustrate, discourage' အစား 'depress' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"depress ahead of time / depress immediately"},"well-known":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'famous, fame' အစား 'well-known' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"well-known ahead of time / well-known immediately"},"specialize in":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'focus, emphasis, concentrate' အစား 'specialize in' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun / Verb","col":"specialize in ahead of time / specialize in immediately"},"part":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'component, proportion, percent, section, element, ingredient' အစား 'part' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"part ahead of time / part immediately"},"typical":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'representative, common, average' အစား 'typical' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"typical ahead of time / typical immediately"},"uncommon":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'special, unique, unusual, rare' အစား 'uncommon' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"uncommon ahead of time / uncommon immediately"},"accurately":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'precisely' အစား 'accurately' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"accurately ahead of time / accurately immediately"},"expand":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'add, enlarge, increase spaces' အစား 'expand' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"expand ahead of time / expand immediately"},"climb":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'go up, increase' အစား 'climb' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"climb ahead of time / climb immediately"},"enhance":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'improve, increase' အစား 'enhance' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"enhance ahead of time / enhance immediately"},"power":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'force, energy' အစား 'power' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"power ahead of time / power immediately"},"fuel":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'coal, firewood, petrol, gas' အစား 'fuel' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"fuel ahead of time / fuel immediately"},"preference":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'like, priority' အစား 'preference' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"preference ahead of time / preference immediately"},"trust":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'less suspicious, believe' အစား 'trust' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"trust ahead of time / trust immediately"},"computer":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'laptop' အစား 'computer' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"computer ahead of time / computer immediately"},"handy":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'convenient' အစား 'handy' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"handy ahead of time / handy immediately"},"demonstrate":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'display, show, exhibition' အစား 'demonstrate' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"demonstrate ahead of time / demonstrate immediately"},"important":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'significant, major, main, primary' အစား 'important' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"important ahead of time / important immediately"},"straightforward":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'direct, first-hand, simple' အစား 'straightforward' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"straightforward ahead of time / straightforward immediately"},"disused":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'empty, abandoned' အစား 'disused' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"disused ahead of time / disused immediately"},"work":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'item' အစား 'work' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"work ahead of time / work immediately"},"turn":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'switch' အစား 'turn' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"turn ahead of time / turn immediately"},"information":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'details, data, graph, chart' အစား 'information' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"information ahead of time / information immediately"},"visualize":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'imagine' အစား 'visualize' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"visualize ahead of time / visualize immediately"},"repetition":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'over and over' အစား 'repetition' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"repetition ahead of time / repetition immediately"},"poor":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'weak' အစား 'poor' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Adjective","col":"poor ahead of time / poor immediately"},"pollutant":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'contaminant' အစား 'pollutant' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Noun","col":"pollutant ahead of time / pollutant immediately"},"continue":{"mm":"(Listening 179 Trap) အသံဖိုင်တွင် 'ahead, go on, keep doing' အစား 'continue' ဟု လှည့်စားပြောဆိုလေ့ရှိသောစကားလုံး","pos":"Verb","col":"continue ahead of time / continue immediately"},"mohinga":{"mm":"မုန့်ဟင်းခါး (မြန်မာနိုင်ငံ၏ အမျိုးသားကိုယ်စားပြု မနက်စာ မုန့်ဟင်းခါး)","pos":"Noun","col":"quintessential national dish / fragrant lemongrass-infused broth"},"ohn no khao swe":{"mm":"အုန်းနို့ခေါက်ဆွဲ (မွှေးကြိုင်ချိုစိမ့်သော အုန်းနို့ကြက်သားခေါက်ဆွဲ)","pos":"Noun","col":"velvety coconut broth / impeccable balance of flavors"},"laphet thoke":{"mm":"လက်ဖက်သုပ် (မြန်မာ့ရိုးရာ လက်ဖက်သုပ် (အကြော်စုံ၊ မြေပဲ၊ ကြက်သွန်ဖြူကြော်))","pos":"Noun","col":"lactic fermentation / earthy umami complexity"},"shan khao swe":{"mm":"ရှမ်းခေါက်ဆွဲ (ရှမ်းရိုးရာ ခေါက်ဆွဲ (အရည် / အသုပ်))","pos":"Noun","col":"savory tomato-based reduction / fermented soybean paste"},"rakhine mont di":{"mm":"ရခိုင်မုန့်တီ (ရခိုင်ရိုးရာ စပ်စပ်ချဉ်ချဉ် မုန့်တီဟင်းရည်)","pos":"Noun","col":"exhilarating spiciness / piquant clear broth"},"nan gyi thoke":{"mm":"နန်းကြီးသုပ် (မြန်မာ့နန်းကြီးသုပ် (ကြက်သားဟင်းအနှစ်၊ ပဲမှုန့်၊ ဆီနီ))","pos":"Noun","col":"luxurious noodle salad / aromatic curry reduction"},"danbauk":{"mm":"ဒန်ပေါက် (ဒန်ပေါက် (ကြက်သား/ဆိတ်သား၊ သီဟိုဠ်စေ့၊ စပျစ်ခြောက်))","pos":"Noun","col":"festive royal heritage / fragrant long-grain basmati"},"htamin thoke":{"mm":"ထမင်းသုပ် (မြန်မာ့ရိုးရာ ထမင်းသုပ်)","pos":"Noun","col":"hand-tossed delicacy / earthy nutty flavor"},"shwe taung khao swe":{"mm":"ရွှေတောင်ခေါက်ဆွဲ (ရွှေတောင် ရိုးရာ ကြက်သားအုန်းနို့ခေါက်ဆွဲ)","pos":"Noun","col":"concentrated coconut reduction / regional culinary tradition"},"kya zan hin gar":{"mm":"ကြာဆံဟင်းခါး (ကြာဆံဟင်းခါး (မှိုခြောက်၊ ကြာဖူး၊ ဘဲဥ))","pos":"Noun","col":"delicate poultry consommé / communal religious ceremonies"},"tohu thoke":{"mm":"တိုဟူးသုပ် (ရှမ်းရိုးရာ တိုဟူးသုပ် (ပဲဝါခြမ်းတိုဟူး၊ ကြက်သွန်ဖြူဆီ၊ မြေပဲ))","pos":"Noun","col":"artisanal chickpea tofu / nutty velvety texture"},"tohu nway":{"mm":"တိုဟူးနွေး (ရှမ်းတိုဟူးနွေး (ပူပူနွေးနွေး တိုဟူးရည်၊ ခေါက်ဆွဲ))","pos":"Noun","col":"piping-hot comforting texture / custardy split-pea emulsion"},"nga htamin":{"mm":"ငါးထမင်း (ရှမ်းရိုးရာ ငါးထမင်းနယ်)","pos":"Noun","col":"hand-kneaded fish rice / golden turmeric hue"},"samusa thoke":{"mm":"စမူဆာသုပ် (စမူဆာသုပ် (ပဲဟင်းရည်၊ ဂေါ်ဖီထုပ်၊ ပူဒီနာ))","pos":"Noun","col":"street-food sensation / tangy chickpea broth"},"wet tha dote htoe":{"mm":"ဝက်သားတုတ်ထိုး (ဝက်သားတုတ်ထိုး (စွပ်ပြုတ်ရည်၊ ငရုတ်သီးစိမ်းဆော့စ်))","pos":"Noun","col":"sociable communal dining / bubbling master stock"},"nga baung dok":{"mm":"ငါးပေါင်းထုပ် (မွန်ရိုးရာ ငါးပေါင်းထုပ် (ငှက်ပျောဖက်ထုပ်))","pos":"Noun","col":"steamed parcels / subtle herbal perfume"},"kachin shat jam":{"mm":"ကချင်ရှပ်ဂျမ် (ကချင်ရိုးရာ ရှပ်ဂျမ်ထမင်း)","pos":"Noun","col":"highland one-pot specialty / indigenous mountain herbs"},"karen talabaw":{"mm":"ကရင်တာလပေါဟင်း (ကရင်ရိုးရာ တာလပေါဟင်း)","pos":"Noun","col":"ancestral soup / ground rice thickener"},"meeshay":{"mm":"မြီးရှည် (မန္တလေး/ရှမ်း ရိုးရာ မြီးရှည်)","pos":"Noun","col":"dense fermented soybean reduction / rich umami profile"},"burmese chicken curry":{"mm":"မြန်မာ့ကြက်သားဆီပြန်ဟင်း (မြန်မာ့ရိုးရာ ကြက်သားဆီပြန်ဟင်း)","pos":"Noun","col":"slow-simmered reduction / oil-separated curry technique"},"ngapi":{"mm":"ငါးပိ (မြန်မာ့မီးဖိုချောင်၏ အသက် ငါးပိ)","pos":"Noun","col":"culinary bedrock / pungent umami foundation"},"hmyin ngapi":{"mm":"မျှင်ငါးပိ / စိတ်စာငါးပိ (မျှင်ငါးပိ (ပင်လယ်မျှင်ကောင်လေးများဖြင့် ပြုလုပ်ထားသော ငါးပိ))","pos":"Noun","col":"sun-cured seafood paste / savory depth"},"pone yay gyi":{"mm":"ပုန်းရည်ကြီး (ပုန်းရည်ကြီး (ပုဂံဒေသထွက် ကုလားပဲ/မြင်းခွာပဲ အချဉ်ဖောက်အနှစ်))","pos":"Noun","col":"pitch-black viscous paste / ancient heritage product"},"laphet":{"mm":"လက်ဖက် (ရှမ်းပြည်နယ်ထွက် ရိုးရာ အချဉ်ဖောက် လက်ဖက်စိမ်း)","pos":"Noun","col":"subterranean aging process / savory astringency"},"chin baung ywet":{"mm":"ချဉ်ပေါင်ရွက် (ချဉ်ပေါင်ရွက် (ချဉ်ပေါင်ကြော် / ချဉ်ပေါင်ဟင်းချို))","pos":"Noun","col":"palate-cleansing tartness / refreshing acidity"},"min kway ywet":{"mm":"မြင်းခွာရွက် (မြင်းခွာရွက် (မြင်းခွာရွက်သုပ် / ဟင်းခါး))","pos":"Noun","col":"revered medicinal herb / crisp herbal salad"},"kin mon ywet":{"mm":"ကင်းမုံရွက် (ကင်းမုံရွက် (ကင်းမုံရွက်ဟင်းချို))","pos":"Noun","col":"soothing vegetable broth / backyard vine produce"},"pe poke":{"mm":"ပဲပုပ် (ရှမ်းပဲပုပ် (မီးဖုတ်ပဲပုပ်ပြား / ပဲပုပ်ထောင်း))","pos":"Noun","col":"smoky umami profile / charcoal-toasted discs"},"pe hmont / besan":{"mm":"ကုလားပဲမှုန့် (ကုလားပဲမှုန့် (မုန့်ဟင်းခါးနှင့် အသုပ်များတွင် မရှိမဖြစ်))","pos":"Noun","col":"essential binding agent / nutty flavor enhancement"},"dandalun thee":{"mm":"ဒန့်ဒလွန်သီး (ဒန့်ဒလွန်သီး (ဒန့်ဒလွန်သီးဟင်းချို / ချဉ်ရည်ဟင်း))","pos":"Noun","col":"succulent inner pulp / fibrous nutritious pods"},"sat thwa hpu / sabalin":{"mm":"စပါးလင် (စပါးလင် (မုန့်ဟင်းခါးနှင့် ငါးဟင်းများတွင် မရှိမဖြစ်))","pos":"Noun","col":"uplifting citrus bouquet / neutralizes gaminess"},"nanwin hmont":{"mm":"နနွင်းမှုန့် (နနွင်းမှုန့် (ဆနွင်းမှုန့်))","pos":"Noun","col":"antimicrobial qualities / golden radiance"},"kyet thun ni & kyet thun phyu":{"mm":"ကြက်သွန်နီ / ကြက်သွန်ဖြူ (ကြက်သွန်နီနှင့် ကြက်သွန်ဖြူ (မြန်မာ့ဟင်းချက်အနှစ်၏ အခြေခံ))","pos":"Noun","col":"indispensable twin pillars / finely pounded aromatic paste"},"kyet thun phyu si gyaw":{"mm":"ကြက်သွန်ဖြူဆီချက် (ကြက်သွန်ဖြူဆီချက် (အသုပ်နှင့် ခေါက်ဆွဲများအတွက်))","pos":"Noun","col":"universal condiment / infused golden dressing"},"magyi hman":{"mm":"မန်ကျည်းမှည့် (မန်ကျည်းမှည့် (ဟင်းချိုနှင့် အသုပ်များအတွက် အချဉ်ရည်))","pos":"Noun","col":"fruity clean acidity / velvety tart juice"},"htanyet":{"mm":"ထန်းလျက် (ထန်းလျက် (အညာဒေသထွက် သဘာဝထန်းလျက်ခဲ))","pos":"Noun","col":"unrefined palm sugar / arid dry-zone heritage"},"nga pyar yay":{"mm":"ငါးငံပြာရည် (ငါးငံပြာရည် (ဟင်းခတ်ဆားရည်))","pos":"Noun","col":"liquid salt seasoning / rich natural glutamates"},"balachaung":{"mm":"ဘာလချောင် (ဘာလချောင်ကြော် (ပုဇွန်ခြောက်၊ ကြက်သွန်နီ/ဖြူကြော်၊ ငရုတ်သီး))","pos":"Noun","col":"explosive savory condiment / crunchy texture sensation"},"a kyaw sone":{"mm":"အကြော်စုံ (မြန်မာ့ရိုးရာ အကြော်စုံ (ဘူးသီးကြော်၊ ပဲကြော်၊ တိုဟူးကြော်))","pos":"Noun","col":"shatteringly crisp exterior / vibrant teatime culture"},"mont lin ma ya":{"mm":"မုန့်လင်မယား (မုန့်လင်မယား (ဘဲဥ/ကြက်ဥ၊ ပဲပြုတ်၊ ကြက်သွန်မြိတ်))","pos":"Noun","col":"poetic street delicacy / cast-iron dimpled skillet"},"shwe yin aye":{"mm":"ရွှေရင်အေး (ရွှေရင်အေး (အုန်းနို့၊ သာကူ၊ ကောက်ညှင်း၊ မုန့်လက်ဆောင်းဖတ်))","pos":"Noun","col":"golden heart cooler / tropical heat antidote"},"sanwin makin":{"mm":"ဆနွင်းမကင်း (ဆနွင်းမကင်း (ရွှေကြည်မုန့်၊ အုန်းနို့၊ ထောပတ်၊ ဘိန်းစေ့))","pos":"Noun","col":"caramelized golden crust / rich semolina confection"},"mont lone yay paw":{"mm":"မုန့်လုံးရေပေါ် (မုန့်လုံးရေပေါ် (သင်္ကြန်ရိုးရာ မုန့်))","pos":"Noun","col":"synonymous with New Year / molten jaggery surprise"},"bein mont":{"mm":"ဘိန်းမုန့် (ဘိန်းမုန့် (ထန်းလျက်ရည်၊ ဘိန်းစေ့၊ အုန်းသီးဆံ))","pos":"Noun","col":"spongy honeycomb texture / charcoal-baked street pancake"},"hnan ma ywet":{"mm":"နှမ်းမရွက် (နှမ်းမရွက် (နှမ်းမရွက်သုပ် / ဟင်းချို))","pos":"Noun","col":"earthy anise-mint bouquet / wild aromatic greens"},"pin sein":{"mm":"ပင်စိမ်း (ပင်စိမ်း (ကြက်သားကြော် / တာလပေါဟင်း))","pos":"Noun","col":"peppery clove-like profile / aromatic citrus lift"},"nan nan pin":{"mm":"နံနံပင် (နံနံပင် (ဟင်းရည်နှင့် အသုပ်များအတွက် အုပ်မွှေး))","pos":"Noun","col":"universal herbal garnish / herbaceous crunch"},"nga yoke kaung":{"mm":"ငရုတ်ကောင်း (ငရုတ်ကောင်း (ဟင်းခါးနှင့် စွပ်ပြုတ်ရည်များအတွက်))","pos":"Noun","col":"ancient source of heat / dry floral spiciness"},"hnan & hnan si":{"mm":"နှမ်း / နှမ်းဆီ (နှမ်းလှော်နှင့် နှမ်းဆီ (မြန်မာ့မီးဖိုချောင်သုံး ဆီမွှေး))","pos":"Noun","col":"artisanal cold-pressed oil / nutty pleasant crunch"},"mye pe & mye pe si":{"mm":"မြေပဲ / မြေပဲဆီ (မြေပဲလှော်နှင့် မြေပဲဆီစစ်စစ်)","pos":"Noun","col":"gold standard cooking medium / unrefined aromatic oil"},"bu thee":{"mm":"ဘူးသီး (ဘူးသီး (ဘူးသီးကြော် / ဘူးသီးဟင်းချို))","pos":"Noun","col":"high moisture content / tender sponge-like flesh"},"kauk hnyin":{"mm":"ကောက်ညှင်း (ကောက်ညှင်းဆန် (ကောက်ညှင်းဖြူ/ငချိတ်/နီ))","pos":"Noun","col":"heirloom sticky rice / ceremonial confection staple"},"nga phe":{"mm":"ငါးဖယ် (ငါးဖယ်ခြစ် (ငါးဖယ်ကြော် / ငါးဖယ်ဟင်း))","pos":"Noun","col":"extraordinary natural elasticity / springy bouncy texture"},"mon nyin chin":{"mm":"မုန်ညင်းချဉ် (မုန်ညင်းချဉ် (ရှမ်းခေါက်ဆွဲနှင့် တွဲဖက်စားစရာ))","pos":"Noun","col":"naturally lacto-fermented / crisp pungent counterpoint"},"pa zun chauk":{"mm":"ပုဇွန်ခြောက် (ပုဇွန်ခြောက် (ပုဇွန်ခြောက်မှုန့် / အသုပ်များတွင် မရှိမဖြစ်))","pos":"Noun","col":"concentrated marine umami / fine golden seafood dust"},"gin / chin":{"mm":"ချင်း / ဂျင်း (ချင်း (ဂျင်း) - ဟင်းခတ်အမွှေးအကြိုင်)","pos":"Noun","col":"piquant aromatic root / palate-cleansing zest"},"mont latt saung":{"mm":"မုန့်လက်ဆောင်း (မုန့်လက်ဆောင်း (ထန်းလျက်ရည် / အုန်းနို့))","pos":"Noun","col":"caramelized jaggery syrup / ancient street refreshment"},"htamane":{"mm":"ထမနဲ (ထမနဲ (တပို့တွဲလ ရိုးရာ ပွဲတော်မုန့်))","pos":"Noun","col":"communal festival preparation / lunar festival tradition"},"htoe mont":{"mm":"ထိုးမုန့် (မန္တလေး ရိုးရာ ထိုးမုန့်)","pos":"Noun","col":"prestigious royal confectionery / glossy chewy texture"},"halawa":{"mm":"ဟာလဝါ (ပုသိမ်ဟာလဝါ) (ပုသိမ်ရိုးရာ ဟာလဝါ)","pos":"Noun","col":"delta heritage confection / woven bark packaging"},"kauk hnyin kyidauk":{"mm":"ကောက်ညှင်းကျည်တောက် (ကောက်ညှင်းကျည်တောက် (ဝါးကျည်တောက်ထမင်း))","pos":"Noun","col":"roasted inside green bamboo / paper-thin inner membrane"}};

const articleCache = new Map();

async function fetchCollocations(rawWord) {
  const word = (rawWord || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!word) return null;

  // 1. Check curated high-yield lexicon first
  if (CURATED_ACADEMIC_LEXICON[word]) {
    const entry = CURATED_ACADEMIC_LEXICON[word];
    return {
      word,
      pos: entry.pos,
      meaning_mm: entry.meaning_mm || '',
      collocations: entry.collocations,
      isCurated: true,
      nounCollocations: entry.collocations.adj_noun || [],
      modifierCollocations: entry.collocations.adv_adj || [],
      verbCollocations: entry.collocations.verb_noun || [],
      sentenceFrames: [entry.collocations.frame],
      triggers: entry.collocations.prep_phrase || [],
      adjectives: entry.collocations.adv_adj || [],
      nouns: entry.collocations.adj_noun || []
    };
  }

  // 2. Dynamic Datamuse with intelligent POS categorization
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

    let pos = "noun";
    if (word.endsWith("ful") || word.endsWith("less") || word.endsWith("ous") || word.endsWith("ive") || word.endsWith("ic") || word.endsWith("al") || word.endsWith("able") || word.endsWith("ible")) {
      pos = "adj";
    } else if (word.endsWith("ize") || word.endsWith("ise") || word.endsWith("ate") || word.endsWith("ify")) {
      pos = "verb";
    } else if (metaItem.defs && metaItem.defs.length > 0) {
      const dPos = metaItem.defs[0].split("\t")[0];
      if (dPos === "adj") pos = "adj";
      else if (dPos === "v") pos = "verb";
      else if (dPos === "adv") pos = "adv";
      else pos = "noun";
    } else if (tags.includes("adj")) pos = "adj";
    else if (tags.includes("v")) pos = "verb";

    const jjaClean = cleanWordList(jjaRaw);
    const jjbClean = cleanWordList(jjbRaw);
    const trgClean = cleanWordList(trgRaw);

    let verb_noun = [];
    let adj_noun = [];
    let adv_adj = [];
    let prep_phrase = [];
    let frame = "";

    if (pos === "adj") {
      adj_noun = jjaClean.slice(0, 5).map(n => `${word} ${n}`);
      if (!adj_noun.length) adj_noun = [`${word} factor`, `${word} dimension`, `${word} consideration`];
      adv_adj = ["vitally", "critically", "profoundly", "increasingly", "substantially"].map(a => `${a} ${word}`);
      prep_phrase = [`of ${word} significance to`, `in a ${word} capacity`, `central to ${word} discourse`];
      frame = `The ${word} characteristics of this phenomenon warrant comprehensive empirical evaluation.`;
      verb_noun = [`demonstrate ${word} outcomes`, `exert a ${word} influence`, `assume a ${word} posture`];
    } else if (pos === "verb") {
      verb_noun = trgClean.slice(0, 5).map(n => `${word} the ${n}`);
      if (!verb_noun.length) verb_noun = [`${word} the problem`, `${word} systemic risks`, `${word} ongoing disputes`];
      adj_noun = [`substantial ${word} efforts`, `proactive ${word} policies`];
      adv_adj = ["measurably", "proactively", "effectively", "substantially", "systematically"].map(a => `${a} ${word}`);
      prep_phrase = [`with a view to ${word}ing`, `in an effort to ${word}`, `aimed at ${word}ing`];
      frame = `Targeted state intervention is imperative to ${word} systemic deficiencies within the sector.`;
    } else {
      // noun
      adj_noun = jjbClean.slice(0, 5).map(a => `${a} ${word}`);
      if (!adj_noun.length) adj_noun = [`pressing ${word}`, `profound ${word}`, `underlying ${word}`];
      verb_noun = ["scrutinize", "evaluate", "implement", "foster", "remedy"].map(v => `${v} ${word}`);
      adv_adj = [`fundamentally centered on ${word}`, `intrinsically linked to ${word}`];
      prep_phrase = [`in the context of ${word}`, `with respect to ${word}`, `at the forefront of ${word}`];
      frame = `Policymakers must carefully scrutinize the multifaceted implications of ${word} within contemporary society.`;
    }

    const burmeseLex = (typeof LEXICON_BURMESE_MAP !== 'undefined' && LEXICON_BURMESE_MAP[word]) ? LEXICON_BURMESE_MAP[word] : null;
    return {
      word,
      pos,
      meaning_mm: burmeseLex ? burmeseLex.mm : '',
      collocations: {
        verb_noun,
        adj_noun,
        adv_adj,
        prep_phrase,
        frame
      },
      isCurated: false,
      nounCollocations: adj_noun,
      modifierCollocations: adv_adj,
      verbCollocations: verb_noun,
      sentenceFrames: [frame],
      triggers: prep_phrase,
      adjectives: adv_adj,
      nouns: adj_noun
    };
  } catch (err) {
    console.error("[fetchCollocations Error]", err);
    return null;
  }
}

async function fetchSynonyms(rawWord) {
  const word = (rawWord || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!word) return null;

  // 1. Curated check
  if (CURATED_ACADEMIC_LEXICON[word]) {
    const entry = CURATED_ACADEMIC_LEXICON[word];
    return {
      word,
      pos: entry.pos,
      synonyms: entry.synonyms.map(s => s.term),
      items: entry.synonyms,
      specific: entry.synonyms.map(s => s.term),
      isCurated: true
    };
  }

  // 2. Dynamic fetch
  try {
    const [synRes, spcRes] = await Promise.allSettled([
      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=15`).then(r => r.json()),
      fetch(`https://api.datamuse.com/words?rel_spc=${encodeURIComponent(word)}&max=8`).then(r => r.json())
    ]);

    const synList = cleanWordList(synRes.status === "fulfilled" ? synRes.value : []);
    const spcList = cleanWordList(spcRes.status === "fulfilled" ? spcRes.value : []);
    const combined = Array.from(new Set([...synList, ...spcList])).filter(w => w !== word).slice(0, 8);

    if (!combined.length) return null;

    const formatted = combined.map((term, i) => {
      const capTerm = term.charAt(0).toUpperCase() + term.slice(1);
      const reg = i < 2 ? "C1 Academic" : (i < 4 ? "C1 Analytical" : "B2-C1 Formal");
      return {
        term: capTerm,
        register: reg,
        nuance: `Academic equivalent of "${word}" appropriate for IELTS Task 2 discourse.`,
        example: `Scholars frequently substitute "${term}" in place of "${word}" to enhance lexical precision.`
      };
    });

    return {
      word,
      pos: "academic term",
      synonyms: formatted.map(s => s.term),
      items: formatted,
      specific: spcList.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      isCurated: false
    };
  } catch (err) {
    console.error("[fetchSynonyms Error]", err);
    return null;
  }
}

async function fetchFullWikipediaArticle(rawTopic) {
  const topic = (rawTopic || "").trim();
  if (!topic) return null;

  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(topic)}&gsrlimit=1&prop=extracts&explaintext=1&format=json&redirects=1`;

  let data = null;
  try {
    const res = await fetch(searchUrl, { headers: { "User-Agent": "IELTSPrepStudioBot/1.0 (academic.prep@gmail.com)" } });
    if (res.ok) data = await res.json();
  } catch (e) {
    console.error("[Wikipedia Search Error]", e);
  }

  // Fallback to opensearch if generator yields empty
  if (!data || !data.query || !data.query.pages) {
    try {
      const openSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&namespace=0&format=json`;
      const osRes = await fetch(openSearchUrl, { headers: { "User-Agent": "IELTSPrepStudioBot/1.0 (academic.prep@gmail.com)" } });
      if (osRes.ok) {
        const osJson = await osRes.json();
        const matchedTitle = osJson[1] && osJson[1][0] ? osJson[1][0] : null;
        if (matchedTitle) {
          const directUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(matchedTitle)}&prop=extracts&explaintext=1&format=json&redirects=1`;
          const dirRes = await fetch(directUrl, { headers: { "User-Agent": "IELTSPrepStudioBot/1.0 (academic.prep@gmail.com)" } });
          if (dirRes.ok) data = await dirRes.json();
        }
      }
    } catch (osErr) {
      console.error("[Wikipedia Fallback Error]", osErr);
    }
  }

  if (!data || !data.query || !data.query.pages) return null;
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  if (pageId === "-1") return null;
  const page = pages[pageId];
  if (!page || !page.extract) return null;

  let raw = page.extract;
  // Strip trailing bibliography, references, notes, and external links
  const cutoffRegex = /\n==\s*(References|External links|Further reading|See also|Notes|Bibliography)\s*==/i;
  const cutoff = raw.search(cutoffRegex);
  if (cutoff !== -1) {
    raw = raw.substring(0, cutoff).trim();
  }

  // Format headers for clear readability
  raw = raw.replace(/^={4}\s*([^=]+?)\s*={4}$/gm, "🔹 *$1*");
  raw = raw.replace(/^={3}\s*([^=]+?)\s*={3}$/gm, "📌 *$1*");
  raw = raw.replace(/^={2}\s*([^=]+?)\s*={2}$/gm, "\n━━━━━━━━━━━━━━━━━━━━\n📖 *$1*\n━━━━━━━━━━━━━━━━━━━━");

  // Split into paragraphs, cleanly segment any oversized blocks, and pack multi-paragraph pages (~2,400-2,800 chars)
  const rawParagraphs = raw.split(/\n{2,}/);
  const normalizedParagraphs = [];

  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    // If a single paragraph is exceptionally long, split cleanly on sentence boundaries
    if (trimmed.length > 2200) {
      const sentences = trimmed.split(/(?<=[.!?])\s+/);
      let subChunk = "";
      for (const s of sentences) {
        if (subChunk.length + s.length + 1 > 2000) {
          if (subChunk) normalizedParagraphs.push(subChunk.trim());
          subChunk = s;
        } else {
          subChunk = subChunk ? `${subChunk} ${s}` : s;
        }
      }
      if (subChunk) normalizedParagraphs.push(subChunk.trim());
    } else {
      normalizedParagraphs.push(trimmed);
    }
  }

  const pagesArr = [];
  let currentChunk = "";

  for (const p of normalizedParagraphs) {
    if (currentChunk.length + p.length + 2 > 2600) {
      if (currentChunk) pagesArr.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${p}` : p;
    }
  }
  if (currentChunk) pagesArr.push(currentChunk.trim());
  if (!pagesArr.length && raw.trim()) pagesArr.push(raw.trim());

  const wordCount = raw.split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return {
    title: page.title,
    fullText: raw,
    pages: pagesArr,
    totalLength: raw.length,
    wordCount: wordCount,
    readingTimeMin: readingTimeMin,
    totalPages: pagesArr.length,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/\s+/g, "_"))}`,
    extract: pagesArr[0] || raw
  };
}

async function fetchTopicBrief(rawTopic) {
  return await fetchFullWikipediaArticle(rawTopic);
}

async function fetchDictionary(rawWord) {
  const word = (rawWord || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!word) return null;

  let meaning_mm = "";
  if (typeof CURATED_ACADEMIC_LEXICON !== "undefined" && CURATED_ACADEMIC_LEXICON[word] && CURATED_ACADEMIC_LEXICON[word].meaning_mm) {
    meaning_mm = CURATED_ACADEMIC_LEXICON[word].meaning_mm;
  } else if (typeof LEXICON_BURMESE_MAP !== "undefined" && LEXICON_BURMESE_MAP[word] && LEXICON_BURMESE_MAP[word].mm) {
    meaning_mm = LEXICON_BURMESE_MAP[word].mm;
  }

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
      meaning_mm,
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
  return `💡 *Free Preview:* *${quota.remaining}/10 remaining today.*\n⭐ *Upgrade to Lifetime VIP (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)) for Unlimited Access!*`;
}

function getQuotaExceededKeyboard(env) {
  return {
    inline_keyboard: [
      [{ text: "⭐ Upgrade to Lifetime VIP (97,000 Ks (Lifetime) / 5,000 Ks (Sprint))", callback_data: "info_payment" }],
      [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
    ]
  };
}

function getQuotaExceededMessage() {
  return `⚠️ *DAILY FREE QUOTA LIMIT REACHED (10/10 USED)*
━━━━━━━━━━━━━━━━━━━━
Free tier accounts are allocated 10 Academic AI searches per day.

👑 *Target Band 7.5+ Lifetime Studio VIP Pass (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint))*
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
    statusBadge = `🆓 *FREE TIER* (${quota.remaining}/10 Queries Remaining Today)`;
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
🆓 *Free Tier:* တစ်နေ့လျှင် ၁၀ ကြိမ် စမ်းသပ် အသုံးပြုနိုင်ပါသည်။

👇 စတင်ရှာဖွေရန် အောက်ပါ ခလုတ်များမှ ရွေးချယ်ပါ:`;

  const vipVoucher = isVip ? await getUserVipVoucher(env, userId) : null;
  const launchUrl = getStudioLaunchUrl(env, userId, vipVoucher);

  const inlineKeyboard = [
    [
      { text: "📖 Scholarly Cloze Drill", callback_data: "tool_cloze" },
      { text: "🎙️ Cambridge & BBC Podcasts", callback_data: "tool_podcast" }
    ],
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
      { text: isVip ? "👑 VIP Lifetime Active" : "⭐ Upgrade VIP (97,000 Ks (Lifetime) / 5,000 Ks (Sprint))", callback_data: isVip ? "vip_status" : "info_payment" }
    ],
    [
      { text: "🚀 Launch IELTS Prep Studio", web_app: { url: launchUrl } }
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

  const isVip = (await resolveIsVip(env, userId));
  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const result = await fetchCollocations(rawWord);
  if (!result || !result.collocations) {
    await sendTelegramMessage(botToken, chatId, `⚠️ No academic collocations found for \`${rawWord}\`. Try common academic words like *impact, crucial, policy, environment, education, evidence*.`, {
      inline_keyboard: [
        [{ text: "🔍 Collocate another word", callback_data: "ask_tool:collocate" }],
        [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]
      ]
    });
    return;
  }

  const col = result.collocations;
  let text = `🔗 *ACADEMIC COLLOCATIONS: "${result.word.toUpperCase()}"*\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏷️ *Part of Speech:* _${result.pos}_\n`;
  if (result.meaning_mm) {
    text += `🇲🇲 *မြန်မာအဓိပ္ပာယ်:* ${result.meaning_mm}\n`;
  }
  text += `\n`;

  if (col.verb_noun && col.verb_noun.length) {
    text += `🔹 *Verb + Noun Pairings:*\n` + col.verb_noun.map(v => `• ${v}`).join("\n") + "\n\n";
  }
  if (col.adj_noun && col.adj_noun.length) {
    text += `🔹 *Adjective + Noun Pairings:*\n` + col.adj_noun.map(a => `• ${a}`).join("\n") + "\n\n";
  }
  if (col.adv_adj && col.adv_adj.length) {
    text += `🔹 *Adverb Intensifiers:*\n` + col.adv_adj.map(ad => `• ${ad}`).join("\n") + "\n\n";
  }
  if (col.prep_phrase && col.prep_phrase.length) {
    text += `🔹 *Academic Prepositional Phrases:*\n` + col.prep_phrase.map(p => `• _${p}_`).join("\n") + "\n\n";
  }
  if (col.frame) {
    text += `✍️ *Band 9 Academic Model Sentence:*\n"${col.frame}"\n`;
    if (col.frame_mm) {
      text += `🇲🇲 _"${col.frame_mm}"_\n`;
    }
    text += "\n";
  }

  text += `💡 *Band 8.5 Tip:*
Pair words with authentic academic collocations to secure high Lexical Resource marks in Task 2.

${formatQuotaFooter(quota)}`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "🔍 Collocate another word", callback_data: "ask_tool:collocate" },
        { text: `💎 Synonyms for "${result.word}"`, callback_data: `tool_syn:${result.word}` }
      ],
      [
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" },
        { text: "🚀 Open Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }
      ]
    ]
  });
}

async function handleSynCommand(chatId, userId, rawWord, env, botToken) {
  if (!rawWord) {
    await handlePromptForTool(chatId, userId, "syn", env, botToken);
    return;
  }

  const isVip = (await resolveIsVip(env, userId));
  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const result = await fetchSynonyms(rawWord);
  if (!result || (!result.items && !result.synonyms?.length)) {
    await sendTelegramMessage(botToken, chatId, `⚠️ No synonyms found for \`${rawWord}\`. Try common essay words like *important, decrease, advantageous, negative*.`, {
      inline_keyboard: [
        [{ text: "🔍 Search another synonym", callback_data: "ask_tool:syn" }],
        [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]
      ]
    });
    return;
  }

  let text = `💎 *BAND 8.5+ SYNONYMS FOR: "${result.word.toUpperCase()}"*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (result.items && result.items.length) {
    for (const item of result.items.slice(0, 4)) {
      text += `• *${item.term}* \`[${item.register || "C1 Academic"}]\`\n` +
              `  _${item.nuance}_\n` +
              `  ✍️ *Model:* "${item.example}"\n\n`;
    }
  } else if (result.synonyms && result.synonyms.length) {
    text += `🎯 *Academic Substitutes:*\n` + result.synonyms.map(s => `• *${s}*`).join("\n") + "\n\n";
  }

  text += `💡 *Lexical Flexibility Warning:*
Avoid mechanical substitutions. Ensure the synonym matches the precise academic register and nuance of your thesis.

${formatQuotaFooter(quota)}`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "🔍 Find more synonyms", callback_data: "ask_tool:syn" },
        { text: `🔗 Collocations for "${result.word}"`, callback_data: `tool_collocate:${result.word}` }
      ],
      [
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" },
        { text: "🚀 Open Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }
      ]
    ]
  });
}

async function handleReadCommand(chatId, userId, rawTopic, env, botToken) {
  if (!rawTopic) {
    await handlePromptForTool(chatId, userId, "read", env, botToken);
    return;
  }

  const isVip = (await resolveIsVip(env, userId));
  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const result = await fetchFullWikipediaArticle(rawTopic);
  if (!result || !result.pages || !result.pages.length) {
    await sendTelegramMessage(botToken, chatId, `⚠️ Could not retrieve an academic knowledge brief for \`${rawTopic}\`. Try broad IELTS topics like *Renewable energy, Globalization, Automation, Mental health*.`, {
      inline_keyboard: [
        [{ text: "📖 Read another topic", callback_data: "ask_tool:read" }],
        [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]
      ]
    });
    return;
  }

  const cacheId = Math.random().toString(36).substring(2, 8);
  articleCache.set(cacheId, result);
  if (env.VIP_KV) {
    try {
      await env.VIP_KV.put("wiki:" + cacheId, JSON.stringify(result), { expirationTtl: 3600 });
    } catch (e) {
      console.warn("[KV Put wiki Error]", e);
    }
  }

  const pageText = result.pages[0];
  const text = 
`📖 *ACADEMIC TOPIC BRIEF: "${result.title.toUpperCase()}"*
📊 *${result.wordCount} words* • ~*${result.readingTimeMin} min read* • *Page 1 of ${result.totalPages}*
━━━━━━━━━━━━━━━━━━━━

${pageText}

🎯 *IELTS Writing & Speaking Angles:*
• *Key Perspectives:* Evaluate socioeconomic impacts, statutory regulations, and long-term implications.

${formatQuotaFooter(quota)}`;

  const buttons = [];
  if (result.totalPages > 1) {
    buttons.push([
      { text: `📄 Page 1/${result.totalPages}`, callback_data: "wiki_noop" },
      { text: "Next Page ➡️", callback_data: `wiki_p:${cacheId}:1` }
    ]);
  }
  buttons.push([
    { text: "📖 Read Another Topic", callback_data: "ask_tool:read" },
    { text: "🌐 Open Wikipedia ↗", url: result.url }
  ]);
  buttons.push([
    { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" },
    { text: "🚀 Open Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }
  ]);

  await sendTelegramMessage(botToken, chatId, text, { inline_keyboard: buttons });
}

async function handleWikiPageCallback(chatId, userId, messageId, callbackQueryId, cacheId, pageIdx, env, botToken) {
  let article = articleCache.get(cacheId);
  if (!article && env.VIP_KV) {
    try {
      article = await env.VIP_KV.get("wiki:" + cacheId, "json");
    } catch (e) {
      console.warn("[KV Get wiki Error]", e);
    }
  }

  if (!article || !article.pages || !article.pages[pageIdx]) {
    await answerCallbackQuery(botToken, callbackQueryId, "Session expired. Please request the topic again via /read.");
    return;
  }

  const pageText = article.pages[pageIdx];
  const text = 
`📖 *ACADEMIC TOPIC BRIEF: "${article.title.toUpperCase()}"*
📊 *${article.wordCount} words* • ~*${article.readingTimeMin} min read* • *Page ${pageIdx + 1} of ${article.totalPages}*
━━━━━━━━━━━━━━━━━━━━

${pageText}

🎯 *IELTS Writing & Speaking Angles:*
• *Key Perspectives:* Evaluate socioeconomic impacts, statutory regulations, and long-term implications.`;

  const navRow = [];
  if (pageIdx > 0) {
    navRow.push({ text: "⬅️ Prev", callback_data: `wiki_p:${cacheId}:${pageIdx - 1}` });
  }
  navRow.push({ text: `📄 ${pageIdx + 1}/${article.totalPages}`, callback_data: "wiki_noop" });
  if (pageIdx < article.totalPages - 1) {
    navRow.push({ text: "Next ➡️", callback_data: `wiki_p:${cacheId}:${pageIdx + 1}` });
  }

  const keyboard = {
    inline_keyboard: [
      navRow,
      [
        { text: "📖 Read Another Topic", callback_data: "ask_tool:read" },
        { text: "🌐 Open Wikipedia ↗", url: article.url }
      ],
      [
        { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" },
        { text: "🚀 Open Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }
      ]
    ]
  };

  await editTelegramMessageText(botToken, chatId, messageId, text, keyboard);
  await answerCallbackQuery(botToken, callbackQueryId, `Page ${pageIdx + 1} of ${article.totalPages}`);
}

async function handleDictCommand(chatId, userId, rawWord, env, botToken) {
  if (!rawWord) {
    await handlePromptForTool(chatId, userId, "dict", env, botToken);
    return;
  }

  const isVip = (await resolveIsVip(env, userId));
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
  text += `🏷️ *Part of Speech:* _${result.pos}_\n`;
  if (result.meaning_mm) {
    text += `🇲🇲 *မြန်မာအဓိပ္ပာယ်:* ${result.meaning_mm}\n`;
  }
  text += `\n`;
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
  const isVip = (await resolveIsVip(env, userId));
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
      [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }, { text: "🚀 Launch Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
    ]
  });
}

async function handlePaperCommand(chatId, userId, topic, env, botToken) {
  const isVip = (await resolveIsVip(env, userId));
  const quota = await checkAndConsumeQuota(env, userId, isVip);
  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }
  try {
    const res = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(topic)}&filter=has_abstract:true,language:en&per_page=1`);
    const data = await res.json();
    const work = data.results && data.results[0];
    if (!work || !work.abstract_inverted_index) {
      await sendTelegramMessage(botToken, chatId, "No peer-reviewed paper found for that topic. Try `/paper climate policy`.");
      return;
    }
    const inv = work.abstract_inverted_index;
    const words = [];
    Object.keys(inv).forEach((w) => inv[w].forEach((pos) => { words[pos] = w; }));
    const abstract = words.join(" ").slice(0, 750);
    const text = `🔬 *Peer-Reviewed Study (${work.publication_year || 2025})*\n*Title:* ${work.title}\n*Citations:* ${work.cited_by_count || 0}\n\n${abstract}...\n\n${formatQuotaFooter(quota)}`;
    await sendTelegramMessage(botToken, chatId, text, {
      inline_keyboard: [
        [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }, { text: "🚀 Launch Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
      ]
    });
  } catch (e) {
    await sendTelegramMessage(botToken, chatId, "Could not load academic paper. Please try again in a moment.");
  }
}

async function handleChartCommand(chatId, userId, country, env, botToken) {
  const isVip = (await resolveIsVip(env, userId));
  const quota = await checkAndConsumeQuota(env, userId, isVip);
  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }
  const c = country.trim().toUpperCase().slice(0, 3) || "MMR";
  try {
    const res = await fetch(`https://api.worldbank.org/v2/country/${encodeURIComponent(c)}/indicator/IT.NET.USER.ZS?date=2019:2023&format=json`);
    const data = await res.json();
    const rows = (Array.isArray(data) && Array.isArray(data[1]) ? data[1] : []).filter((r) => r.value !== null);
    if (!rows.length) {
      await sendTelegramMessage(botToken, chatId, "Use a 3-letter ISO country code, e.g. `/chart MMR`, `/chart GBR`, `/chart SGP`.");
      return;
    }
    const lines = rows.map((r) => `• *${r.date}*: ${Number(r.value).toFixed(1)}%`).join("\n");
    const text = `📊 *Writing Task 1 Live Data (${rows[0].country.value})*\n*Indicator:* Internet Users (% of Population)\n\n${lines}\n\n_Write a 2-sentence overview comparing the trend from ${rows[rows.length - 1].date} to ${rows[0].date}._\n\n${formatQuotaFooter(quota)}`;
    await sendTelegramMessage(botToken, chatId, text, {
      inline_keyboard: [
        [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }, { text: "🚀 Launch Studio", web_app: { url: env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/" } }]
      ]
    });
  } catch (e) {
    await sendTelegramMessage(botToken, chatId, "Could not load World Bank statistics. Please try again.");
  }
}

const FALLBACK_CLOZE_BANK = [
  {
    topicKey: "climate policy",
    title: "Macroeconomic Decarbonization Pathways and Cross-Border Carbon Pricing Frameworks",
    year: 2025,
    citations: 489,
    paragraphs: [
      "Paragraph A — Global Decarbonization Mandates:\nEconomic decarbonization requires robust institutional frameworks that integrate carbon taxation with targeted fiscal subsidies. International climate treaties demonstrate that structural financial interventions accelerate clean-energy transitions while preventing competitive disparities across developing industrial sectors.",
      "Paragraph B — Empirical Methodologies & Market Adjustments:\nEmpirical evaluations across OECD member nations confirm that border carbon adjustments significantly reduce carbon leakage without inducing macroeconomic contraction. Advanced econometric modeling indicates that phased revenue recycling protects vulnerable lower-income demographics from rising utility tariffs while incentivizing corporate capital investments into zero-emission manufacturing facilities.",
      "Paragraph C — Strategic Synthesis & Policy Implications:\nUltimately, the efficacy of municipal decarbonization relies upon coherent cross-border governance. Policymakers must harmoniously align regulatory mandates with market-based cap-and-trade systems to sustain long-term ecological equilibrium and achieve net-zero targets by 2050."
    ],
    targetWords: ["frameworks", "subsidies", "leakage", "contraction", "recycling", "governance", "equilibrium"]
  },
  {
    topicKey: "urban sustainability",
    title: "Urban Microclimates, Spatial Density, and Ecological Infrastructure in Mega-Cities",
    year: 2025,
    citations: 395,
    paragraphs: [
      "Paragraph A — Urban Heat Island Dynamics:\nRapid metropolitan growth has exacerbated urban heat island phenomena, severely compromising microclimatic equilibrium and ambient living standards in high-density corridors. Anthropogenic surface materials such as asphalt and concrete absorb vast quantities of shortwave solar radiation, re-emitting thermal energy and elevating nighttime surface temperatures.",
      "Paragraph B — Biophilic Architecture & Empirical Evidence:\nTo mitigate these detrimental microclimatic conditions, municipal urban planners are increasingly mandating the integration of extensive vegetative green rooftops and vertical pocket gardens into building codes. Empirical longitudinal assessments in Singapore and Rotterdam verify that rooftop vegetation lowers building cooling loads by up to 32 percent while absorbing stormwater runoff.",
      "Paragraph C — Strategic Urban Synthesis:\nNonetheless, retrofitting historic building stock with heavy soil-based systems presents formidable structural and financial hurdles. Municipalities are consequently deploying high-albedo cool pavements alongside shaded transit corridors as practical cost-effective interventions that deliver immediate ecological and public health dividends."
    ],
    targetWords: ["equilibrium", "anthropogenic", "radiation", "mitigate", "vegetative", "retrofitting", "dividends"]
  },
  {
    topicKey: "artificial intelligence",
    title: "Generative Artificial Intelligence in Higher Education: Cognitive Scaffolding and Assessment Integrity",
    year: 2025,
    citations: 612,
    paragraphs: [
      "Paragraph A — Pedagogical Disruption:\nThe widespread diffusion of generative artificial intelligence and large language models has triggered a paradigm transformation across tertiary education curricula. While generative tools provide unprecedented opportunities for personalized cognitive scaffolding and adaptive learning support, they simultaneously challenge foundational assumptions regarding authentic student authorship.",
      "Paragraph B — Empirical Classroom Findings:\nEmpirical trials conducted across university computer science and linguistics departments reveal that students utilizing AI as an interactive conversational tutor demonstrate accelerated mastery of introductory theoretical paradigms. However, unguided automated text generation frequently induces cognitive atrophy, diminishing students' capacity for critical synthesis and independent rhetorical problem-solving.",
      "Paragraph C — Future Institutional Imperatives:\nConsequently, higher education institutions must urgently transition away from traditional memorization-based take-home evaluations. Academic faculties must establish innovative multimodal assessment protocols that evaluate iterative reasoning, oral viva defenses, and reflective problem formulation over mechanized text regurgitation."
    ],
    targetWords: ["paradigm", "scaffolding", "authorship", "interactive", "cognitive", "synthesis", "protocols"]
  }
];

async function handleClozeCommand(chatId, userId, topic, env, botToken) {
  const isVip = (await resolveIsVip(env, userId));
  const quota = await checkAndConsumeQuota(env, userId, isVip);
  if (!quota.allowed) {
    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));
    return;
  }

  const t = (topic || "climate policy").trim();
  let workTitle = "";
  let pubYear = 2025;
  let citations = 214;
  let articleParagraphs = [];
  let wordBank = [];
  let answerKey = "";
  let targetCount = 6;

  try {
    const res = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(t)}&filter=has_abstract:true,language:en&per_page=4`, {
      headers: {
        "User-Agent": "IELTSPrepStudioBot/1.0 (mailto:contact@hyuguo.com)",
        "Accept": "application/json"
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      const works = (data.results || []).filter((w) => w.abstract_inverted_index);
      if (works.length >= 2) {
        const reconstructedPars = works.slice(0, 3).map((w, wIdx) => {
          const inv = w.abstract_inverted_index;
          const words = [];
          Object.keys(inv).forEach((tok) => inv[tok].forEach((pos) => { words[pos] = tok; }));
          const text = words.filter(Boolean).join(" ");
          const label = String.fromCharCode(65 + wIdx);
          return `Paragraph ${label} — ${w.title}:\n${text}`;
        });

        const stopWords = ["between", "through", "because", "without", "another", "against", "however", "therefore", "further", "several", "during", "before", "should", "within", "across", "although", "whereas", "furthermore"];
        const candidates = [];
        reconstructedPars.forEach((pText, pIdx) => {
          const tokens = pText.split(/\s+/);
          tokens.forEach((tok) => {
            const clean = tok.replace(/[^a-zA-Z]/g, "").toLowerCase();
            if (clean.length >= 7 && !stopWords.includes(clean) && !candidates.some(c => c.clean === clean)) {
              candidates.push({ pIdx, clean });
            }
          });
        });

        if (candidates.length >= 5) {
          targetCount = Math.min(6, candidates.length);
          const selected = candidates.slice(0, targetCount);
          wordBank = [...selected.map(s => s.clean)].sort(() => Math.random() - 0.5);

          let blankNum = 1;
          const answers = [];
          articleParagraphs = reconstructedPars.map((pText) => {
            let processed = pText;
            selected.forEach((sel) => {
              const reg = new RegExp(`\\b${sel.clean}\\b([.,;:]?)`, 'i');
              if (reg.test(processed)) {
                processed = processed.replace(reg, `[ ${blankNum} ]$1`);
                answers.push(`${blankNum}. *${sel.clean}*`);
                blankNum++;
              }
            });
            return processed;
          });

          workTitle = works[0].title;
          pubYear = works[0].publication_year || 2025;
          citations = works[0].cited_by_count || 180;
          answerKey = answers.join("\n");
        }
      }
    }
  } catch (err) {
    console.warn("[OpenAlex Multi-Paragraph Fetch Notice]", err);
  }

  if (!articleParagraphs.length) {
    const tLow = t.toLowerCase();
    const fallback = FALLBACK_CLOZE_BANK.find(f => tLow.includes(f.topicKey) || f.topicKey.includes(tLow)) || FALLBACK_CLOZE_BANK[0];
    workTitle = fallback.title;
    pubYear = fallback.year;
    citations = fallback.citations;

    let blankNum = 1;
    const answers = [];
    const chosenWords = fallback.targetWords.slice(0, 6);
    wordBank = [...chosenWords].sort(() => Math.random() - 0.5);

    articleParagraphs = fallback.paragraphs.map((pText) => {
      let processed = pText;
      chosenWords.forEach((word) => {
        const reg = new RegExp(`\\b${word}\\b([.,;:]?)`, 'i');
        if (reg.test(processed)) {
          processed = processed.replace(reg, `[ ${blankNum} ]$1`);
          answers.push(`${blankNum}. *${word}*`);
          blankNum++;
        }
      });
      return processed;
    });

    targetCount = answers.length;
    answerKey = answers.join("\n");
  }

  const launchUrl = env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/";
  const text =
`📖 *FULL SCHOLARLY ARTICLE CLOZE DRILL*
━━━━━━━━━━━━━━━━━━━━
🔬 *Academic Topic:* _${workTitle}_
📅 *Publication Year:* ${pubYear} • *Citations:* ${citations}

Fill in blanks *[ 1 ]* to *[ ${targetCount} ]* across the 3 article paragraphs:

${articleParagraphs.join("\n\n")}

🔤 *Academic Word Bank:*
\`${wordBank.join("  •  ")}\`

||🔍 *Answer Key:*
${answerKey}||

${formatQuotaFooter(quota)}`;

  await sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [{ text: "⚡ Launch Interactive Cloze Lab", web_app: { url: launchUrl } }],
      [{ text: "🔄 Next Article Topic", callback_data: "tool_cloze" }, { text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]
    ]
  });
}

const PODCAST_CHANNELS = {

  ielts: {

    key: "ielts",

    name: "IELTS Speaking Band 9 (Real Exam Interviews)",

    tagline: "Authentic candidate & examiner interviews for Part 1, 2 & 3 fluency",

    searchTerm: "IELTS Speaking Band 9",

    note: "💡 *100% Native English Discourse:* Real exam mock tests, candidate answers & Band 9 scoring feedback.",

    episodes: [

      {

        id: "ielts_ep15",

        title: "EP. 15 IELTS Speaking Test | BAND 9 | Real Exam Simulation",

        show: "IELTS Speaking Band 9",

        date: "2026-10-26",

        durationMin: 15,

        audioUrl: "https://traffic.megaphone.fm/PODAGEN5116923529.mp3?updated=1778656091"

      },

      {

        id: "ielts_ep2",

        title: "EP. 2 IELTS Speaking Interview | BAND 9 | Full Real Test",

        show: "IELTS Speaking Band 9",

        date: "2026-10-26",

        durationMin: 15,

        audioUrl: "https://traffic.megaphone.fm/PODAGEN2263951416.mp3?updated=1778656111"

      },

      {

        id: "ielts_ep20",

        title: "EP. 20 IELTS Speaking Test | BAND 8+ Advanced Lexicon",

        show: "IELTS Speaking Band 9",

        date: "2026-10-26",

        durationMin: 15,

        audioUrl: "https://traffic.megaphone.fm/PODAGEN2922136104.mp3?updated=1778656084"

      }

    ]

  },

  bbc: {

    key: "bbc",

    name: "BBC 6 Minute English (Native British Vocabulary)",

    tagline: "Topical UK discussions on science, society & modern English idioms",

    searchTerm: "BBC 6 Minute English",

    note: "*(Official BBC international broadcast feed: includes a brief ~20s opening sponsor before British dialogue)*",

    episodes: [

      {

        id: "bbc_sleep",

        title: "What should you eat for a better night's sleep?",

        show: "BBC 6 Minute English",

        date: "2026-10-22",

        durationMin: 6,

        audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0phyzz9.mp3"

      },

      {

        id: "bbc_gold",

        title: "Why has gold got so expensive?",

        show: "BBC 6 Minute English",

        date: "2026-10-15",

        durationMin: 6,

        audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0pgs15w.mp3"

      },

      {

        id: "bbc_alcohol",

        title: "Are people drinking less alcohol?",

        show: "BBC 6 Minute English",

        date: "2026-10-08",

        durationMin: 6,

        audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0pfllv6.mp3"

      },

      {

        id: "bbc_heartbreak",

        title: "Why does heartbreak hurt so much?",

        show: "BBC 6 Minute English",

        date: "2026-10-01",

        durationMin: 6,

        audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0pdc7mz.mp3"

      }

    ]

  },

  energy: {

    key: "energy",

    name: "IELTS Energy English 7+ (Examiner Strategies)",

    tagline: "High-scoring vocabulary & exam mastery from former IELTS examiners",

    searchTerm: "IELTS Energy English",

    note: "💡 *Examiner Strategy:* Aubrey Carter & Jessica Beck on Band 8+ scoring criteria.",

    episodes: [

      {

        id: "energy_halloween",

        title: "Holidays on IELTS Part 1: Boost Vocabulary Scores",

        show: "IELTS Energy English 7+",

        date: "2026-10-27",

        durationMin: 18,

        audioUrl: "https://traffic.megaphone.fm/ALLE3646384363.mp3"

      },

      {

        id: "energy_launch",

        title: "Launching Answers Part 1: Start With a Bang!",

        show: "IELTS Energy English 7+",

        date: "2026-10-23",

        durationMin: 16,

        audioUrl: "https://traffic.megaphone.fm/ALLE1914174882.mp3"

      },

      {

        id: "energy_opinions",

        title: "How to Evaluate Opinions for Higher IELTS Scores",

        show: "IELTS Energy English 7+",

        date: "2026-10-20",

        durationMin: 17,

        audioUrl: "https://traffic.megaphone.fm/ALLE2089373638.mp3"

      }

    ]

  },

  speak: {

    key: "speak",

    name: "BBC The English We Speak & Cambridge Discourse",

    tagline: "3-minute real UK everyday idioms, expressions & Cambridge discourse",

    searchTerm: "BBC The English We Speak",

    note: "*(Official BBC / Cambridge feeds: 100% authentic British idiomatic phrasing)*",

    episodes: [

      {

        id: "speak_breath",

        title: "The English We Speak: In the same breath",

        show: "BBC The English We Speak",

        date: "2026-10-27",

        durationMin: 3,

        audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0pjsmsb.mp3"

      },

      {

        id: "speak_devices",

        title: "The English We Speak: Leave to one's own devices",

        show: "BBC The English We Speak",

        date: "2026-10-20",

        durationMin: 3,

        audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0phlwk0.mp3"

      },

      {

        id: "speak_patience",

        title: "The English We Speak: Try one's patience",

        show: "BBC The English We Speak",

        date: "2026-10-13",

        durationMin: 3,

        audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0pgdrn8.mp3"

      },

      {

        id: "cambridge_first",

        title: "The first Cambridge English exams",

        show: "Cambridge Assessment Podcasts",

        date: "2020-11-26",

        durationMin: 12,

        audioUrl: "https://sphinx.acast.com/p/open/s/60ba0653b349f90012ecd19c/e/https%3A%2F%2Fs3-eu-west-1.amazonaws.com%2Fprod.ca%2F2020%2FPodcasts%2Fthe-first-cambridge-english-exams-podcast.mp3/media.mp3"

      }

    ]

  }

};



function resolvePodcastChannel(query) {

  const q = (query || "").trim().toLowerCase();

  if (q.includes("bbc") || q.includes("6min") || q.includes("sleep") || q.includes("gold") || q.includes("alcohol") || q.includes("heartbreak")) {

    return "bbc";

  }

  if (q.includes("energy") || q.includes("allears") || q.includes("strategy") || q.includes("examiner") || q.includes("halloween")) {

    return "energy";

  }

  if (q.includes("cambridge") || q.includes("speak") || q.includes("idiom") || q.includes("device") || q.includes("breath") || q.includes("patience")) {

    return "speak";

  }

  return "ielts";

}



async function fetchLatestPodcastEpisodes(channelKey) {

  const channel = PODCAST_CHANNELS[channelKey] || PODCAST_CHANNELS.ielts;

  let liveEpisodes = [];



  try {

    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(channel.searchTerm)}&media=podcast&entity=podcastEpisode&limit=6`;

    const ctrl = new AbortController();

    const timeoutId = setTimeout(() => ctrl.abort(), 2800);

    const res = await fetch(itunesUrl, {

      signal: ctrl.signal,

      headers: {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",

        "Accept": "application/json"

      }

    });

    clearTimeout(timeoutId);



    if (res.ok) {

      const data = await res.json();

      if (data.results && Array.isArray(data.results)) {

        liveEpisodes = data.results

          .filter(e => (e.previewUrl || e.episodeUrl) && e.trackName)

          .map((e, idx) => ({

            id: `${channelKey}_live_${idx}`,

            title: e.trackName,

            show: e.collectionName || channel.name,

            date: (e.releaseDate || "").slice(0, 10) || "2026-10-25",

            durationMin: e.trackTimeMillis ? Math.round(e.trackTimeMillis / 60000) : 10,

            audioUrl: e.previewUrl || e.episodeUrl

          }));

      }

    }

  } catch (err) {

    console.warn(`[Podcast Fetch Notice - ${channelKey}]`, err ? err.message : "timeout");

  }



  const fallbackList = channel.episodes || [];

  const combined = [];

  const seenUrls = new Set();



  for (const ep of liveEpisodes) {

    if (ep.audioUrl && !seenUrls.has(ep.audioUrl)) {

      seenUrls.add(ep.audioUrl);

      combined.push(ep);

    }

    if (combined.length >= 4) break;

  }



  for (const ep of fallbackList) {

    if (ep.audioUrl && !seenUrls.has(ep.audioUrl)) {

      seenUrls.add(ep.audioUrl);

      combined.push(ep);

    }

    if (combined.length >= 4) break;

  }



  return combined.length > 0 ? combined : fallbackList;

}



async function handlePodcastCommand(chatId, userId, query, env, botToken) {

  const isVip = (await resolveIsVip(env, userId));

  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {

    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));

    return;

  }



  const channelKey = resolvePodcastChannel(query);

  const channel = PODCAST_CHANNELS[channelKey] || PODCAST_CHANNELS.ielts;

  const episodes = await fetchLatestPodcastEpisodes(channelKey);



  const numIcons = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];

  const epLines = episodes.slice(0, 4).map((ep, i) => {

    return `${numIcons[i]} *${ep.title}*\n   📅 ${ep.date} • ⏱️ ~${ep.durationMin} min • 🇬🇧 English\n   🔗 [Play Stream Audio](${ep.audioUrl})`;

  }).join("\n\n");



  const launchUrl = env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/";

  const extraNote = channel.note ? `\n${channel.note}\n` : "";



  const text =

`🎙️ *NATIVE ENGLISH PODCAST HUB // MULTI-STREAM*

━━━━━━━━━━━━━━━━━━━━

📻 *Channel:* ${channel.name}

💡 *Focus:* ${channel.tagline}

${extraNote}

🎧 *LATEST WORKING EPISODES (100% ENGLISH):*

${epLines}



👇 *Tap below to STREAM directly into Telegram or switch channels:*



${formatQuotaFooter(quota)}`;



  const playButtons = episodes.slice(0, 3).map((ep, i) => ({

    text: `▶️ Ep ${i + 1}`,

    callback_data: `pod_play:${channelKey}:${i}`

  }));



  const inline_keyboard = [

    playButtons,

    [

      { text: channelKey === "ielts" ? "✅ 🗣️ IELTS Band 9" : "🗣️ IELTS Band 9", callback_data: "pod_ielts" },

      { text: channelKey === "bbc" ? "✅ 🇬🇧 BBC 6-Min" : "🇬🇧 BBC 6-Min", callback_data: "pod_bbc" }

    ],

    [

      { text: channelKey === "energy" ? "✅ ⚡ IELTS Energy" : "⚡ IELTS Energy", callback_data: "pod_energy" },

      { text: channelKey === "speak" ? "✅ 📻 Idioms & Cam" : "📻 Idioms & Cam", callback_data: "pod_cambridge" }

    ],

    [{ text: "🚀 Open in Studio App (Live Transcribe)", web_app: { url: launchUrl } }],

    [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]

  ];



  await sendTelegramMessage(botToken, chatId, text, { inline_keyboard }, true);

}



async function handlePlayPodcastEpisode(chatId, userId, channelKey, epIndex, env, botToken) {

  const isVip = (await resolveIsVip(env, userId));

  const quota = await checkAndConsumeQuota(env, userId, isVip);

  if (!quota.allowed) {

    await sendTelegramMessage(botToken, chatId, getQuotaExceededMessage(), getQuotaExceededKeyboard(env));

    return;

  }



  const channel = PODCAST_CHANNELS[channelKey] || PODCAST_CHANNELS.ielts;

  const episodes = await fetchLatestPodcastEpisodes(channelKey);

  const ep = episodes[epIndex] || episodes[0] || (channel.episodes && channel.episodes[0]);



  if (!ep || !ep.audioUrl) {

    await sendTelegramMessage(botToken, chatId, "❌ Could not retrieve audio stream. Please try another episode or channel.", {

      inline_keyboard: [[{ text: "📻 Back to Podcasts", callback_data: "tool_podcast" }]]

    });

    return;

  }



  await sendTelegramChatAction(botToken, chatId, "upload_voice");



  const launchUrl = env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/";

  const caption =

`🎧 *${ep.title}*

━━━━━━━━━━━━━━━━━━━━

📻 *Show:* ${ep.show}

⏱️ *Duration:* ~${ep.durationMin} min • 📅 *Date:* ${ep.date}



💡 *Speaking & Listening Drill:*

Shadow the native speaker's phrasing, sentence stress, and natural pauses. Notice C1/C2 collocations in context!



🚀 *Live Speech Recognition:* Open in Studio Web App for real-time speech transcription, WPM pace metrics, and pause analytics.



${formatQuotaFooter(quota)}`;



  const playKeyboard = {

    inline_keyboard: [

      [{ text: "🚀 Open in Studio App (Live Transcribe)", web_app: { url: launchUrl } }],

      [

        { text: `📻 ${channel.name.slice(0, 18)}...`, callback_data: `pod_${channelKey}` },

        { text: "🔄 Switch Channel", callback_data: "tool_podcast" }

      ],

      [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]

    ]

  };



  try {

    const audioRes = await sendTelegramAudio(

      botToken,

      chatId,

      ep.audioUrl,

      ep.title,

      ep.show,

      caption,

      (ep.durationMin || 6) * 60,

      playKeyboard

    );



    if (!audioRes.ok) {

      const fallbackMsg =

`🎧 *${ep.title}*

━━━━━━━━━━━━━━━━━━━━

📻 *Show:* ${ep.show}

⏱️ *Duration:* ~${ep.durationMin} min • 📅 *Date:* ${ep.date}



🔗 *Direct Audio Stream (MP3):*

${ep.audioUrl}



💡 *Audio Immersion:*

Listen via the link above or tap below to open in the Studio App for live transcription.



${formatQuotaFooter(quota)}`;

      await sendTelegramMessage(botToken, chatId, fallbackMsg, playKeyboard);

    }

  } catch (err) {

    console.error("[sendTelegramAudio Error]", err);

    await sendTelegramMessage(botToken, chatId, `🔗 *Audio Stream:* ${ep.audioUrl}\n\n${formatQuotaFooter(quota)}`, playKeyboard);

  }

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
  `📅 *Today's Quota (${getYangonDateStr()} MMT):*\n• Used Today: *${quota.count} / ${quota.limit}*\n• Remaining Today: *${quota.remaining} queries*\n\n⭐ *Upgrade to Lifetime VIP (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint))* for unlimited queries, all 1,162 vocabulary items, 23 CBT reading passages, and 40 writing models!`
}`;

  const buttons = [];
  if (!isVip) {
    buttons.push([{ text: "⭐ Upgrade to Lifetime VIP (97,000 Ks (Lifetime) / 5,000 Ks (Sprint))", callback_data: "info_payment" }]);
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
  const isVip = (await resolveIsVip(env, userId));
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
      error: "Daily free quota limit reached (10/10). Upgrade to Lifetime VIP (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)) for unlimited queries.",
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
      error: "Daily free quota limit reached (10/10). Upgrade to Lifetime VIP (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)) for unlimited queries.",
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
      error: "Daily free quota limit reached (10/10). Upgrade to Lifetime VIP (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)) for unlimited queries.",
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
      error: "Daily free quota limit reached (10/10). Upgrade to Lifetime VIP (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)) for unlimited queries.",
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
      error: "Daily free quota limit reached (10/10). Upgrade to Lifetime VIP (97,000 MMK (Lifetime) / 5,000 MMK (7-Day Sprint)) for unlimited queries.",
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

// ==========================================
// 8. CLOUDFLARE WORKERS AI CHAT ENDPOINT ($0 COST, NO-AUTH, ZERO POPUPS)
// ==========================================
async function handleAiChat(request, env) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("Authorization") || "";
    const signingKey = env.SESSION_SIGNING_KEY || env.BOT_TOKEN || "ips-secret-key-2026";

    let isVip = false;
    let userId = request.headers.get("cf-connecting-ip") || "anon-client";

    if (authHeader.startsWith("Bearer ")) {
      const pl = await verifySessionToken(authHeader.slice(7), signingKey);
      if (pl && pl.tier === "vip") {
        isVip = true;
        userId = String(pl.sub);
      }
    }

    if (body.initData) {
      const tgUser = await verifyTelegramInitData(body.initData, env.BOT_TOKEN);
      if (tgUser && tgUser.id) {
        userId = String(tgUser.id);
        const u = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(tgUser.id).first();
        if (u && u.is_vip === 1) isVip = true;
      }
    }

    // Enforce quota check
    const quota = await checkAndConsumeQuota(env, userId, isVip);
    if (!quota.allowed) {
      return jsonResponse({
        error: "Daily free AI practice quota exceeded (10 queries/day). Upgrade to Lifetime VIP Pass for unlimited practice.",
        quotaExceeded: true
      }, 429);
    }

    const promptText = (body.prompt || body.promptText || "").trim();
    const systemInstruction = body.systemInstruction || "You are an IELTS-style academic practice copilot for IELTS Prep Studio.";
    const maxTokens = Math.min(body.max_tokens || 650, 800);

    const MODEL_MAP = {
      "@cf/meta/llama-3.2-3b-instruct": "@cf/meta/llama-3.2-3b-instruct",
      "llama-3.2-3b": "@cf/meta/llama-3.2-3b-instruct",
      "@cf/meta/llama-3.1-8b-instruct": "@cf/meta/llama-3.1-8b-instruct",
      "llama-3.1-8b": "@cf/meta/llama-3.1-8b-instruct",
      "@cf/mistral/mistral-7b-instruct-v0.2": "@cf/mistral/mistral-7b-instruct-v0.2",
      "mistral-7b": "@cf/mistral/mistral-7b-instruct-v0.2"
    };

    const selectedModel = MODEL_MAP[body.model] || "@cf/meta/llama-3.2-3b-instruct";

    let messages = body.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      messages = [
        { role: "system", content: systemInstruction },
        { role: "user", content: promptText }
      ];
    }

    const aiRes = await env.AI.run(selectedModel, {
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.4
    });

    return jsonResponse({
      reply: aiRes.response || "",
      model: selectedModel,
      isVip: isVip,
      remainingQuota: quota.remaining
    });
  } catch (err) {
    console.error("[AiChat Error]", err);
    return jsonResponse({ error: err.message }, 500);
  }
}






async function generateCustomersCSV(env) {
  const query = `
    SELECT 
      COALESCE(p.id, '-') as payment_id,
      u.telegram_id,
      COALESCE(u.username, p.username, 'NoUsername') as username,
      COALESCE(u.first_name, '') as first_name,
      COALESCE(p.amount_mmk, 97000) as amount_mmk,
      COALESCE(p.currency, 'MMK') as currency,
      COALESCE(p.payment_method, 'slip') as payment_method,
      COALESCE(pc.code, '') as voucher_code,
      CASE WHEN u.vip_activated_at > 0 
           THEN datetime(u.vip_activated_at, 'unixepoch', '+6 hours 30 minutes') 
           ELSE datetime(u.updated_at, 'unixepoch', '+6 hours 30 minutes') 
      END as approved_at_mmt,
      CASE WHEN u.is_vip = 1 THEN 'APPROVED_VIP' ELSE 'FREE' END as status
    FROM users u
    LEFT JOIN (
      SELECT * FROM payments 
      WHERE status = 'approved'
      GROUP BY telegram_id
    ) p ON p.telegram_id = u.telegram_id
    LEFT JOIN (
      SELECT * FROM promo_codes
      WHERE is_used = 1
      GROUP BY used_by_tg_id
    ) pc ON pc.used_by_tg_id = u.telegram_id
    WHERE u.is_vip = 1
    ORDER BY u.vip_activated_at DESC
  `;

  const { results } = await env.DB.prepare(query).all();
  const rows = results || [];

  const headers = [
    "Payment ID",
    "Telegram ID",
    "Username",
    "First Name",
    "Amount",
    "Currency",
    "Payment Method",
    "Voucher Code",
    "Approved Date & Time (MMT)",
    "Status"
  ];

  function escapeCsv(val) {
    if (val === null || val === undefined) return '""';
    let s = String(val);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  }

  const csvLines = [headers.map(escapeCsv).join(",")];

  for (const r of rows) {
    csvLines.push([
      escapeCsv(r.payment_id),
      escapeCsv(r.telegram_id),
      escapeCsv(r.username ? "@" + r.username.replace(/^@/, '') : ''),
      escapeCsv(r.first_name),
      escapeCsv(r.amount_mmk),
      escapeCsv(r.currency),
      escapeCsv(r.payment_method),
      escapeCsv(r.voucher_code),
      escapeCsv(r.approved_at_mmt),
      escapeCsv(r.status)
    ].join(","));
  }

  return { csv: csvLines.join("\r\n"), count: rows.length };
}

async function sendTelegramDocument(botToken, chatId, fileContent, fileName, caption = "", replyMarkup = null) {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  const blob = new Blob(["\uFEFF" + fileContent], { type: "text/csv;charset=utf-8" });
  formData.append("document", blob, fileName);
  if (caption) {
    formData.append("caption", caption);
    formData.append("parse_mode", "Markdown");
  }
  if (replyMarkup) {
    formData.append("reply_markup", JSON.stringify(replyMarkup));
  }
  return fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: "POST",
    body: formData
  });
}






async function handleTelegramBotRedeem(chatId, userId, from, code, env, botToken) {

  const cleanCode = (code || "").trim().toUpperCase();

  const codeHash = await sha256Hex(cleanCode);

  const nowMs = Date.now();

  const bonusMs = 7 * 24 * 60 * 60 * 1000;



  let isSprint = cleanCode.includes("SPRINT");

  let promo = await env.DB.prepare("SELECT * FROM promo_codes WHERE code = ?").bind(cleanCode).first();

  let voucher = await env.DB.prepare("SELECT * FROM vouchers WHERE code_hash = ?").bind(codeHash).first();



  if (promo && promo.is_used === 1 && promo.used_by_tg_id !== userId) {

    await sendTelegramMessage(botToken, chatId, "❌ *This voucher code has already been redeemed.*\n\nPlease contact @hyuguo if you need help with your pass.");

    return;

  }



  if (!promo && !voucher) {

    await sendTelegramMessage(botToken, chatId, `❌ *Invalid code:* \`${cleanCode}\`\n\nPlease verify your code or contact @hyuguo.`);

    return;

  }



  if (promo && promo.plan_type === "sprint") isSprint = true;

  if (voucher && voucher.tier === "sprint") isSprint = true;



  const vipExpiresAt = isSprint ? (nowMs + bonusMs) : 0;

  const fullName = (from.first_name || "") + (from.last_name ? " " + from.last_name : "");



  if (isSprint) {

    await env.DB.prepare(`

      INSERT INTO users (telegram_id, username, first_name, is_vip, vip_activated_at, vip_expires_at, updated_at)

      VALUES (?, ?, ?, 1, unixepoch(), ?, unixepoch())

      ON CONFLICT(telegram_id) DO UPDATE SET

        is_vip = 1,

        vip_activated_at = COALESCE(vip_activated_at, unixepoch()),

        vip_expires_at = CASE WHEN vip_expires_at > ? THEN vip_expires_at + ? ELSE ? + ? END,

        updated_at = unixepoch()

    `).bind(userId, from.username || "", fullName, nowMs + bonusMs, nowMs, bonusMs, nowMs, bonusMs).run();

  } else {

    await env.DB.prepare(`

      INSERT INTO users (telegram_id, username, first_name, is_vip, vip_activated_at, vip_expires_at, updated_at)

      VALUES (?, ?, ?, 1, unixepoch(), 0, unixepoch())

      ON CONFLICT(telegram_id) DO UPDATE SET

        is_vip = 1,

        vip_activated_at = COALESCE(vip_activated_at, unixepoch()),

        vip_expires_at = 0,

        updated_at = unixepoch()

    `).bind(userId, from.username || "", fullName).run();

  }



  if (promo) {

    try {

      await env.DB.prepare("UPDATE promo_codes SET is_used = 1, used_by_tg_id = ?, used_at = unixepoch() WHERE code = ?").bind(userId, cleanCode).run();

    } catch (e) {}

  }



  const launchUrl = env.STUDIO_WEB_URL || "https://ielts-prep-studio-olive.vercel.app/";

  const expiryDateStr = isSprint ? new Date(nowMs + bonusMs).toLocaleDateString("en-GB", { timeZone: "Asia/Yangon" }) : "Never (Lifetime)";



  const successMsg = isSprint ?

`🎉 *7-DAY SPRINT VIP PASS ACTIVATED!*

━━━━━━━━━━━━━━━━━━━━

Code \`${cleanCode}\` successfully applied to your account!



⚡ *Sprint Access:* Active for 7 full days

📅 *Valid Until:* ${expiryDateStr} MMT

✨ *Unlocked Features:*

• All 23 Cambridge Reading CBT Passages

• All 40 Band 9 Writing Models + Evaluator

• 1,162 Academic Lexicon Items & SRS Traps

• Unlimited AI Academic Tools & Speaking Drills



Tap below to start your 7-day preparation sprint:`

:

`👑 *LIFETIME VIP PASS ACTIVATED!*

━━━━━━━━━━━━━━━━━━━━

Code \`${cleanCode}\` successfully applied to your account!



✨ *Access:* Permanent Lifetime (Never Expires)

All Cambridge CBTs, Writing Models, 1,162 Vocabulary items, and Unlimited Academic AI Tools are unlocked forever!



Tap below to launch the studio:`;



  await sendTelegramMessage(botToken, chatId, successMsg, {

    inline_keyboard: [

      [{ text: "🚀 Launch IELTS Prep Studio", web_app: { url: launchUrl } }],

      [{ text: "⚡ VIP Academic Menu", callback_data: "menu_tools" }]

    ]

  });

}

// Telegram Avatar Proxy & Monogram SVG Generator
async function handleTelegramAvatar(request, env) {
  const url = new URL(request.url);
  const rawId = url.searchParams.get("userId") || 
                url.searchParams.get("user_id") || 
                url.searchParams.get("id") || 
                url.searchParams.get("uid");
  const name = url.searchParams.get("name") || url.searchParams.get("first_name") || "Scholar";
  const initial = (name.trim()[0] || "S").toUpperCase();

  // Helper for generating vector monogram SVG avatar
  const makeMonogramSvg = (letter) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#avatarGrad)"/>
  <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="44" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${letter}</text>
</svg>`.trim();

  const svgResponse = (letter) => new Response(makeMonogramSvg(letter), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Vary": "Accept-Encoding"
    }
  });

  if (!rawId) {
    return svgResponse(initial);
  }

  const userId = String(rawId).replace(/[^0-9]/g, '');
  if (!userId) {
    return svgResponse(initial);
  }

  const botToken = env.BOT_TOKEN;
  if (!botToken) {
    return svgResponse(initial);
  }

  try {
    // 1. Fetch user profile photos metadata
    const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${userId}&limit=1`, {
      cf: { cacheTtl: 3600, cacheEverything: true }
    });

    if (!photosRes.ok) {
      return svgResponse(initial);
    }

    const photosData = await photosRes.json();
    if (!photosData.ok || !photosData.result || !photosData.result.photos || photosData.result.photos.length === 0) {
      return svgResponse(initial);
    }

    const photoSizes = photosData.result.photos[0];
    if (!photoSizes || photoSizes.length === 0) {
      return svgResponse(initial);
    }

    // Pick ~320px width or largest available
    const targetPhoto = photoSizes.find(p => p.width >= 320) || photoSizes[photoSizes.length - 1];
    if (!targetPhoto || !targetPhoto.file_id) {
      return svgResponse(initial);
    }

    // 2. Fetch file path from Telegram
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(targetPhoto.file_id)}`, {
      cf: { cacheTtl: 3600, cacheEverything: true }
    });

    if (!fileRes.ok) {
      return svgResponse(initial);
    }

    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result || !fileData.result.file_path) {
      return svgResponse(initial);
    }

    // 3. Determine correct MIME
    const filePath = fileData.result.file_path;
    const ext = filePath.includes('.') ? filePath.toLowerCase().split('.').pop() : 'jpg';
    const mimeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp'
    };
    const contentType = mimeMap[ext] || 'image/jpeg';

    // 4. Fetch actual binary image from Telegram File API
    const imageRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`, {
      cf: { cacheTtl: 86400, cacheEverything: true }
    });

    if (!imageRes.ok) {
      return svgResponse(initial);
    }

    return new Response(imageRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
        "ETag": `"${targetPhoto.file_unique_id || targetPhoto.file_id}"`,
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (err) {
    console.error("[Telegram Avatar Proxy Error]", err);
    return svgResponse(initial);
  }
}
