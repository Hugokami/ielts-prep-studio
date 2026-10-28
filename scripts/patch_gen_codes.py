import sys

with open('backend/worker.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = """      if (text.startsWith("/gen_codes")) {
        const parts = text.split(" ");
        const count = Math.min(Math.max(parseInt(parts[1], 10) || 5, 1), 50);
        const generated = [];

        for (let i = 0; i < count; i++) {
          const rnd = generateRandomCode();
          await env.DB.prepare("INSERT INTO promo_codes (code, is_used) VALUES (?, 0)").bind(rnd).run();
          generated.push(rnd);
        }

        await sendTelegramMessage(botToken, chatId, `🎟️ *Generated ${count} VIP Activation Codes:*\\n\\n` + generated.map(c => `• \\`${c}\\``).join("\\n"));
        return jsonResponse({ ok: true });
      }"""

# Try reading directly from the file to find exact target
lines = text.splitlines(keepends=True)
start_idx = -1
end_idx = -1
for i, l in enumerate(lines):
    if 'if (text.startsWith("/gen_codes")) {' in l:
        start_idx = i
    if start_idx != -1 and 'return jsonResponse({ ok: true });' in l and i > start_idx:
        end_idx = i + 1 # include closing brace
        break

if start_idx != -1 and end_idx != -1:
    print(f"Found target block at lines {start_idx+1} to {end_idx+1}")
    nl = '\r\n' if '\r\n' in lines[start_idx] else '\n'
    replacement = [
        f'      if (text.startsWith("/gen_codes") || text.startsWith("/mint")) {{{nl}',
        f'        const parts = text.trim().split(/\\s+/);{nl}',
        f'        let count = 10;{nl}',
        f'        let isSprint = false;{nl}',
        f'        for (let i = 1; i < parts.length; i++) {{{nl}',
        f'          const p = parts[i].toLowerCase();{nl}',
        f'          if (/^\\d+$/.test(p)) {{{nl}',
        f'            count = Math.min(Math.max(parseInt(p, 10), 1), 100);{nl}',
        f'          }} else if (p === "sprint" || p === "7day") {{{nl}',
        f'            isSprint = true;{nl}',
        f'          }} else if (p === "lifetime" || p === "vip") {{{nl}',
        f'            isSprint = false;{nl}',
        f'          }}{nl}',
        f'        }}{nl}',
        f'        const planType = isSprint ? "sprint" : "lifetime";{nl}',
        f'        const prefix = isSprint ? "SPRINT" : "VIP";{nl}',
        f'        const generated = [];{nl}',
        f'        const statements = [];{nl}',
        f'        const nowMs = Date.now();{nl}',
        f'        const bonusMs = 7 * 24 * 60 * 60 * 1000;{nl}',
        f'        const expAt = isSprint ? (nowMs + bonusMs) : 0;{nl}',
        f'        for (let i = 0; i < count; i++) {{{nl}',
        f'          const code = generateSecureVoucherCode(prefix);{nl}',
        f'          const hash = await sha256Hex(code);{nl}',
        f'          statements.push({nl}',
        f'            env.DB.prepare("INSERT INTO promo_codes (code, is_used, plan_type) VALUES (?, 0, ?)").bind(code, planType){nl}',
        f'          );{nl}',
        f'          statements.push({nl}',
        f'            env.DB.prepare("INSERT INTO vouchers (code_hash, tier, max_devices, revoked, created_at, expires_at) VALUES (?, ?, 3, 0, unixepoch(), ?)").bind(hash, isSprint ? "sprint" : "vip", expAt){nl}',
        f'          );{nl}',
        f'          generated.push(code);{nl}',
        f'        }}{nl}',
        f'        await env.DB.batch(statements);{nl}',
        f'        const previewList = generated.slice(0, 15).map(c => `• \\`${{c}}\\``).join("\\n");{nl}',
        f'        const extraNote = generated.length > 15 ? `\\n_...and ${{generated.length - 15}} more passes._` : "";{nl}',
        f'        const mintMsg = {nl}',
        f'`🎟️ *MINTED ${{count}} ${{isSprint ? "7-DAY SPRINT" : "LIFETIME VIP"}} PASSES!*{nl}',
        f'━━━━━━━━━━━━━━━━━━━━{nl}',
        f'✨ *Status:* Active & Unredeemed (One-Time Use){nl}',
        f'📱 *Device Quota:* Max 3 devices per code{nl}',
        f'🔒 *Entropy:* Cryptographically secure 64-bit Base32{nl}',
        f'{nl}',
        f'📋 *Generated Codes:*{nl}',
        f'${{previewList}}${{extraNote}}{nl}',
        f'{nl}',
        f'💡 *Delivery Format:* Send any code to a student. Once entered on Web or Bot, it activates their VIP account.`;{nl}',
        f'        await sendTelegramMessage(botToken, chatId, mintMsg, {{{nl}',
        f'          inline_keyboard: [{nl}',
        f'            [{{ text: "⚡ Mint 10 Sprint Passes", callback_data: "mint_quick:sprint:10" }}],{nl}',
        f'            [{{ text: "👑 Mint 10 Lifetime Passes", callback_data: "mint_quick:lifetime:10" }}]{nl}',
        f'          ]{nl}',
        f'        }});{nl}',
        f'        return jsonResponse({{ ok: true }});{nl}',
        f'      }}{nl}'
    ]
    lines[start_idx:end_idx+1] = replacement
    with open('backend/worker.js', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("SUCCESSFULLY REPLACED gen_codes block!")
else:
    print("Could not find line indices")
