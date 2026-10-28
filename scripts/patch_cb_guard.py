with open("backend/worker.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'const cbMessageId = cb.message ? cb.message.message_id : null;' in l:
        print(f"Found cbMessageId at line {i+1}")
        nl = '\n'
        guard = [
            f'{nl}',
            f'    // Strict Admin Callback Query Guard (Hugo Only: 7468650530){nl}',
            f'    const ADMIN_CALLBACK_PREFIXES = [{nl}',
            f'      "approve:", "reject:", "mint_quick:", "admin_export_csv", "admin_vip_toggle:"{nl}',
            f'    ];{nl}',
            f'{nl}',
            f'    const isRestrictedCallback = ADMIN_CALLBACK_PREFIXES.some(prefix => data.startsWith(prefix) || data === prefix);{nl}',
            f'    if (isRestrictedCallback && String(cbUserId) !== String(adminId)) {{{nl}',
            f'      await answerCallbackQuery(botToken, cb.id, "⛔ Access Denied: Administrator authorization required.", true);{nl}',
            f'      return jsonResponse({{ ok: true }});{nl}',
            f'    }}{nl}'
        ]
        lines[i+1:i+1] = guard
        break

with open("backend/worker.js", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Updated callback guard successfully")
