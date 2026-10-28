import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

with open('backend/worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_handle_sync = """async function handleSync(request, env) {
  const body = await request.json();
  const authHeader = request.headers.get("Authorization") || "";
  const { initData, progress, srsDueCount } = body || {};

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
  }

  // Persist progress if telegramId is authenticated (NEVER trust client self-tier)
  const progressJson = progress ? JSON.stringify(progress) : "{}";
  const dueCount = typeof srsDueCount === "number" ? srsDueCount : 0;
  if (telegramId) {
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
    savedProgress: userRow && userRow.progress_json ? JSON.parse(userRow.progress_json) : null,
    vipData: vipData
  });
}"""

new_handle_sync = """async function handleSync(request, env) {
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
}"""

if old_handle_sync in content:
    content = content.replace(old_handle_sync, new_handle_sync)
    with open('backend/worker.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Successfully replaced handleSync in backend/worker.js")
else:
    print("❌ Could not find exact old_handle_sync block")
    sys.exit(1)
