import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("backend/worker.js", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Ensure adminId declaration has robust fallback to Hugo's ID (7468650530)
target_admin_decl = "  const adminId = env.ADMIN_TG_ID;"
replace_admin_decl = "  const adminId = String(env.ADMIN_TG_ID || env.ADMIN_CHAT_ID || '7468650530');"

if target_admin_decl in text:
    text = text.replace(target_admin_decl, replace_admin_decl)
    print("Patched adminId declaration")
else:
    print("FAILED adminId declaration")

# 2. Add message command guard
target_msg_handler = """    const from = msg.from || {};
    const text = (msg.text || "").trim();"""

replace_msg_handler = """    const from = msg.from || {};
    const text = (msg.text || "").trim();

    // Strict Admin Command Access Guard (Hugo Only: 7468650530)
    const ADMIN_COMMAND_PREFIXES = [
      "/admin", "/stats", "/mint", "/gen_codes", "/broadcast", "/broadcast_vip",
      "/broadcast_free", "/export", "/customers", "/csv", "/spreadsheet",
      "/lookup", "/setup_commands"
    ];

    const isRestrictedCmd = ADMIN_COMMAND_PREFIXES.some(prefix => text === prefix || text.startsWith(prefix + " ") || text.startsWith(prefix + "@")) || text.startsWith("/vip ");
    if (isRestrictedCmd && String(userId) !== String(adminId)) {
      await sendTelegramMessage(botToken, chatId, "⛔ *Access Denied.*\\n\\nThis administrative utility is restricted exclusively to the Lead Instructor / Administrator (@hyuguo).");
      return jsonResponse({ ok: true });
    }"""

if target_msg_handler in text:
    text = text.replace(target_msg_handler, replace_msg_handler)
    print("Patched message command guard")
else:
    print("FAILED message command guard")

# 3. Add callback query guard
target_cb_handler = """    const cb = update.callback_query;
    const cbChatId = cb.message ? cb.message.chat.id : null;
    const cbMessageId = cb.message ? cb.message.message_id : null;
    const cbUserId = cb.from ? cb.from.id : null;
    const data = cb.data || "";"""

replace_cb_handler = """    const cb = update.callback_query;
    const cbChatId = cb.message ? cb.message.chat.id : null;
    const cbMessageId = cb.message ? cb.message.message_id : null;
    const cbUserId = cb.from ? cb.from.id : null;
    const data = cb.data || "";

    // Strict Admin Callback Query Guard (Hugo Only: 7468650530)
    const ADMIN_CALLBACK_PREFIXES = [
      "approve:", "reject:", "mint_quick:", "admin_export_csv", "admin_vip_toggle:"
    ];

    const isRestrictedCallback = ADMIN_CALLBACK_PREFIXES.some(prefix => data.startsWith(prefix) || data === prefix);
    if (isRestrictedCallback && String(cb.from.id) !== String(adminId)) {
      await answerCallbackQuery(botToken, cb.id, "⛔ Access Denied: Administrator authorization required.", true);
      return jsonResponse({ ok: true });
    }"""

if target_cb_handler in text:
    text = text.replace(target_cb_handler, replace_cb_handler)
    print("Patched callback query guard")
else:
    print("FAILED callback query guard")

with open("backend/worker.js", "w", encoding="utf-8") as f:
    f.write(text)

print("Finished updating backend/worker.js")
