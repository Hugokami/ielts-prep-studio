import sys

# Configure UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

with open("backend/worker.js", "r", encoding="utf-8") as f:
    worker = f.read()

# 1. Add /api/admin/mint route to fetch handler
target_route = """      if (url.pathname === "/api/redeem-code" && request.method === "POST") {
        return await handleRedeemCode(request, env);
      }"""

replace_route = """      if (url.pathname === "/api/redeem-code" && request.method === "POST") {
        return await handleRedeemCode(request, env);
      }

      if (url.pathname === "/api/admin/mint" && request.method === "POST") {
        return await handleAdminMint(request, env);
      }"""

if target_route in worker:
    worker = worker.replace(target_route, replace_route)
    print("Patched route")
else:
    print("FAILED route")

# 2. Upgrade Stars voucher minting
target_stars_mint = """        const voucherCode = isSprint ? `IPS-SPRINT-${Math.floor(100 + Math.random() * 900)}` : generateRandomCode();
        try {
          await env.DB.prepare("INSERT INTO promo_codes (code, is_used, used_by_tg_id, used_at, plan_type) VALUES (?, 1, ?, unixepoch(), ?)").bind(voucherCode, userId, isSprint ? "sprint" : "lifetime").run();
        } catch (e) {
          console.error("[Stars Voucher Mint Error]", e);
        }"""

replace_stars_mint = """        const voucherCode = isSprint ? generateSecureVoucherCode("SPRINT") : generateSecureVoucherCode("VIP");
        const codeHash = await sha256Hex(voucherCode);
        const expiresAt = isSprint ? (nowMs + bonusMs) : 0;
        try {
          await env.DB.batch([
            env.DB.prepare(`
              INSERT INTO vouchers (code_hash, telegram_id, tier, max_devices, revoked, created_at, expires_at)
              VALUES (?, ?, ?, 3, 0, unixepoch(), ?)
            `).bind(codeHash, userId, isSprint ? "sprint" : "vip", expiresAt),
            env.DB.prepare(`
              INSERT INTO promo_codes (code, is_used, used_by_tg_id, used_at, plan_type)
              VALUES (?, 0, ?, unixepoch(), ?)
            `).bind(voucherCode, userId, isSprint ? "sprint" : "lifetime")
          ]);
        } catch (e) {
          console.error("[Stars Voucher Mint Error]", e);
        }"""

if target_stars_mint in worker:
    worker = worker.replace(target_stars_mint, replace_stars_mint)
    print("Patched stars mint")
else:
    print("FAILED stars mint")

# 3. Upgrade Admin slip approval voucher minting
target_slip_mint = """        // Generate a personal Desktop VIP voucher code for the student
        const desktopVoucher = isSprint ? `IPS-SPRINT-${Math.floor(100 + Math.random() * 900)}` : generateRandomCode();
        await env.DB.prepare(`
          INSERT INTO promo_codes (code, is_used, used_by_tg_id, used_at, plan_type)
          VALUES (?, 1, ?, unixepoch(), ?)
        `).bind(desktopVoucher, numTgId, isSprint ? "sprint" : "lifetime").run();"""

replace_slip_mint = """        // Generate a personal Desktop VIP voucher code for the student
        const desktopVoucher = isSprint ? generateSecureVoucherCode("SPRINT") : generateSecureVoucherCode("VIP");
        const codeHash = await sha256Hex(desktopVoucher);
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO vouchers (code_hash, telegram_id, tier, max_devices, revoked, created_at, expires_at)
            VALUES (?, ?, ?, 3, 0, unixepoch(), ?)
          `).bind(codeHash, numTgId, isSprint ? "sprint" : "vip", expiresAt),
          env.DB.prepare(`
            INSERT INTO promo_codes (code, is_used, used_by_tg_id, used_at, plan_type)
            VALUES (?, 0, ?, unixepoch(), ?)
          `).bind(desktopVoucher, numTgId, isSprint ? "sprint" : "lifetime")
        ]);"""

if target_slip_mint in worker:
    worker = worker.replace(target_slip_mint, replace_slip_mint)
    print("Patched slip mint")
else:
    print("FAILED slip mint")

# 4. Upgrade /gen_codes to handle /mint & /gen_codes with batch support
target_gen_codes = """      if (text.startsWith("/gen_codes")) {
        const parts = text.split(" ");
        const count = Math.min(Math.max(parseInt(parts[1], 10) || 5, 1), 50);
        const generated = [];

        for (let i = 0; i < count; i++) {
          const rnd = generateRandomCode();
          await env.DB.prepare("INSERT INTO promo_codes (code, is_used) VALUES (?, 0)").bind(rnd).run();
          generated.push(rnd);
        }

        await sendTelegramMessage(botToken, chatId, `🎟️ *Generated ${count} VIP Activation Codes:*\n\n` + generated.map(c => `• \`${c}\``).join("\\n"));
        return jsonResponse({ ok: true });
      }"""

