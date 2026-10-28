import re

with open("backend/worker.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Patch handleSyncState promo code check
target1 = """    if (!isVip) {
      try {
        const pRow = await env.DB.prepare("SELECT plan_type FROM promo_codes WHERE code = ?").bind(cleanVoucher).first();
        if (pRow) isVip = true;
      } catch (e) {}
    }"""

replace1 = """    if (!isVip && telegramId) {
      try {
        const pRow = await env.DB.prepare("SELECT plan_type FROM promo_codes WHERE code = ? AND is_used = 1 AND used_by_tg_id = ?").bind(cleanVoucher, telegramId).first();
        if (pRow) isVip = true;
      } catch (e) {}
    }"""

# 2. Patch /api/redeem-code
target2 = """  // Backward-compat check in promo_codes table
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
  }"""

replace2 = """  // Backward-compat check in promo_codes table (Strict one-time redemption check)
  let legacyPromo = null;
  if (!voucher) {
    legacyPromo = await env.DB.prepare("SELECT * FROM promo_codes WHERE code = ?").bind(cleanCode).first();
    if (legacyPromo) {
      if (legacyPromo.is_used === 1) {
        return jsonResponse({ success: false, error: "This one-time voucher code has already been redeemed." }, 400);
      }
      if (legacyPromo.plan_type === "sprint") isSprint = true;
      const expAt = isSprint ? (nowMs + bonusMs) : 0;
      await env.DB.prepare("INSERT OR IGNORE INTO vouchers (code_hash, tier, max_devices, revoked, created_at, expires_at) VALUES (?, ?, 3, 0, unixepoch(), ?)").bind(codeHash, isSprint ? "sprint" : "vip", expAt).run();
      voucher = { code_hash: codeHash, tier: isSprint ? "sprint" : "vip", max_devices: 3, revoked: 0, expires_at: expAt };
    }
  }

  if (!voucher || voucher.revoked === 1) {
    return jsonResponse({ success: false, error: "Invalid, expired, or revoked voucher code." }, 400);
  }

  // Prevent multiple distinct telegram accounts from claiming the same voucher
  if (voucher.telegram_id && telegramId && voucher.telegram_id !== telegramId) {
    return jsonResponse({ success: false, error: "This one-time voucher has already been claimed by another account." }, 403);
  }"""

# 3. Patch /api/radar/feed
target3 = """      if (!isVip) {
        try {
          const pRow = await env.DB.prepare(
            "SELECT plan_type FROM promo_codes WHERE code = ?"
          ).bind(cleanCode).first();
          if (pRow) isVip = true;
        } catch (e) {}
      }"""

replace3 = """      if (!isVip && userId) {
        try {
          const pRow = await env.DB.prepare(
            "SELECT plan_type FROM promo_codes WHERE code = ? AND is_used = 1 AND used_by_tg_id = ?"
          ).bind(cleanCode, userId).first();
          if (pRow) isVip = true;
        } catch (e) {}
      }"""

# Normalize CRLF for matching
target1_crlf = target1.replace("\n", "\r\n")
replace1_crlf = replace1.replace("\n", "\r\n")
target2_crlf = target2.replace("\n", "\r\n")
replace2_crlf = replace2.replace("\n", "\r\n")
target3_crlf = target3.replace("\n", "\r\n")
replace3_crlf = replace3.replace("\n", "\r\n")

if target1_crlf in content:
    content = content.replace(target1_crlf, replace1_crlf)
    print("Patched target 1")
elif target1 in content:
    content = content.replace(target1, replace1)
    print("Patched target 1 (LF)")
else:
    print("FAILED target 1")

if target2_crlf in content:
    content = content.replace(target2_crlf, replace2_crlf)
    print("Patched target 2")
elif target2 in content:
    content = content.replace(target2, replace2)
    print("Patched target 2 (LF)")
else:
    print("FAILED target 2")

if target3_crlf in content:
    content = content.replace(target3_crlf, replace3_crlf)
    print("Patched target 3")
elif target3 in content:
    content = content.replace(target3, replace3)
    print("Patched target 3 (LF)")
else:
    print("FAILED target 3")

with open("backend/worker.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Done updating backend/worker.js")
