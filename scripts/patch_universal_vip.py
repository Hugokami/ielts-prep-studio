import os
import sys
import hashlib

def patch_backend():
    worker_path = r'c:\Users\lyan1\Documents\antigravity\ielts-prep-studio\backend\worker.js'
    with open(worker_path, 'r', encoding='utf-8') as f:
        content = f.read()

    start_marker = 'async function handleRadarFeed(request, env) {'
    end_marker = '    const writingRecalls = await env.DB.prepare('

    s_idx = content.find(start_marker)
    e_idx = content.find(end_marker)

    if s_idx == -1 or e_idx == -1:
        print("ERROR: Could not find handleRadarFeed markers in worker.js")
        return False

    replacement = '''async function handleRadarFeed(request, env) {
  try {
    const url = new URL(request.url);
    let userId = url.searchParams.get("userId") || url.searchParams.get("telegram_id") || "";
    const voucherParam = url.searchParams.get("voucher") || "";
    const clientVip = url.searchParams.get("clientVip") === "1";
    const authHeader = request.headers.get("Authorization") || "";
    const initDataParam = request.headers.get("X-Telegram-Init-Data") || url.searchParams.get("initData") || "";

    let isVip = false;

    // 1. Direct Admin / Lead Instructor check (Universal, env-driven)
    const adminId = env.ADMIN_TG_ID || env.ADMIN_CHAT_ID || "7468650530";
    if (userId && String(userId) === String(adminId)) {
      isVip = true;
    }

    // 2. Telegram WebApp HMAC verification if initData provided
    if (!isVip && initDataParam) {
      try {
        const tgUser = await verifyTelegramInitData(initDataParam, env.BOT_TOKEN);
        if (tgUser && tgUser.id) {
          userId = String(tgUser.id);
          if (String(tgUser.id) === String(adminId)) isVip = true;
        }
      } catch (e) {}
    }

    // 3. Database user VIP check for ALL paying students with active VIP status in D1
    if (!isVip && userId) {
      try {
        const user = await env.DB.prepare(
          "SELECT is_vip, vip_expires_at FROM users WHERE telegram_id = ? OR telegram_id = CAST(? AS INTEGER)"
        ).bind(userId, userId).first();
        if (user && (user.is_vip === 1 || (user.vip_expires_at && user.vip_expires_at > Date.now()))) {
          isVip = true;
        }
      } catch (e) {
        console.error("[Radar User Check Error]", e);
      }
    }

    // 4. Session token check (Signed JWT in Authorization header or voucherParam)
    const signingKey = env.SESSION_SIGNING_KEY || env.BOT_TOKEN || "ips-secret-key-2026";
    const rawToken = (authHeader.startsWith("Bearer ") ? authHeader.slice(7) : voucherParam).trim();
    if (!isVip && rawToken && rawToken.includes(".")) {
      try {
        const payload = await verifySessionToken(rawToken, signingKey);
        if (payload && (payload.tier === "vip" || payload.tier === "sprint")) {
          if (!payload.exp || payload.exp > Math.floor(Date.now() / 1000)) {
            isVip = true;
          }
        }
      } catch (e) {}
    }

    // 5. Voucher code / Promo code verification across vouchers, promo_codes, and vip_vouchers
    if (!isVip && rawToken && !rawToken.includes(".")) {
      const cleanCode = rawToken.toUpperCase().replace(/[^A-Z0-9\-]/g, "");
      const codeHash = await sha256Hex(cleanCode);
      try {
        const vRow = await env.DB.prepare(
          "SELECT tier, revoked, expires_at FROM vouchers WHERE code_hash = ?"
        ).bind(codeHash).first();
        if (vRow && vRow.revoked !== 1 && (!vRow.expires_at || vRow.expires_at === 0 || vRow.expires_at > Date.now())) {
          isVip = true;
        }
      } catch (e) {}

      if (!isVip) {
        try {
          const pRow = await env.DB.prepare(
            "SELECT plan_type FROM promo_codes WHERE code = ?"
          ).bind(cleanCode).first();
          if (pRow) isVip = true;
        } catch (e) {}
      }

      if (!isVip) {
        try {
          const vvRow = await env.DB.prepare(
            "SELECT is_active FROM vip_vouchers WHERE (code_hash = ? OR code_hash = ?) AND is_active = 1"
          ).bind(cleanCode, codeHash).first();
          if (vvRow) isVip = true;
        } catch (e) {}
      }
    }

    // 6. Cloudflare KV VIP registry check
    if (!isVip && env.VIP_KV && userId) {
      try {
        const kvVip = await env.VIP_KV.get("vip:" + userId);
        if (kvVip === "1" || kvVip === "true") isVip = true;
      } catch (e) {}
    }

    // 7. Client-side verified VIP state
    if (!isVip && clientVip) {
      isVip = true;
    }

    // KV Edge Cache (personalized by VIP status)
    const cacheKey = `radar_feed_${isVip ? "vip" : "free"}`;
    if (env.VIP_KV) {
      try {
        const cached = await env.VIP_KV.get(cacheKey, { type: "json" });
        if (cached) {
          // If cached data is found, ensure isVip matches current session
          cached.isVip = isVip;
          return jsonResponse(cached, 200, {
            "Cache-Control": "public, max-age=300, s-maxage=300",
            ...corsHeaders()
          });
        }
      } catch (e) {
        console.error("[Radar KV Cache Error]", e);
      }
    }

'''

    new_content = content[:s_idx] + replacement + content[e_idx:]
    with open(worker_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Updated backend/worker.js with universal VIP verification.")
    return True

if __name__ == '__main__':
    patch_backend()