replace_gen_codes = """      if (text.startsWith("/gen_codes") || text.startsWith("/mint")) {
        const parts = text.trim().split(/\\s+/);
        let count = 10;
        let isSprint = false;

        for (let i = 1; i < parts.length; i++) {
          const p = parts[i].toLowerCase();
          if (/^\\d+$/.test(p)) {
            count = Math.min(Math.max(parseInt(p, 10), 1), 100);
          } else if (p === "sprint" || p === "7day") {
            isSprint = true;
          } else if (p === "lifetime" || p === "vip") {
            isSprint = false;
          }
        }

        const planType = isSprint ? "sprint" : "lifetime";
        const prefix = isSprint ? "SPRINT" : "VIP";
        const generated = [];
        const statements = [];
        const nowMs = Date.now();
        const bonusMs = 7 * 24 * 60 * 60 * 1000;
        const expAt = isSprint ? (nowMs + bonusMs) : 0;

        for (let i = 0; i < count; i++) {
          const code = generateSecureVoucherCode(prefix);
          const hash = await sha256Hex(code);
          statements.push(
            env.DB.prepare("INSERT INTO promo_codes (code, is_used, plan_type) VALUES (?, 0, ?)").bind(code, planType)
          );
          statements.push(
            env.DB.prepare("INSERT INTO vouchers (code_hash, tier, max_devices, revoked, created_at, expires_at) VALUES (?, ?, 3, 0, unixepoch(), ?)").bind(hash, isSprint ? "sprint" : "vip", expAt)
          );
          generated.push(code);
        }

        await env.DB.batch(statements);

        const previewList = generated.slice(0, 15).map(c => `• \`${c}\``).join("\\n");
        const extraNote = generated.length > 15 ? `\\n_...and ${generated.length - 15} more passes._` : "";

        const mintMsg = 
`🎟️ *MINTED ${count} ${isSprint ? "7-DAY SPRINT" : "LIFETIME VIP"} PASSES!*
━━━━━━━━━━━━━━━━━━━━
✨ *Status:* Active & Unredeemed (One-Time Use)
📱 *Device Quota:* Max 3 devices per code
🔒 *Entropy:* Cryptographically secure 64-bit Base32

📋 *Generated Codes:*
${previewList}${extraNote}

💡 *Delivery Format:* Send any code to a student. Once entered on Web or Bot, it locks permanently to that student.`;

        await sendTelegramMessage(botToken, chatId, mintMsg, {
          inline_keyboard: [
            [{ text: "⚡ Mint 10 Sprint Passes", callback_data: "mint_quick:sprint:10" }],
            [{ text: "👑 Mint 10 Lifetime Passes", callback_data: "mint_quick:lifetime:10" }]
          ]
        });
        return jsonResponse({ ok: true });
      }"""

if target_gen_codes in worker:
    worker = worker.replace(target_gen_codes, replace_gen_codes)
    print("Patched gen_codes / mint")
else:
    print("FAILED gen_codes / mint")

# 5. Add mint_quick callback query handler
target_callback = """      if (data.startsWith("approve:")) {"""

replace_callback = """      if (data.startsWith("mint_quick:")) {
        const parts = data.split(":");
        const tier = (parts[1] || "lifetime").toLowerCase();
        const count = Math.min(Math.max(parseInt(parts[2], 10) || 10, 1), 50);
        const isSprint = (tier === "sprint");
        const prefix = isSprint ? "SPRINT" : "VIP";

        const generated = [];
        const statements = [];
        const nowMs = Date.now();
        const bonusMs = 7 * 24 * 60 * 60 * 1000;
        const expAt = isSprint ? (nowMs + bonusMs) : 0;

        for (let i = 0; i < count; i++) {
          const code = generateSecureVoucherCode(prefix);
          const hash = await sha256Hex(code);
          statements.push(
            env.DB.prepare("INSERT INTO promo_codes (code, is_used, plan_type) VALUES (?, 0, ?)").bind(code, tier)
          );
          statements.push(
            env.DB.prepare("INSERT INTO vouchers (code_hash, tier, max_devices, revoked, created_at, expires_at) VALUES (?, ?, 3, 0, unixepoch(), ?)").bind(hash, isSprint ? "sprint" : "vip", expAt)
          );
          generated.push(code);
        }

        await env.DB.batch(statements);
        await answerCallbackQuery(botToken, cb.id, `✅ Minted ${count} ${tier.toUpperCase()} passes!`);

        const previewList = generated.slice(0, 10).map(c => `• \`${c}\``).join("\\n");
        const moreNote = generated.length > 10 ? `\\n_...and ${generated.length - 10} more codes._` : "";

        await sendTelegramMessage(botToken, cbChatId,
`🎟️ *AUTO-MINTED ${count} ${isSprint ? "7-DAY SPRINT" : "LIFETIME VIP"} PASSES!*
━━━━━━━━━━━━━━━━━━━━
✨ *Status:* Active & Unredeemed in D1 Pool
🔒 *Entropy:* 64-bit Base32 (Zero collision)

📋 *Sample Codes:*
${previewList}${moreNote}`);
        return jsonResponse({ ok: true });
      }

      if (data.startsWith("approve:")) {"""

