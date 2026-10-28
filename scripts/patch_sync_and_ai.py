import os
import sys

def patch():
    path = r'c:\Users\lyan1\Documents\antigravity\ielts-prep-studio\backend\worker.js'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update handleSync telegramId parsing and binding
    old_sync_tg = '''  } else if (bodyTgId && typeof bodyTgId === "number") {
    telegramId = bodyTgId;
  }'''
    new_sync_tg = '''  } else if (bodyTgId) {
    telegramId = parseInt(bodyTgId, 10) || bodyTgId;
  }'''
    if old_sync_tg in content:
        content = content.replace(old_sync_tg, new_sync_tg, 1)
        print("SUCCESS: Patched handleSync telegramId parsing")
    else:
        print("WARNING: old_sync_tg not found")

    old_sync_query = 'userRow = await env.DB.prepare("SELECT is_vip, vip_expires_at, progress_json FROM users WHERE telegram_id = ?").bind(telegramId).first();'
    new_sync_query = 'userRow = await env.DB.prepare("SELECT is_vip, vip_expires_at, progress_json FROM users WHERE telegram_id = ? OR telegram_id = CAST(? AS INTEGER)").bind(telegramId, telegramId).first();'
    if old_sync_query in content:
        content = content.replace(old_sync_query, new_sync_query, 1)
        print("SUCCESS: Patched handleSync user query binding")
    else:
        print("WARNING: old_sync_query not found")

    # Add voucher verification in handleSync if not telegram VIP
    old_sync_vch = '''  const cleanVoucher = voucher ? String(voucher).trim().toUpperCase() : "";'''
    new_sync_vch = '''  const cleanVoucher = voucher ? String(voucher).trim().toUpperCase() : "";

  // Multi-source voucher verification if not already VIP
  if (!isVip && cleanVoucher) {
    const codeHash = await sha256Hex(cleanVoucher);
    try {
      const vRow = await env.DB.prepare("SELECT tier, revoked, expires_at FROM vouchers WHERE code_hash = ?").bind(codeHash).first();
      if (vRow && vRow.revoked !== 1 && (!vRow.expires_at || vRow.expires_at === 0 || vRow.expires_at > Date.now())) {
        isVip = true;
        if (vRow.expires_at) vipExpiresAt = vRow.expires_at;
      }
    } catch (e) {}
    if (!isVip) {
      try {
        const pRow = await env.DB.prepare("SELECT plan_type FROM promo_codes WHERE code = ?").bind(cleanVoucher).first();
        if (pRow) isVip = true;
      } catch (e) {}
    }
  }'''
    if old_sync_vch in content:
        content = content.replace(old_sync_vch, new_sync_vch, 1)
        print("SUCCESS: Patched handleSync voucher verification")
    else:
        print("WARNING: old_sync_vch not found")

    # 2. Update handleAiChat VIP verification
    old_ai_block = '''    if (body.initData) {
      const tgUser = await verifyTelegramInitData(body.initData, env.BOT_TOKEN);
      if (tgUser && tgUser.id) {
        userId = String(tgUser.id);
        const u = await env.DB.prepare("SELECT is_vip FROM users WHERE telegram_id = ?").bind(tgUser.id).first();
        if (u && u.is_vip === 1) isVip = true;
      }
    }'''

    new_ai_block = '''    if (body.initData) {
      const tgUser = await verifyTelegramInitData(body.initData, env.BOT_TOKEN);
      if (tgUser && tgUser.id) {
        userId = String(tgUser.id);
        const u = await env.DB.prepare("SELECT is_vip, vip_expires_at FROM users WHERE telegram_id = ? OR telegram_id = CAST(? AS INTEGER)").bind(tgUser.id, tgUser.id).first();
        if (u && (u.is_vip === 1 || (u.vip_expires_at && u.vip_expires_at > Date.now()))) isVip = true;
      }
    } else if (body.telegramId || body.userId) {
      const uId = body.telegramId || body.userId;
      const u = await env.DB.prepare("SELECT is_vip, vip_expires_at FROM users WHERE telegram_id = ? OR telegram_id = CAST(? AS INTEGER)").bind(uId, uId).first();
      if (u && (u.is_vip === 1 || (u.vip_expires_at && u.vip_expires_at > Date.now()))) {
        isVip = true;
        userId = String(uId);
      }
    }

    if (!isVip && body.voucher) {
      isVip = await resolveIsVip(env, userId, body.voucher);
    }
    if (userId && String(userId) === String(env.ADMIN_TG_ID || "7468650530")) {
      isVip = true;
    }'''

    if old_ai_block in content:
        content = content.replace(old_ai_block, new_ai_block, 1)
        print("SUCCESS: Patched handleAiChat VIP verification")
    else:
        print("WARNING: old_ai_block not found")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("ALL PATCHES APPLIED TO worker.js")

if __name__ == '__main__':
    patch()