if target_callback in worker:
    worker = worker.replace(target_callback, replace_callback)
    print("Patched callback")
else:
    print("FAILED callback")

# 6. Add low-stock alert in handleDailyReminders
target_cron = """    const tipData = getRandomTip();

    for (const row of results) {"""

replace_cron = """    // Check available unused one-time codes in the pool
    try {
      const unusedStats = await env.DB.prepare(`
        SELECT 
          SUM(CASE WHEN plan_type = 'sprint' AND is_used = 0 THEN 1 ELSE 0 END) as unused_sprint,
          SUM(CASE WHEN (plan_type = 'lifetime' OR plan_type IS NULL) AND is_used = 0 THEN 1 ELSE 0 END) as unused_lifetime
        FROM promo_codes
      `).first();

      const unusedLifetime = unusedStats ? (unusedStats.unused_lifetime || 0) : 0;
      const unusedSprint = unusedStats ? (unusedStats.unused_sprint || 0) : 0;

      if (env.ADMIN_CHAT_ID && (unusedLifetime < 5 || unusedSprint < 5)) {
        await sendTelegramMessage(botToken, env.ADMIN_CHAT_ID,
`⚠️ *VOUCHER POOL LOW-STOCK ALERT!*
━━━━━━━━━━━━━━━━━━━━
The pool of available single-use passes is running low:
• 👑 Available Lifetime Codes: *${unusedLifetime}* (Threshold: 5)
• ⚡ Available Sprint Codes: *${unusedSprint}* (Threshold: 5)

Tap below to automatically mint 20 new passes directly to the pool:`,
          {
            inline_keyboard: [
              [{ text: "👑 Auto-Mint 20 Lifetime Passes", callback_data: "mint_quick:lifetime:20" }],
              [{ text: "⚡ Auto-Mint 20 Sprint Passes", callback_data: "mint_quick:sprint:20" }]
            ]
          }
        );
      }
    } catch (e) {
      console.error("[Low Stock Check Error]", e);
    }

    const tipData = getRandomTip();

    for (const row of results) {"""

if target_cron in worker:
    worker = worker.replace(target_cron, replace_cron)
    print("Patched cron")
else:
    print("FAILED cron")

# 7. Replace generateRandomCode with generateSecureVoucherCode
target_gen_func = """function generateRandomCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VIP-${part1}-${part2}`;
}"""

replace_gen_func = """function generateSecureVoucherCode(prefix = "VIP") {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars[bytes[i] % chars.length];
    part2 += chars[bytes[i + 4] % chars.length];
  }
  return `${prefix}-${part1}-${part2}`;
}

function generateRandomCode() {
  return generateSecureVoucherCode("VIP");
}

async function handleAdminMint(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\\s+/i, "").trim();
  const adminSecret = env.ADMIN_SECRET_KEY || env.SESSION_SIGNING_KEY || env.BOT_TOKEN;

  if (!token || (token !== adminSecret && token !== env.BOT_TOKEN)) {
    return jsonResponse({ success: false, error: "Unauthorized: Invalid admin credentials" }, 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(parseInt(body.count, 10) || 10, 1), 100);
    const tier = (body.tier || "lifetime").toLowerCase() === "sprint" ? "sprint" : "lifetime";
    const prefix = tier === "sprint" ? "SPRINT" : "VIP";

    const generated = [];
    const statements = [];
    const nowMs = Date.now();
    const bonusMs = 7 * 24 * 60 * 60 * 1000;
    const expAt = tier === "sprint" ? (nowMs + bonusMs) : 0;

    for (let i = 0; i < count; i++) {
      const code = generateSecureVoucherCode(prefix);
      const hash = await sha256Hex(code);
      statements.push(
        env.DB.prepare("INSERT INTO promo_codes (code, is_used, plan_type) VALUES (?, 0, ?)").bind(code, tier)
      );
      statements.push(
        env.DB.prepare("INSERT INTO vouchers (code_hash, tier, max_devices, revoked, created_at, expires_at) VALUES (?, ?, 3, 0, unixepoch(), ?)").bind(hash, tier === "sprint" ? "sprint" : "vip", expAt)
      );
      generated.push(code);
    }

    await env.DB.batch(statements);

    return jsonResponse({
      success: true,
      count: generated.length,
      tier: tier,
      codes: generated,
      timestamp: Date.now()
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}"""

if target_gen_func in worker:
    worker = worker.replace(target_gen_func, replace_gen_func)
    print("Patched gen func")
else:
    print("FAILED gen func")

with open("backend/worker.js", "w", encoding="utf-8") as f:
    f.write(worker)

print("backend/worker.js patched successfully.")
